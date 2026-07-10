package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPortalCreditPassportRequiresActiveConsent(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}

	externalToken := demoRoleToken(t, server, roleIDExternalCollaborator)
	if response := gatewayRequest(server, http.MethodGet, "/api/portal/credit-passport", externalToken); response.Code != http.StatusOK {
		t.Fatalf("expected active consent to allow portal access, got %d: %s", response.Code, response.Body.String())
	}
	if response := gatewayRequest(server, http.MethodGet, "/api/portal/credit-passport/download", externalToken); response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-")) {
		t.Fatalf("expected consent-scoped PDF download, got status=%d content-type=%q body=%q", response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
	}

	ownerToken := demoRoleToken(t, server, roleIDOrgOwner)
	if response := gatewayRequest(server, http.MethodPost, "/api/consent/grants/cs-1/revoke", ownerToken); response.Code != http.StatusOK {
		t.Fatalf("revoke consent: got %d: %s", response.Code, response.Body.String())
	}

	if response := gatewayRequest(server, http.MethodGet, "/api/portal/credit-passport", externalToken); response.Code != http.StatusForbidden {
		t.Fatalf("expected revoked consent to deny portal access, got %d: %s", response.Code, response.Body.String())
	}
}

func TestPortalAccessRequestCanBeApproved(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	externalToken := demoRoleToken(t, server, roleIDExternalCollaborator)
	request := httptest.NewRequest(http.MethodPost, "/api/portal/access-requests", bytes.NewBufferString(`{"scope":"transactions"}`))
	request.Header.Set("Authorization", "Bearer "+externalToken)
	request.Header.Set("Content-Type", "application/json")
	requested := httptest.NewRecorder()
	server.ServeHTTP(requested, request)
	if requested.Code != http.StatusAccepted {
		t.Fatalf("request additional scope: got %d: %s", requested.Code, requested.Body.String())
	}
	var created struct {
		Item struct {
			ID string `json:"id"`
		} `json:"item"`
	}
	if err := json.Unmarshal(requested.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode access request: %v", err)
	}
	if created.Item.ID == "" {
		t.Fatal("expected pending consent grant id")
	}

	ownerToken := demoRoleToken(t, server, roleIDOrgOwner)
	if response := gatewayRequest(server, http.MethodPost, "/api/consent/grants/"+created.Item.ID+"/approve", ownerToken); response.Code != http.StatusOK {
		t.Fatalf("approve requested scope: got %d: %s", response.Code, response.Body.String())
	}

	access := gatewayRequest(server, http.MethodGet, "/api/portal/access", externalToken)
	if access.Code != http.StatusOK {
		t.Fatalf("read portal access: got %d: %s", access.Code, access.Body.String())
	}
	var overview struct {
		Grants []struct {
			Scopes []string `json:"scopes"`
		} `json:"grants"`
	}
	if err := json.Unmarshal(access.Body.Bytes(), &overview); err != nil {
		t.Fatalf("decode portal access: %v", err)
	}
	if !portalScopeGranted(overview.Grants, "transactions") {
		t.Fatalf("expected approved transactions scope in portal access: %+v", overview.Grants)
	}
}

func TestExternalCollaboratorSessionSerializesEmptyPermissionsArray(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	body, err := json.Marshal(map[string]string{"role_id": roleIDExternalCollaborator})
	if err != nil {
		t.Fatalf("encode demo login: %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/session/demo-login", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("external demo login: got %d: %s", response.Code, response.Body.String())
	}
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode demo login response: %v", err)
	}
	if string(payload["permissions"]) != "[]" {
		t.Fatalf("expected empty permissions array, got %s", payload["permissions"])
	}
}

