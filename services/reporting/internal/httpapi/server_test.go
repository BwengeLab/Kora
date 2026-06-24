package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/reporting"
)

func TestGenerateReportEndpoint(t *testing.T) {
	body := map[string]any{
		"actor": access.Actor{
			UserID: "operator", OrganizationID: "org-1",
			Roles: []access.Role{access.RoleFinanceOperator},
		},
		"input": reporting.Input{OrganizationID: "org-1"},
	}
	response := perform(t, body)
	if response.Code != http.StatusOK {
		t.Fatalf("expected report, got %d: %s", response.Code, response.Body.String())
	}
	var report reporting.Report
	if err := json.Unmarshal(response.Body.Bytes(), &report); err != nil {
		t.Fatal(err)
	}
	if report.OrganizationID != "org-1" || report.ID == "" {
		t.Fatalf("invalid report response: %+v", report)
	}
}

func TestGenerateReportEndpointRejectsUnknownFieldsAndUnauthorizedROI(t *testing.T) {
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/v1/reports/generate", bytes.NewBufferString(`{"unknown":true}`))
	New().ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("unknown request field must be rejected: %d", response.Code)
	}

	body := map[string]any{
		"actor": access.Actor{
			UserID: "operator", OrganizationID: "org-1",
			Roles: []access.Role{access.RoleFinanceOperator},
		},
		"input": reporting.Input{OrganizationID: "org-1", IncludeROI: true},
	}
	response = perform(t, body)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("unauthorized ROI must be rejected: %d", response.Code)
	}
}

func perform(t *testing.T, body any) *httptest.ResponseRecorder {
	t.Helper()
	encoded, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/v1/reports/generate", bytes.NewReader(encoded))
	New().ServeHTTP(response, request)
	return response
}
