package ledger

import (
	"testing"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/policy"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestApprovalToPostingAndReversalWorkflow(t *testing.T) {
	rules := policy.DefaultSME("org-1")
	workflows := workflow.NewStore()
	ledgers := NewStore()
	operator := access.Actor{
		UserID:         "operator",
		OrganizationID: "org-1",
		Roles:          []access.Role{access.RoleFinanceOperator},
	}
	lead := leadActor("lead")

	task, err := workflows.Create(operator, taskForIntegration(), rules)
	if err != nil {
		t.Fatal(err)
	}
	task, err = workflows.Assign(
		workflow.ActorContext{Actor: operator, Human: true},
		task.ID,
		access.RoleFinanceLead,
		ledgerProof(),
	)
	if err != nil {
		t.Fatal(err)
	}
	task, err = workflows.Approve(
		workflow.ActorContext{Actor: lead, Human: true},
		task.ID,
		rules,
		ledgerProof(),
	)
	if err != nil || task.State != workflow.Approved {
		t.Fatalf("approval failed: task=%+v err=%v", task, err)
	}

	bank, err := ledgers.CreateAccount(lead, Account{
		OrganizationID: "org-1",
		Code:           "1000",
		Name:           "Bank",
		Type:           Asset,
		Currency:       "RWF",
	})
	if err != nil {
		t.Fatal(err)
	}
	receivable, err := ledgers.CreateAccount(lead, Account{
		OrganizationID: "org-1",
		Code:           "1100",
		Name:           "Accounts Receivable",
		Type:           Asset,
		Currency:       "RWF",
	})
	if err != nil {
		t.Fatal(err)
	}
	group, err := ledgers.Post(
		ActorContext{Actor: lead, Human: true},
		task,
		[]Entry{
			{AccountID: bank.ID, DebitMinor: task.AmountMinor, Currency: "RWF", Evidence: ledgerProof()},
			{AccountID: receivable.ID, CreditMinor: task.AmountMinor, Currency: "RWF", Evidence: ledgerProof()},
		},
	)
	if err != nil {
		t.Fatal(err)
	}
	task, err = workflows.MarkExecuted(
		workflow.ActorContext{Actor: lead, Human: true},
		task.ID,
		ledgerProof(),
	)
	if err != nil || task.State != workflow.Executed {
		t.Fatalf("execution transition failed: task=%+v err=%v", task, err)
	}

	if _, err = ledgers.Reverse(
		ActorContext{Actor: lead, Human: true},
		"org-1",
		group.ID,
		ledgerProof(),
	); err != nil {
		t.Fatal(err)
	}
	task, err = workflows.MarkReversed(
		workflow.ActorContext{Actor: lead, Human: true},
		task.ID,
		ledgerProof(),
	)
	if err != nil || task.State != workflow.Reversed {
		t.Fatalf("reversal transition failed: task=%+v err=%v", task, err)
	}
	if balance, err := ledgers.Balance("org-1", bank.ID); err != nil || balance != 0 {
		t.Fatalf("expected zero bank balance after reversal: balance=%d err=%v", balance, err)
	}
	history, err := workflows.History("org-1", task.ID)
	if err != nil || len(history) != 4 {
		t.Fatalf("expected assign, approve, execute, reverse history: history=%+v err=%v", history, err)
	}
}

func taskForIntegration() workflow.Task {
	return workflow.Task{
		OrganizationID:  "org-1",
		SuggestedAction: "post_reconciled_payment",
		AmountMinor:     250_000,
		Currency:        "RWF",
		Evidence:        ledgerProof(),
	}
}
