package eventledger

import (
	"testing"

	"github.com/kora-finance/kora/libs/corrections"
	"github.com/kora-finance/kora/libs/evidence"
)

func TestAppendIsIdempotentBySourceProvenance(t *testing.T) {
	store := NewStore()
	first, err := store.Append(testEvent("org-a", "row-1"))
	if err != nil || !first.Created {
		t.Fatalf("expected event creation, created=%v err=%v", first.Created, err)
	}
	replayed := testEvent("org-a", "row-1")
	replayed.Type = InvoiceIssued
	second, err := store.Append(replayed)
	if err != nil {
		t.Fatal(err)
	}
	if second.Created || second.Event.ID != first.Event.ID {
		t.Fatal("expected provenance replay to return original event")
	}
}

func TestReversalPreservesOriginalAndDerivesEffectiveStatus(t *testing.T) {
	store := NewStore()
	created, _ := store.Append(testEvent("org-a", "row-1"))
	if _, err := store.Reverse("org-a", created.Event.ID, testEvidence("row-correction"), "wrong source amount"); err != nil {
		t.Fatal(err)
	}
	view, err := store.Get("org-a", created.Event.ID)
	if err != nil {
		t.Fatal(err)
	}
	if view.Event.Status != Active || view.EffectiveStatus != Reversed {
		t.Fatalf("expected immutable active original and reversed effective state, got %+v", view)
	}
	if len(view.Corrections) != 1 || view.Corrections[0].Type != corrections.EventReversed {
		t.Fatalf("expected reversal stream, got %+v", view.Corrections)
	}
	if _, err := store.Reverse("org-a", created.Event.ID, testEvidence("row-correction-2"), "duplicate reversal"); err == nil {
		t.Fatal("expected duplicate reversal to fail")
	}
}

func TestAdjustmentRequiresExistingSameTenantReplacement(t *testing.T) {
	store := NewStore()
	original, _ := store.Append(testEvent("org-a", "row-1"))
	replacement := testEvent("org-a", "row-2")
	replacement.Attributes["amount"] = "2000"
	replacementResult, _ := store.Append(replacement)

	_, err := store.AppendCorrection(corrections.Event{
		OrganizationID:     "org-a",
		Type:               corrections.EventAdjusted,
		OriginalEventID:    original.Event.ID,
		ReplacementEventID: replacementResult.Event.ID,
		Evidence:           testEvidence("row-adjustment"),
		Reason:             "corrected amount",
	})
	if err != nil {
		t.Fatal(err)
	}
	view, _ := store.Get("org-a", original.Event.ID)
	if view.EffectiveStatus != Adjusted {
		t.Fatalf("expected adjusted status, got %s", view.EffectiveStatus)
	}
}

func TestTenantCannotReadOrCorrectAnotherTenantEvent(t *testing.T) {
	store := NewStore()
	created, _ := store.Append(testEvent("org-a", "row-1"))
	if _, err := store.Get("org-b", created.Event.ID); err == nil {
		t.Fatal("expected cross-tenant read to fail")
	}
	if _, err := store.Reverse("org-b", created.Event.ID, testEvidence("row-correction"), "unauthorized"); err == nil {
		t.Fatal("expected cross-tenant reversal to fail")
	}
}

func testEvent(organizationID string, sourceRecordID string) Event {
	return Event{
		OrganizationID: organizationID,
		Type:           PaymentReceived,
		Evidence:       testEvidence(sourceRecordID),
		Attributes:     map[string]string{"amount": "1000", "currency": "RWF"},
	}
}

func testEvidence(sourceRecordID string) evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID:    "doc-1",
		SourceRecordID:      sourceRecordID,
		SourceRecordDBID:    "src-1",
		IngestionBatchID:    "batch-1",
		ExtractionVersionID: "xver-1",
		Reason:              "normalized extracted record",
		ConfidenceScore:     0.98,
	}
}
