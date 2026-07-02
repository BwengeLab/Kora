package riskanalytics

import (
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/financeanalytics"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestDetectSeededAnomalies(t *testing.T) {
	flags, err := Detect(financeLead(), fixture())
	if err != nil {
		t.Fatalf("Detect() error = %v", err)
	}
	seen := map[string]bool{}
	for _, flag := range flags {
		seen[flag.Type] = true
		if flag.Evidence.SourceDocumentID == "" || flag.Reason == "" {
			t.Fatalf("flag lacks evidence or reason: %+v", flag)
		}
	}
	for _, kind := range []string{"MISSING_APPROVAL", "UNSUPPORTED_PAYMENT", "DUPLICATE_VENDOR", "SUPPLIER_PRICE_HIKE", "MARGIN_DROP"} {
		if !seen[kind] {
			t.Fatalf("missing seeded anomaly %s in %+v", kind, flags)
		}
	}
}

func TestDetectRejectsTenantAndPermissionViolations(t *testing.T) {
	input := fixture()
	if _, err := Detect(access.Actor{UserID: "u", OrganizationID: "org_1", Roles: []access.Role{access.RoleExternalCollaborator}}, input); err == nil {
		t.Fatal("Detect() allowed external actor without consent")
	}

	input = fixture()
	input.Events[0].OrganizationID = "org_2"
	if _, err := Detect(financeLead(), input); err == nil {
		t.Fatal("Detect() allowed cross-tenant event")
	}
}

func fixture() Input {
	current := financeanalytics.Report{
		ID:             "report_current",
		OrganizationID: "org_1",
		Currency:       "RWF",
		ProfitAndLoss: financeanalytics.ProfitAndLoss{
			GrossMarginBasisPoints: 4500,
			Evidence:               []evidence.Evidence{proof("margin")},
		},
	}
	prior := financeanalytics.Report{
		ID:             "report_prior",
		OrganizationID: "org_1",
		Currency:       "RWF",
		ProfitAndLoss:  financeanalytics.ProfitAndLoss{GrossMarginBasisPoints: 7000},
	}
	return Input{
		OrganizationID:                    "org_1",
		AsOf:                              date("2026-02-01"),
		SupplierPriceIncreaseThresholdBps: 1500,
		MarginDropThresholdBps:            1000,
		Events: []eventledger.EventView{
			view("payment_no_approval", eventledger.PaymentSent, "2026-01-01", -50_000, "pay_1", nil),
			view("bill_old", eventledger.BillReceived, "2026-01-01", 100_000, "bill_old", map[string]string{"item_key": "cement"}, "supplier_1"),
			view("bill_new", eventledger.BillReceived, "2026-01-15", 130_000, "bill_new", map[string]string{"item_key": "cement"}, "supplier_1"),
		},
		Entities: []entities.Entity{
			{ID: "supplier_1", OrganizationID: "org_1", Type: entities.ExternalParty, DisplayName: "Acme Supplies", Attributes: map[string]string{"role": "SUPPLIER"}},
			{ID: "supplier_2", OrganizationID: "org_1", Type: entities.ExternalParty, DisplayName: "ACME  Supplies", Attributes: map[string]string{"role": "VENDOR"}},
		},
		ApprovalTasks: []workflow.Task{
			{ID: "approved_other", OrganizationID: "org_1", State: workflow.Executed, Evidence: proof("other_payment")},
		},
		CurrentReport: current,
		PriorReport:   &prior,
	}
}

func financeLead() access.Actor {
	return access.Actor{UserID: "u_finance", OrganizationID: "org_1", Roles: []access.Role{access.RoleFinanceLead}}
}

func view(id string, kind eventledger.EventType, occurred string, amount int64, sourceRecord string, attrs map[string]string, party ...string) eventledger.EventView {
	externalParty := ""
	if len(party) > 0 {
		externalParty = party[0]
	}
	event := eventledger.Event{ID: id, OrganizationID: "org_1", Type: kind, Status: eventledger.Active, ExternalPartyID: externalParty, Evidence: proofWithDate(sourceRecord, occurred, amount), Attributes: attrs}
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