func TestReconciliationOversightActionsArePersistedAndAudited(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	token := demoRoleToken(t, server, roleIDOrgOwner)
	for _, action := range []string{"assign", "ask", "acknowledge"} {
		response := gatewayRequest(server, http.MethodPost, "/api/workflow/reconciliations/r-1/"+action, token)
		if response.Code != http.StatusOK {
			t.Fatalf("%s reconciliation action: got %d: %s", action, response.Code, response.Body.String())
		}
	}
	response := gatewayRequest(server, http.MethodGet, "/api/workflow/snapshot", token)
	if response.Code != http.StatusOK {
		t.Fatalf("workflow snapshot: got %d: %s", response.Code, response.Body.String())
	}
	var snapshot struct {
		Reconciliations []struct {
			ID      string `json:"id"`
			History []struct {
				Action string `json:"action"`
			} `json:"history"`
		} `json:"reconciliations"`
		AuditLog []struct {
			Action string `json:"action"`
		} `json:"auditLog"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &snapshot); err != nil {
		t.Fatalf("decode workflow snapshot: %v", err)
	}
	var recon *struct {
		ID      string `json:"id"`
		History []struct {
			Action string `json:"action"`
		} `json:"history"`
	}
	for idx := range snapshot.Reconciliations {
		if snapshot.Reconciliations[idx].ID == "r-1" {
			recon = &snapshot.Reconciliations[idx]
			break
		}
	}
	if recon == nil || len(recon.History) < 3 {
		t.Fatalf("expected persisted reconciliation history, got %+v", recon)
	}
	for _, want := range []string{"Delegated exception to Finance Operator", "Requested explanation from Finance Operator", "Acknowledged exception review"} {
		found := false
		for _, event := range recon.History {
			if event.Action == want {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("missing reconciliation history action %q: %+v", want, recon.History)
		}
	}
	if len(snapshot.AuditLog) < 3 {
		t.Fatalf("expected audit entries for oversight actions, got %d", len(snapshot.AuditLog))
	}
}

func TestRoiExportIsTenantScopedPdf(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	token := demoRoleToken(t, server, roleIDOrgOwner)
	response := gatewayRequest(server, http.MethodGet, "/api/roi/export", token)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Fatalf("expected ROI PDF export, got status=%d content-type=%q body=%q", response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
	}
}

func TestCashflowExportIsTenantScopedPdf(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	token := demoRoleToken(t, server, roleIDOrgOwner)
	response := gatewayRequest(server, http.MethodGet, "/api/finance/cashflow-export", token)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Fatalf("expected cashflow PDF export, got status=%d content-type=%q body=%q", response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
	}
}

func TestIntakeSourceConnectionIsPersistedAndAudited(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	token := demoRoleToken(t, server, roleIDOrgAdmin)
	response := gatewayRequest(server, http.MethodPost, "/api/intake/sources/email/connect", token)
	if response.Code != http.StatusOK {
		t.Fatalf("connect intake source: got %d: %s", response.Code, response.Body.String())
	}
	status := gatewayRequest(server, http.MethodGet, "/api/intake/sources", token)
	if status.Code != http.StatusOK {
		t.Fatalf("read intake sources: got %d: %s", status.Code, status.Body.String())
	}
	var payload struct {
		Sources map[string]bool `json:"sources"`
	}
	if err := json.Unmarshal(status.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode intake sources: %v", err)
	}
	if !payload.Sources["email"] {
		t.Fatalf("expected email source to be connected: %+v", payload.Sources)
	}
	workflow := gatewayRequest(server, http.MethodGet, "/api/workflow/snapshot", demoRoleToken(t, server, roleIDOrgOwner))
	if !bytes.Contains(workflow.Body.Bytes(), []byte("Connected intake source")) {
		t.Fatalf("expected intake source audit entry, got %s", workflow.Body.String())
	}
}

func TestReconciliationExportIsTenantScopedPdf(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	token := demoRoleToken(t, server, roleIDOrgOwner)
	response := gatewayRequest(server, http.MethodGet, "/api/workflow/reconciliation-export", token)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Fatalf("expected reconciliation PDF export, got status=%d content-type=%q body=%q", response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
	}
}

func TestClaimActionsCreateAuditEntries(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	token := demoRoleToken(t, server, roleIDOrgOwner)
	for _, action := range []string{"request-docs", "refer-siu"} {
		response := gatewayRequest(server, http.MethodPost, "/api/claims/CLM-2025-00412/"+action, token)
		if response.Code != http.StatusOK {
			t.Fatalf("claim %s: got %d: %s", action, response.Code, response.Body.String())
		}
	}
	workflow := gatewayRequest(server, http.MethodGet, "/api/workflow/snapshot", token)
	if workflow.Code != http.StatusOK || !bytes.Contains(workflow.Body.Bytes(), []byte("Requested claim documents")) || !bytes.Contains(workflow.Body.Bytes(), []byte("Referred claim to SIU")) {
		t.Fatalf("expected claim audit entries, got status=%d body=%s", workflow.Code, workflow.Body.String())
	}
}

func demoRoleToken(t *testing.T, server *Server, roleID string) string {
	t.Helper()
	body, err := json.Marshal(map[string]string{"role_id": roleID})
	if err != nil {
		t.Fatalf("encode demo login: %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/session/demo-login", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("demo login %s: got %d: %s", roleID, response.Code, response.Body.String())
	}
	var session sessionResponse
	if err := json.Unmarshal(response.Body.Bytes(), &session); err != nil {
		t.Fatalf("decode demo login: %v", err)
	}
	if session.Token == "" {
		t.Fatal("demo login returned no token")
	}
	return session.Token
}

func gatewayRequest(server *Server, method, path, token string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, nil)
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	return response
}

func portalScopeGranted(grants []struct {
	Scopes []string `json:"scopes"`
}, scope string) bool {
	for _, grant := range grants {
		for _, grantedScope := range grant.Scopes {
			if grantedScope == scope {
				return true
			}
		}
	}
	return false
}
