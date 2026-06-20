package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kora-finance/kora/libs/corrections"
	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/ingestion"
	"github.com/kora-finance/kora/libs/normalization"
)

func TestNormalizeQueryAndReverseWorkflow(t *testing.T) {
	server := New(normalization.NewService(entities.NewResolver(), eventledger.NewStore()))
	input := normalization.Input{
		IngestionBatchID: "batch-1",
		Record: ingestion.SourceRecord{
			ID:                  "src-1",
			OrganizationID:      "org-1",
			DocumentID:          "doc-1",
			ExtractionVersionID: "xver-1",
			SourceRecordID:      "row-1",
			RecordType:          "invoice",
			Fields: map[string]string{
				"date": "2026-06-01", "reference": "INV-1", "amount": "1000", "currency": "RWF", "party_name": "Kigali Brokers",
			},
			Confidence:   0.98,
			QualityFlags: []string{ingestion.QualityComplete},
			SourceLocation: ingestion.SourceLocation{
				RowNumber: 2,
			},
		},
	}
	body, _ := json.Marshal(input)
	response := httptest.NewRecorder()
	server.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/v1/normalize", bytes.NewReader(body)))
	if response.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d %s", response.Code, response.Body.String())
	}
	var normalized normalization.Result
	if err := json.Unmarshal(response.Body.Bytes(), &normalized); err != nil {
		t.Fatal(err)
	}

	correction := corrections.Event{
		OrganizationID:  "org-1",
		Type:            corrections.EventReversed,
		OriginalEventID: normalized.Event.ID,
		Evidence:        normalized.Event.Evidence,
		Reason:          "invoice uploaded in error",
	}
	correctionBody, _ := json.Marshal(correction)
	correctionResponse := httptest.NewRecorder()
	server.ServeHTTP(correctionResponse, httptest.NewRequest(http.MethodPost, "/v1/events/corrections", bytes.NewReader(correctionBody)))
	if correctionResponse.Code != http.StatusCreated {
		t.Fatalf("expected correction 201, got %d %s", correctionResponse.Code, correctionResponse.Body.String())
	}

	getResponse := httptest.NewRecorder()
	getURL := "/v1/events/get?organization_id=org-1&event_id=" + normalized.Event.ID
	server.ServeHTTP(getResponse, httptest.NewRequest(http.MethodGet, getURL, nil))
	if getResponse.Code != http.StatusOK {
		t.Fatalf("expected event 200, got %d %s", getResponse.Code, getResponse.Body.String())
	}
	var view eventledger.EventView
	if err := json.Unmarshal(getResponse.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if view.Status != eventledger.Active || view.EffectiveStatus != eventledger.Reversed {
		t.Fatalf("expected preserved original and derived reversal, got %+v", view)
	}
}

func TestNormalizeReplayReturnsOK(t *testing.T) {
	server := New(normalization.NewService(entities.NewResolver(), eventledger.NewStore()))
	input := normalization.Input{IngestionBatchID: "batch-1", Record: ingestion.SourceRecord{
		ID: "src-1", OrganizationID: "org-1", DocumentID: "doc-1", ExtractionVersionID: "xver-1", SourceRecordID: "row-1", RecordType: "payment",
		Fields: map[string]string{"date": "2026-06-01", "reference": "PAY-1", "amount": "1000", "currency": "RWF"}, Confidence: 0.98, QualityFlags: []string{ingestion.QualityComplete},
	}}
	body, _ := json.Marshal(input)
	first := httptest.NewRecorder()
	server.ServeHTTP(first, httptest.NewRequest(http.MethodPost, "/v1/normalize", bytes.NewReader(body)))
	second := httptest.NewRecorder()
	server.ServeHTTP(second, httptest.NewRequest(http.MethodPost, "/v1/normalize", bytes.NewReader(body)))
	if first.Code != http.StatusCreated || second.Code != http.StatusOK {
		t.Fatalf("expected create then replay, got %d and %d", first.Code, second.Code)
	}
}
