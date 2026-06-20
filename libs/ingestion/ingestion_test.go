package ingestion

import "testing"

func TestRetryWithSameIdempotencyKeyReturnsReplay(t *testing.T) {
	service := NewService(NewMemoryStore())
	input := cleanInput("idem-1")

	first, err := service.Ingest(input)
	if err != nil {
		t.Fatalf("first ingest failed: %v", err)
	}
	second, err := service.Ingest(input)
	if err != nil {
		t.Fatalf("second ingest failed: %v", err)
	}

	if !second.Replayed {
		t.Fatal("expected retry to be marked as replay")
	}
	if second.Document.ID != first.Document.ID {
		t.Fatalf("expected replay to return same document id, got %q and %q", first.Document.ID, second.Document.ID)
	}
	if len(second.SourceRecords) != 1 {
		t.Fatalf("expected replayed result to keep source records, got %d", len(second.SourceRecords))
	}
}

func TestSameFileWithDifferentKeyReturnsDuplicateSource(t *testing.T) {
	service := NewService(NewMemoryStore())
	first, err := service.Ingest(cleanInput("idem-1"))
	if err != nil {
		t.Fatalf("first ingest failed: %v", err)
	}

	secondInput := cleanInput("idem-2")
	second, err := service.Ingest(secondInput)
	if err != nil {
		t.Fatalf("second ingest failed: %v", err)
	}

	if !second.DuplicateSource {
		t.Fatal("expected duplicate source to be detected")
	}
	if second.Document.ID != first.Document.ID {
		t.Fatalf("expected duplicate upload to resolve to original document, got %q and %q", first.Document.ID, second.Document.ID)
	}
	if second.ExtractionVersion.Version != 1 {
		t.Fatalf("duplicate upload without reprocess should not create a new version, got %d", second.ExtractionVersion.Version)
	}
}

func TestForceReprocessCreatesNewExtractionVersion(t *testing.T) {
	service := NewService(NewMemoryStore())
	first, err := service.Ingest(cleanInput("idem-1"))
	if err != nil {
		t.Fatalf("first ingest failed: %v", err)
	}

	reprocess := cleanInput("idem-2")
	reprocess.ForceReprocess = true
	reprocess.ExtractedRecords[0].Confidence = 0.65
	second, err := service.Ingest(reprocess)
	if err != nil {
		t.Fatalf("reprocess failed: %v", err)
	}

	if !second.Reprocessed {
		t.Fatal("expected reprocess flag")
	}
	if second.Document.ID != first.Document.ID {
		t.Fatalf("expected reprocess to use existing document, got %q and %q", first.Document.ID, second.Document.ID)
	}
	if second.ExtractionVersion.Version != 2 {
		t.Fatalf("expected extraction version 2, got %d", second.ExtractionVersion.Version)
	}
	assertHasFlag(t, second.SourceRecords[0].QualityFlags, QualityLowConfidence)
}

func TestIdempotencyKeyCannotBeReusedWithDifferentContent(t *testing.T) {
	service := NewService(NewMemoryStore())
	if _, err := service.Ingest(cleanInput("idem-1")); err != nil {
		t.Fatalf("first ingest failed: %v", err)
	}

	input := cleanInput("idem-1")
	input.Content = []byte("different content")
	if _, err := service.Ingest(input); err == nil {
		t.Fatal("expected reused key with different content to fail")
	}
}

func TestMissingDocumentIsFlaggedBeforeTrustedOutput(t *testing.T) {
	service := NewService(NewMemoryStore())
	input := cleanInput("idem-1")
	input.Content = nil
	input.ExtractedRecords = nil

	result, err := service.Ingest(input)
	if err != nil {
		t.Fatalf("ingest failed: %v", err)
	}

	assertHasFlag(t, result.ExtractionVersion.QualityFlags, QualityMissingDoc)
	assertHasFlag(t, result.ExtractionVersion.QualityFlags, QualityNeedsReview)
}

func cleanInput(idempotencyKey string) IngestInput {
	return IngestInput{
		OrganizationID: "org-1",
		IdempotencyKey: idempotencyKey,
		FileName:       "statement.csv",
		ContentType:    "text/csv",
		Content:        []byte("date,amount,reference\n2026-06-01,1000,INV-1\n"),
		Extractor:      "csv-fixture",
		ExtractedRecords: []ExtractedRecordInput{
			{
				SourceRecordID: "row-1",
				RecordType:     "transaction",
				Fields: map[string]string{
					"date":      "2026-06-01",
					"amount":    "1000",
					"reference": "INV-1",
				},
				Confidence: 0.98,
			},
		},
	}
}

func assertHasFlag(t *testing.T, flags []string, expected string) {
	t.Helper()
	for _, flag := range flags {
		if flag == expected {
			return
		}
	}
	t.Fatalf("expected flags %v to include %q", flags, expected)
}
