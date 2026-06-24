package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/normalization"
	insurance "github.com/kora-finance/kora/verticals/insurance"
)

func TestMapBrokerAndReplayThroughAPI(t *testing.T) {
	server := testServer()
	input := insurance.Input{
		OrganizationID: "org-api",
		RecordType:     insurance.Broker,
		Fields: map[string]string{
			"broker_code": "BRK-API", "broker_name": "API Brokers",
		},
		Evidence: apiProof("broker-api", "BRK-API"),
	}
	first := post(t, server, "/v1/insurance/map", input)
	if first.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", first.Code, first.Body.String())
	}
	second := post(t, server, "/v1/insurance/map", input)
	if second.Code != http.StatusOK {
		t.Fatalf("expected replay 200, got %d: %s", second.Code, second.Body.String())
	}
	var body insurance.Mapping
	if err := json.Unmarshal(first.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.RelatedIDs["broker_external_party_id"] == "" {
		t.Fatalf("broker link missing: %+v", body)
	}
}

func TestTemplatesExposeEverySupportedInsuranceRecord(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/v1/insurance/templates", nil)
	response := httptest.NewRecorder()
	testServer().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", response.Code)
	}
	var body struct {
		Templates []insurance.ImportTemplate `json:"templates"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Templates) != 9 {
		t.Fatalf("expected nine import templates, got %d", len(body.Templates))
	}
}

func TestUnknownFieldsAndCrossTenantReconciliationAreRejected(t *testing.T) {
	request := httptest.NewRequest(
		http.MethodPost,
		"/v1/insurance/map",
		bytes.NewBufferString(`{"organization_id":"org-api","unexpected":true}`),
	)
	response := httptest.NewRecorder()
	testServer().ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("unknown field should be rejected, got %d", response.Code)
	}

	response = post(t, testServer(), "/v1/insurance/reconcile", map[string]any{
		"organization_id": "org-a",
		"mappings":        []insurance.Mapping{{OrganizationID: "org-b"}},
		"policy":          map[string]any{},
	})
	if response.Code != http.StatusBadRequest {
		t.Fatalf("cross-tenant reconciliation should be rejected, got %d", response.Code)
	}
}

func testServer() *Server {
	normalizer := normalization.NewService(entities.NewResolver(), eventledger.NewStore())
	return New(insurance.NewAdapter(normalizer))
}

func post(t *testing.T, server http.Handler, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(payload))
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	return response
}

func apiProof(recordID, reference string) evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID: "doc-" + recordID, SourceRecordID: recordID,
		IngestionBatchID: "batch-api", ExtractionVersionID: "version-api",
		TransactionReference: reference, Reason: "insurance API test",
		ConfidenceScore: .99,
	}
}
