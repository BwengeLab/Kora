package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBackendExportsReturnDownloadableFiles(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	token := demoRoleToken(t, server, roleIDOrgOwner)
	featuresResponse := gatewayRequest(server, http.MethodGet, "/api/features", token)
	if featuresResponse.Code != http.StatusOK || !bytes.Contains(featuresResponse.Body.Bytes(), []byte(`"enabled":[]`)) {
		t.Fatalf("expected empty feature entitlements to serialize as an array, got status=%d body=%s", featuresResponse.Code, featuresResponse.Body.String())
	}

	for _, path := range []string{"/api/collections/export-summary", "/api/reports-board-pack", "/api/audit/investigations/evidence-pack"} {
		response := gatewayRequest(server, http.MethodPost, path, token)
		if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-1.4")) {
			t.Fatalf("expected PDF from %s, got status=%d content-type=%q body=%q", path, response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
		}
		if response.Header().Get("Content-Disposition") == "" {
			t.Fatalf("expected attachment filename from %s", path)
		}
	}

	reportRequest := httptest.NewRequest(http.MethodPost, "/api/reports/rep-1/export", bytes.NewBufferString(`{"period":"May 2025"}`))
	reportRequest.Header.Set("Authorization", "Bearer "+token)
	reportRequest.Header.Set("Content-Type", "application/json")
	reportResponse := httptest.NewRecorder()
	server.ServeHTTP(reportResponse, reportRequest)
	if reportResponse.Code != http.StatusOK || reportResponse.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(reportResponse.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Fatalf("expected report PDF, got status=%d content-type=%q body=%q", reportResponse.Code, reportResponse.Header().Get("Content-Type"), reportResponse.Body.Bytes())
	}

	adminToken := demoRoleToken(t, server, roleIDOrgAdmin)
	dataResponse := gatewayRequest(server, http.MethodPost, "/api/settings/data-export", adminToken)
	if dataResponse.Code != http.StatusOK || dataResponse.Header().Get("Content-Type") != "application/json" || dataResponse.Header().Get("Content-Disposition") == "" {
		t.Fatalf("expected JSON data attachment, got status=%d content-type=%q disposition=%q", dataResponse.Code, dataResponse.Header().Get("Content-Type"), dataResponse.Header().Get("Content-Disposition"))
	}
	var archive map[string]any
	if err := json.Unmarshal(dataResponse.Body.Bytes(), &archive); err != nil {
		t.Fatalf("decode data export: %v", err)
	}
	for _, key := range []string{"exportedAt", "settings", "reports", "collections", "finance", "consentGrants"} {
		if _, ok := archive[key]; !ok {
			t.Fatalf("data export missing %q", key)
		}
	}

	planRequest := httptest.NewRequest(http.MethodPost, "/api/settings/billing-portal", bytes.NewBufferString(`{"plan":"Enterprise"}`))
	planRequest.Header.Set("Authorization", "Bearer "+adminToken)
	planRequest.Header.Set("Content-Type", "application/json")
	planResponse := httptest.NewRecorder()
	server.ServeHTTP(planResponse, planRequest)
	if planResponse.Code != http.StatusOK || !bytes.Contains(planResponse.Body.Bytes(), []byte(`"plan":"Enterprise"`)) || !bytes.Contains(planResponse.Body.Bytes(), []byte(`"priceMonthly":"Custom"`)) {
		t.Fatalf("expected persisted Enterprise plan, got status=%d body=%s", planResponse.Code, planResponse.Body.String())
	}
}

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

