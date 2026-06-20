package corrections

import (
	"testing"

	"github.com/kora-finance/kora/libs/evidence"
)

func TestValidateRequiresOriginalForReversal(t *testing.T) {
	err := Validate(Event{ID: "cor-1", OrganizationID: "org-1", Type: EventReversed, Reason: "wrong upload", Evidence: validEvidence()})
	if err == nil {
		t.Fatal("expected reversal without original event to fail")
	}
}

func TestValidateAllowsCreatedWithoutOriginal(t *testing.T) {
	err := Validate(Event{ID: "cor-1", OrganizationID: "org-1", Type: EventCreated, Reason: "new event", Evidence: validEvidence()})
	if err != nil {
		t.Fatalf("expected created event to pass, got %v", err)
	}
}

func TestValidateAdjustmentRequiresReplacement(t *testing.T) {
	err := Validate(Event{ID: "cor-1", OrganizationID: "org-1", Type: EventAdjusted, OriginalEventID: "evt-1", Reason: "correct amount", Evidence: validEvidence()})
	if err == nil {
		t.Fatal("expected adjustment without replacement to fail")
	}
}

func validEvidence() evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID:    "doc-1",
		SourceRecordID:      "row-1",
		IngestionBatchID:    "batch-1",
		ExtractionVersionID: "xver-1",
		Reason:              "source correction",
		ConfidenceScore:     1,
	}
}
