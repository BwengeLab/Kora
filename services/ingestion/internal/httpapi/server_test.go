package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kora-finance/kora/libs/ingestion"
)

func TestIngestDocumentEndpoint(t *testing.T) {
	server := New(ingestion.NewService(ingestion.NewMemoryStore()))
	body := []byte(`{
		"organization_id": "org-1",
		"idempotency_key": "upload-1",
		"file_name": "statement.csv",
		"content_type": "text/csv",
		"content_base64": "ZGF0ZSxhbW91bnQK",
		"extractor": "csv-fixture",
		"extracted_records": [{
			"source_record_id": "row-1",
			"record_type": "transaction",
			"fields": {"amount": "1000"},
			"confidence": 0.95
		}]
	}`)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/documents/ingest", bytes.NewReader(body))
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d: %s", http.StatusCreated, rec.Code, rec.Body.String())
	}
	var result ingestion.Result
	if err := json.NewDecoder(rec.Body).Decode(&result); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if result.Document.Fingerprint == "" {
		t.Fatal("expected fingerprint")
	}
	if len(result.SourceRecords) != 1 {
		t.Fatalf("expected one source record, got %d", len(result.SourceRecords))
	}
}

func TestEndpointRejectsInvalidContent(t *testing.T) {
	server := New(ingestion.NewService(ingestion.NewMemoryStore()))
	body := []byte(`{
		"organization_id": "org-1",
		"idempotency_key": "upload-1",
		"file_name": "statement.csv",
		"content_base64": "not-base64"
	}`)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/documents/ingest", bytes.NewReader(body))
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}
