package reporting

import (
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/audit"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/libs/reconciliation"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestGenerateDerivesLedgerAndROIFromVerifiedSources(t *testing.T) {
	input := validInput()
	report, err := Generate(financeLead("org-1"), input)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Ledger) != 1 || report.Ledger[0].DebitMinor != 250_000 || report.Ledger[0].CreditMinor != 250_000 {
		t.Fatalf("ledger summary did not reconcile: %+v", report.Ledger)
	}
	if len(report.ROI) != 1 || report.ROI[0].AmountMinor != 250_000 || report.ROI[0].Count != 1 {
		t.Fatalf("ROI was not derived from the posting: %+v", report.ROI)
	}
	if report.VerifiedAuditEntries != 1 || report.ID == "" {
		t.Fatalf("report provenance is incomplete: %+v", report)
	}
}

func TestGenerateRejectsDoubleCountingAndInventedMonetaryROI(t *testing.T) {
	input := validInput()
	input.Outcomes = append(input.Outcomes, input.Outcomes[0])
	if _, err := Generate(financeLead("org-1"), input); err == nil {
		t.Fatal("same source event must not be counted twice")
	}

	input = validInput()
	input.Outcomes[0].PostingGroupID = "missing"
	if _, err := Generate(financeLead("org-1"), input); err == nil {
		t.Fatal("monetary ROI without an executed posting must be rejected")
	}
}

func TestGenerateEnforcesPermissionsTenantAndLedgerIntegrity(t *testing.T) {
	input := validInput()
	operator := access.Actor{UserID: "operator", OrganizationID: "org-1", Roles: []access.Role{access.RoleFinanceOperator}}
	if _, err := Generate(operator, input); err == nil {
		t.Fatal("finance operator must not read ROI")
	}
	input.IncludeROI = false
	input.Outcomes = nil
	if _, err := Generate(operator, input); err != nil {
		t.Fatalf("finance operator should read non-ROI reports: %v", err)
	}
	if _, err := Generate(financeLead("org-2"), input); err == nil {
		t.Fatal("cross-tenant report access must be denied")
	}
	input = validInput()
	input.PostingGroups[0].Entries[1].CreditMinor--
	if _, err := Generate(financeLead("org-1"), input); err == nil {
		t.Fatal("unbalanced source ledger must be rejected")
	}
}

func TestDuplicateROIComesFromReconciliationEvidence(t *testing.T) {
	input := validInput()
	duplicate := testEvent("event-duplicate", eventledger.PaymentSent, -45_000)
	input.Events = append(input.Events, duplicate)
	input.Reconciliation.Candidates = append(input.Reconciliation.Candidates, reconciliation.Candidate{
		LeftEventID: duplicate.ID, State: reconciliation.Duplicate, Score: 1,
		Evidence: duplicate.Evidence, Reason: "duplicate source event",
	})
	entry := audit.Seal(audit.Entry{
		ID: "audit-duplicate", TenantID: "org-1", ActorUserID: "lead",
		Action: auditAction(DuplicatePaymentAvoided), Resource: duplicate.ID,
		EvidenceID: duplicate.Evidence.SourceRecordID, OccurredAt: time.Now().UTC(),
	})
	input.AuditEntries = append(input.AuditEntries, entry)
	input.Outcomes = append(input.Outcomes, Outcome{
		Type: DuplicatePaymentAvoided, SourceEventID: duplicate.ID, AuditEntryID: entry.ID,
	})
	report, err := Generate(financeLead("org-1"), input)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.ROI) != 2 {
		t.Fatalf("expected two separately sourced ROI metrics: %+v", report.ROI)
	}
	for _, metric := range report.ROI {
		if metric.Type == DuplicatePaymentAvoided && metric.AmountMinor != 45_000 {
			t.Fatalf("duplicate amount was not derived from evidence: %+v", metric)
		}
	}
}

func validInput() Input {
	event := testEvent("event-payment", eventledger.PaymentReceived, 250_000)
	proof := event.Evidence
	task := workflow.Task{
		ID: "task-1", OrganizationID: "org-1", SuggestedAction: "collect_late_invoice",
		State: workflow.Executed, AmountMinor: 250_000, Currency: "RWF", Evidence: proof,
	}
	group := ledger.Group{
		ID: "posting-1", OrganizationID: "org-1", ApprovalTaskID: task.ID,
		Entries: []ledger.Entry{
			{ID: "entry-1", OrganizationID: "org-1", AccountID: "bank", DebitMinor: 250_000, Currency: "RWF", PostingGroupID: "posting-1", ApprovalTaskID: task.ID, Evidence: proof},
			{ID: "entry-2", OrganizationID: "org-1", AccountID: "receivable", CreditMinor: 250_000, Currency: "RWF", PostingGroupID: "posting-1", ApprovalTaskID: task.ID, Evidence: proof},
		},
	}
	auditEntry := audit.Seal(audit.Entry{
		ID: "audit-roi", TenantID: "org-1", ActorUserID: "lead",
		Action: auditAction(LateInvoiceCollected), Resource: event.ID,
		EvidenceID: proof.SourceRecordID, OccurredAt: time.Now().UTC(),
	})
	return Input{
		OrganizationID: "org-1", Events: []eventledger.Event{event},
		ApprovalTasks: []workflow.Task{task}, PostingGroups: []ledger.Group{group},
		AuditEntries: []audit.Entry{auditEntry}, IncludeROI: true,
		Outcomes: []Outcome{{
			Type: LateInvoiceCollected, SourceEventID: event.ID, ApprovalTaskID: task.ID,
			PostingGroupID: group.ID, AuditEntryID: auditEntry.ID,
		}},
	}
}

func financeLead(organizationID string) access.Actor {
	return access.Actor{UserID: "lead", OrganizationID: organizationID, Roles: []access.Role{access.RoleFinanceLead}}
}

func testEvent(id string, eventType eventledger.EventType, amount int64) eventledger.Event {
	return eventledger.Event{
		ID: id, OrganizationID: "org-1", Type: eventType, Status: eventledger.Active,
		Evidence: testEvidence("source-"+id, amount),
	}
}

func testEvidence(source string, amount int64) evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID: "doc-" + source, SourceRecordID: source,
		IngestionBatchID: "batch-1", ExtractionVersionID: "version-1",
		TransactionReference: source, OccurredOn: "2026-01-01",
		AmountMinor: amount, Currency: "RWF", Reason: "reporting test",
		ConfidenceScore: .99, ConfidenceMethod: "fixture",
	}
}