func TestClaimsOfficerDemoSessionUsesVerticalRoleAndPermissions(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	body, err := json.Marshal(map[string]string{"role_id": roleIDClaimsOfficer})
	if err != nil {
		t.Fatalf("encode demo login: %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/session/demo-login", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	server.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("claims demo login: got %d: %s", response.Code, response.Body.String())
	}
	var payload struct {
		Roles []struct {
			ID          string `json:"id"`
			BlueprintID string `json:"blueprintId"`
		} `json:"roles"`
		Permissions []struct {
			Permission string `json:"permission"`
		} `json:"permissions"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode demo login response: %v", err)
	}
	if len(payload.Roles) != 1 || payload.Roles[0].ID != roleIDClaimsOfficer || payload.Roles[0].BlueprintID != "blueprint.claims_officer" {
		t.Fatalf("unexpected claims role: %+v", payload.Roles)
	}
	want := map[string]bool{"claims:review": false, "claims:prepare": false, "events:read": false}
	for _, grant := range payload.Permissions {
		if _, ok := want[grant.Permission]; ok {
			want[grant.Permission] = true
		}
	}
	for permission, found := range want {
		if !found {
			t.Fatalf("missing claims session permission %s", permission)
		}
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
	token := demoRoleToken(t, server, roleIDClaimsOfficer)
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

func TestWorkflowAndClaimsMutationsEnforceRolePermissions(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	operator := demoRoleToken(t, server, roleIDFinanceOperator)
	lead := demoRoleToken(t, server, roleIDFinanceLead)
	owner := demoRoleToken(t, server, roleIDOrgOwner)
	claims := demoRoleToken(t, server, roleIDClaimsOfficer)

	checks := []struct {
		name       string
		token      string
		path       string
		wantStatus int
	}{
		{name: "operator cannot approve", token: operator, path: "/api/workflow/approvals/missing/approve", wantStatus: http.StatusForbidden},
		{name: "operator can withdraw own request", token: operator, path: "/api/workflow/approvals/missing/withdraw", wantStatus: http.StatusNotFound},
		{name: "lead may approve", token: lead, path: "/api/workflow/approvals/missing/approve", wantStatus: http.StatusNotFound},
		{name: "operator cannot post reconciliation", token: operator, path: "/api/workflow/reconciliations/missing/approve", wantStatus: http.StatusForbidden},
		{name: "owner cannot post reconciliation", token: owner, path: "/api/workflow/reconciliations/missing/approve", wantStatus: http.StatusForbidden},
		{name: "lead may post reconciliation", token: lead, path: "/api/workflow/reconciliations/missing/approve", wantStatus: http.StatusNotFound},
		{name: "owner cannot mutate claims", token: owner, path: "/api/claims/missing/request-docs", wantStatus: http.StatusForbidden},
		{name: "claims officer may prepare claim", token: claims, path: "/api/claims/missing/request-docs", wantStatus: http.StatusNotFound},
	}
	for _, check := range checks {
		t.Run(check.name, func(t *testing.T) {
			response := gatewayRequest(server, http.MethodPost, check.path, check.token)
			if response.Code != check.wantStatus {
				t.Fatalf("got %d, want %d: %s", response.Code, check.wantStatus, response.Body.String())
			}
		})
	}
}

func TestTenantMutationEndpointsUseLeastPrivilege(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	operator := demoRoleToken(t, server, roleIDFinanceOperator)
	lead := demoRoleToken(t, server, roleIDFinanceLead)
	auditor := demoRoleToken(t, server, roleIDAuditor)
	owner := demoRoleToken(t, server, roleIDOrgOwner)
	admin := demoRoleToken(t, server, roleIDOrgAdmin)
	claims := demoRoleToken(t, server, roleIDClaimsOfficer)

	checks := []struct {
		name       string
		method     string
		token      string
		path       string
		wantStatus int
	}{
		{name: "operator reads collections", method: http.MethodGet, token: operator, path: "/api/collections/overdue", wantStatus: http.StatusOK},
		{name: "operator sends collection action", method: http.MethodPost, token: operator, path: "/api/collections/overdue/missing/remind", wantStatus: http.StatusNotFound},
		{name: "auditor cannot send collection action", method: http.MethodPost, token: auditor, path: "/api/collections/overdue/missing/remind", wantStatus: http.StatusForbidden},
		{name: "operator cannot post transaction", method: http.MethodPost, token: operator, path: "/api/finance/transactions/missing/post", wantStatus: http.StatusForbidden},
		{name: "lead may post transaction", method: http.MethodPost, token: lead, path: "/api/finance/transactions/missing/post", wantStatus: http.StatusNotFound},
		{name: "auditor may run agent", method: http.MethodPost, token: auditor, path: "/api/agents/run/missing", wantStatus: http.StatusNotFound},
		{name: "admin cannot run agent", method: http.MethodPost, token: admin, path: "/api/agents/run/missing", wantStatus: http.StatusForbidden},
		{name: "auditor reads consent", method: http.MethodGet, token: auditor, path: "/api/consent/grants", wantStatus: http.StatusOK},
		{name: "auditor cannot create consent", method: http.MethodPost, token: auditor, path: "/api/consent/grants", wantStatus: http.StatusForbidden},
		{name: "lead can reach consent creation validation", method: http.MethodPost, token: lead, path: "/api/consent/grants", wantStatus: http.StatusBadRequest},
		{name: "auditor reads relationships", method: http.MethodGet, token: auditor, path: "/api/relationships/overview", wantStatus: http.StatusOK},
		{name: "auditor cannot mutate relationship", method: http.MethodPost, token: auditor, path: "/api/relationships/parties/missing/email-contact", wantStatus: http.StatusForbidden},
		{name: "lead may mutate relationship", method: http.MethodPost, token: lead, path: "/api/relationships/parties/missing/email-contact", wantStatus: http.StatusNotFound},
		{name: "owner cannot raise audit finding", method: http.MethodPost, token: owner, path: "/api/audit/investigations/findings", wantStatus: http.StatusForbidden},
		{name: "auditor can reach finding validation", method: http.MethodPost, token: auditor, path: "/api/audit/investigations/findings", wantStatus: http.StatusBadRequest},
		{name: "claims officer cannot settle", method: http.MethodPost, token: claims, path: "/api/claims/CLM-2025-00401/advance", wantStatus: http.StatusForbidden},
	}
	for _, check := range checks {
		t.Run(check.name, func(t *testing.T) {
			response := gatewayRequest(server, check.method, check.path, check.token)
			if response.Code != check.wantStatus {
				t.Fatalf("got %d, want %d: %s", response.Code, check.wantStatus, response.Body.String())
			}
		})
	}
}

func TestIntegrationReadinessDoesNotFabricateProviderConnections(t *testing.T) {
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	token := demoRoleToken(t, server, roleIDOrgAdmin)
	response := gatewayRequest(server, http.MethodGet, "/api/integrations/status", token)
	if response.Code != http.StatusOK {
		t.Fatalf("integration status: got %d: %s", response.Code, response.Body.String())
	}
	var payload struct {
		Items []integrationStatus `json:"items"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode integration status: %v", err)
	}
	byID := map[string]integrationStatus{}
	for _, item := range payload.Items {
		byID[item.ID] = item
	}
	if item := byID["mtn-momo"]; !item.Connected || item.Readiness != "sandbox" || item.ConnectionID == "" || !item.CanConnect {
		t.Fatalf("unexpected MTN readiness: %+v", item)
	}
	if item := byID["bk"]; !item.Connected || item.Readiness != "manual_import" || item.ConnectionID == "" || !item.CanConnect {
		t.Fatalf("unexpected bank readiness: %+v", item)
	}
	if item := byID["quickbooks"]; item.Connected || item.Readiness != "not_implemented" || item.CanConnect {
		t.Fatalf("unexpected QuickBooks readiness: %+v", item)
	}
	unsupported := gatewayRequest(server, http.MethodPost, "/api/integrations/status/quickbooks/connect", token)
	if unsupported.Code != http.StatusNotImplemented {
		t.Fatalf("unsupported connect: got %d: %s", unsupported.Code, unsupported.Body.String())
	}
	for _, action := range []string{"disconnect", "connect"} {
		result := gatewayRequest(server, http.MethodPost, "/api/integrations/status/mtn-momo/"+action, token)
		if result.Code != http.StatusOK {
			t.Fatalf("MTN %s: got %d: %s", action, result.Code, result.Body.String())
		}
		if bytes.Contains(result.Body.Bytes(), []byte("conn_demo_")) {
			t.Fatalf("MTN %s fabricated a demo connection: %s", action, result.Body.String())
		}
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
