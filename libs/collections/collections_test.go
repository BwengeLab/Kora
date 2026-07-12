package collections

import (
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
)

func TestBuildCasesCreatesOverdueRemindersAndEscalations(t *testing.T) {
	cases, err := BuildCases(actor(access.RoleFinanceLead), Input{
		OrganizationID:    "org_1",
		AsOf:              date("2026-02-20"),
		ReminderAfterDays: 7,
		EscalateAfterDays: 30,
		Events: []eventledger.EventView{
			invoice("inv_old", "2026-01-01", "2026-01-10", 120_000),
			invoice("inv_recent", "2026-02-01", "2026-02-18", 50_000),
		},
	})
	if err != nil {
		t.Fatalf("BuildCases() error = %v", err)
	}
	if len(cases) != 1 {
		t.Fatalf("expected one overdue case, got %d", len(cases))
	}
	if cases[0].State != Escalated || cases[0].DaysOverdue != 41 || cases[0].AmountMinor != 120_000 || cases[0].DraftMessage == "" {
		t.Fatalf("case = %+v", cases[0])
	}
}

func TestSendReminderRequiresHumanCollectionsPermission(t *testing.T) {
	c := Case{ID: "case_1", OrganizationID: "org_1", DraftMessage: "Please pay", State: Reminder}
	if _, err := SendReminder(actor(access.RoleFinanceLead), false, c, proof("send"), "email"); err == nil {
		t.Fatal("SendReminder() allowed agent/non-human send")
	}
	if _, err := SendReminder(actor(access.RoleAuditorCompliance), true, c, proof("send"), "email"); err == nil {
		t.Fatal("SendReminder() allowed read-only auditor")
	}
	receipt, err := SendReminder(actor(access.RoleFinanceOperator), true, c, proof("send"), "email")
	if err != nil {
		t.Fatalf("SendReminder() error = %v", err)
	}
	if receipt.CaseID != c.ID || receipt.SentByUserID == "" || receipt.Message == "" {
		t.Fatalf("receipt = %+v", receipt)
	}
}

func actor(role access.Role) access.Actor {
	return access.Actor{UserID: "u_1", OrganizationID: "org_1", Roles: []access.Role{role}}
}

func invoice(id, occurred, due string, amount int64) eventledger.EventView {
	event := eventledger.Event{ID: id, OrganizationID: "org_1", Type: eventledger.InvoiceIssued, Status: eventledger.Active, ExternalPartyID: "party_1", Evidence: proofWithDate(id, occurred, amount), Attributes: map[string]string{"due_date": due, "party_name": "Kora Customer"}}
	return eventledger.EventView{Event: event, EffectiveStatus: eventledger.Active}
}

func date(value string) time.Time {
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		panic(err)
	}
	return parsed
}

func proof(sourceRecord string) evidence.Evidence {
	return proofWithDate(sourceRecord, "2026-01-01", 1)
}

func proofWithDate(sourceRecord, occurred string, amount int64) evidence.Evidence {
	return evidence.Evidence{SourceDocumentID: "doc_1", SourceRecordID: sourceRecord, IngestionBatchID: "batch_1", ExtractionVersionID: "extract_1", TransactionReference: sourceRecord, OccurredOn: occurred, AmountMinor: amount, Currency: "RWF", Reason: "fixture", ConfidenceScore: 0.95}
}
