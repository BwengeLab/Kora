package normalization

import (
	"testing"

	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/ingestion"
)

func TestNormalizeCreatesGenericPaymentEventAndEntities(t *testing.T) {
	service := NewService(entities.NewResolver(), eventledger.NewStore())
	result, err := service.Normalize(Input{IngestionBatchID: "batch-1", Record: sourceRecord("payment")})
	if err != nil {
		t.Fatal(err)
	}
	if result.Event.Type != eventledger.PaymentReceived {
		t.Fatalf("expected payment received, got %s", result.Event.Type)
	}
	if result.Event.ExternalPartyID == "" || result.Event.SourceEntityID == "" {
		t.Fatalf("expected resolved party and payment entities, got %+v", result.Event.RelatedEntityIDs)
	}
	if result.Event.Evidence.SourceRecordDBID != "src-1" || result.Event.Evidence.ExtractionVersionID != "xver-1" {
		t.Fatalf("expected complete provenance, got %+v", result.Event.Evidence)
	}
}

func TestInsuranceTermsMapToGenericEventsAndCategoryMetadata(t *testing.T) {
	service := NewService(entities.NewResolver(), eventledger.NewStore())
	premium := sourceRecord("premium")
	premiumResult, err := service.Normalize(Input{IngestionBatchID: "batch-1", Record: premium})
	if err != nil {
		t.Fatal(err)
	}
	if premiumResult.Event.Type != eventledger.PaymentReceived || premiumResult.Event.Attributes["category"] != "premium" {
		t.Fatalf("premium polluted generic taxonomy: %+v", premiumResult.Event)
	}

	claim := sourceRecord("claim")
	claim.ID = "src-2"
	claim.SourceRecordID = "row-2"
	claim.Fields["reference"] = "CLM-1"
	claimResult, err := service.Normalize(Input{IngestionBatchID: "batch-1", Record: claim})
	if err != nil {
		t.Fatal(err)
	}
	if claimResult.Event.Type != eventledger.ObligationCreated || claimResult.Event.Attributes["category"] != "claim" {
		t.Fatalf("claim polluted generic taxonomy: %+v", claimResult.Event)
	}
}

func TestNormalizeRejectsRecordsThatNeedReview(t *testing.T) {
	service := NewService(entities.NewResolver(), eventledger.NewStore())
	record := sourceRecord("payment")
	record.QualityFlags = []string{ingestion.QualityLowConfidence, ingestion.QualityNeedsReview}
	if _, err := service.Normalize(Input{IngestionBatchID: "batch-1", Record: record}); err == nil {
		t.Fatal("expected untrusted source record to be rejected")
	}
}

func TestNormalizeRequiresExplicitCompleteQuality(t *testing.T) {
	service := NewService(entities.NewResolver(), eventledger.NewStore())
	record := sourceRecord("payment")
	record.QualityFlags = nil
	if _, err := service.Normalize(Input{IngestionBatchID: "batch-1", Record: record}); err == nil {
		t.Fatal("expected record without complete quality to be rejected")
	}
}

func TestNormalizeIsReplaySafe(t *testing.T) {
	service := NewService(entities.NewResolver(), eventledger.NewStore())
	input := Input{IngestionBatchID: "batch-1", Record: sourceRecord("invoice")}
	first, _ := service.Normalize(input)
	second, err := service.Normalize(input)
	if err != nil {
		t.Fatal(err)
	}
	if !first.Created || second.Created || first.Event.ID != second.Event.ID {
		t.Fatal("expected normalization replay to return the original event")
	}
}

func TestParseMinorUnitsIsExact(t *testing.T) {
	minor, err := parseMinorUnits("12.34", 2)
	if err != nil || minor != 1234 {
		t.Fatalf("expected 1234, got %d err=%v", minor, err)
	}
	if _, err := parseMinorUnits("12.345", 2); err == nil {
		t.Fatal("expected excess currency precision to fail")
	}
}

func sourceRecord(recordType string) ingestion.SourceRecord {
	return ingestion.SourceRecord{
		ID:                  "src-1",
		OrganizationID:      "org-1",
		DocumentID:          "doc-1",
		ExtractionVersionID: "xver-1",
		SourceRecordID:      "row-1",
		RecordType:          recordType,
		Fields: map[string]string{
			"date":       "2026-06-01",
			"reference":  "PAY-1",
			"amount":     "1000",
			"currency":   "RWF",
			"party_name": "Kigali Brokers",
		},
		Confidence:   0.98,
		QualityFlags: []string{ingestion.QualityComplete},
		SourceLocation: ingestion.SourceLocation{
			RowNumber: 2,
		},
	}
}
