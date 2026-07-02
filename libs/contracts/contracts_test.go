package contracts

import (
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
)

func TestAnalyzeBuildsContractsObligationsAlertsAndMismatches(t *testing.T) {
	report, err := Analyze(financeLead(), Input{
		OrganizationID:   "org_1",
		AsOf:             date("2026-11-20"),
		RenewalAlertDays: 45,
		Events: []eventledger.EventView{
			contractEvent("evt_contract", "CON-1", "2026-01-01", "2026-12-31", "2026-12-20"),
			obligationEvent("evt_obligation", stableID("org_1", "CON-1")),
			paymentEvent("evt_unlinked_payment", nil),
			paymentEvent("evt_linked_payment", map[string]string{"contract_link": stableID("org_1", "CON-1")}),
		},
	})
	if err != nil {
		t.Fatalf("Analyze() error = %v", err)
	}
	if len(report.Contracts) != 1 || len(report.Obligations) != 1 || len(report.Contracts[0].Obligations) != 1 {
		t.Fatalf("contract/obligation report = %+v", report)
	}
	if len(report.RenewalAlerts) != 1 || report.RenewalAlerts[0].DaysUntilRenewal != 30 {
		t.Fatalf("renewal alerts = %+v", report.RenewalAlerts)
	}
	if len(report.MismatchFlags) != 1 || report.MismatchFlags[0].EventID != "evt_unlinked_payment" {
		t.Fatalf("mismatch flags = %+v", report.MismatchFlags)
	}
}

func TestAnalyzeRequiresContractPermissionAndTenantIntegrity(t *testing.T) {
	input := Input{OrganizationID: "org_1", AsOf: date("2026-01-01"), RenewalAlertDays: 30, Events: []eventledger.EventView{contractEvent("evt_contract", "CON-1", "2026-01-01", "2026-12-31", "")}}
	if _, err := Analyze(access.Actor{UserID: "u", OrganizationID: "org_1", Roles: []access.Role{access.RoleFinanceOperator}}, input); err == nil {
		t.Fatal("Analyze() allowed role without contracts permission")
	}
	input.Events[0].OrganizationID = "org_2"
	if _, err := Analyze(financeLead(), input); err == nil {
		t.Fatal("Analyze() allowed cross-tenant event")
	}
}

func financeLead() access.Actor {
	return access.Actor{UserID: "u_finance", OrganizationID: "org_1", Roles: []access.Role{access.RoleFinanceLead}}
}

func contractEvent(id, number, start, end, renewal string) eventledger.EventView {
	attrs := map[string]string{"contract_number": number, "start_date": start, "end_date": end}
	if renewal != "" {
		attrs["renewal_date"] = renewal
	}
	event := eventledger.Event{ID: id, OrganizationID: "org_1", Type: eventledger.ContractSigned, Status: eventledger.Active, ExternalPartyID: "party_1", Evidence: proof(id), Attributes: attrs}
	return eventledger.EventView{Event: event, EffectiveStatus: eventledger.Active}
}

func obligationEvent(id, contractID string) eventledger.EventView {
	event := eventledger.Event{ID: id, OrganizationID: "org_1", Type: eventledger.ObligationCreated, Status: eventledger.Active, ExternalPartyID: "party_1", Evidence: proofWithAmount(id, 25_000), Attributes: map[string]string{"contract_link": contractID, "due_date": "2026-12-01", "description": "renewal fee"}}
	return eventledger.EventView{Event: event, EffectiveStatus: eventledger.Active}
}

func paymentEvent(id string, attrs map[string]string) eventledger.EventView {
	event := eventledger.Event{ID: id, OrganizationID: "org_1", Type: eventledger.PaymentSent, Status: eventledger.Active, ExternalPartyID: "party_1", Evidence: proofWithAmount(id, -25_000), Attributes: attrs}
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
	return proofWithAmount(sourceRecord, 1)
}

func proofWithAmount(sourceRecord string, amount int64) evidence.Evidence {
	return evidence.Evidence{SourceDocumentID: "doc_1", SourceRecordID: sourceRecord, IngestionBatchID: "batch_1", ExtractionVersionID: "extract_1", TransactionReference: sourceRecord, OccurredOn: "2026-01-01", AmountMinor: amount, Currency: "RWF", Reason: "fixture", ConfidenceScore: 0.95}
}
