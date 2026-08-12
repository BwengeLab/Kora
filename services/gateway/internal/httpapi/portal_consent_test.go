package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/auth"
	"github.com/kora-finance/kora/libs/connectors"
	"github.com/kora-finance/kora/libs/identity"
)

const testOrgID = "org-1"

type testServer struct {
	server *Server
	mock   sqlmock.Sqlmock
	users  map[access.Role]string
}

func newTestServer(t *testing.T) *testServer {
	t.Helper()
	server, err := New([]byte("test-jwt-secret"))
	if err != nil {
		t.Fatalf("create server: %v", err)
	}
	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatalf("create sqlmock: %v", err)
	}
	mock.MatchExpectationsInOrder(false)
	server.db = db
	t.Cleanup(func() { _ = db.Close() })

	if err := server.identityStore.CreateOrganization(identity.Organization{
		ID:        testOrgID,
		Name:      "Acme Finance Ltd",
		Domain:    "acme.test",
		Status:    "active",
		CreatedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("create organization: %v", err)
	}

	seed := []struct {
		email string
		name  string
		role  access.Role
	}{
		{"owner@acme.test", "Test Owner", access.RoleOrganizationOwner},
		{"lead@acme.test", "Test Lead", access.RoleFinanceLead},
		{"operator@acme.test", "Test Operator", access.RoleFinanceOperator},
		{"auditor@acme.test", "Test Auditor", access.RoleAuditorCompliance},
		{"admin@acme.test", "Test Admin", access.RoleOrgAdmin},
		{"claims@acme.test", "Test Claims", access.RoleClaimsOfficer},
		{"external@acme.test", "Test External", access.RoleExternalCollaborator},
	}
	users := map[access.Role]string{}
	for _, item := range seed {
		if err := seedTenantUser(server.identityStore, testOrgID, item.email, item.name, "test-pass-123", item.role); err != nil {
			t.Fatalf("seed user %s: %v", item.email, err)
		}
		user, err := server.identityStore.FindUserByEmail(item.email)
		if err != nil {
			t.Fatalf("find user %s: %v", item.email, err)
		}
		users[item.role] = user.ID
	}
	return &testServer{server: server, mock: mock, users: users}
}

func (ts *testServer) token(t *testing.T, role access.Role) string {
	t.Helper()
	return ts.tokenFor(t, role)
}

func (ts *testServer) tokenFor(t *testing.T, roles ...access.Role) string {
	t.Helper()
	userID := "usr-test"
	if len(roles) == 1 {
		if id, ok := ts.users[roles[0]]; ok {
			userID = id
		}
	}
	roleStrings := make([]string, 0, len(roles))
	for _, role := range roles {
		roleStrings = append(roleStrings, string(role))
	}
	perms := access.PermissionsForRoles(roles...)
	permStrings := make([]string, 0, len(perms))
	for _, perm := range perms {
		permStrings = append(permStrings, string(perm))
	}
	now := time.Now().UTC()
	token, err := auth.SignJWT(auth.Claims{
		Subject:        userID,
		OrganizationID: testOrgID,
		Plane:          string(access.PlaneTenant),
		Roles:          roleStrings,
		Permissions:    permStrings,
		ExpiresAt:      now.Add(time.Hour).Unix(),
		IssuedAt:       now.Unix(),
	}, ts.server.jwtSecret)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return token
}

func (ts *testServer) expectCatchAlls() {
	for i := 0; i < 40; i++ {
		ts.mock.ExpectQuery(".*").WillReturnRows(sqlmock.NewRows([]string{"col"}))
	}
	for i := 0; i < 40; i++ {
		ts.mock.ExpectExec(".*").WillReturnResult(sqlmock.NewResult(0, 1))
	}
}

type auditSeedRow struct {
	id       string
	action   string
	resource string
	actor    string
	at       time.Time
}

func auditRows(rows ...auditSeedRow) *sqlmock.Rows {
	out := sqlmock.NewRows([]string{"id", "action", "resource", "actor", "occurred_at"})
	for _, row := range rows {
		out.AddRow(row.id, row.action, row.resource, row.actor, row.at)
	}
	return out
}

