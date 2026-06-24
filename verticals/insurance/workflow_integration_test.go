package insurance

import (
	"testing"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/libs/policy"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestClaimRequiresHumanApprovalBeforeGenericLedgerPosting(t *testing.T) {
	const organizationID = "org-insurance-workflow"
	adapter := testAdapter()
	rules := policy.DefaultInsurance(organizationID)
	workflows := workflow.NewStore()
	ledgers := ledger.NewStore()
	operator := access.Actor{
		UserID:         "operator-1",
		OrganizationID: organizationID,
		Roles:          []access.Role{access.RoleFinanceOperator},
	}
	lead := access.Actor{
		UserID:         "lead-1",
		OrganizationID: organizationID,
		Roles:          []access.Role{access.RoleFinanceLead},
	}

	claimEvidence := proof("claim-workflow", "CLM-2026-100", 500_000, "RWF")
	claim, err := adapter.Map(Input{
		OrganizationID: organizationID,
		RecordType:     Claim,
		Fields: map[string]string{
			"claim_number": "CLM-2026-100", "insured_name": "Example Logistics",
			"claim_date": "2026-01-01", "amount": "500000", "currency": "RWF",
		},
		Evidence: claimEvidence,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !contains(claim.QualityFlags, "unsupported-claim") {
		t.Fatalf("claim without approval must be flagged: %+v", claim.QualityFlags)
	}

	task, err := workflows.Create(operator, workflow.Task{
		OrganizationID:  organizationID,
		SuggestedAction: "pay_claim",
		AmountMinor:     500_000,
		Currency:        "RWF",
		Evidence:        claimEvidence,
	}, rules)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = ledgers.Post(ledger.ActorContext{Actor: lead, Human: true}, task, nil); err == nil {
		t.Fatal("unapproved claim must not be posted")
	}
	task, err = workflows.Assign(
		workflow.ActorContext{Actor: operator, Human: true},
		task.ID,
		access.RoleFinanceLead,
		claimEvidence,
	)
	if err != nil {
		t.Fatal(err)
	}
	task, err = workflows.Approve(
		workflow.ActorContext{Actor: lead, Human: true},
		task.ID,
		rules,
		claimEvidence,
	)
	if err != nil || task.State != workflow.Approved {
		t.Fatalf("claim approval failed: task=%+v err=%v", task, err)
	}

	claimsExpense, err := ledgers.CreateAccount(lead, ledger.Account{
		OrganizationID: organizationID, Code: "6100", Name: "Claims expense",
		Type: ledger.Expense, Currency: "RWF",
	})
	if err != nil {
		t.Fatal(err)
	}
	bank, err := ledgers.CreateAccount(lead, ledger.Account{
		OrganizationID: organizationID, Code: "1000", Name: "Bank",
		Type: ledger.Asset, Currency: "RWF",
	})
	if err != nil {
		t.Fatal(err)
	}
	posting, err := ledgers.Post(
		ledger.ActorContext{Actor: lead, Human: true},
		task,
		[]ledger.Entry{
			{AccountID: claimsExpense.ID, DebitMinor: 500_000, Currency: "RWF", Evidence: claimEvidence},
			{AccountID: bank.ID, CreditMinor: 500_000, Currency: "RWF", Evidence: claimEvidence},
		},
	)
	if err != nil {
		t.Fatal(err)
	}

	paymentEvidence := proof("claim-payment-workflow", "PAY-CLM-100", -500_000, "RWF")
	payment, err := adapter.Map(Input{
		OrganizationID: organizationID,
		RecordType:     ClaimPayment,
		Fields: map[string]string{
			"reference": "PAY-CLM-100", "claim_number": "CLM-2026-100",
			"date": "2026-01-02", "amount": "-500000", "currency": "RWF",
			"party_name": "Example Logistics", "approval_task_id": task.ID,
			"ledger_entry_id": posting.ID,
		},
		Evidence: paymentEvidence,
	})
	if err != nil {
		t.Fatal(err)
	}
	if payment.RelatedIDs["approval_task_id"] != task.ID || payment.RelatedIDs["ledger_entry_id"] != posting.ID {
		t.Fatalf("claim payment lost approval or posting links: %+v", payment.RelatedIDs)
	}
	reconciled, err := ReconcileEvents(organizationID, []Mapping{claim, payment}, rules)
	if err != nil {
		t.Fatal(err)
	}
	if len(reconciled.Candidates) == 0 || reconciled.Candidates[0].State != "MATCHED" {
		t.Fatalf("approved claim payment was not reconciled: %+v", reconciled)
	}
}
