package reconciliation

import (
	"encoding/json"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/policy"
	"os"
	"path/filepath"
	"testing"
)

func TestGoldenReconciliationCases(t *testing.T) {
	var fixture struct {
		Cases []struct {
			Name             string `json:"name"`
			LeftType         string `json:"left_type"`
			RightType        string `json:"right_type"`
			Reference        string `json:"reference"`
			LeftDate         string `json:"left_date"`
			RightDate        string `json:"right_date"`
			ExpectedState    string `json:"expected_state"`
			LeftAmountMinor  int64  `json:"left_amount_minor"`
			RightAmountMinor int64  `json:"right_amount_minor"`
		} `json:"cases"`
	}
	data, err := os.ReadFile(filepath.Join("..", "..", "testdata", "labels", "reconciliation_golden.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(data, &fixture); err != nil {
		t.Fatal(err)
	}
	for _, testCase := range fixture.Cases {
		t.Run(testCase.Name, func(t *testing.T) {
			events := []eventledger.Event{
				evt("left", eventledger.EventType(testCase.LeftType), testCase.Reference, testCase.LeftAmountMinor, testCase.LeftDate),
				evt("right", eventledger.EventType(testCase.RightType), testCase.Reference, testCase.RightAmountMinor, testCase.RightDate),
			}
			result, err := Reconcile("org-1", events, policy.DefaultSME("org-1"))
			if err != nil {
				t.Fatal(err)
			}
			if len(result.Candidates) != 1 || result.Candidates[0].State != State(testCase.ExpectedState) {
				t.Fatalf("expected %s, got %+v", testCase.ExpectedState, result.Candidates)
			}
		})
	}
}

func TestExactPaymentInvoiceMatch(t *testing.T) {
	p := policy.DefaultSME("org-1")
	events := []eventledger.Event{evt("pay", eventledger.PaymentReceived, "INV-1", 1000, "2026-01-02"), evt("inv", eventledger.InvoiceIssued, "INV-1", 1000, "2026-01-02")}
	r, e := Reconcile("org-1", events, p)
	if e != nil {
		t.Fatal(e)
	}
	if r.Candidates[0].State != Matched || r.Candidates[0].Score < .95 {
		t.Fatalf("expected exact match: %+v", r.Candidates)
	}
	if len(r.Candidates) != 1 {
		t.Fatalf("expected a single non-symmetric match, got %+v", r.Candidates)
	}
}
func TestDuplicateAndSuspiciousDetection(t *testing.T) {
	p := policy.DefaultSME("org-1")
	events := []eventledger.Event{evt("p1", eventledger.PaymentReceived, "INV-1", 1000, "2026-01-02"), evt("p2", eventledger.PaymentReceived, "INV-1", 1000, "2026-01-03"), evt("inv", eventledger.InvoiceIssued, "INV-1", 9000, "2026-01-02")}
	r, e := Reconcile("org-1", events, p)
	if e != nil {
		t.Fatal(e)
	}
	seenDup, seenSusp := false, false
	for _, c := range r.Candidates {
		seenDup = seenDup || c.State == Duplicate
		seenSusp = seenSusp || c.State == Suspicious
	}
	if !seenDup || !seenSusp {
		t.Fatalf("expected duplicate and suspicious: %+v", r.Candidates)
	}
}
func TestCrossTenantDenied(t *testing.T) {
	p := policy.DefaultSME("org-1")
	_, e := Reconcile("org-1", []eventledger.Event{evt("x", eventledger.PaymentReceived, "A", 1, "2026-01-01"), {ID: "bad", OrganizationID: "org-2"}}, p)
	if e == nil {
		t.Fatal("expected tenant denial")
	}
}
func evt(id string, typ eventledger.EventType, ref string, amount int64, date string) eventledger.Event {
	return eventledger.Event{ID: id, OrganizationID: "org-1", Type: typ, Status: eventledger.Active, Evidence: evidence.Evidence{SourceDocumentID: "doc-" + id, SourceRecordID: "row-" + id, IngestionBatchID: "batch-1", ExtractionVersionID: "xver-1", TransactionReference: ref, OccurredOn: date, AmountMinor: amount, Currency: "RWF", Reason: "fixture", ConfidenceScore: .98}, Attributes: map[string]string{"party_name": "Party A"}}
}