func expectWorkflowSnapshot(ts *testServer, reconRows []*sqlmock.Rows, audit []auditSeedRow) {
	ts.mock.ExpectQuery("FROM approval_tasks at").WillReturnRows(sqlmock.NewRows([]string{"id"}))
	if len(reconRows) == 0 {
		reconRows = []*sqlmock.Rows{sqlmock.NewRows([]string{"id"})}
	}
	ts.mock.ExpectQuery("FROM match_candidates mc").WillReturnRows(reconRows...)
	ts.mock.ExpectQuery("FROM audit_entries ae").WillReturnRows(auditRows(audit...))
}

func reconRow() *sqlmock.Rows {
	now := time.Now().UTC()
	return sqlmock.NewRows([]string{
		"id", "state", "score", "confidence_tier", "reason", "created_at",
		"le_id", "le_type", "le_source", "le_ref", "le_amt", "le_cur", "le_dir", "le_party",
		"re_id", "re_type", "re_ref", "re_amt", "re_cur", "re_party", "mc_evidence", "mc_factors",
	}).AddRow(
		"r-1", "SUGGESTED", 0.85, "SUGGESTED", "Exception detected on unmatched payment", now,
		"le-1", "PAYMENT_RECEIVED", "Bank", "TRX-1001", "250000", "USD", "inflow", "Acme Supplier",
		"", "", "", "0", "USD", "", "{}", "[]",
	)
}

func claimRow() *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id", "claimant", "policy_number", "type", "stage", "incident_date", "reported_date", "description",
		"claimed_amount", "deductible", "ai_summary", "triage_severity", "triage_fast_track", "fraud_score", "fraud_flags",
		"suggested_reserve", "suggested_settlement", "reserve", "assigned_to", "sla_text", "payment_reconciled", "coverage_ok", "evidence",
	}).AddRow(
		"CLM-2025-00412", "Test Claimant", "", "general", "fnol", "", "", "",
		"0", "0", "", "low", false, 0, "[]",
		"0", "0", "0", "", "", false, true, "{}",
	)
}

func consentGrantRow(externalUserID string, scopesJSON string) *sqlmock.Rows {
	now := time.Now().UTC()
	return sqlmock.NewRows([]string{"grant_id", "grantee", "organization_id", "actor_user_id", "purpose", "scopes", "occurred_at"}).
		AddRow("cs-1", "BK Lender", testOrgID, externalUserID, "Credit Passport data sharing", scopesJSON, now)
}

