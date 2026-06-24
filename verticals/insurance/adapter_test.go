package insurance

import (
	"fmt"
	"testing"

	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/normalization"
	"github.com/kora-finance/kora/libs/policy"
)

func TestInsuranceWorkflowMapsAndReconcilesWithoutCoreInsuranceTypes(t *testing.T) {
	adapter := testAdapter()
	organizationID := "org-insurance"

	broker, err := adapter.Map(Input{
		OrganizationID: organizationID,
		RecordType:     Broker,
		Fields:         map[string]string{"broker_code": "BRK-1", "broker_name": "Kigali Brokers"},
		Evidence:       proof("broker-1", "BRK-1", 0, ""),
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(broker.Entities) != 1 || broker.Entities[0].Type != entities.ExternalParty || broker.Entities[0].Attributes["role"] != "BROKER" {
		t.Fatalf("broker was not mapped to a generic external party: %+v", broker)
	}

	policyMapping, err := adapter.Map(Input{
		OrganizationID: organizationID,
		RecordType:     Policy,
		Fields: map[string]string{
			"policy_number": "POL-1001", "customer_name": "Example Logistics",
			"effective_date": "2026-01-07", "premium_amount": "275000",
			"currency": "RWF", "broker_code": "BRK-1",
		},
		Evidence: proof("policy-1", "POL-1001", 275000, "RWF"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(policyMapping.Events) != 2 || policyMapping.Events[0].Type != eventledger.ContractSigned || policyMapping.Events[1].Type != eventledger.InvoiceIssued {
		t.Fatalf("policy did not map to contract and invoice events: %+v", policyMapping.Events)
	}
	if policyMapping.RelatedIDs["contract_id"] == "" || policyMapping.RelatedIDs["invoice_id"] == "" {
		t.Fatalf("policy generic links are incomplete: %+v", policyMapping.RelatedIDs)
	}

	premiumMapping, err := adapter.Map(Input{
		OrganizationID: organizationID,
		RecordType:     Premium,
		Fields: map[string]string{
			"policy_number": "POL-1001", "payment_date": "2026-01-07",
			"amount": "275000", "currency": "RWF", "payer_name": "Example Logistics",
		},
		Evidence: proof("premium-1", "POL-1001", 275000, "RWF"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if premiumMapping.Events[0].Type != eventledger.PaymentReceived || premiumMapping.Events[0].Attributes["category"] != "premium" {
		t.Fatalf("premium polluted the generic event taxonomy: %+v", premiumMapping.Events[0])
	}

	result, err := ReconcileEvents(organizationID, []Mapping{policyMapping, premiumMapping}, policy.DefaultInsurance(organizationID))
	if err != nil {
		t.Fatal(err)
	}
	matched := false
	for _, candidate := range result.Candidates {
		if candidate.State == "MATCHED" && (candidate.LeftEventID == premiumMapping.Events[0].ID || candidate.RightEventID == premiumMapping.Events[0].ID) {
			matched = true
		}
	}
	if !matched {
		t.Fatalf("premium payment did not reconcile to policy invoice: %+v", result)
	}
}

func TestClaimsPaymentsAndExceptionReport(t *testing.T) {
	adapter := testAdapter()
	organizationID := "org-claims"
	unsupported, err := adapter.Map(Input{
		OrganizationID: organizationID,
		RecordType:     Claim,
		Fields: map[string]string{
			"claim_number": "CLM-1", "insured_name": "Customer A", "claim_date": "2026-02-01",
			"amount": "1250000", "currency": "RWF",
		},
		Evidence: proof("claim-1", "CLM-1", 1250000, "RWF"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if !contains(unsupported.QualityFlags, "unsupported-claim") || unsupported.Events[0].Type != eventledger.ObligationCreated {
		t.Fatalf("unsupported claim was not routed for approval: %+v", unsupported)
	}

	approved, err := adapter.Map(Input{
		OrganizationID: organizationID,
		RecordType:     Claim,
		Fields: map[string]string{
			"claim_number": "CLM-2", "insured_name": "Customer B", "claim_date": "2026-02-02",
			"amount": "500000", "currency": "RWF", "approval_task_id": "task-claim-2",
		},
		Evidence: proof("claim-2", "CLM-2", 500000, "RWF"),
	})
	if err != nil {
		t.Fatal(err)
	}
	payout, err := adapter.Map(Input{
		OrganizationID: organizationID,
		RecordType:     ClaimPayment,
		Fields: map[string]string{
			"reference": "CLM-2", "claim_number": "CLM-2", "date": "2026-02-02",
			"amount": "-500000", "currency": "RWF", "party_name": "Customer B",
		},
		Evidence: proof("payout-1", "CLM-2", -500000, "RWF"),
	})
	if err != nil {
		t.Fatal(err)
	}
	bankCharge, err := adapter.Map(Input{
		OrganizationID: organizationID,
		RecordType:     BankCharge,
		Fields: map[string]string{
			"reference": "BANK-1", "date": "2026-02-03", "amount": "-5000",
			"currency": "RWF", "party_name": "Example Bank",
		},
		Evidence: proof("charge-1", "BANK-1", -5000, "RWF"),
	})
	if err != nil {
		t.Fatal(err)
	}

	mappings := []Mapping{unsupported, approved, payout, bankCharge}
	reconciled, err := ReconcileEvents(organizationID, mappings, policy.DefaultInsurance(organizationID))
	if err != nil {
		t.Fatal(err)
	}
	report, err := BuildExceptionReport(organizationID, mappings, reconciled)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.UnsupportedClaims) != 1 || report.UnsupportedClaims[0].Evidence.TransactionReference != "CLM-1" {
		t.Fatalf("unsupported claim report is wrong: %+v", report.UnsupportedClaims)
	}
	if len(report.UnmatchedPayments) != 1 || report.UnmatchedPayments[0].Evidence.TransactionReference != "BANK-1" {
		t.Fatalf("unmatched payment report is wrong: %+v", report.UnmatchedPayments)
	}
	if len(report.ApprovalTaskIDs) != 1 || report.ApprovalTaskIDs[0] != "task-claim-2" {
		t.Fatalf("approval links are wrong: %+v", report.ApprovalTaskIDs)
	}
}

func TestInsurancePaymentCategoriesRemainGenericAndValidated(t *testing.T) {
	adapter := testAdapter()
	for index, recordType := range []RecordType{Commission, SupplierPayment, BankCharge, Refund} {
		fields := map[string]string{
			"reference": string(recordType) + "-1", "date": "2026-03-01", "amount": "-1000",
			"currency": "RWF", "party_name": "Counterparty",
		}
		if recordType == Refund {
			fields["direction"] = "sent"
		}
		mapped, err := adapter.Map(Input{
			OrganizationID: "org-payments", RecordType: recordType, Fields: fields,
			Evidence: proof(fmt.Sprintf("payment-%d", index), fields["reference"], -1000, "RWF"),
		})
		if err != nil {
			t.Fatalf("%s: %v", recordType, err)
		}
		if mapped.Events[0].Type != eventledger.PaymentSent || mapped.Events[0].Attributes["category"] != string(recordType) {
			t.Fatalf("%s did not map to a generic payment: %+v", recordType, mapped.Events[0])
		}
	}
	if _, err := adapter.Map(Input{
		OrganizationID: "org-payments", RecordType: Commission,
		Fields:   map[string]string{"reference": "COM-2", "date": "2026-03-01", "amount": "1000", "currency": "RWF", "party_name": "Broker"},
		Evidence: proof("invalid-sign", "COM-2", 1000, "RWF"),
	}); err == nil {
		t.Fatal("positive outgoing commission should be rejected")
	}
}

func TestInsuranceMappingIsIdempotent(t *testing.T) {
	adapter := testAdapter()
	input := Input{
		OrganizationID: "org-a", RecordType: Premium,
		Fields:   map[string]string{"policy_number": "POL-1", "payment_date": "2026-01-01", "amount": "100", "currency": "RWF", "payer_name": "A"},
		Evidence: proof("premium-idempotent", "POL-1", 100, "RWF"),
	}
	first, err := adapter.Map(input)
	if err != nil {
		t.Fatal(err)
	}
	second, err := adapter.Map(input)
	if err != nil {
		t.Fatal(err)
	}
	if !first.Created || second.Created || first.Events[0].ID != second.Events[0].ID {
		t.Fatalf("insurance mapping replay was not idempotent: first=%+v second=%+v", first, second)
	}
	if first.ID == "" || first.ID != second.ID {
		t.Fatalf("insurance mapping ID must be stable across replay: first=%q second=%q", first.ID, second.ID)
	}
}

func testAdapter() *Adapter {
	return NewAdapter(normalization.NewService(entities.NewResolver(), eventledger.NewStore()))
}

func proof(sourceRecord, reference string, amount int64, currency string) evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID: "doc-" + sourceRecord, SourceRecordID: sourceRecord,
		IngestionBatchID: "batch-1", ExtractionVersionID: "version-1",
		TransactionReference: reference, OccurredOn: "2026-01-01",
		AmountMinor: amount, Currency: currency, Reason: "insurance adapter test",
		ConfidenceScore: .99, ConfidenceMethod: "fixture",
	}
}
