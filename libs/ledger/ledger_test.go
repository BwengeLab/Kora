package ledger

import (
	"testing"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestApprovedBalancedPostingAndReversal(t *testing.T) {
	store := NewStore()
	lead := leadActor("lead")
	bank, err := store.CreateAccount(lead, Account{OrganizationID: "org-1", Code: "1000", Name: "Bank", Type: Asset, Currency: "RWF"})
	if err != nil {
		t.Fatal(err)
	}
	revenue, err := store.CreateAccount(lead, Account{OrganizationID: "org-1", Code: "4000", Name: "Revenue", Type: Revenue, Currency: "RWF"})
	if err != nil {
		t.Fatal(err)
	}
	task := approvedTask(1_000)
	entries := []Entry{{AccountID: bank.ID, DebitMinor: 1_000, Currency: "RWF", Evidence: ledgerProof()}, {AccountID: revenue.ID, CreditMinor: 1_000, Currency: "RWF", Evidence: ledgerProof()}}
	group, err := store.Post(ActorContext{Actor: lead, Human: true}, task, entries)
	if err != nil {
		t.Fatal(err)
	}
	if balance, _ := store.Balance("org-1", bank.ID); balance != 1_000 {
		t.Fatalf("expected bank balance 1000, got %d", balance)
	}
	reversal, err := store.Reverse(ActorContext{Actor: lead, Human: true}, "org-1", group.ID, ledgerProof())
	if err != nil || reversal.ReversalOfPostingGroup != group.ID {
		t.Fatalf("expected linked reversal: reversal=%+v err=%v", reversal, err)
	}
	if balance, _ := store.Balance("org-1", bank.ID); balance != 0 {
		t.Fatalf("expected reversed balance 0, got %d", balance)
	}
	if _, err = store.Reverse(ActorContext{Actor: lead, Human: true}, "org-1", group.ID, ledgerProof()); err == nil {
		t.Fatal("expected duplicate reversal to fail")
	}
}

func TestPostingRequiresApprovalBalanceAndHuman(t *testing.T) {
	store := NewStore()
	lead := leadActor("lead")
	a, _ := store.CreateAccount(lead, Account{OrganizationID: "org-1", Code: "1000", Name: "Bank", Type: Asset, Currency: "RWF"})
	b, _ := store.CreateAccount(lead, Account{OrganizationID: "org-1", Code: "4000", Name: "Revenue", Type: Revenue, Currency: "RWF"})
	entries := []Entry{{AccountID: a.ID, DebitMinor: 1_000, Evidence: ledgerProof()}, {AccountID: b.ID, CreditMinor: 900, Evidence: ledgerProof()}}
	task := approvedTask(1_000)
	if _, err := store.Post(ActorContext{Actor: lead, Human: true}, task, entries); err == nil {
		t.Fatal("expected unbalanced posting to fail")
	}
	entries[1].CreditMinor = 1_000
	task.AmountMinor = 900
	if _, err := store.Post(ActorContext{Actor: lead, Human: true}, task, entries); err == nil {
		t.Fatal("expected posting above approved amount to fail")
	}
	task.AmountMinor = 1_000
	task.State = workflow.Assigned
	if _, err := store.Post(ActorContext{Actor: lead, Human: true}, task, entries); err == nil {
		t.Fatal("expected unapproved posting to fail")
	}
	task.State = workflow.Approved
	if _, err := store.Post(ActorContext{Actor: lead, Human: false}, task, entries); err == nil {
		t.Fatal("expected agent posting to fail")
	}
}

func TestLedgerTenantBoundary(t *testing.T) {
	store := NewStore()
	lead := leadActor("lead")
	account, _ := store.CreateAccount(lead, Account{OrganizationID: "org-1", Code: "1000", Name: "Bank", Type: Asset, Currency: "RWF"})
	if _, err := store.Balance("org-2", account.ID); err == nil {
		t.Fatal("expected cross-tenant account read to fail")
	}
}

func leadActor(id string) access.Actor {
	return access.Actor{UserID: id, OrganizationID: "org-1", Roles: []access.Role{access.RoleFinanceLead}}
}

func approvedTask(amount int64) workflow.Task {
	return workflow.Task{ID: "approval-1", OrganizationID: "org-1", CreatorUserID: "operator", State: workflow.Approved, AmountMinor: amount, Currency: "RWF", Evidence: ledgerProof()}
}

func ledgerProof() evidence.Evidence {
	return evidence.Evidence{SourceDocumentID: "doc-1", SourceRecordID: "row-1", IngestionBatchID: "batch-1", ExtractionVersionID: "version-1", Reason: "approved fixture", ConfidenceScore: 1}
}
