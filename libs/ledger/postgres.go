package ledger

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/auth"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/workflow"
)

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(db *sql.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

func (s *PostgresStore) CreateAccount(actor access.Actor, account Account) (Account, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: account.OrganizationID}, access.PermissionPostLedger); err != nil {
		return Account{}, err
	}
	if account.Code == "" || account.Name == "" || account.Currency == "" || !validAccountType(account.Type) {
		return Account{}, errors.New("valid account code, name, type, and currency are required")
	}
	id, err := auth.NewID("account")
	if err != nil {
		return Account{}, err
	}
	account.ID = id
	account.CreatedAt = time.Now().UTC()
	_, err = s.db.Exec(
		"INSERT INTO ledger_accounts (id, organization_id, code, name, account_type, currency, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		account.ID, account.OrganizationID, account.Code, account.Name, account.Type, account.Currency, account.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return Account{}, errors.New("account code already exists")
		}
		return Account{}, err
	}
	return account, nil
}

func (s *PostgresStore) Post(ctx ActorContext, task workflow.Task, entries []Entry) (Group, error) {
	if !ctx.Human {
		return Group{}, errors.New("agents cannot post ledger entries")
	}
	if err := access.Authorize(ctx.Actor, access.Resource{OrganizationID: task.OrganizationID}, access.PermissionPostLedger); err != nil {
		return Group{}, err
	}
	if task.State != workflow.Approved {
		return Group{}, errors.New("approval task must be approved before posting")
	}
	if len(entries) < 2 {
		return Group{}, errors.New("a posting requires at least two entries")
	}

	groupID, err := auth.NewID("posting")
	if err != nil {
		return Group{}, err
	}
	now := time.Now().UTC()

	prepared := make([]Entry, len(entries))
	var debitTotal, creditTotal int64

	tx, err := s.db.Begin()
	if err != nil {
		return Group{}, err
	}
	defer tx.Rollback()

	for i, entry := range entries {
		var orgID, currency string
		err := tx.QueryRow("SELECT organization_id, currency FROM ledger_accounts WHERE id = $1", entry.AccountID).Scan(&orgID, &currency)
		if err == sql.ErrNoRows {
			return Group{}, errors.New("ledger account not found")
		}
		if err != nil {
			return Group{}, err
		}
		if orgID != task.OrganizationID {
			return Group{}, errors.New("ledger account not found")
		}
		if entry.Currency == "" {
			entry.Currency = currency
		}
		if entry.Currency != task.Currency || currency != entry.Currency {
			return Group{}, errors.New("posting currency does not match task and account")
		}
		if (entry.DebitMinor <= 0) == (entry.CreditMinor <= 0) {
			return Group{}, errors.New("each entry must contain exactly one positive debit or credit")
		}
		if err := evidence.Validate(entry.Evidence); err != nil {
			return Group{}, err
		}
		entryID, err := auth.NewID("entry")
		if err != nil {
			return Group{}, err
		}
		entry.ID = entryID
		entry.OrganizationID = task.OrganizationID
		entry.PostingGroupID = groupID
		entry.ApprovalTaskID = task.ID
		entry.CreatedAt = now
		debitTotal += entry.DebitMinor
		creditTotal += entry.CreditMinor
		prepared[i] = entry
	}

	if debitTotal != creditTotal {
		return Group{}, errors.New("posting is not balanced")
	}
	if debitTotal != task.AmountMinor {
		return Group{}, errors.New("posting total does not equal approved amount")
	}

	_, err = tx.Exec(
		"INSERT INTO posting_groups (id, organization_id, approval_task_id, created_by, created_at) VALUES ($1, $2, $3, $4, $5)",
		groupID, task.OrganizationID, task.ID, ctx.Actor.UserID, now,
	)
	if err != nil {
		return Group{}, err
	}

	for _, entry := range prepared {
		evidenceJSON, err := json.Marshal(entry.Evidence)
		if err != nil {
			return Group{}, err
		}
		_, err = tx.Exec(
			"INSERT INTO ledger_entries (id, organization_id, account_id, debit_minor, credit_minor, currency, posting_group_id, approval_task_id, evidence, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
			entry.ID, entry.OrganizationID, entry.AccountID, entry.DebitMinor, entry.CreditMinor, entry.Currency, entry.PostingGroupID, entry.ApprovalTaskID, evidenceJSON, entry.CreatedAt,
		)
		if err != nil {
			return Group{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return Group{}, err
	}

	return Group{ID: groupID, OrganizationID: task.OrganizationID, ApprovalTaskID: task.ID, Entries: prepared, CreatedBy: ctx.Actor.UserID, CreatedAt: now}, nil
}

func (s *PostgresStore) Reverse(ctx ActorContext, organizationID, groupID string, proof evidence.Evidence) (Group, error) {
	if !ctx.Human {
		return Group{}, errors.New("agents cannot reverse ledger postings")
	}
	if err := access.Authorize(ctx.Actor, access.Resource{OrganizationID: organizationID}, access.PermissionReverseLedger); err != nil {
		return Group{}, err
	}
	if err := evidence.Validate(proof); err != nil {
		return Group{}, err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return Group{}, err
	}
	defer tx.Rollback()

	var originalGroup Group
	originalGroup.ID = groupID
	originalGroup.OrganizationID = organizationID
	err = tx.QueryRow(
		"SELECT approval_task_id, COALESCE(reversal_of_posting_group_id, ''), created_by, created_at FROM posting_groups WHERE id = $1 AND organization_id = $2",
		groupID, organizationID,
	).Scan(&originalGroup.ApprovalTaskID, &originalGroup.ReversalOfPostingGroup, &originalGroup.CreatedBy, &originalGroup.CreatedAt)
	if err == sql.ErrNoRows {
		return Group{}, errors.New("posting group not found")
	}
	if err != nil {
		return Group{}, err
	}

	if originalGroup.ReversalOfPostingGroup != "" {
		return Group{}, errors.New("a reversal posting cannot be reversed directly")
	}

	var count int
	err = tx.QueryRow("SELECT COUNT(*) FROM posting_groups WHERE reversal_of_posting_group_id = $1", groupID).Scan(&count)
	if err != nil {
		return Group{}, err
	}
	if count > 0 {
		return Group{}, errors.New("posting group is already reversed")
	}

	rows, err := tx.Query(
		"SELECT id, organization_id, account_id, debit_minor, credit_minor, currency, posting_group_id, approval_task_id, COALESCE(reversal_of_entry_id, ''), evidence, created_at FROM ledger_entries WHERE posting_group_id = $1",
		groupID,
	)
	if err != nil {
		return Group{}, err
	}
	defer rows.Close()

	var originalEntries []Entry
	for rows.Next() {
		var e Entry
		var evidenceJSON []byte
		if err := rows.Scan(&e.ID, &e.OrganizationID, &e.AccountID, &e.DebitMinor, &e.CreditMinor, &e.Currency, &e.PostingGroupID, &e.ApprovalTaskID, &e.ReversalOfEntryID, &evidenceJSON, &e.CreatedAt); err != nil {
			return Group{}, err
		}
		if err := json.Unmarshal(evidenceJSON, &e.Evidence); err != nil {
			return Group{}, err
		}
		originalEntries = append(originalEntries, e)
	}
	if err := rows.Err(); err != nil {
		return Group{}, err
	}

	reversalID, err := auth.NewID("posting")
	if err != nil {
		return Group{}, err
	}
	now := time.Now().UTC()

	_, err = tx.Exec(
		"INSERT INTO posting_groups (id, organization_id, approval_task_id, reversal_of_posting_group_id, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
		reversalID, organizationID, originalGroup.ApprovalTaskID, groupID, ctx.Actor.UserID, now,
	)
	if err != nil {
		return Group{}, err
	}

	entries := make([]Entry, len(originalEntries))
	for i, originalEntry := range originalEntries {
		entryID, err := auth.NewID("entry")
		if err != nil {
			return Group{}, err
		}
		evidenceJSON, err := json.Marshal(proof)
		if err != nil {
			return Group{}, err
		}
		entries[i] = Entry{
			ID:                entryID,
			OrganizationID:    organizationID,
			AccountID:         originalEntry.AccountID,
			DebitMinor:        originalEntry.CreditMinor,
			CreditMinor:       originalEntry.DebitMinor,
			Currency:          originalEntry.Currency,
			PostingGroupID:    reversalID,
			ApprovalTaskID:    originalGroup.ApprovalTaskID,
			ReversalOfEntryID: originalEntry.ID,
			Evidence:          proof,
			CreatedAt:         now,
		}
		_, err = tx.Exec(
			"INSERT INTO ledger_entries (id, organization_id, account_id, debit_minor, credit_minor, currency, posting_group_id, approval_task_id, reversal_of_entry_id, evidence, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
			entries[i].ID, entries[i].OrganizationID, entries[i].AccountID, entries[i].DebitMinor, entries[i].CreditMinor, entries[i].Currency, entries[i].PostingGroupID, entries[i].ApprovalTaskID, entries[i].ReversalOfEntryID, evidenceJSON, entries[i].CreatedAt,
		)
		if err != nil {
			return Group{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return Group{}, err
	}

	return Group{ID: reversalID, OrganizationID: organizationID, ApprovalTaskID: originalGroup.ApprovalTaskID, ReversalOfPostingGroup: groupID, Entries: entries, CreatedBy: ctx.Actor.UserID, CreatedAt: now}, nil
}

func (s *PostgresStore) Group(organizationID, groupID string) (Group, error) {
	var g Group
	err := s.db.QueryRow(
		"SELECT id, organization_id, approval_task_id, COALESCE(reversal_of_posting_group_id, ''), created_by, created_at FROM posting_groups WHERE id = $1 AND organization_id = $2",
		groupID, organizationID,
	).Scan(&g.ID, &g.OrganizationID, &g.ApprovalTaskID, &g.ReversalOfPostingGroup, &g.CreatedBy, &g.CreatedAt)
	if err == sql.ErrNoRows {
		return Group{}, errors.New("posting group not found")
	}
	if err != nil {
		return Group{}, err
	}

	rows, err := s.db.Query(
		"SELECT id, organization_id, account_id, debit_minor, credit_minor, currency, posting_group_id, approval_task_id, COALESCE(reversal_of_entry_id, ''), evidence, created_at FROM ledger_entries WHERE posting_group_id = $1 ORDER BY created_at",
		groupID,
	)
	if err != nil {
		return Group{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var e Entry
		var evidenceJSON []byte
		if err := rows.Scan(&e.ID, &e.OrganizationID, &e.AccountID, &e.DebitMinor, &e.CreditMinor, &e.Currency, &e.PostingGroupID, &e.ApprovalTaskID, &e.ReversalOfEntryID, &evidenceJSON, &e.CreatedAt); err != nil {
			return Group{}, err
		}
		if err := json.Unmarshal(evidenceJSON, &e.Evidence); err != nil {
			return Group{}, err
		}
		g.Entries = append(g.Entries, e)
	}
	if err := rows.Err(); err != nil {
		return Group{}, err
	}

	return g, nil
}

func (s *PostgresStore) Balance(organizationID, accountID string) (int64, error) {
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM ledger_accounts WHERE id = $1 AND organization_id = $2)", accountID, organizationID).Scan(&exists)
	if err != nil {
		return 0, err
	}
	if !exists {
		return 0, errors.New("ledger account not found")
	}

	var balance sql.NullInt64
	err = s.db.QueryRow("SELECT SUM(debit_minor - credit_minor) FROM ledger_entries WHERE organization_id = $1 AND account_id = $2", accountID, organizationID).Scan(&balance)
	if err != nil {
		return 0, err
	}
	if balance.Valid {
		return balance.Int64, nil
	}
	return 0, nil
}

func isUniqueViolation(err error) bool {
	return err != nil && (isPGError(err, "23505") || isPGError(err, "unique"))
}

func isPGError(err error, code string) bool {
	type sqlErr interface {
		SQLState() string
	}
	var se sqlErr
	if errors.As(err, &se) {
		return se.SQLState() == code
	}
	return false
}
