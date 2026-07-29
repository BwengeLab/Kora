package ledger

import (
	"errors"
	"slices"
	"sync"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/auth"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/workflow"
)

type AccountType string

const (
	Asset     AccountType = "ASSET"
	Liability AccountType = "LIABILITY"
	Equity    AccountType = "EQUITY"
	Revenue   AccountType = "REVENUE"
	Expense   AccountType = "EXPENSE"
)

type Account struct {
	ID             string      `json:"id"`
	OrganizationID string      `json:"organization_id"`
	Code           string      `json:"code"`
	Name           string      `json:"name"`
	Type           AccountType `json:"type"`
	Currency       string      `json:"currency"`
	CreatedAt      time.Time   `json:"created_at"`
}

type Entry struct {
	ID                string            `json:"id"`
	OrganizationID    string            `json:"organization_id"`
	AccountID         string            `json:"account_id"`
	DebitMinor        int64             `json:"debit_minor"`
	CreditMinor       int64             `json:"credit_minor"`
	Currency          string            `json:"currency"`
	PostingGroupID    string            `json:"posting_group_id"`
	ApprovalTaskID    string            `json:"approval_task_id"`
	ReversalOfEntryID string            `json:"reversal_of_entry_id,omitempty"`
	Evidence          evidence.Evidence `json:"evidence"`
	CreatedAt         time.Time         `json:"created_at"`
}

type Group struct {
	ID                     string    `json:"id"`
	OrganizationID         string    `json:"organization_id"`
	ApprovalTaskID         string    `json:"approval_task_id"`
	ReversalOfPostingGroup string    `json:"reversal_of_posting_group,omitempty"`
	Entries                []Entry   `json:"entries"`
	CreatedBy              string    `json:"created_by"`
	CreatedAt              time.Time `json:"created_at"`
}

type ActorContext struct {
	Actor access.Actor `json:"actor"`
	Human bool         `json:"human"`
}

type memoryStore struct {
	mu       sync.RWMutex
	accounts map[string]Account
	groups   map[string]Group
	reversed map[string]string
}

func NewStore() Store {
	return &memoryStore{accounts: map[string]Account{}, groups: map[string]Group{}, reversed: map[string]string{}}
}

func (s *memoryStore) CreateAccount(actor access.Actor, account Account) (Account, error) {
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
	account.ID, account.CreatedAt = id, time.Now().UTC()
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, existing := range s.accounts {
		if existing.OrganizationID == account.OrganizationID && existing.Code == account.Code {
			return Account{}, errors.New("account code already exists")
		}
	}
	s.accounts[id] = account
	return account, nil
}

func (s *memoryStore) Post(ctx ActorContext, task workflow.Task, entries []Entry) (Group, error) {
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
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, entry := range entries {
		account, ok := s.accounts[entry.AccountID]
		if !ok || account.OrganizationID != task.OrganizationID {
			return Group{}, errors.New("ledger account not found")
		}
		if entry.Currency == "" {
			entry.Currency = account.Currency
		}
		if entry.Currency != task.Currency || account.Currency != entry.Currency {
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
	group := Group{ID: groupID, OrganizationID: task.OrganizationID, ApprovalTaskID: task.ID, Entries: prepared, CreatedBy: ctx.Actor.UserID, CreatedAt: now}
	s.groups[groupID] = cloneGroup(group)
	return cloneGroup(group), nil
}

func (s *memoryStore) Reverse(ctx ActorContext, organizationID, groupID string, proof evidence.Evidence) (Group, error) {
	if !ctx.Human {
		return Group{}, errors.New("agents cannot reverse ledger postings")
	}
	if err := access.Authorize(ctx.Actor, access.Resource{OrganizationID: organizationID}, access.PermissionReverseLedger); err != nil {
		return Group{}, err
	}
	if err := evidence.Validate(proof); err != nil {
		return Group{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	original, ok := s.groups[groupID]
	if !ok || original.OrganizationID != organizationID {
		return Group{}, errors.New("posting group not found")
	}
	if original.ReversalOfPostingGroup != "" {
		return Group{}, errors.New("a reversal posting cannot be reversed directly")
	}
	if s.reversed[groupID] != "" {
		return Group{}, errors.New("posting group is already reversed")
	}
	reversalID, err := auth.NewID("posting")
	if err != nil {
		return Group{}, err
	}
	now := time.Now().UTC()
	entries := make([]Entry, len(original.Entries))
	for i, originalEntry := range original.Entries {
		entryID, err := auth.NewID("entry")
		if err != nil {
			return Group{}, err
		}
		entries[i] = Entry{ID: entryID, OrganizationID: organizationID, AccountID: originalEntry.AccountID, DebitMinor: originalEntry.CreditMinor, CreditMinor: originalEntry.DebitMinor, Currency: originalEntry.Currency, PostingGroupID: reversalID, ApprovalTaskID: original.ApprovalTaskID, ReversalOfEntryID: originalEntry.ID, Evidence: proof, CreatedAt: now}
	}
	reversal := Group{ID: reversalID, OrganizationID: organizationID, ApprovalTaskID: original.ApprovalTaskID, ReversalOfPostingGroup: groupID, Entries: entries, CreatedBy: ctx.Actor.UserID, CreatedAt: now}
	s.groups[reversalID] = cloneGroup(reversal)
	s.reversed[groupID] = reversalID
	return cloneGroup(reversal), nil
}

func (s *memoryStore) Group(organizationID, groupID string) (Group, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	group, ok := s.groups[groupID]
	if !ok || group.OrganizationID != organizationID {
		return Group{}, errors.New("posting group not found")
	}
	return cloneGroup(group), nil
}

func (s *memoryStore) Balance(organizationID, accountID string) (int64, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	account, ok := s.accounts[accountID]
	if !ok || account.OrganizationID != organizationID {
		return 0, errors.New("ledger account not found")
	}
	var balance int64
	for _, group := range s.groups {
		if group.OrganizationID != organizationID {
			continue
		}
		for _, entry := range group.Entries {
			if entry.AccountID == accountID {
				balance += entry.DebitMinor - entry.CreditMinor
			}
		}
	}
	return balance, nil
}

func validAccountType(value AccountType) bool {
	return slices.Contains([]AccountType{Asset, Liability, Equity, Revenue, Expense}, value)
}

func cloneGroup(group Group) Group {
	group.Entries = slices.Clone(group.Entries)
	return group
}
