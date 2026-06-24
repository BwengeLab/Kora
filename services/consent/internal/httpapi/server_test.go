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
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestConsentGrantLifecycleAPI(t *testing.T) {
	store := consent.NewStore()
	server := New(store)
	now := time.Now().UTC()
	proof := apiProof("grant")
	body := map[string]any{
		"actor": access.Actor{UserID: "owner", OrganizationID: "org-1", Roles: []access.Role{access.RoleOrganizationOwner}},
		"grant": consent.Grant{
			OrganizationID: "org-1", ExternalUserID: "lender", RecipientPartyID: "party-lender",
			AllowedDataCategories: []string{"credit_passport"},
			AllowedPermissions:    []access.Permission{access.PermissionReadCreditPassport},
			PeriodStart:           now.AddDate(-1, 0, 0), PeriodEnd: now,
			ExpiresAt: now.Add(24 * time.Hour), Purpose: "credit review", Evidence: proof,
		},
		"approval": workflow.Task{
			ID: "approval-1", OrganizationID: "org-1", SuggestedAction: "grant_external_access",
			CreatorUserID: "admin", State: workflow.Approved, RequiredApprovers: 1,
			ApproverUserIDs: []string{"owner"}, Evidence: proof,
		},
	}
	response := performJSON(t, server, http.MethodPost, "/v1/consent/grants", body)
	if response.Code != http.StatusCreated {
		t.Fatalf("grant create failed: %d %s", response.Code, response.Body.String())
	}
	var grant consent.Grant
	if err := json.Unmarshal(response.Body.Bytes(), &grant); err != nil {
		t.Fatal(err)
	}
	if grant.ID == "" || grant.ApprovalTaskID != "approval-1" {
		t.Fatalf("created grant lost approval link: %+v", grant)
	}

	revoke := map[string]any{
		"actor":           access.Actor{UserID: "owner", OrganizationID: "org-1", Roles: []access.Role{access.RoleOrganizationOwner}},
		"organization_id": "org-1", "evidence": apiProof("revoke"),
	}
	response = performJSON(t, server, http.MethodPost, "/v1/consent/grants/"+grant.ID+"/revoke", revoke)
	if response.Code != http.StatusOK {
		t.Fatalf("grant revoke failed: %d %s", response.Code, response.Body.String())
	}
}

func TestConsentAPIRejectsUnknownFieldsAndLogsDeniedAccess(t *testing.T) {
	server := New(consent.NewStore())
	response := performJSON(t, server, http.MethodPost, "/v1/consent/authorize", map[string]any{"unknown": true})
	if response.Code != http.StatusBadRequest {
		t.Fatalf("unknown field must be rejected: %d", response.Code)
	}
	response = performJSON(t, server, http.MethodPost, "/v1/consent/authorize", consent.AccessRequest{
		GrantID: "missing", ExternalActor: access.Actor{
			UserID: "external", OrganizationID: "org-1", Roles: []access.Role{access.RoleExternalCollaborator},
		},
		Permission: access.PermissionReadReports, DataCategory: "reports",
		PeriodStart: time.Now().Add(-time.Hour), PeriodEnd: time.Now(), Resource: "report-1",
	})
	if response.Code != http.StatusForbidden || !bytes.Contains(response.Body.Bytes(), []byte(`"allowed":false`)) {
		t.Fatalf("denied access must return its audit record: %d %s", response.Code, response.Body.String())
	}
}

func TestConsentTemplatesAPI(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/v1/consent/templates", nil)
	response := httptest.NewRecorder()
	New(consent.NewStore()).ServeHTTP(response, request)
	if response.Code != http.StatusOK || !bytes.Contains(response.Body.Bytes(), []byte(`"lender"`)) {
		t.Fatalf("templates unavailable: %d %s", response.Code, response.Body.String())
	}
}

func performJSON(t *testing.T, server http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	encoded, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(method, path, bytes.NewReader(encoded))
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	return response
}

func apiProof(source string) evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID: "doc-" + source, SourceRecordID: "record-" + source,
		IngestionBatchID: "batch-1", ExtractionVersionID: "version-1",
		Reason: "consent API test", ConfidenceScore: 1, ConfidenceMethod: "human",
	}
}
