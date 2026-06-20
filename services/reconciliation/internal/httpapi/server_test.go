package httpapi

import (
	"bytes"
	"encoding/json"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/policy"
	"github.com/kora-finance/kora/libs/reconciliation"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestReconcileHTTP(t *testing.T) {
	p := policy.DefaultSME("org-1")
	events := []eventledger.Event{event("pay", eventledger.PaymentReceived), event("inv", eventledger.InvoiceIssued)}
	body, _ := json.Marshal(map[string]any{"organization_id": "org-1", "events": events, "policy": p})
	res := httptest.NewRecorder()
	New().ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/v1/reconcile", bytes.NewReader(body)))
	if res.Code != 200 {
		t.Fatalf("got %d %s", res.Code, res.Body.String())
	}
	var out reconciliation.Result
	_ = json.Unmarshal(res.Body.Bytes(), &out)
	if len(out.Candidates) == 0 || out.Candidates[0].State != reconciliation.Matched {
		t.Fatalf("unexpected %+v", out)
	}
}
func event(id string, typ eventledger.EventType) eventledger.Event {
	return eventledger.Event{ID: id, OrganizationID: "org-1", Type: typ, Status: eventledger.Active, Evidence: evidence.Evidence{SourceDocumentID: "doc-" + id, SourceRecordID: "row-1", IngestionBatchID: "batch", ExtractionVersionID: "xver", TransactionReference: "INV-1", OccurredOn: "2026-01-01", AmountMinor: 1000, Currency: "RWF", Reason: "test", ConfidenceScore: .98}, Attributes: map[string]string{"party_name": "Party"}}
}