func TestBackendExportsReturnDownloadableFiles(t *testing.T) {
	ts := newTestServer(t)

	ts.mock.ExpectQuery("FROM finance_analytics_reports").
		WillReturnRows(sqlmock.NewRows([]string{"id", "period_start", "period_end", "generated_by", "created_at", "kind"}).
			AddRow("rep-1", "2025-05-01", "2025-05-31", "Test Owner", time.Now().UTC(), "ledger"))
	ts.mock.ExpectQuery("FROM finance_analytics_reports").
		WillReturnRows(sqlmock.NewRows([]string{"id", "period_start", "period_end", "generated_by", "created_at", "kind"}).
			AddRow("rep-1", "2025-05-01", "2025-05-31", "Test Owner", time.Now().UTC(), "ledger"))
	ts.mock.ExpectQuery("FROM finance_analytics_reports").
		WillReturnRows(sqlmock.NewRows([]string{"id", "period_start", "period_end", "generated_by", "created_at", "kind"}).
			AddRow("rep-1", "2025-05-01", "2025-05-31", "Test Owner", time.Now().UTC(), "ledger"))

	billingPayload := `{"plan":"Enterprise","priceMonthly":"Custom","seatsIncluded":100}`
	ts.mock.ExpectQuery("SELECT resource FROM audit_entries").WithArgs(testOrgID, "settings.billing").
		WillReturnRows(sqlmock.NewRows([]string{"resource"}).AddRow(billingPayload))
	ts.mock.ExpectQuery("SELECT resource FROM audit_entries").WithArgs(testOrgID, "settings.billing").
		WillReturnRows(sqlmock.NewRows([]string{"resource"}).AddRow(billingPayload))

	ts.expectCatchAlls()

	ownerToken := ts.token(t, access.RoleOrganizationOwner)
	featuresResponse := gatewayRequest(ts.server, http.MethodGet, "/api/features", ownerToken)
	if featuresResponse.Code != http.StatusOK || !bytes.Contains(featuresResponse.Body.Bytes(), []byte(`"enabled":[]`)) {
		t.Fatalf("expected empty feature entitlements to serialize as an array, got status=%d body=%s", featuresResponse.Code, featuresResponse.Body.String())
	}

	for _, path := range []string{"/api/collections/export-summary", "/api/reports-board-pack", "/api/audit/investigations/evidence-pack"} {
		response := gatewayRequest(ts.server, http.MethodPost, path, ownerToken)
		if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-1.4")) {
			t.Fatalf("expected PDF from %s, got status=%d content-type=%q body=%q", path, response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
		}
		if response.Header().Get("Content-Disposition") == "" {
			t.Fatalf("expected attachment filename from %s", path)
		}
	}

	reportRequest := httptest.NewRequest(http.MethodPost, "/api/reports/rep-1/export", bytes.NewBufferString(`{"period":"May 2025"}`))
	reportRequest.Header.Set("Authorization", "Bearer "+ownerToken)
	reportRequest.Header.Set("Content-Type", "application/json")
	reportResponse := httptest.NewRecorder()
	ts.server.ServeHTTP(reportResponse, reportRequest)
	if reportResponse.Code != http.StatusOK || reportResponse.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(reportResponse.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Fatalf("expected report PDF, got status=%d content-type=%q body=%q", reportResponse.Code, reportResponse.Header().Get("Content-Type"), reportResponse.Body.Bytes())
	}

	adminToken := ts.token(t, access.RoleOrgAdmin)
	dataResponse := gatewayRequest(ts.server, http.MethodPost, "/api/settings/data-export", adminToken)
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
	ts.server.ServeHTTP(planResponse, planRequest)
	if planResponse.Code != http.StatusOK || !bytes.Contains(planResponse.Body.Bytes(), []byte(`"plan":"Enterprise"`)) || !bytes.Contains(planResponse.Body.Bytes(), []byte(`"priceMonthly":"Custom"`)) {
		t.Fatalf("expected persisted Enterprise plan, got status=%d body=%s", planResponse.Code, planResponse.Body.String())
	}
}

