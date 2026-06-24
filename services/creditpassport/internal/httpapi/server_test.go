package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/consent"
	"github.com/kora-finance/kora/libs/creditpassport"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestCreditPassportGenerateReplayAndReadAPI(t *testing.T) {
	server := New(creditpassport.NewStore(), consent.NewStore())
	body := map[string]any{
		"actor": access.Actor{UserID: "lead", OrganizationID: "org-1", Roles: []access.Role{access.RoleFinanceLead}},
		"input": apiPassportInput(),
	}
	response := perform(t, server, "/v1/credit-passports", body)
	if response.Code != http.StatusCreated {
		t.Fatalf("passport generation failed: %d %s", response.Code, response.Body.String())
	}
	var passport creditpassport.Passport
	if err := json.Unmarshal(response.Body.Bytes(), &passport); err != nil {
		t.Fatal(err)
	}
	response = perform(t, server, "/v1/credit-passports", body)
	if response.Code != http.StatusOK {
		t.Fatalf("passport replay should be idempotent: %d %s", response.Code, response.Body.String())
	}
	readBody := map[string]any{
		"actor":           access.Actor{UserID: "auditor", OrganizationID: "org-1", Roles: []access.Role{access.RoleAuditorCompliance}},
		"organization_id": "org-1",
	}
	response = perform(t, server, "/v1/credit-passports/"+passport.ID+"/read", readBody)
	if response.Code != http.StatusOK {
		t.Fatalf("passport read failed: %d %s", response.Code, response.Body.String())
	}
}

func TestCreditPassportAPIRejectsUnknownFields(t *testing.T) {
	response := perform(t, New(creditpassport.NewStore(), consent.NewStore()), "/v1/credit-passports", map[string]any{"unknown": true})
	if response.Code != http.StatusBadRequest {
		t.Fatalf("unknown field must be rejected: %d", response.Code)
	}
}

func apiPassportInput() creditpassport.Input {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)
	proof := apiPassportProof("payment", 1000)
	event := eventledger.Event{
		ID: "payment", OrganizationID: "org-1", Type: eventledger.PaymentReceived,
		Status: eventledger.Active, Evidence: proof, Attributes: map[string]string{},
	}
	taskProof := apiPassportProof("posting", 1000)
	task := workflow.Task{
		ID: "task", OrganizationID: "org-1", State: workflow.Executed,
		AmountMinor: 1000, Currency: "RWF", Evidence: taskProof,
	}
	accounts := []ledger.Account{
		{ID: "bank", OrganizationID: "org-1", Code: "1000", Name: "Bank", Type: ledger.Asset, Currency: "RWF"},
		{ID: "revenue", OrganizationID: "org-1", Code: "4000", Name: "Revenue", Type: ledger.Revenue, Currency: "RWF"},
	}
	group := ledger.Group{
		ID: "posting", OrganizationID: "org-1", ApprovalTaskID: task.ID, CreatedAt: end,
		Entries: []ledger.Entry{
			{ID: "entry-1", OrganizationID: "org-1", AccountID: "bank", DebitMinor: 1000, Currency: "RWF", PostingGroupID: "posting", ApprovalTaskID: task.ID, Evidence: taskProof},
			{ID: "entry-2", OrganizationID: "org-1", AccountID: "revenue", CreditMinor: 1000, Currency: "RWF", PostingGroupID: "posting", ApprovalTaskID: task.ID, Evidence: taskProof},
		},
	}
	return creditpassport.Input{
		OrganizationID: "org-1", PeriodStart: start, PeriodEnd: end, AsOf: end,
		Events:   []eventledger.EventView{{Event: event, EffectiveStatus: eventledger.Active}},
		Accounts: accounts, ApprovalTasks: []workflow.Task{task}, PostingGroups: []ledger.Group{group},
		Policy: creditpassport.AffordabilityPolicy{
			ID: "policy", OrganizationID: "org-1", Version: 1, Currency: "RWF",
			MaxDebtServiceBasisPoints: 4000, StressBufferBasisPoints: 1000,
			TermMonths: 12, Evidence: apiPassportProof("policy", 0),
		},
	}
}

func apiPassportProof(source string, amount int64) evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID: "doc-" + source, SourceRecordID: "record-" + source,
		IngestionBatchID: "batch-1", ExtractionVersionID: "version-1",
		OccurredOn: "2026-01-15", AmountMinor: amount, Currency: "RWF",
		Reason: "credit passport API test", ConfidenceScore: 1, ConfidenceMethod: "fixture",
	}
}

func perform(t *testing.T, server http.Handler, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	encoded, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(encoded))
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	return response
}
