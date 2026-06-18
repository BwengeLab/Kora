package evidence

import "testing"

func TestValidateRequiresSourceDocument(t *testing.T) {
	err := Validate(Evidence{SourceRecordID: "row-1", Reason: "matched reference", ConfidenceScore: 0.9})
	if err == nil {
		t.Fatal("expected missing source document to fail")
	}
}

func TestValidateAcceptsCompleteEvidence(t *testing.T) {
	err := Validate(Evidence{SourceDocumentID: "doc-1", SourceRecordID: "row-1", Reason: "matched reference", ConfidenceScore: 0.9})
	if err != nil {
		t.Fatalf("expected valid evidence, got %v", err)
	}
}