func TestPortalCreditPassportRequiresActiveConsent(t *testing.T) {
	ts := newTestServer(t)
	externalUserID := ts.users[access.RoleExternalCollaborator]

	ts.mock.ExpectQuery("FROM consent_grant_events g").WillReturnRows(consentGrantRow(externalUserID, `["credit-passport"]`))
	ts.mock.ExpectQuery("FROM consent_grant_events g").WillReturnRows(consentGrantRow(externalUserID, `["credit-passport"]`))
	ts.mock.ExpectQuery("FROM consent_grant_events g").WillReturnRows(sqlmock.NewRows([]string{"grant_id", "grantee", "organization_id", "actor_user_id", "purpose", "scopes", "occurred_at"}))
	ts.mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM external_access_grants`).WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))
	ts.expectCatchAlls()

	externalToken := ts.token(t, access.RoleExternalCollaborator)
	if response := gatewayRequest(ts.server, http.MethodGet, "/api/portal/credit-passport", externalToken); response.Code != http.StatusOK {
		t.Fatalf("expected active consent to allow portal access, got %d: %s", response.Code, response.Body.String())
	}
	if response := gatewayRequest(ts.server, http.MethodGet, "/api/portal/credit-passport/download", externalToken); response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-")) {
		t.Fatalf("expected consent-scoped PDF download, got status=%d content-type=%q body=%q", response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
	}

	ownerToken := ts.token(t, access.RoleOrganizationOwner)
	if response := gatewayRequest(ts.server, http.MethodPost, "/api/consent/grants/cs-1/revoke", ownerToken); response.Code != http.StatusOK {
		t.Fatalf("revoke consent: got %d: %s", response.Code, response.Body.String())
	}

	if response := gatewayRequest(ts.server, http.MethodGet, "/api/portal/credit-passport", externalToken); response.Code != http.StatusForbidden {
		t.Fatalf("expected revoked consent to deny portal access, got %d: %s", response.Code, response.Body.String())
	}
}

func TestPortalAccessRequestCanBeApproved(t *testing.T) {
	ts := newTestServer(t)
	externalUserID := ts.users[access.RoleExternalCollaborator]

	ts.mock.ExpectQuery("FROM consent_grant_events g").WillReturnRows(consentGrantRow(externalUserID, `["credit-passport"]`))
	ts.mock.ExpectQuery("FROM consent_grant_events g").WillReturnRows(consentGrantRow(externalUserID, `["credit-passport"]`))
	ts.mock.ExpectQuery("FROM consent_grant_events g").WillReturnRows(consentGrantRow(externalUserID, `["credit-passport","transactions"]`))
	ts.mock.ExpectQuery("FROM consent_grant_events g").WillReturnRows(consentGrantRow(externalUserID, `["credit-passport","transactions"]`))
	ts.mock.ExpectQuery(`SELECT EXISTS\(SELECT 1 FROM external_access_grants`).WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))
	ts.expectCatchAlls()

	externalToken := ts.token(t, access.RoleExternalCollaborator)
	request := httptest.NewRequest(http.MethodPost, "/api/portal/access-requests", bytes.NewBufferString(`{"scope":"transactions"}`))
	request.Header.Set("Authorization", "Bearer "+externalToken)
	request.Header.Set("Content-Type", "application/json")
	requested := httptest.NewRecorder()
	ts.server.ServeHTTP(requested, request)
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

	ownerToken := ts.token(t, access.RoleOrganizationOwner)
	if response := gatewayRequest(ts.server, http.MethodPost, "/api/consent/grants/"+created.Item.ID+"/approve", ownerToken); response.Code != http.StatusOK {
		t.Fatalf("approve requested scope: got %d: %s", response.Code, response.Body.String())
	}

	accessResponse := gatewayRequest(ts.server, http.MethodGet, "/api/portal/access", externalToken)
	if accessResponse.Code != http.StatusOK {
		t.Fatalf("read portal access: got %d: %s", accessResponse.Code, accessResponse.Body.String())
	}
	var overview struct {
		Grants []struct {
			Scopes []string `json:"scopes"`
		} `json:"grants"`
	}
	if err := json.Unmarshal(accessResponse.Body.Bytes(), &overview); err != nil {
		t.Fatalf("decode portal access: %v", err)
	}
	if !portalScopeGranted(overview.Grants, "transactions") {
		t.Fatalf("expected approved transactions scope in portal access: %+v", overview.Grants)
	}
}

func TestReconciliationOversightActionsArePersistedAndAudited(t *testing.T) {
	ts := newTestServer(t)
	now := time.Now().UTC()
	audit := []auditSeedRow{
		{id: "ev-1", action: "Delegated reconciliation exception", resource: "r-1", actor: "Test Owner", at: now},
		{id: "ev-2", action: "Requested reconciliation explanation", resource: "r-1", actor: "Test Owner", at: now},
		{id: "ev-3", action: "Acknowledged reconciliation exception", resource: "r-1", actor: "Test Owner", at: now},
	}
	for i := 0; i < 4; i++ {
		expectWorkflowSnapshot(ts, []*sqlmock.Rows{reconRow()}, audit)
	}
	ts.expectCatchAlls()

	ownerToken := ts.token(t, access.RoleOrganizationOwner)
	for _, action := range []string{"assign", "ask", "acknowledge"} {
		response := gatewayRequest(ts.server, http.MethodPost, "/api/workflow/reconciliations/r-1/"+action, ownerToken)
		if response.Code != http.StatusOK {
			t.Fatalf("%s reconciliation action: got %d: %s", action, response.Code, response.Body.String())
		}
	}
	response := gatewayRequest(ts.server, http.MethodGet, "/api/workflow/snapshot", ownerToken)
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
	ts := newTestServer(t)
	ts.mock.ExpectQuery("FROM roi_facts").WillReturnRows(sqlmock.NewRows([]string{"total", "minutes", "currency"}).AddRow(0, 0, "USD"))
	ts.expectCatchAlls()

	ownerToken := ts.token(t, access.RoleOrganizationOwner)
	response := gatewayRequest(ts.server, http.MethodGet, "/api/roi/export", ownerToken)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Fatalf("expected ROI PDF export, got status=%d content-type=%q body=%q", response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
	}
}

func TestCashflowExportIsTenantScopedPdf(t *testing.T) {
	ts := newTestServer(t)
	ts.expectCatchAlls()

	ownerToken := ts.token(t, access.RoleOrganizationOwner)
	response := gatewayRequest(ts.server, http.MethodGet, "/api/finance/cashflow-export", ownerToken)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Fatalf("expected cashflow PDF export, got status=%d content-type=%q body=%q", response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
	}
}

func TestIntakeSourceConnectionIsPersistedAndAudited(t *testing.T) {
	ts := newTestServer(t)
	now := time.Now().UTC()
	ts.mock.ExpectQuery("action = 'intake.source'").WillReturnRows(sqlmock.NewRows([]string{"resource"}).AddRow("email"))
	expectWorkflowSnapshot(ts, nil, []auditSeedRow{
		{id: "ev-i", action: "Connected intake source", resource: "email", actor: "Test Admin", at: now},
	})
	ts.expectCatchAlls()

	adminToken := ts.token(t, access.RoleOrgAdmin)
	response := gatewayRequest(ts.server, http.MethodPost, "/api/intake/sources/email/connect", adminToken)
	if response.Code != http.StatusOK {
		t.Fatalf("connect intake source: got %d: %s", response.Code, response.Body.String())
	}
	status := gatewayRequest(ts.server, http.MethodGet, "/api/intake/sources", adminToken)
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
	workflow := gatewayRequest(ts.server, http.MethodGet, "/api/workflow/snapshot", ts.token(t, access.RoleOrganizationOwner))
	if !bytes.Contains(workflow.Body.Bytes(), []byte("Connected intake source")) {
		t.Fatalf("expected intake source audit entry, got %s", workflow.Body.String())
	}
}

func TestReconciliationExportIsTenantScopedPdf(t *testing.T) {
	ts := newTestServer(t)
	ts.expectCatchAlls()

	ownerToken := ts.token(t, access.RoleOrganizationOwner)
	response := gatewayRequest(ts.server, http.MethodGet, "/api/workflow/reconciliation-export", ownerToken)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/pdf" || !bytes.HasPrefix(response.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Fatalf("expected reconciliation PDF export, got status=%d content-type=%q body=%q", response.Code, response.Header().Get("Content-Type"), response.Body.Bytes())
	}
}

func TestClaimActionsCreateAuditEntries(t *testing.T) {
	ts := newTestServer(t)
	now := time.Now().UTC()
	for i := 0; i < 4; i++ {
		ts.mock.ExpectQuery("FROM business_events be").WillReturnRows(claimRow())
	}
	expectWorkflowSnapshot(ts, nil, []auditSeedRow{
		{id: "ev-c1", action: "Requested claim documents", resource: "CLM-2025-00412", actor: "Test Claims", at: now},
		{id: "ev-c2", action: "Referred claim to SIU", resource: "CLM-2025-00412", actor: "Test Claims", at: now},
	})
	ts.expectCatchAlls()

	claimsToken := ts.token(t, access.RoleClaimsOfficer)
	for _, action := range []string{"request-docs", "refer-siu"} {
		response := gatewayRequest(ts.server, http.MethodPost, "/api/claims/CLM-2025-00412/"+action, claimsToken)
		if response.Code != http.StatusOK {
			t.Fatalf("claim %s: got %d: %s", action, response.Code, response.Body.String())
		}
	}
	workflow := gatewayRequest(ts.server, http.MethodGet, "/api/workflow/snapshot", claimsToken)
	if workflow.Code != http.StatusOK || !bytes.Contains(workflow.Body.Bytes(), []byte("Requested claim documents")) || !bytes.Contains(workflow.Body.Bytes(), []byte("Referred claim to SIU")) {
		t.Fatalf("expected claim audit entries, got status=%d body=%s", workflow.Code, workflow.Body.String())
	}
}

func TestWorkflowAndClaimsMutationsEnforceRolePermissions(t *testing.T) {
	ts := newTestServer(t)
	ts.expectCatchAlls()

	operator := ts.token(t, access.RoleFinanceOperator)
	lead := ts.token(t, access.RoleFinanceLead)
	owner := ts.token(t, access.RoleOrganizationOwner)
	claims := ts.token(t, access.RoleClaimsOfficer)

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
			response := gatewayRequest(ts.server, http.MethodPost, check.path, check.token)
			if response.Code != check.wantStatus {
				t.Fatalf("got %d, want %d: %s", response.Code, check.wantStatus, response.Body.String())
			}
		})
	}
}

func TestTenantMutationEndpointsUseLeastPrivilege(t *testing.T) {
	ts := newTestServer(t)
	ts.expectCatchAlls()

	operator := ts.token(t, access.RoleFinanceOperator)
	lead := ts.token(t, access.RoleFinanceLead)
	auditor := ts.token(t, access.RoleAuditorCompliance)
	owner := ts.token(t, access.RoleOrganizationOwner)
	admin := ts.token(t, access.RoleOrgAdmin)
	claims := ts.token(t, access.RoleClaimsOfficer)

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
			response := gatewayRequest(ts.server, check.method, check.path, check.token)
			if response.Code != check.wantStatus {
				t.Fatalf("got %d, want %d: %s", response.Code, check.wantStatus, response.Body.String())
			}
		})
	}
}

func TestIntegrationReadinessDoesNotFabricateProviderConnections(t *testing.T) {
	ts := newTestServer(t)
	adminActor := access.Actor{
		UserID:         ts.users[access.RoleOrgAdmin],
		OrganizationID: testOrgID,
		Plane:          access.PlaneTenant,
		Roles:          []access.Role{access.RoleOrgAdmin},
		Permissions:    access.PermissionsForRoles(access.RoleOrgAdmin),
	}
	store, ok := ts.server.connections.(*connectors.MemoryConnectionStore)
	if !ok {
		t.Fatalf("expected memory connection store, got %T", ts.server.connections)
	}
	for _, connection := range []connectors.Connection{
		{ID: "conn-momo-1", OrganizationID: testOrgID, Kind: connectors.MoMo, DisplayName: "MTN MoMo", SecretRef: "secret://org-1/momo", Active: true, Config: map[string]string{"environment": "sandbox"}},
		{ID: "conn-bk-1", OrganizationID: testOrgID, Kind: connectors.BankStatement, DisplayName: "Bank of Kigali", SecretRef: "secret://org-1/bk", Active: true, Config: map[string]string{"format": "csv"}},
	} {
		if _, err := store.Create(adminActor, connection); err != nil {
			t.Fatalf("seed connection: %v", err)
		}
	}
	ts.expectCatchAlls()

	adminToken := ts.token(t, access.RoleOrgAdmin)
	response := gatewayRequest(ts.server, http.MethodGet, "/api/integrations/status", adminToken)
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
	unsupported := gatewayRequest(ts.server, http.MethodPost, "/api/integrations/status/quickbooks/connect", adminToken)
	if unsupported.Code != http.StatusNotImplemented {
		t.Fatalf("unsupported connect: got %d: %s", unsupported.Code, unsupported.Body.String())
	}
	for _, action := range []string{"disconnect", "connect"} {
		result := gatewayRequest(ts.server, http.MethodPost, "/api/integrations/status/mtn-momo/"+action, adminToken)
		if result.Code != http.StatusOK {
			t.Fatalf("MTN %s: got %d: %s", action, result.Code, result.Body.String())
		}
		if bytes.Contains(result.Body.Bytes(), []byte("conn_demo_")) {
			t.Fatalf("MTN %s fabricated a demo connection: %s", action, result.Body.String())
		}
	}
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
