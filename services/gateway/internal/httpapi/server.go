package httpapi

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/auth"
	"github.com/kora-finance/kora/libs/connectors"
	"github.com/kora-finance/kora/libs/email"
	"github.com/kora-finance/kora/libs/identity"
	"github.com/kora-finance/kora/libs/ingestion"
	"github.com/kora-finance/kora/libs/servicekit"
)

const maxRequestBytes = 1 << 20

const demoPassword = "demo-pass-123"

type Server struct {
	mux                 *http.ServeMux
	identityService     *identity.Service
	identityStore       identity.Store
	connections         connectors.ConnectionStore
	jwtSecret           []byte
	agentRuntimeURL     string
	agentRuntimeToken   string
	runtimeDatabaseURL  string
	db                  *sql.DB
	documentAIURL       string
	ingestionServiceURL string
	enterpriseMu        sync.RWMutex
	pendingInvites      map[string]enterpriseInvite
	emailSender         *email.Sender
	httpClient          *http.Client
}

type enterpriseInvite struct {
	Email          string
	Role           access.Role
	Token          string
	OrganizationID string
	DisplayName    string
}

type sessionResponse struct {
	User        sessionUser         `json:"user"`
	Tenant      sessionTenant       `json:"tenant"`
	Roles       []sessionRole       `json:"roles"`
	Permissions []sessionPermission `json:"permissions"`
	Token       string              `json:"token"`
	IssuedAt    string              `json:"issuedAt"`
	ExpiresAt   string              `json:"expiresAt"`
}

type sessionUser struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
}

type sessionTenant struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type sessionRole struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	BlueprintID string `json:"blueprintId"`
}

type sessionPermission struct {
	Permission string       `json:"permission"`
	Scope      sessionScope `json:"scope"`
}

type sessionScope struct {
	Kind     string `json:"kind"`
	TenantID string `json:"tenantId,omitempty"`
}

type integrationStatus struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Category     string `json:"category"`
	Status       string `json:"status"`
	LastSync     string `json:"lastSync"`
	Connected    bool   `json:"connected"`
	ConnectionID string `json:"connectionId,omitempty"`
	Readiness    string `json:"readiness"`
	CanConnect   bool   `json:"canConnect"`
}

type integrationStatusOverride struct {
	Status       string
	LastSync     string
	Connected    bool
	ConnectionID string
}

type portalAccessActivity struct {
	Action string `json:"action"`
	At     string `json:"at"`
}

type portalAccessResponse struct {
	OrganizationName string                 `json:"organizationName"`
	Grants           []ConsentGrantData     `json:"grants"`
	Activity         []portalAccessActivity `json:"activity"`
}

func New(secret []byte) (*Server, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	var store identity.Store
	if databaseURL != "" {
		pgStore, err := identity.NewPostgresStore(databaseURL)
		if err != nil {
			return nil, fmt.Errorf("identity postgres store: %w", err)
		}
		store = pgStore
	} else {
		store = identity.NewMemoryStore()
	}
	service := identity.NewService(store, secret)
	connectionStore := connectors.NewMemoryConnectionStore()
	server := &Server{
		mux:                 http.NewServeMux(),
		identityService:     service,
		identityStore:       store,
		connections:         connectionStore,
		jwtSecret:           secret,
		agentRuntimeURL:     strings.TrimRight(os.Getenv("KORA_AGENT_RUNTIME_URL"), "/"),
		agentRuntimeToken:   os.Getenv("KORA_AGENT_RUNTIME_TOKEN"),
		runtimeDatabaseURL:  databaseURL,
		documentAIURL:       strings.TrimRight(os.Getenv("KORA_DOCUMENT_AI_URL"), "/"),
		ingestionServiceURL: strings.TrimRight(os.Getenv("KORA_INGESTION_SERVICE_URL"), "/"),
		pendingInvites:      map[string]enterpriseInvite{},
		httpClient:          &http.Client{Timeout: 35 * time.Second},
		emailSender: email.NewSender(email.Config{
			APIKey:   os.Getenv("KORA_MAILERSEND_API_KEY"),
			FromAddr: os.Getenv("KORA_SMTP_FROM_ADDR"),
			FromName: os.Getenv("KORA_SMTP_FROM_NAME"),
		}),
	}
	if databaseURL != "" {
		db, err := sql.Open("pgx", databaseURL)
		if err == nil {
			if err := db.Ping(); err == nil {
				server.db = db
			} else {
				_ = db.Close()
			}
		}
	}
	server.routes()
	return server, nil
}

func (s *Server) routes() {
	s.mux.HandleFunc("/healthz", servicekit.HealthHandler("gateway"))
	s.mux.HandleFunc("/api/session/enterprise-register", s.enterpriseRegister)
	s.mux.HandleFunc("/api/session/enterprise-login", s.enterpriseLogin)
	s.mux.HandleFunc("/api/session/set-password", s.setPassword)
	s.mux.HandleFunc("/api/session/me", s.sessionMe)
	s.mux.HandleFunc("/api/integrations/status", s.integrationsStatus)
	s.mux.HandleFunc("/api/integrations/status/", s.integrationsStatusAction)
	s.mux.HandleFunc("/api/workflow/snapshot", s.workflowSnapshot)
	s.mux.HandleFunc("/api/workflow/approvals/", s.workflowApprovalAction)
	s.mux.HandleFunc("/api/workflow/reconciliations/", s.workflowReconciliationAction)
	s.mux.HandleFunc("/api/workflow/reconciliation-export", s.reconciliationExport)
	s.mux.HandleFunc("/api/collections/overdue", s.collectionsOverdue)
	s.mux.HandleFunc("/api/collections/overdue/", s.collectionsOverdueAction)
	s.mux.HandleFunc("/api/collections/export-summary", s.collectionsExportSummary)
	s.mux.HandleFunc("/api/claims/workspace", s.claimsWorkspace)
	s.mux.HandleFunc("/api/claims/", s.claimsAction)
	s.mux.HandleFunc("/api/consent/grants", s.consentGrants)
	s.mux.HandleFunc("/api/consent/grants/", s.consentGrantAction)
	s.mux.HandleFunc("/api/relationships/overview", s.relationshipsOverview)
	s.mux.HandleFunc("/api/relationships/parties/", s.relationshipPartyAction)
	s.mux.HandleFunc("/api/roi/summary", s.roiSummary)
	s.mux.HandleFunc("/api/roi/export", s.roiExport)
	s.mux.HandleFunc("/api/portal/credit-passport/download", s.portalCreditPassportDownload)
	s.mux.HandleFunc("/api/portal/credit-passport", s.portalCreditPassport)
	s.mux.HandleFunc("/api/portal/access", s.portalAccessOverview)
	s.mux.HandleFunc("/api/portal/access-requests", s.portalAccessRequest)
	s.mux.HandleFunc("/api/agents/overview", s.agentsOverview)
	s.mux.HandleFunc("/api/agents/run-all", s.agentRunAll)
	s.mux.HandleFunc("/api/agents/run/", s.agentRun)
	s.mux.HandleFunc("/api/agents/", s.agentFeedback)
	s.mux.HandleFunc("/api/collections/management", s.collectionsManagement)
	s.mux.HandleFunc("/api/collections/management/", s.collectionsManagementAction)
	s.mux.HandleFunc("/api/home/owner-summary", s.ownerSummary)
	s.mux.HandleFunc("/api/home/owner-dashboard", s.ownerDashboard)
	s.mux.HandleFunc("/api/home/admin-dashboard", s.adminDashboard)
	s.mux.HandleFunc("/api/home/admin-dashboard/access-requests/", s.adminAccessRequestAction)
	s.mux.HandleFunc("/api/home/operator-dashboard", s.operatorDashboard)
	s.mux.HandleFunc("/api/home/auditor-dashboard", s.auditorDashboard)
	s.mux.HandleFunc("/api/home/platform-dashboard", s.platformDashboard)
	s.mux.HandleFunc("/api/intake/docs", s.intakeDocsAPI)
	s.mux.HandleFunc("/api/intake/sources", s.intakeSourcesAPI)
	s.mux.HandleFunc("/api/intake/sources/", s.intakeSourceAction)
	s.mux.HandleFunc("/api/intake/upload", s.intakeUpload)
	s.mux.HandleFunc("/api/intake/docs/", s.intakeDocAction)
	s.mux.HandleFunc("/api/reports", s.reportsCatalog)
	s.mux.HandleFunc("/api/reports/", s.reportDetail)
	s.mux.HandleFunc("/api/reports-board-pack", s.reportsBoardPack)
	s.mux.HandleFunc("/api/financial-statements/export", s.financialStatementsExport)
	s.mux.HandleFunc("/api/finance/operations", s.financeOperations)
	s.mux.HandleFunc("/api/finance/cashflow-view", s.financeCashflowView)
	s.mux.HandleFunc("/api/finance/cashflow-export", s.financeCashflowExport)
	s.mux.HandleFunc("/api/finance/journals", s.financeCreateJournal)
	s.mux.HandleFunc("/api/finance/bills/", s.financeBillAction)
	s.mux.HandleFunc("/api/finance/transactions/", s.financeTransactionAction)
	s.mux.HandleFunc("/api/audit/investigations", s.auditInvestigations)
	s.mux.HandleFunc("/api/audit/investigations/findings", s.auditFindingCreate)
	s.mux.HandleFunc("/api/audit/investigations/evidence-pack", s.auditEvidencePack)
	s.mux.HandleFunc("/api/smtp/test", s.smtpTest)
	s.mux.HandleFunc("/api/smtp/send-invitation", s.smtpSendInvitation)
	s.mux.HandleFunc("/api/settings/users", s.settingsUsers)
	s.mux.HandleFunc("/api/settings/users/", s.settingsUserAction)
	s.mux.HandleFunc("/api/settings/approval-rules", s.settingsApprovalRules)
	s.mux.HandleFunc("/api/settings/approval-rules/", s.settingsApprovalRuleAction)
	s.mux.HandleFunc("/api/settings/overview", s.settingsOverviewAPI)
	s.mux.HandleFunc("/api/settings/org-profile", s.settingsOrgProfile)
	s.mux.HandleFunc("/api/settings/policy-controls", s.settingsPolicyControls)
	s.mux.HandleFunc("/api/settings/data-controls", s.settingsDataControls)
	s.mux.HandleFunc("/api/settings/data-export", s.settingsDataExport)
	s.mux.HandleFunc("/api/settings/billing-portal", s.settingsBillingPortal)
	s.mux.HandleFunc("/api/account/settings", s.accountSettingsAPI)
	s.mux.HandleFunc("/api/account/sign-out-others", s.accountSignOutOthers)
	s.mux.HandleFunc("/api/features", s.featuresOverview)
	s.mux.HandleFunc("/api/features/", s.featureToggle)
	s.mux.HandleFunc("/api/mailbox", s.mailboxAPI)
	s.mux.HandleFunc("/api/mailbox/connect", s.mailboxConnect)
	s.mux.HandleFunc("/api/mailbox/send", s.mailboxSend)
	s.mux.HandleFunc("/api/mailbox/messages/", s.mailboxMessageAction)
	s.mux.HandleFunc("/api/platform/console", s.platformConsoleAPI)
	s.mux.HandleFunc("/api/platform/tenants", s.platformTenantCreate)
	s.mux.HandleFunc("/api/platform/flags/", s.platformFlagToggle)
	s.mux.HandleFunc("/api/platform/users", s.platformUserCreate)
	s.mux.HandleFunc("/api/platform/support-requests", s.platformSupportRequestCreate)
	s.mux.HandleFunc("/api/home/finance-lead-dashboard", s.financeLeadDashboard)
	s.mux.HandleFunc("/api/contracts/overview", s.contractsOverview)
	s.mux.HandleFunc("/api/contracts/", s.contractAction)
	s.mux.HandleFunc("/api/owner/risk-dashboard", s.ownerRiskDashboard)
	s.mux.HandleFunc("/api/owner/risk-dashboard/export", s.ownerRiskDashboardExport)
	s.mux.HandleFunc("/api/owner/risks/", s.ownerRiskAction)
	s.mux.HandleFunc("/api/controls-close/overview", s.controlsCloseOverview)
	s.mux.HandleFunc("/api/controls-close/tasks/", s.controlsCloseTaskAction)
	s.mux.HandleFunc("/api/controls-close/evidence-gaps/", s.controlsCloseEvidenceGapAction)
	s.mux.HandleFunc("/api/controls-close/lock", s.controlsCloseLock)
}

func (s *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	if request.Method == http.MethodOptions {
		writeCORS(writer, request)
		writer.WriteHeader(http.StatusNoContent)
		return
	}
	writeCORS(writer, request)
	s.mux.ServeHTTP(writer, request)
}

func (s *Server) enterpriseRegister(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		OrganizationName string `json:"organization_name"`
		BusinessEmail    string `json:"business_email"`
		DisplayName      string `json:"display_name"`
		Password         string `json:"password"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	allowed := []string{"gmail.com", "yahoo.com", "outlook.com", "hotmail.com"}
	email := strings.ToLower(strings.TrimSpace(body.BusinessEmail))
	if email == "" || !strings.Contains(email, "@") {
		writeError(writer, http.StatusBadRequest, "business email is required")
		return
	}
	domain := strings.TrimSpace(strings.SplitN(email, "@", 2)[1])
	if domain == "" {
		writeError(writer, http.StatusBadRequest, "business email domain is required")
		return
	}
	for _, blocked := range allowed {
		if strings.EqualFold(domain, blocked) {
			writeError(writer, http.StatusBadRequest, "use a business email domain")
			return
		}
	}
	if existingUser, err := s.identityStore.FindUserByEmail(email); err == nil && existingUser.ID != "" {
		writeError(writer, http.StatusConflict, "email already registered")
		return
	}
	out, err := s.identityService.RegisterOrganization(identity.RegisterInput{
		OrganizationName: body.OrganizationName,
		OwnerEmail:       email,
		OwnerDisplayName: body.DisplayName,
		OwnerPassword:    body.Password,
	})
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	user, err := s.identityStore.FindUserByID(out.OwnerUserID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	org, err := s.organizationByID(out.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	login, err := s.identityService.Login(user.Email, body.Password)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return
	}
	writeJSON(writer, http.StatusCreated, buildTenantSession(user, org, login.AccessToken, login.Roles, login.Permissions))
}

func (s *Server) enterpriseLogin(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		BusinessEmail string `json:"business_email"`
		Password      string `json:"password"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.BusinessEmail))
	if email == "" {
		writeError(writer, http.StatusBadRequest, "business email is required")
		return
	}
	if body.Password == "" {
		writeError(writer, http.StatusBadRequest, "password is required")
		return
	}
	login, err := s.identityService.Login(email, body.Password)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return
	}
	user, err := s.identityStore.FindUserByID(login.UserID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	org, err := s.organizationByID(login.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	if org.Domain != "" && !strings.HasSuffix(strings.ToLower(user.Email), "@"+strings.ToLower(org.Domain)) {
		writeError(writer, http.StatusForbidden, "email domain does not match the organization")
		return
	}
	writeJSON(writer, http.StatusOK, buildTenantSession(user, org, login.AccessToken, login.Roles, login.Permissions))
}

func (s *Server) sessionMe(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	token, err := bearerToken(request)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return
	}
	claims, err := auth.VerifyJWT(token, s.jwtSecret, time.Now())
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.Plane == string(access.PlanePlatform) && slices.Contains(claims.Roles, string(access.RoleSuperAdmin)) {
		session, err := s.buildSuperAdminSession()
		if err != nil {
			writeError(writer, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(writer, http.StatusOK, session)
		return
	}
	user, err := s.identityStore.FindUserByID(claims.Subject)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return
	}
	org, err := s.organizationByID(claims.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return
	}
	roles, err := s.identityStore.RolesForUser(user.ID)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return
	}
	permissions := access.PermissionsForRoles(roles...)
	writeJSON(writer, http.StatusOK, buildTenantSession(user, org, token, roles, permissions))
}

func (s *Server) integrationsStatus(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	token, err := bearerToken(request)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return
	}
	claims, err := auth.VerifyJWT(token, s.jwtSecret, time.Now())
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.OrganizationID == "" {
		writeError(writer, http.StatusForbidden, "tenant session required")
		return
	}
	actor, err := actorFromClaims(claims)
	if err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	if err := access.Authorize(actor, access.Resource{OrganizationID: claims.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	statuses, err := s.integrationStatusesForActor(actor, claims.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"items": statuses})
}

func (s *Server) integrationsStatusAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, actor, ok := s.requireTenantActor(writer, request, access.PermissionManageIntegrations)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/integrations/status/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	integrationID, action := parts[0], parts[1]
	statuses, err := s.integrationStatusesForActor(actor, claims.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	var current *integrationStatus
	for idx := range statuses {
		if statuses[idx].ID == integrationID {
			current = &statuses[idx]
			break
		}
	}
	if current == nil {
		writeError(writer, http.StatusNotFound, "integration not found")
		return
	}
	if !current.CanConnect {
		writeError(writer, http.StatusNotImplemented, "provider adapter is not implemented")
		return
	}
	override := integrationStatusOverride{
		Status:       current.Status,
		LastSync:     current.LastSync,
		Connected:    current.Connected,
		ConnectionID: current.ConnectionID,
	}
	actionLabel := ""
	switch action {
	case "connect":
		if override.ConnectionID == "" {
			writeError(writer, http.StatusConflict, "connector credentials and connection must be configured first")
			return
		}
		override.Connected = true
		override.Status = "connected"
		override.LastSync = map[string]string{"sandbox": "Sandbox configured", "manual_import": "Manual import configured"}[current.Readiness]
		actionLabel = "Integration connect"
	case "disconnect":
		override.Connected = false
		override.Status = "disconnected"
		override.LastSync = "Not connected"
		actionLabel = "Integration disconnect"
	default:
		writeError(writer, http.StatusNotFound, "unknown integration action")
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, actionLabel, current.Name)
	s.persistIntegrationOverride(claims.OrganizationID, integrationID, override)
	updated, err := s.integrationStatusesForActor(actor, claims.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"items": updated})
}

func (s *Server) workflowSnapshot(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	q := s.queryWorkflowSnapshot(claims.OrganizationID)
	if q == nil {
		writeJSON(writer, http.StatusOK, emptyWorkflowSnapshot())
		return
	}
	writeJSON(writer, http.StatusOK, q)
}

func (s *Server) workflowApprovalAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/workflow/approvals/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	approvalID, action := parts[0], parts[1]
	permission := access.PermissionCreateApproval
	if action == "approve" || action == "reject" {
		permission = access.PermissionApproveFinancial
	}
	claims, _, ok := s.requireTenantActor(writer, request, permission)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	actorRole := s.sessionRoleName(claims)

	var creatorUserID, state string
	var requiredApprovers int
	var approverUserIDs []byte
	if err := s.db.QueryRow(`
		SELECT state, creator_user_id, required_approvers, approver_user_ids
		FROM approval_tasks
		WHERE organization_id = $1 AND id = $2`,
		claims.OrganizationID, approvalID).Scan(&state, &creatorUserID, &requiredApprovers, &approverUserIDs); err != nil {
		writeError(writer, http.StatusNotFound, "approval not found")
		return
	}
	result := ""
	switch action {
	case "approve":
		if claims.Subject == creatorUserID {
			result = "sod"
			break
		}
		var approvers []string
		_ = json.Unmarshal(approverUserIDs, &approvers)
		if slices.Contains(approvers, claims.Subject) {
			result = "duplicate"
			break
		}
		if requiredApprovers == 2 && len(approvers) == 0 && strings.Contains(strings.ToLower(actorRole), "owner") {
			result = "needs-first"
			break
		}
		if state == "SUGGESTED" {
			_ = s.transitionApprovalTask(claims.OrganizationID, approvalID, "SUGGESTED", "ASSIGNED", claims.Subject)
		}
		approvers = append(approvers, claims.Subject)
		approverIDsJSON, _ := json.Marshal(approvers)
		if requiredApprovers == 2 && len(approvers) < 2 {
			_, _ = s.db.Exec(`UPDATE approval_tasks SET approver_user_ids = $1 WHERE id = $2 AND organization_id = $3`, approverIDsJSON, approvalID, claims.OrganizationID)
			result = "partial"
			break
		}
		_, _ = s.db.Exec(`UPDATE approval_tasks SET approver_user_ids = $1 WHERE id = $2 AND organization_id = $3`, approverIDsJSON, approvalID, claims.OrganizationID)
		_ = s.transitionApprovalTask(claims.OrganizationID, approvalID, "ASSIGNED", "APPROVED", claims.Subject)
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Approved & posted", approvalID)
		result = "approved"
	case "reject":
		if state == "SUGGESTED" || state == "ASSIGNED" || state == "ESCALATED" {
			_ = s.transitionApprovalTask(claims.OrganizationID, approvalID, state, "REJECTED", claims.Subject)
			_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Rejected approval", approvalID)
		}
		result = "rejected"
	case "withdraw":
		if state == "SUGGESTED" || state == "ASSIGNED" {
			_ = s.transitionApprovalTask(claims.OrganizationID, approvalID, state, "REJECTED", claims.Subject)
			_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Withdrew approval request", approvalID)
		}
		result = "withdrawn"
	case "escalate":
		if state == "ASSIGNED" {
			_ = s.transitionApprovalTask(claims.OrganizationID, approvalID, "ASSIGNED", "ESCALATED", claims.Subject)
			_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Escalated approval", approvalID)
		}
		result = "escalated"
	case "nudge":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Nudged approver", approvalID)
		result = "nudged"
	case "request-info":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Requested approval info", approvalID)
		result = "requested-info"
	case "resubmit":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Resubmitted approval", approvalID)
		result = "resubmitted"
	case "reassign":
		if state == "ASSIGNED" {
			_, _ = s.db.Exec(`UPDATE approval_tasks SET approver_user_ids = '[]'::jsonb WHERE id = $1 AND organization_id = $2`, approvalID, claims.OrganizationID)
		}
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Reassigned approval", approvalID)
		result = "reassigned"
	default:
		writeError(writer, http.StatusNotFound, "unknown workflow action")
		return
	}
	snapshot := s.queryWorkflowSnapshot(claims.OrganizationID)
	if snapshot == nil {
		snapshot = emptyWorkflowSnapshot()
	}
	writeJSON(writer, http.StatusOK, map[string]any{"result": result, "snapshot": snapshot})
}

func (s *Server) workflowReconciliationAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/workflow/reconciliations/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	reconID, action := parts[0], parts[1]
	permission := access.PermissionReviewReconciliation
	if action == "prepare" || action == "reject" || action == "dismiss" {
		permission = access.PermissionResolveReconciliation
	} else if action == "approve" {
		permission = access.PermissionApproveFinancial
	}
	claims, actor, ok := s.requireTenantActor(writer, request, permission)
	if !ok {
		return
	}
	if action == "approve" {
		if err := access.Authorize(actor, access.Resource{OrganizationID: claims.OrganizationID}, access.PermissionPostLedger); err != nil {
			writeError(writer, http.StatusForbidden, err.Error())
			return
		}
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	result := ""
	switch action {
	case "prepare":
		_ = s.prepareMatchApproval(claims.OrganizationID, claims.Subject, reconID)
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Prepared match - routed for approval", reconID)
		result = "prepared"
	case "reject":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Rejected match - returned to review", reconID)
		result = "rejected"
	case "approve":
		var exists bool
		_ = s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM match_candidates WHERE id = $1 AND organization_id = $2)`, reconID, claims.OrganizationID).Scan(&exists)
		if !exists {
			writeError(writer, http.StatusNotFound, "reconciliation not found")
			return
		}
		_ = s.markLinkedApprovalPosted(claims.OrganizationID, claims.Subject, reconID)
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Reconciliation approved & posted", reconID)
		result = "approved"
	case "dismiss":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Dismissed reconciliation exception", reconID)
		result = "dismissed"
	case "assign":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Delegated reconciliation exception", reconID)
		result = "assigned"
	case "ask":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Requested reconciliation explanation", reconID)
		result = "asked"
	case "acknowledge":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Acknowledged reconciliation exception", reconID)
		result = "acknowledged"
	default:
		writeError(writer, http.StatusNotFound, "unknown workflow action")
		return
	}
	snapshot := s.queryWorkflowSnapshot(claims.OrganizationID)
	if snapshot == nil {
		snapshot = emptyWorkflowSnapshot()
	}
	writeJSON(writer, http.StatusOK, map[string]any{"result": result, "snapshot": snapshot})
}

func (s *Server) reconciliationExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	q := s.queryWorkflowSnapshot(claims.OrganizationID)
	items := 0
	open := 0
	if q != nil {
		items = len(q.Reconciliations)
		for _, item := range q.Reconciliations {
			if item.Stage == "reviewing" || item.Stage == "detected" {
				open++
			}
		}
	}
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Reconciliation Control Summary) Tj\n0 -28 Td\n/F1 11 Tf\n(Total reconciliation items: %d) Tj\n0 -22 Td\n(Open exceptions: %d) Tj\n0 -22 Td\n(Audit evidence is linked to each workflow item.) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from the tenant-scoped reconciliation workflow.) Tj\nET\n", items, open)
	pdf := "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length " + strconv.Itoa(len(content)) + ">>stream\n" + content + "endstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-reconciliation-summary.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(pdf))
}

func (s *Server) prepareMatchApproval(orgID, actorUserID, reconID string) error {
	if s.db == nil {
		return errNoDatabase
	}
	taskID := "ap-from-" + reconID
	var exists bool
	if err := s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM approval_tasks WHERE organization_id = $1 AND id = $2)`, orgID, taskID).Scan(&exists); err == nil && exists {
		return nil
	}
	var amountMinor int64
	var currency, party, ref, reason, tier string
	var amtText string
	err := s.db.QueryRow(`
		SELECT
			COALESCE(le.evidence->>'amount_minor', '0') AS le_amt,
			COALESCE(le.evidence->>'currency', 'USD') AS le_cur,
			COALESCE(lre.display_name, le.evidence->>'counterparty', 'Unknown') AS le_party,
			COALESCE(le.evidence->>'reference', '') AS le_ref,
			COALESCE(mc.reason, '') AS mc_reason,
			COALESCE(mc.confidence_tier, 'SUGGESTED') AS mc_tier
		FROM match_candidates mc
		LEFT JOIN business_events le ON mc.left_event_id = le.id
		LEFT JOIN resolved_entities lre ON le.external_party_id = lre.id
		WHERE mc.id = $1 AND mc.organization_id = $2`, reconID, orgID).Scan(&amtText, &currency, &party, &ref, &reason, &tier)
	if err != nil {
		return err
	}
	amountMinor, _ = strconv.ParseInt(amtText, 10, 64)
	if amountMinor < 0 {
		amountMinor = 0
	}
	requiredApprovers := 1
	if amountMinor > 10000000 {
		requiredApprovers = 2
	}
	subtitle := "prepared"
	if ref != "" {
		subtitle = ref + " - prepared"
	}
	evidence := buildEvidenceJSON(map[string]any{
		"title":          "Approve match: " + party,
		"subtitle":       subtitle,
		"risk":           riskFromReconTier(strings.ToLower(tier)),
		"recommendation": reason,
	})
	_, err = s.db.Exec(`
		INSERT INTO approval_tasks (
			id, organization_id, suggested_action, creator_user_id, assigned_role,
			state, amount_minor, currency, required_approvers, approver_user_ids,
			match_candidate_id, evidence, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb, $10, $11, now())`,
		taskID, orgID, "prepare_match", actorUserID, "",
		"SUGGESTED", amountMinor, currency, requiredApprovers, reconID, evidence)
	return err
}

func (s *Server) markLinkedApprovalPosted(orgID, actorUserID, reconID string) error {
	if s.db == nil {
		return errNoDatabase
	}
	var taskID, state string
	err := s.db.QueryRow(`
		SELECT id, state FROM approval_tasks
		WHERE organization_id = $1 AND match_candidate_id = $2
		ORDER BY created_at DESC LIMIT 1`, orgID, reconID).Scan(&taskID, &state)
	if err != nil {
		return nil
	}
	switch state {
	case "SUGGESTED":
		_ = s.transitionApprovalTask(orgID, taskID, "SUGGESTED", "ASSIGNED", actorUserID)
		_ = s.transitionApprovalTask(orgID, taskID, "ASSIGNED", "APPROVED", actorUserID)
		_ = s.transitionApprovalTask(orgID, taskID, "APPROVED", "EXECUTED", actorUserID)
	case "ASSIGNED":
		_ = s.transitionApprovalTask(orgID, taskID, "ASSIGNED", "APPROVED", actorUserID)
		_ = s.transitionApprovalTask(orgID, taskID, "APPROVED", "EXECUTED", actorUserID)
	case "APPROVED":
		_ = s.transitionApprovalTask(orgID, taskID, "APPROVED", "EXECUTED", actorUserID)
	}
	return nil
}

func approvalMatchesRecon(item WorkflowApprovalItem, recon WorkflowReconciliation) bool {
	if item.Type != "match" {
		return false
	}
	if item.Amount.AmountMinor != recon.Transaction.Amount.AmountMinor || item.Amount.Currency != recon.Transaction.Amount.Currency {
		return false
	}
	title := normalizePartyLabel(strings.TrimPrefix(strings.ToLower(item.Title), "approve match: "))
	counterparty := normalizePartyLabel(recon.Transaction.Counterparty)
	return strings.Contains(counterparty, title) || strings.Contains(title, counterparty)
}

func riskFromReconTier(tier string) string {
	switch tier {
	case "suspicious", "review":
		return "high"
	case "duplicate":
		return "medium"
	default:
		return "low"
	}
}

func recordReference(record *BusinessRecord) string {
	if record == nil {
		return ""
	}
	return record.Reference
}

func coalesce(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func normalizePartyLabel(value string) string {
	normalized := strings.ToLower(value)
	replacer := strings.NewReplacer(".", "", ",", "", "-", " ", "_", " ")
	normalized = replacer.Replace(normalized)
	for _, suffix := range []string{" inc", " ltd", " limited", " llc", " co"} {
		normalized = strings.ReplaceAll(normalized, suffix, "")
	}
	return strings.Join(strings.Fields(normalized), " ")
}

func filterStrings(values []string, target string) []string {
	filtered := values[:0]
	for _, value := range values {
		if value != target {
			filtered = append(filtered, value)
		}
	}
	return filtered
}

func advanceClaimStage(claim *ClaimRecord) (string, bool) {
	order := []string{"fnol", "triage", "adjusting", "approval", "settlement", "closed"}
	for idx, stage := range order {
		if claim.Stage != stage {
			continue
		}
		if idx >= len(order)-1 {
			return claim.Stage, false
		}
		claim.Stage = order[idx+1]
		return claim.Stage, true
	}
	return claim.Stage, false
}

func claimSLAText(stage, current string) string {
	switch stage {
	case "closed":
		return "Closed"
	case "settlement":
		return "Paid - reconciling"
	case "approval":
		return "Awaiting approval"
	case "adjusting":
		return "Adjusting"
	case "triage":
		return "In triage"
	case "fnol":
		return "FNOL"
	default:
		return current
	}
}

func deriveClaimStats(claims []ClaimRecord) ClaimStats {
	stats := ClaimStats{
		TotalReserves: Money{AmountMinor: "0", Currency: "USD"},
		AvgCycleDays:  0.0,
	}
	var totalReserve int64
	for _, claim := range claims {
		if claim.Stage != "closed" {
			stats.OpenClaims++
		}
		switch claim.Stage {
		case "fnol":
			stats.Pipeline.FNOL++
		case "triage":
			stats.Pipeline.Triage++
		case "adjusting":
			stats.Pipeline.Adjusting++
		case "approval":
			stats.Pipeline.Approval++
		case "settlement":
			stats.Pipeline.Settlement++
		case "closed":
			stats.Pipeline.Closed++
		}
		if claim.FraudScore >= 70 || len(claim.FraudFlags) > 0 {
			stats.FraudFlagged++
		}
		if reserve, err := strconv.ParseInt(claim.Reserve.AmountMinor, 10, 64); err == nil {
			totalReserve += reserve
		}
	}
	stats.TotalReserves = Money{AmountMinor: strconv.FormatInt(totalReserve, 10), Currency: "USD"}
	return stats
}

func (s *Server) collectionsOverdue(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	items := s.queryCollectionsOverdue(claims.OrganizationID)
	if items == nil {
		items = []OverdueItem{}
	}
	writeJSON(writer, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) collectionsOverdueAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/collections/overdue/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	itemID, action := parts[0], parts[1]
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionSendCollections)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	actionStatus := map[string]string{
		"remind":          "reminded",
		"promise":         "promised",
		"escalate":        "escalated",
		"hand-to-finance": "handed_to_finance",
		"flag-owner-call": "owner_call",
		"request-update":  "finance_update_requested",
	}[action]
	if actionStatus == "" {
		writeError(writer, http.StatusNotFound, "unknown collections action")
		return
	}

	items := s.queryCollectionsOverdue(claims.OrganizationID)
	if items == nil {
		items = []OverdueItem{}
	}
	var updated OverdueItem
	found := false
	for idx := range items {
		if items[idx].ID == itemID {
			updated = items[idx]
			found = true
			break
		}
	}
	if !found {
		writeError(writer, http.StatusNotFound, "overdue item not found")
		return
	}
	updated.ActionStatus = actionStatus

	now := time.Now().UTC()
	if action == "remind" {
		_, err := s.db.Exec(`
			INSERT INTO collection_reminder_events (
				id, organization_id, case_id, sent_by, delivery_channel, message, evidence, sent_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`,
			"re-"+strconv.FormatInt(now.UnixNano(), 10),
			claims.OrganizationID, itemID, claims.Subject, "email",
			"Reminder sent for overdue item "+itemID,
			buildEvidenceJSON(map[string]any{"action": action, "status": actionStatus}),
			now,
		)
		if err != nil {
			writeError(writer, http.StatusInternalServerError, err.Error())
			return
		}
	} else if err := s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Collections action "+action, itemID); err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"item": updated, "items": items})
}

func (s *Server) collectionsExportSummary(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	items := s.queryCollectionsOverdue(claims.OrganizationID)
	if items == nil {
		items = []OverdueItem{}
	}

	var totalMinor int64
	buckets := map[string]int{"0-30": 0, "31-60": 0, "61-90": 0, "90+": 0}
	for _, item := range items {
		amount, err := strconv.ParseInt(item.Amount.AmountMinor, 10, 64)
		if err == nil {
			totalMinor += amount
		}
		switch {
		case item.DaysOverdue <= 30:
			buckets["0-30"]++
		case item.DaysOverdue <= 60:
			buckets["31-60"]++
		case item.DaysOverdue <= 90:
			buckets["61-90"]++
		default:
			buckets["90+"]++
		}
	}
	currency := "USD"
	if len(items) > 0 && items[0].Amount.Currency != "" {
		currency = items[0].Amount.Currency
	}
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Receivables Summary) Tj\n0 -28 Td\n/F1 11 Tf\n(Generated: %s) Tj\n0 -22 Td\n(Open receivables: %d) Tj\n0 -22 Td\n(Total overdue: %s %.2f) Tj\n0 -22 Td\n(Aging 0-30 days: %d) Tj\n0 -22 Td\n(Aging 31-60 days: %d) Tj\n0 -22 Td\n(Aging 61-90 days: %d) Tj\n0 -22 Td\n(Aging 90+ days: %d) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from tenant-scoped collections records.) Tj\nET\n", time.Now().UTC().Format("2006-01-02 15:04 UTC"), len(items), currency, float64(totalMinor)/100, buckets["0-30"], buckets["31-60"], buckets["61-90"], buckets["90+"])
	pdf := "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length " + strconv.Itoa(len(content)) + ">>stream\n" + content + "endstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-receivables-summary.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(pdf))
}

func (s *Server) claimsWorkspace(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	actor, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents)
	if !ok {
		return
	}

	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}

	payload, err := s.queryClaimsWorkspace(actor.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	if payload == nil {
		payload = emptyClaimsWorkspace()
	}

	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) queryClaimsWorkspace(orgID string) (*ClaimsWorkspaceData, error) {
	// Query claims from business_events and resolved_entities tables
	// Claims are represented as business events with event_type related to insurance claims
	query := `
		SELECT 
			be.id,
			re.display_name as claimant,
			COALESCE(be.attributes->>'policy_number', '') as policy_number,
			COALESCE(be.attributes->>'claim_type', 'general') as type,
			COALESCE(be.attributes->>'stage', 'fnol') as stage,
			COALESCE(be.attributes->>'incident_date', '') as incident_date,
			COALESCE(be.attributes->>'reported_date', '') as reported_date,
			COALESCE(be.attributes->>'description', '') as description,
			COALESCE(be.attributes->>'claimed_amount', '0') as claimed_amount,
			COALESCE(be.attributes->>'deductible', '0') as deductible,
			COALESCE(be.attributes->>'ai_summary', '') as ai_summary,
			COALESCE(be.attributes->>'triage_severity', 'low') as triage_severity,
			COALESCE(be.attributes->>'triage_fast_track', 'false') as triage_fast_track,
			COALESCE(be.attributes->>'fraud_score', '0') as fraud_score,
			COALESCE(be.attributes->>'fraud_flags', '[]') as fraud_flags,
			COALESCE(be.attributes->>'suggested_reserve', '0') as suggested_reserve,
			COALESCE(be.attributes->>'suggested_settlement', '0') as suggested_settlement,
			COALESCE(be.attributes->>'reserve', '0') as reserve,
			COALESCE(be.attributes->>'assigned_to', '') as assigned_to,
			COALESCE(be.attributes->>'sla_text', '') as sla_text,
			COALESCE(be.attributes->>'payment_reconciled', 'false') as payment_reconciled,
			COALESCE(be.attributes->>'coverage_ok', 'true') as coverage_ok,
			COALESCE(be.evidence, '{}'::jsonb) as evidence
		FROM business_events be
		LEFT JOIN resolved_entities re ON be.external_party_id = re.id
		WHERE be.organization_id = $1 
		AND be.event_type IN ('CLAIM_REPORTED', 'CLAIM_UPDATED', 'CLAIM_SETTLED', 'CLAIM_CLOSED')
		ORDER BY be.created_at DESC
		LIMIT 50
	`

	rows, err := s.db.Query(query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var claims []ClaimRecord
	var totalReserveMinor int64
	var fraudFlagged int
	stageCounts := make(map[string]int)

	for rows.Next() {
		var c ClaimRecord
		var claimedAmount, deductible, suggestedReserve, suggestedSettlement, reserve string
		var fraudScore int
		var triageFastTrack, paymentReconciled, coverageOK bool
		var fraudFlagsJSON []byte
		var evidenceJSON []byte

		err := rows.Scan(
			&c.ID, &c.Claimant, &c.PolicyNumber, &c.Type, &c.Stage,
			&c.IncidentDate, &c.ReportedDate, &c.Description,
			&claimedAmount, &deductible, &c.AISummary,
			&c.TriageSeverity, &triageFastTrack, &fraudScore, &fraudFlagsJSON,
			&suggestedReserve, &suggestedSettlement, &reserve,
			&c.AssignedTo, &c.SLAText, &paymentReconciled, &coverageOK,
			&evidenceJSON,
		)
		if err != nil {
			return nil, err
		}

		c.ClaimedAmount = Money{AmountMinor: parseDecimalToMinor(claimedAmount), Currency: "USD"}
		c.Deductible = Money{AmountMinor: parseDecimalToMinor(deductible), Currency: "USD"}
		c.TriageFastTrack = triageFastTrack
		c.FraudScore = fraudScore
		c.SuggestedReserve = Money{AmountMinor: parseDecimalToMinor(suggestedReserve), Currency: "USD"}
		c.SuggestedSettlement = Money{AmountMinor: parseDecimalToMinor(suggestedSettlement), Currency: "USD"}
		c.Reserve = Money{AmountMinor: parseDecimalToMinor(reserve), Currency: "USD"}
		c.PaymentReconciled = &paymentReconciled
		c.CoverageOK = coverageOK

		// Parse fraud flags
		if len(fraudFlagsJSON) > 0 {
			var flags []string
			if err := json.Unmarshal(fraudFlagsJSON, &flags); err == nil {
				c.FraudFlags = flags
			}
		}

		// Parse evidence
		if len(evidenceJSON) > 0 {
			var docs []EvidenceDoc
			if err := json.Unmarshal(evidenceJSON, &docs); err == nil {
				c.Evidence = docs
			}
		}

		if reserveMinor, err := strconv.ParseInt(c.Reserve.AmountMinor, 10, 64); err == nil {
			totalReserveMinor += reserveMinor
		}
		if len(c.FraudFlags) > 0 {
			fraudFlagged++
		}
		stageCounts[c.Stage]++

		claims = append(claims, c)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	// If no claims found, return empty result instead of demo data
	if len(claims) == 0 {
		return &ClaimsWorkspaceData{
			Claims: []ClaimRecord{},
			Stats: ClaimStats{
				OpenClaims:    0,
				TotalReserves: Money{AmountMinor: "0", Currency: "USD"},
				AvgCycleDays:  0,
				FraudFlagged:  0,
				Pipeline:      ClaimStageCounts{},
			},
		}, nil
	}

	return &ClaimsWorkspaceData{
		Claims: claims,
		Stats: ClaimStats{
			OpenClaims:    len(claims),
			TotalReserves: Money{AmountMinor: strconv.FormatInt(totalReserveMinor, 10), Currency: "USD"},
			AvgCycleDays:  0.0,
			FraudFlagged:  fraudFlagged,
			Pipeline: ClaimStageCounts{
				FNOL:       stageCounts["fnol"],
				Triage:     stageCounts["triage"],
				Adjusting:  stageCounts["adjusting"],
				Approval:   stageCounts["approval"],
				Settlement: stageCounts["settlement"],
				Closed:     stageCounts["closed"],
			},
		},
	}, nil
}

func (s *Server) claimsAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, actor, ok := s.requireTenantActor(writer, request, access.PermissionPrepareClaims)
	if !ok {
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/claims/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	claimID, action := parts[0], parts[1]
	actorName := s.sessionDisplayName(claims)

	if action == "advance" {
		if err := access.Authorize(actor, access.Resource{OrganizationID: claims.OrganizationID}, access.PermissionSettleClaims); err != nil {
			writeError(writer, http.StatusForbidden, err.Error())
			return
		}
	}

	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}

	workspace, err := s.queryClaimsWorkspace(claims.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	if workspace == nil {
		workspace = emptyClaimsWorkspace()
	}
	var target *ClaimRecord
	for idx := range workspace.Claims {
		if workspace.Claims[idx].ID == claimID {
			target = &workspace.Claims[idx]
			break
		}
	}
	if target == nil {
		writeError(writer, http.StatusNotFound, "claim not found")
		return
	}

	actionLabel := map[string]string{"advance": "Advanced claim workflow", "refer-siu": "Referred claim to SIU", "request-docs": "Requested claim documents"}[action]
	if actionLabel == "" {
		writeError(writer, http.StatusNotFound, "unknown claim action")
		return
	}

	result := actionLabel
	evidence := map[string]any{"action": action}
	reason := "Claim " + action + " by " + actorName
	switch action {
	case "advance":
		next, changed := advanceClaimStage(target)
		if !changed {
			writeJSON(writer, http.StatusOK, map[string]any{"result": "unchanged", "payload": workspace})
			return
		}
		target.SLAText = claimSLAText(next, target.SLAText)
		result = next
		evidence = map[string]any{"stage": next}
		reason = fmt.Sprintf("Claim advanced to %s by %s", next, actorName)
	case "refer-siu":
		result = "referred-siu"
		evidence = map[string]any{"referSiu": true}
		reason = fmt.Sprintf("Claim referred to SIU by %s", actorName)
	case "request-docs":
		result = "requested-docs"
		evidence = map[string]any{"requestDocs": true}
		reason = fmt.Sprintf("Claim documents requested by %s", actorName)
	}

	now := time.Now().UTC()
	_, err = s.db.Exec(`
		INSERT INTO correction_events (
			id, organization_id, correction_type, original_event_id, replacement_event_id, evidence, reason, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`,
		"ce-"+strconv.FormatInt(now.UnixNano(), 10),
		claims.OrganizationID, "EVENT_ADJUSTED", claimID, nil,
		buildEvidenceJSON(evidence), reason, now,
	)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	auditAction := actionLabel
	if action == "advance" {
		auditAction = "Claim advanced to " + result
	}
	if err := s.appendAuditEntry(claims.OrganizationID, claims.Subject, auditAction, claimID); err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}

	payload, _ := s.queryClaimsWorkspace(claims.OrganizationID)
	if payload == nil {
		payload = emptyClaimsWorkspace()
	}
	writeJSON(writer, http.StatusOK, map[string]any{"result": result, "payload": payload})
}

func (s *Server) consentGrants(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet && request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	permission := access.PermissionReadConsent
	if request.Method == http.MethodPost {
		permission = access.PermissionManageConsent
	}
	actor, _, ok := s.requireTenantActor(writer, request, permission)
	if !ok {
		return
	}

	// GET: Query consent grants from database - no fallback
	if request.Method == http.MethodGet {
		if s.db == nil {
			writeError(writer, http.StatusServiceUnavailable, "database connection required")
			return
		}

		items, err := s.queryConsentGrants(actor.OrganizationID)
		if err != nil {
			writeError(writer, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(writer, http.StatusOK, map[string]any{"items": items})
		return
	}

	// POST: Create new consent grant
	var body struct {
		Grantee     string   `json:"grantee"`
		GranteeType string   `json:"granteeType"`
		Purpose     string   `json:"purpose"`
		Scopes      []string `json:"scopes"`
		ExpiresAt   string   `json:"expiresAt"`
		Basis       string   `json:"basis"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	grantee := strings.TrimSpace(body.Grantee)
	purpose := strings.TrimSpace(body.Purpose)
	expiresAt := strings.TrimSpace(body.ExpiresAt)
	basis := strings.TrimSpace(body.Basis)
	if grantee == "" || purpose == "" || expiresAt == "" || len(body.Scopes) == 0 {
		writeError(writer, http.StatusBadRequest, "missing required consent fields")
		return
	}
	if _, err := time.Parse("2006-01-02", expiresAt); err != nil {
		writeError(writer, http.StatusBadRequest, "expiresAt must be YYYY-MM-DD")
		return
	}
	if basis == "" {
		basis = "Explicit consent - manual grant"
	}
	granteeType := strings.TrimSpace(body.GranteeType)
	if granteeType == "" {
		granteeType = "partner"
	}

	// Insert into database - no fallback to in-memory demo data
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}

	err := s.insertConsentGrant(actor.OrganizationID, actor.Subject, grantee, granteeType, purpose, body.Scopes, expiresAt, basis)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}

	// Reload from DB
	items, err := s.queryConsentGrants(actor.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(writer, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) queryConsentGrants(orgID string) ([]ConsentGrantData, error) {
	query := `
		SELECT 
			eag.id,
			u.display_name as grantee_name,
			COALESCE(eag.purpose, 'Data sharing') as purpose,
			COALESCE(eag.allowed_permissions, '[]'::jsonb) as scopes,
			CASE WHEN eag.revoked_at IS NOT NULL THEN 'revoked'
			     WHEN eag.expires_at < NOW() THEN 'expired'
			     ELSE 'active'
			END as status,
			COALESCE(eag.evidence->>'basis', 'Explicit consent') as basis,
			cu.display_name as granted_by,
			eag.created_at as granted_at,
			eag.expires_at,
			eag.evidence->>'last_accessed' as last_accessed
		FROM external_access_grants eag
		LEFT JOIN users u ON u.id = eag.external_user_id
		LEFT JOIN users cu ON cu.id = eag.consented_by
		WHERE eag.organization_id = $1
		ORDER BY eag.created_at DESC
		LIMIT 50
	`

	rows, err := s.db.Query(query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var grants []ConsentGrantData
	for rows.Next() {
		var g ConsentGrantData
		var grantedAt, expiresAt time.Time
		var lastAccessed sql.NullString
		var scopesJSON []byte

		err := rows.Scan(
			&g.ID, &g.Grantee, &g.Purpose, &scopesJSON, &g.Status,
			&g.Basis, &g.GrantedBy, &grantedAt, &expiresAt, &lastAccessed,
		)
		if err != nil {
			return nil, err
		}

		// Parse scopes
		if len(scopesJSON) > 0 {
			var perms []map[string]interface{}
			if err := json.Unmarshal(scopesJSON, &perms); err == nil {
				for _, p := range perms {
					if name, ok := p["permission"].(string); ok {
						g.Scopes = append(g.Scopes, name)
					}
				}
			}
		}

		g.GrantedAt = grantedAt.Format("2006-01-02")
		g.ExpiresAt = expiresAt.Format("2006-01-02")
		if lastAccessed.Valid {
			g.LastAccessed = lastAccessed.String
		}

		grants = append(grants, g)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	if len(grants) == 0 {
		return []ConsentGrantData{}, nil
	}

	return grants, nil
}

func (s *Server) insertConsentGrant(orgID, userID, grantee, granteeType, purpose string, scopes []string, expiresAt, basis string) error {
	// Find external user by display name (simplified lookup)
	var externalUserID string
	err := s.db.QueryRow(`SELECT id FROM users WHERE display_name = $1 AND organization_id = $2 LIMIT 1`, grantee, orgID).Scan(&externalUserID)
	if err != nil {
		// Create a minimal external user if not found
		externalUserID = "ext-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	}

	// Build permissions JSON array
	scopesJSON := "["
	for i, scope := range scopes {
		if i > 0 {
			scopesJSON += ","
		}
		scopesJSON += fmt.Sprintf(`{"permission":"%s"}`, scope)
	}
	scopesJSON += "]"

	insertQuery := `
		INSERT INTO external_access_grants 
		(id, organization_id, external_user_id, allowed_permissions, purpose, consented_by, expires_at, evidence)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err = s.db.Exec(insertQuery,
		"cs-"+strconv.FormatInt(time.Now().UnixNano(), 10),
		orgID,
		externalUserID,
		scopesJSON,
		purpose,
		userID,
		expiresAt,
		fmt.Sprintf(`{"basis":"%s"}`, basis),
	)
	return err
}

func (s *Server) consentGrantAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageConsent)
	if !ok {
		return
	}
	path := strings.Trim(strings.TrimPrefix(request.URL.Path, "/api/consent/grants/"), "/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "consent grant not found")
		return
	}
	grantID := parts[0]
	action := parts[1]

	if action != "approve" && action != "revoke" {
		writeError(writer, http.StatusNotFound, "action not found")
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}

	var exists bool
	err := s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM external_access_grants WHERE id = $1 AND organization_id = $2)`, grantID, claims.OrganizationID).Scan(&exists)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	if !exists {
		writeError(writer, http.StatusNotFound, "consent grant not found")
		return
	}

	switch action {
	case "revoke":
		now := time.Now().UTC()
		evidence := map[string]string{"action": "revoked", "revoked_by": claims.Subject, "revoked_at": now.Format(time.RFC3339)}
		res, err := s.db.Exec(
			`UPDATE external_access_grants
			 SET revoked_at = $1, revoked_by = $2, revocation_evidence = $3
			 WHERE id = $4 AND organization_id = $5 AND revoked_at IS NULL`,
			now, claims.Subject, string(buildEvidenceJSON(evidence)), grantID, claims.OrganizationID,
		)
		if err != nil {
			writeError(writer, http.StatusInternalServerError, err.Error())
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			writeError(writer, http.StatusNotFound, "consent grant not found")
			return
		}
	}

	if err := s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Consent "+action, grantID); err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}

	items, err := s.queryConsentGrants(claims.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) relationshipsOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	actor, _, ok := s.requireTenantActor(writer, request, access.PermissionReadRelationships)
	if !ok {
		return
	}

	// Query relationships from database - no fallback
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}

	payload, err := s.queryRelationshipsOverview(actor.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) queryRelationshipsOverview(orgID string) (*RelationshipsOverviewData, error) {
	query := `
		SELECT 
			re.id,
			re.entity_type,
			re.display_name,
			COALESCE(re.attributes->>'contact_name', '') as contact_name,
			COALESCE(re.attributes->>'email', '') as email,
			COALESCE(re.attributes->>'phone', '') as phone,
			COALESCE(re.attributes->>'relationship_type', 'partner') as relationship_type,
			COALESCE(re.attributes->>'status', 'active') as status,
			COALESCE(re.attributes->>'credit_limit', '0') as credit_limit,
			COALESCE(re.attributes->>'outstanding_balance', '0') as outstanding_balance,
			COALESCE(re.attributes->>'currency', 'USD') as currency,
			COALESCE(re.created_at, NOW()) as created_at
		FROM resolved_entities re
		WHERE re.organization_id = $1 
		AND re.entity_type = 'EXTERNAL_PARTY'
		ORDER BY re.created_at DESC
		LIMIT 50
	`

	rows, err := s.db.Query(query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var parties []RelationshipParty
	var totalParties, activeParties int
	for rows.Next() {
		var p RelationshipParty
		var createdAt time.Time
		var creditLimit, outstandingBalance, currency string

		err := rows.Scan(
			&p.ID, &p.Type, &p.Name, &p.Contact, &p.Email, &p.Phone,
			&p.RelationshipType, &p.Status, &creditLimit, &outstandingBalance, &currency, &createdAt,
		)
		if err != nil {
			return nil, err
		}

		p.CreditLimit = Money{AmountMinor: parseDecimalToMinor(creditLimit), Currency: currency}
		p.OutstandingBalance = Money{AmountMinor: parseDecimalToMinor(outstandingBalance), Currency: currency}
		p.Since = createdAt.Format("2006-01-02")

		totalParties++
		if p.Status == "active" {
			activeParties++
		}

		parties = append(parties, p)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	if len(parties) == 0 {
		return &RelationshipsOverviewData{
			Parties:       []RelationshipParty{},
			TotalParties:  0,
			ActiveParties: 0,
		}, nil
	}

	return &RelationshipsOverviewData{
		Parties:       parties,
		TotalParties:  totalParties,
		ActiveParties: activeParties,
	}, nil
}

func (s *Server) relationshipPartyAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageRelationships)
	if !ok {
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/relationships/parties/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	partyID, action := parts[0], parts[1]
	auditAction := ""
	switch action {
	case "email-contact":
		auditAction = "Relationship email contact"
	case "review-terms":
		auditAction = "Relationship review terms"
	case "send-statement":
		auditAction = "Relationship send statement"
	case "schedule-payment":
		auditAction = "Relationship schedule payment"
	default:
		writeError(writer, http.StatusNotFound, "unknown relationship action")
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}

	var partyName string
	err := s.db.QueryRow(
		`SELECT display_name FROM resolved_entities WHERE id = $1 AND organization_id = $2 AND entity_type = 'EXTERNAL_PARTY'`,
		partyID, claims.OrganizationID,
	).Scan(&partyName)
	if err != nil {
		writeError(writer, http.StatusNotFound, "party not found")
		return
	}

	if err := s.appendAuditEntry(claims.OrganizationID, claims.Subject, auditAction, partyID); err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}

	payload, err := s.queryRelationshipsOverview(claims.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) roiSummary(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	actor, _, ok := s.requireTenantActor(writer, request, access.PermissionReadROI)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	data, err := s.queryROISummary(actor.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, data)
}

func (s *Server) roiExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	actor, _, ok := s.requireTenantActor(writer, request, access.PermissionReadROI)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	data, err := s.queryROISummary(actor.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora ROI Summary) Tj\n0 -28 Td\n/F1 12 Tf\n(Total value delivered: %s %s) Tj\n0 -22 Td\n(Subscription cost: %s %s) Tj\n0 -22 Td\n(ROI multiple: %.1fx) Tj\n0 -22 Td\n(Hours saved: %d) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from tenant-scoped, evidence-backed ROI records.) Tj\nET\n", data.TotalValue.AmountMinor, data.TotalValue.Currency, data.SubscriptionCost.AmountMinor, data.SubscriptionCost.Currency, data.ROIMultiple, data.HoursSaved)
	pdf := "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length " + strconv.Itoa(len(content)) + ">>stream\n" + content + "endstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-roi-summary.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(pdf))
}

func (s *Server) queryROISummary(orgID string) (*ROISummaryPayload, error) {
	if s.db == nil {
		return nil, errNoDatabase
	}
	var totalMinor, minutesSaved int64
	var currency string
	err := s.db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN impact_type IN ('MONEY_RECOVERED','DUPLICATE_PAYMENT_AVOIDED','UNSUPPORTED_PAYMENT_CAUGHT','LATE_INVOICE_COLLECTED') THEN amount_minor ELSE 0 END), 0)::bigint,
			COALESCE(SUM(CASE WHEN impact_type IN ('HOURS_SAVED','MISSING_DOCUMENT_FIXED') THEN minutes_saved ELSE 0 END), 0)::bigint,
			COALESCE(MAX(CASE WHEN impact_type IN ('MONEY_RECOVERED','DUPLICATE_PAYMENT_AVOIDED','UNSUPPORTED_PAYMENT_CAUGHT','LATE_INVOICE_COLLECTED') THEN currency END), 'USD')
		FROM roi_facts
		WHERE organization_id = $1`, orgID).Scan(&totalMinor, &minutesSaved, &currency)
	if err != nil {
		return nil, err
	}

	labels := []string{}
	series := []float64{}
	rows, err := s.db.Query(`
		SELECT to_char(date_trunc('month', created_at), 'YYYY-MM'),
		       SUM(amount_minor)::bigint
		FROM roi_facts
		WHERE organization_id = $1
		  AND impact_type IN ('MONEY_RECOVERED','DUPLICATE_PAYMENT_AVOIDED','UNSUPPORTED_PAYMENT_CAUGHT','LATE_INVOICE_COLLECTED')
		GROUP BY 1 ORDER BY 1`, orgID)
	if err == nil {
		defer rows.Close()
		var cumulative int64
		for rows.Next() {
			var label string
			var minor int64
			if err := rows.Scan(&label, &minor); err != nil {
				continue
			}
			cumulative += minor
			labels = append(labels, label)
			series = append(series, float64(cumulative)/100000.0)
		}
	}

	items := []ROIItemData{}
	itemRows, err := s.db.Query(`
		SELECT impact_type, SUM(amount_minor)::bigint
		FROM roi_facts
		WHERE organization_id = $1
		  AND impact_type IN ('MONEY_RECOVERED','DUPLICATE_PAYMENT_AVOIDED','UNSUPPORTED_PAYMENT_CAUGHT','LATE_INVOICE_COLLECTED')
		GROUP BY impact_type`, orgID)
	if err == nil {
		defer itemRows.Close()
		for itemRows.Next() {
			var impactType string
			var minor int64
			if err := itemRows.Scan(&impactType, &minor); err != nil {
				continue
			}
			item := ROIItemData{ID: strings.ToLower(impactType), Value: Money{AmountMinor: itoa(minor), Currency: currency}}
			switch impactType {
			case "MONEY_RECOVERED":
				item.Icon, item.Label, item.Detail = "recovered", "Cash recovered", "Funds recovered from flagged transactions"
			case "DUPLICATE_PAYMENT_AVOIDED":
				item.Icon, item.Label, item.Detail = "duplicates", "Duplicate payments avoided", "Prevented repeat payments on matched records"
			case "UNSUPPORTED_PAYMENT_CAUGHT":
				item.Icon, item.Label, item.Detail = "unsupported", "Unsupported payments caught", "Blocked payments without supporting evidence"
			case "LATE_INVOICE_COLLECTED":
				item.Icon, item.Label, item.Detail = "recovered", "Late invoices collected", "Outstanding invoices collected through reminders"
			}
			items = append(items, item)
		}
	}

	return &ROISummaryPayload{
		TotalValue:       Money{AmountMinor: itoa(totalMinor), Currency: currency},
		SubscriptionCost: Money{AmountMinor: "0", Currency: currency},
		ROIMultiple:      0,
		Series:           series,
		Labels:           labels,
		Items:            items,
		HoursSaved:       int(minutesSaved / 60),
	}, nil
}

func (s *Server) portalCreditPassport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requirePortalPassportAccess(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	payload, err := s.queryPortalCreditPassport(claims)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	s.recordExternalPassportAccess(claims, "External Credit Passport accessed")
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) queryPortalCreditPassport(claims auth.Claims) (*PortalCreditPassportPayload, error) {
	if s.db == nil {
		return nil, errNoDatabase
	}
	out := &PortalCreditPassportPayload{
		SubScores: []PortalCreditSubScore{},
		Trends: PortalCreditTrends{
			Labels:   []string{},
			Revenue:  []float64{},
			Cashflow: []float64{},
		},
		Affordability: PortalCreditAffordability{
			MaxFacility:     Money{AmountMinor: "0", Currency: "USD"},
			MonthlyCapacity: Money{AmountMinor: "0", Currency: "USD"},
			Assumptions:     []string{},
		},
		EvidencePack: []PortalCreditEvidenceFactor{},
		Grant: PortalCreditGrantInfo{
			DataCategories: []string{},
			ScopeNote:      "Credit Passport data shared through a consent-scoped access grant.",
		},
	}
	if org, err := s.organizationByID(claims.OrganizationID); err == nil {
		out.Passport.Tenant = org.Name
		out.Passport.SharedBy = org.Name
	}

	var payloadJSON []byte
	var createdAt time.Time
	err := s.db.QueryRow(`
		SELECT payload, created_at
		FROM credit_passports
		WHERE organization_id = $1
		ORDER BY created_at DESC
		LIMIT 1`, claims.OrganizationID).Scan(&payloadJSON, &createdAt)
	if err == nil {
		var p struct {
			HealthScore int `json:"health_score"`
			Cashflow    *struct {
				Currency            string `json:"currency"`
				NetCashflowMinor    int64  `json:"net_cashflow_minor"`
				AverageMonthlyMinor int64  `json:"average_monthly_minor"`
			} `json:"cashflow"`
			PaymentDiscipline *struct {
				MatchedPayments int `json:"matched_payments"`
				OnTimePayments  int `json:"on_time_payments"`
			} `json:"payment_discipline"`
			Receivables *struct {
				OutstandingMinor int64 `json:"outstanding_minor"`
				OverdueMinor     int64 `json:"overdue_minor"`
			} `json:"receivables"`
			Obligations *struct {
				MonthlyDebtServiceMinor int64 `json:"monthly_debt_service_minor"`
			} `json:"obligations"`
			RiskFlags []struct {
				Severity string `json:"severity"`
			} `json:"risk_flags"`
			Affordability *struct {
				Currency                string   `json:"currency"`
				EstimatedPrincipalMinor int64    `json:"estimated_principal_minor"`
				MaxMonthlyPaymentMinor  int64    `json:"max_monthly_payment_minor"`
				TermMonths              int      `json:"term_months"`
				Assumptions             []string `json:"assumptions"`
			} `json:"affordability"`
		}
		if json.Unmarshal(payloadJSON, &p) == nil {
			out.Passport.Score = p.HealthScore
			out.Passport.Label = creditScoreLabel(p.HealthScore)
			out.Passport.Band = creditScoreBand(p.HealthScore)
			out.Passport.Updated = createdAt.Format("Jan 2, 2006")

			if p.Cashflow != nil {
				cashflowValue := 50
				if p.Cashflow.AverageMonthlyMinor > 0 {
					ratio := float64(p.Cashflow.NetCashflowMinor) / float64(p.Cashflow.AverageMonthlyMinor)
					cashflowValue = int(50 + 50*ratio)
				}
				if cashflowValue > 100 {
					cashflowValue = 100
				}
				if cashflowValue < 0 {
					cashflowValue = 0
				}
				out.SubScores = append(out.SubScores, PortalCreditSubScore{
					ID: "cashflow", Label: "Cash flow", Value: cashflowValue,
					Rating: creditRating(cashflowValue), Evidence: "Verified net cash flow from bank feed",
				})
			}
			if p.PaymentDiscipline != nil && p.PaymentDiscipline.MatchedPayments > 0 {
				value := p.PaymentDiscipline.OnTimePayments * 100 / p.PaymentDiscipline.MatchedPayments
				out.SubScores = append(out.SubScores, PortalCreditSubScore{
					ID: "discipline", Label: "Payment discipline", Value: value,
					Rating: creditRating(value), Evidence: "On-time payment ratio across matched records",
				})
			}
			if p.Receivables != nil && p.Receivables.OutstandingMinor > 0 {
				value := 100 - int(p.Receivables.OverdueMinor*100/p.Receivables.OutstandingMinor)
				if value < 0 {
					value = 0
				}
				out.SubScores = append(out.SubScores, PortalCreditSubScore{
					ID: "receivables", Label: "Receivables", Value: value,
					Rating: creditRating(value), Evidence: "Share of receivables outstanding on time",
				})
			}
			if p.Obligations != nil && p.Cashflow != nil && p.Cashflow.AverageMonthlyMinor > 0 {
				value := 100 - int(p.Obligations.MonthlyDebtServiceMinor*100/p.Cashflow.AverageMonthlyMinor)
				if value < 0 {
					value = 0
				}
				out.SubScores = append(out.SubScores, PortalCreditSubScore{
					ID: "obligations", Label: "Debt service", Value: value,
					Rating: creditRating(value), Evidence: "Debt service relative to average cash flow",
				})
			}
			if p.Affordability != nil {
				affCurrency := p.Affordability.Currency
				if affCurrency == "" {
					affCurrency = "USD"
				}
				out.Affordability.MaxFacility = Money{AmountMinor: itoa(p.Affordability.EstimatedPrincipalMinor), Currency: affCurrency}
				out.Affordability.MonthlyCapacity = Money{AmountMinor: itoa(p.Affordability.MaxMonthlyPaymentMinor), Currency: affCurrency}
				out.Affordability.TermMonths = p.Affordability.TermMonths
				out.Affordability.Assumptions = append([]string(nil), p.Affordability.Assumptions...)
				if out.Affordability.Assumptions == nil {
					out.Affordability.Assumptions = []string{}
				}
			}
			riskCount := 0
			for _, rf := range p.RiskFlags {
				if rf.Severity == "HIGH" || rf.Severity == "CRITICAL" {
					riskCount++
				}
			}
			if riskCount > 0 {
				out.SubScores = append(out.SubScores, PortalCreditSubScore{
					ID: "risk", Label: "Risk flags", Value: riskCount * 10, Rating: "Low",
					Evidence: fmt.Sprintf("%d high-severity risk flag(s) open", riskCount),
				})
			}
		}
	}

	var expiresAt time.Time
	var categoriesJSON []byte
	var sharedBy string
	err = s.db.QueryRow(`
		SELECT eag.expires_at, eag.allowed_data_categories, COALESCE(u.display_name, '')
		FROM external_access_grants eag
		LEFT JOIN users u ON u.id = eag.consented_by
		WHERE eag.organization_id = $1 AND eag.external_user_id = $2
		  AND eag.revoked_at IS NULL AND eag.expires_at > NOW()
		ORDER BY eag.created_at DESC
		LIMIT 1`, claims.OrganizationID, claims.Subject).Scan(&expiresAt, &categoriesJSON, &sharedBy)
	if err == nil {
		out.Grant.ExpiresInDays = int(time.Until(expiresAt).Hours() / 24)
		if out.Grant.ExpiresInDays < 0 {
			out.Grant.ExpiresInDays = 0
		}
		if len(categoriesJSON) > 0 {
			_ = json.Unmarshal(categoriesJSON, &out.Grant.DataCategories)
		}
		if out.Grant.DataCategories == nil {
			out.Grant.DataCategories = []string{}
		}
		if sharedBy != "" {
			out.Passport.SharedBy = sharedBy
		}
	}

	evidenceRows, err := s.db.Query(`
		SELECT cpe.passport_id,
		       COALESCE(cpe.evidence->>'factor', 'Evidence'),
		       COALESCE(d.file_name, 'document'),
		       COALESCE(cpe.evidence->>'detail', 'Consent-scoped evidence record')
		FROM credit_passport_evidence cpe
		LEFT JOIN documents d ON d.id = cpe.source_document_id
		WHERE cpe.organization_id = $1
		ORDER BY cpe.passport_id
		LIMIT 5`, claims.OrganizationID)
	if err == nil {
		defer evidenceRows.Close()
		for evidenceRows.Next() {
			var e PortalCreditEvidenceFactor
			if err := evidenceRows.Scan(&e.ID, &e.Factor, &e.DocName, &e.Detail); err != nil {
				continue
			}
			out.EvidencePack = append(out.EvidencePack, e)
		}
	}

	return out, nil
}

func creditScoreLabel(score int) string {
	switch {
	case score >= 90:
		return "Excellent"
	case score >= 70:
		return "Good"
	case score >= 50:
		return "Fair"
	default:
		return "Poor"
	}
}

func creditScoreBand(score int) string {
	switch {
	case score >= 90:
		return "A+"
	case score >= 80:
		return "A"
	case score >= 70:
		return "B+"
	case score >= 60:
		return "B"
	case score >= 50:
		return "C"
	default:
		return "D"
	}
}

func creditRating(value int) string {
	switch {
	case value >= 85:
		return "Strong"
	case value >= 70:
		return "Good"
	case value >= 50:
		return "Fair"
	default:
		return "Low"
	}
}

func (s *Server) portalCreditPassportDownload(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requirePortalPassportAccess(writer, request)
	if !ok {
		return
	}
	s.recordExternalPassportAccess(claims, "External Credit Passport downloaded")
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", `attachment; filename="kora-credit-passport.pdf"`)
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write(creditPassportPDF())
}

func (s *Server) portalAccessOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requirePortalPassportAccess(writer, request)
	if !ok {
		return
	}
	organization, err := s.organizationByID(claims.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, "organization not found")
		return
	}
	grants := s.activePortalGrants(claims.Subject, time.Now().UTC())
	activity := s.portalActivity(claims)
	writeJSON(writer, http.StatusOK, portalAccessResponse{
		OrganizationName: organization.Name,
		Grants:           grants,
		Activity:         activity,
	})
}

func (s *Server) portalAccessRequest(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requirePortalPassportAccess(writer, request)
	if !ok {
		return
	}
	if !slices.Contains(claims.Roles, string(access.RoleExternalCollaborator)) {
		writeError(writer, http.StatusForbidden, "only external collaborators can request additional access")
		return
	}
	var body struct {
		Scope string `json:"scope"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	scope := strings.TrimSpace(body.Scope)
	if !slices.Contains([]string{"transactions", "contracts", "financials", "bank-statements"}, scope) {
		writeError(writer, http.StatusBadRequest, "unsupported access scope")
		return
	}
	for _, grant := range s.activePortalGrants(claims.Subject, time.Now().UTC()) {
		if slices.Contains(grant.Scopes, scope) {
			writeError(writer, http.StatusBadRequest, "scope is already granted")
			return
		}
	}

	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}

	user, err := s.identityStore.FindUserByID(claims.Subject)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, "external user not found")
		return
	}
	now := time.Now().UTC()
	item := ConsentGrantData{
		ID:              "cs-" + strconv.FormatInt(now.UnixNano(), 10),
		Grantee:         user.DisplayName,
		GranteeType:     "lender",
		RecipientUserID: claims.Subject,
		Purpose:         "Additional portal access requested by external collaborator",
		Scopes:          []string{scope},
		Status:          "pending",
		Basis:           "Awaiting authorisation",
		GrantedBy:       user.DisplayName,
		GrantedAt:       now.Format("2006-01-02"),
		ExpiresAt:       now.AddDate(0, 6, 0).Format("2006-01-02"),
	}
	if err := s.appendAuditEntry(claims.OrganizationID, claims.Subject, "External access scope requested", scope); err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(writer, http.StatusAccepted, map[string]ConsentGrantData{"item": item})
}

func (s *Server) agentsOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}

	// Require database connection - no demo data fallback
	if s.db == nil {
		writeError(writer, http.StatusInternalServerError, "database not connected")
		return
	}

	actorName := s.sessionDisplayName(claims)
	for _, agentID := range []string{"a-intake", "a-recon", "a-cfo", "a-rel", "a-contract", "a-coll", "a-credit", "a-supplier", "a-sales", "a-audit"} {
		s.runAgentFromDB(agentID, actorName, claims.Subject, claims.OrganizationID)
	}

	payload := s.queryAgentsOverviewFromDB(claims.OrganizationID)
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) agentRun(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionRunAgents)
	if !ok {
		return
	}
	if strings.TrimSpace(s.runtimeDatabaseURL) == "" {
		writeError(writer, http.StatusNotFound, "agent not found")
		return
	}
	agentID := strings.Trim(strings.TrimPrefix(request.URL.Path, "/api/agents/run/"), "/")
	if agentID == "" {
		writeError(writer, http.StatusNotFound, "agent not found")
		return
	}

	// Run agent logic using database
	actorName := s.sessionDisplayName(claims)
	s.runAgentFromDB(agentID, actorName, claims.Subject, claims.OrganizationID)

	payload := s.queryAgentsOverviewFromDB(claims.OrganizationID)
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) agentRunAll(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionRunAgents)
	if !ok {
		return
	}
	if strings.TrimSpace(s.runtimeDatabaseURL) == "" {
		writeError(writer, http.StatusNotFound, "agent not found")
		return
	}
	actorName := s.sessionDisplayName(claims)

	// Run all agents using database
	for _, agentID := range []string{"a-intake", "a-recon", "a-cfo", "a-rel", "a-contract", "a-coll", "a-credit", "a-supplier", "a-sales", "a-audit"} {
		s.runAgentFromDB(agentID, actorName, claims.Subject, claims.OrganizationID)
	}

	payload := s.queryAgentsOverviewFromDB(claims.OrganizationID)
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) agentFeedback(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionSubmitAgentFeedback)
	if !ok {
		return
	}
	path := strings.Trim(strings.TrimPrefix(request.URL.Path, "/api/agents/"), "/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 || parts[1] != "feedback" || parts[0] == "" {
		writeError(writer, http.StatusNotFound, "agent feedback route not found")
		return
	}
	var body struct {
		Rating string `json:"rating"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	rating := strings.TrimSpace(body.Rating)
	if rating != "helpful" && rating != "not_helpful" {
		writeError(writer, http.StatusBadRequest, "rating must be helpful or not_helpful")
		return
	}

	agentID := parts[0]
	now := time.Now().UTC()

	// Insert feedback into database
	err := s.insertAgentFeedback(agentID, rating, claims.Subject, claims.OrganizationID, now)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, "failed to save feedback")
		return
	}

	payload := s.queryAgentsOverviewFromDB(claims.OrganizationID)
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) collectionsManagement(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionSendCollections)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	writeJSON(writer, http.StatusOK, s.queryCollectionsManagement(claims.OrganizationID))
}

func (s *Server) collectionsManagementAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionSendCollections)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	path := strings.Trim(strings.TrimPrefix(request.URL.Path, "/api/collections/management/"), "/")
	parts := strings.Split(path, "/")
	if len(parts) == 2 && parts[0] == "policy" && parts[1] == "update" {
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Updated collections policy", "collections")
		writeJSON(writer, http.StatusOK, s.queryCollectionsManagement(claims.OrganizationID))
		return
	}
	if len(parts) != 3 || parts[0] != "escalations" || parts[2] != "decision" {
		writeError(writer, http.StatusNotFound, "collections action not found")
		return
	}
	var body struct {
		Decision string `json:"decision"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	decision := strings.TrimSpace(body.Decision)
	if decision != "approved" && decision != "declined" {
		writeError(writer, http.StatusBadRequest, "invalid decision")
		return
	}
	escalationID := parts[1]
	var customer, invoice string
	err := s.db.QueryRow(`
		SELECT COALESCE(re.display_name, ''), COALESCE(be.id, escalationID)
		FROM collection_cases cc
		LEFT JOIN resolved_entities re ON cc.external_party_id = re.id
		LEFT JOIN business_events be ON cc.invoice_event_id = be.id
		WHERE cc.organization_id = $1 AND cc.id = $2 AND cc.state = 'ESCALATED'`,
		claims.OrganizationID, escalationID).Scan(&customer, &invoice)
	if err != nil {
		writeError(writer, http.StatusNotFound, "escalation not found")
		return
	}
	action := map[string]string{
		"approved": "Approved collections escalation",
		"declined": "Declined collections escalation",
	}[decision]
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, action, customer+" · "+invoice)
	writeJSON(writer, http.StatusOK, s.queryCollectionsManagement(claims.OrganizationID))
}

func (s *Server) ownerSummary(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryOwnerSummary(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyOwnerHomeSummary())
}

func (s *Server) ownerDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryOwnerDashboard(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyOwnerDashboard())
}

func (s *Server) adminDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryAdminDashboard(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyAdminDashboard())
}

func (s *Server) adminAccessRequestAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/home/admin-dashboard/access-requests/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	requestID, action := parts[0], parts[1]
	if action != "grant" && action != "deny" {
		writeError(writer, http.StatusNotFound, "unknown access request action")
		return
	}
	var requester, resource string
	err := s.db.QueryRow(`
		SELECT COALESCE(u.display_name, ''), COALESCE(sag.resource, '')
		FROM platform_support_access_grants sag
		LEFT JOIN platform_users pu ON sag.requested_by = pu.id
		LEFT JOIN users u ON u.id = pu.user_id
		WHERE sag.id = $1`, requestID).Scan(&requester, &resource)
	if err != nil {
		writeError(writer, http.StatusNotFound, "access request not found")
		return
	}
	actionLabel := "Access request denied"
	if action == "grant" {
		actionLabel = "Access request granted"
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, actionLabel, requester+" · "+resource)
	if q := s.queryAdminDashboard(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyAdminDashboard())
}

func (s *Server) operatorDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryOperatorDashboard(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyOperatorHome())
}

func (s *Server) auditorDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryAuditInvestigations(claims.OrganizationID); q != nil {
		aud := AuditorHomeData{
			ControlHealth: ControlHealthData{
				Score:     q.ControlHealth.Score,
				TrendPts:  []int{q.ControlHealth.TrendPts},
				Subscores: q.ControlHealth.Subscores,
			},
			RiskStats: RiskStatsData{
				RiskFlags:     q.RiskStats.RiskFlags,
				SODViolations: q.RiskStats.SodViolations,
				Suspicious:    q.RiskStats.Suspicious,
				MissingDocs:   q.RiskStats.MissingDocs,
			},
			SODViolations: []SODViolationData{},
			MissingDocs:   []MissingDocData{},
		}
		writeJSON(writer, http.StatusOK, aud)
		return
	}
	writeJSON(writer, http.StatusOK, emptyAuditorHome())
}

func (s *Server) platformDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, ok := s.requirePlatformAdmin(writer, request); !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	writeJSON(writer, http.StatusOK, s.queryPlatformHome())
}

func (s *Server) intakeDocsAPI(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents)
	if !ok {
		return
	}

	if s.ingestionServiceURL != "" {
		ingestResp, err := s.httpClient.Get(s.ingestionServiceURL + "/v1/documents?organization_id=" + url.QueryEscape(claims.OrganizationID))
		if err == nil {
			defer ingestResp.Body.Close()
			if ingestResp.StatusCode == http.StatusOK {
				body, _ := io.ReadAll(ingestResp.Body)
				var response struct {
					Items []IntakeDoc `json:"items"`
				}
				var docsResponse struct {
					Items []ingestion.Document `json:"items"`
				}
				if err := json.Unmarshal(body, &docsResponse); err == nil {
					response.Items = make([]IntakeDoc, 0, len(docsResponse.Items))
					for _, d := range docsResponse.Items {
						docType := "document"
						if strings.Contains(strings.ToLower(d.ContentType), "invoice") {
							docType = "invoice"
						}
						response.Items = append(response.Items, IntakeDoc{
							ID:         d.ID,
							Name:       d.FileName,
							Type:       docType,
							Source:     "upload",
							ReceivedAt: d.CreatedAt.Format(time.RFC3339),
							Stage:      "extracting",
							SizeText:   fmt.Sprintf("%d KB", d.SizeBytes/1024),
							Fields:     []ExtractedField{},
						})
					}
					writeJSON(writer, http.StatusOK, response)
					return
				}
			}
		}
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryIntakeDocs(claims.OrganizationID)})
}

func (s *Server) intakeSourcesAPI(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageIntegrations)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	sources := map[string]bool{}
	rows, err := s.db.Query(`SELECT resource FROM audit_entries WHERE organization_id = $1 AND action = 'intake.source' ORDER BY occurred_at ASC`, claims.OrganizationID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var source string
			if rows.Scan(&source) == nil {
				sources[source] = true
			}
		}
	}
	writeJSON(writer, http.StatusOK, map[string]any{"sources": sources})
}

func (s *Server) intakeSourceAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageIntegrations)
	if !ok {
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/intake/sources/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || !slices.Contains([]string{"bank-feed", "email", "scan"}, parts[0]) || parts[1] != "connect" {
		writeError(writer, http.StatusNotFound, "unknown intake source action")
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if err := s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Connected intake source", parts[0]); err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "intake.source", parts[0])
	writeJSON(writer, http.StatusOK, map[string]any{"source": parts[0], "connected": true})
}

func (s *Server) intakeUpload(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionUploadDocuments)
	if !ok {
		return
	}

	contentType := request.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") && s.documentAIURL != "" {
		s.intakeUploadFile(writer, request, claims)
		return
	}

	var body struct {
		Name string `json:"name"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeError(writer, http.StatusBadRequest, "document name is required")
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	now := time.Now().UTC()
	batchID := "batch-" + strconv.FormatInt(now.UnixNano(), 10)
	docID := "doc-upload-" + strconv.FormatInt(now.UnixNano(), 10)
	_, _ = s.db.Exec(`INSERT INTO ingestion_batches (id, organization_id, status, created_at) VALUES ($1, $2, 'EXTRACTING', $3)`, batchID, claims.OrganizationID, now)
	_, _ = s.db.Exec(`
		INSERT INTO documents (id, organization_id, batch_id, file_name, content_type, object_key, fingerprint, size_bytes, created_at)
		VALUES ($1, $2, $3, $4, 'application/json', '', $5, 0, $6)`,
		docID, claims.OrganizationID, batchID, name, "fingerprint-"+docID, now)
	doc := IntakeDoc{
		ID:         docID,
		Name:       name,
		Type:       "document",
		Source:     "upload",
		ReceivedAt: now.Format(time.RFC3339),
		Stage:      "extracting",
		Status:     "processing",
		SizeText:   "- KB",
		Fields:     []ExtractedField{},
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Uploaded document", name)
	writeJSON(writer, http.StatusOK, doc)
}

func (s *Server) intakeUploadFile(writer http.ResponseWriter, request *http.Request, claims auth.Claims) {
	if err := request.ParseMultipartForm(32 << 20); err != nil {
		writeError(writer, http.StatusBadRequest, "failed to parse multipart form: "+err.Error())
		return
	}
	file, header, err := request.FormFile("file")
	if err != nil {
		writeError(writer, http.StatusBadRequest, "file field is required")
		return
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, "failed to read file")
		return
	}
	contentBase64 := base64.StdEncoding.EncodeToString(content)

	extractionInput := map[string]any{
		"organization_id":       claims.OrganizationID,
		"source_document_id":    "upload-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		"ingestion_batch_id":    "batch-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		"extraction_version_id": "xver-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		"file_name":             header.Filename,
		"content_type":          header.Header.Get("Content-Type"),
		"content_base64":        contentBase64,
	}
	body, _ := json.Marshal(extractionInput)
	extractResp, err := s.httpClient.Post(s.documentAIURL+"/v1/documents/extract", "application/json", bytes.NewReader(body))
	if err != nil {
		writeError(writer, http.StatusServiceUnavailable, "document AI service unreachable: "+err.Error())
		return
	}
	defer extractResp.Body.Close()
	extractBody, _ := io.ReadAll(extractResp.Body)

	if extractResp.StatusCode != http.StatusOK {
		writeError(writer, http.StatusBadGateway, "document extraction failed: "+string(extractBody))
		return
	}

	var extractionResult struct {
		OrganizationID      string                           `json:"organization_id"`
		SourceDocumentID    string                           `json:"source_document_id"`
		IngestionBatchID    string                           `json:"ingestion_batch_id"`
		ExtractionVersionID string                           `json:"extraction_version_id"`
		FileName            string                           `json:"file_name"`
		ContentType         string                           `json:"content_type"`
		Parser              string                           `json:"parser"`
		SchemaVersion       string                           `json:"schema_version"`
		Warnings            []string                         `json:"warnings"`
		QualityFlags        []string                         `json:"quality_flags"`
		Metadata            map[string]string                `json:"metadata"`
		Records             []ingestion.ExtractedRecordInput `json:"records"`
	}
	if err := json.Unmarshal(extractBody, &extractionResult); err != nil {
		writeError(writer, http.StatusBadGateway, "invalid extraction response")
		return
	}

	ingestionInput := ingestion.IngestInput{
		OrganizationID:   claims.OrganizationID,
		IdempotencyKey:   extractionResult.SourceDocumentID,
		FileName:         header.Filename,
		ContentType:      header.Header.Get("Content-Type"),
		Content:          content,
		Extractor:        extractionResult.Parser,
		ExtractedRecords: extractionResult.Records,
	}
	ingestBody, _ := json.Marshal(ingestionInput)
	ingestResp, err := s.httpClient.Post(s.ingestionServiceURL+"/v1/documents/ingest", "application/json", bytes.NewReader(ingestBody))
	if err != nil {
		writeError(writer, http.StatusServiceUnavailable, "ingestion service unreachable: "+err.Error())
		return
	}
	defer ingestResp.Body.Close()
	if ingestResp.StatusCode != http.StatusCreated {
		ingestBodyBytes, _ := io.ReadAll(ingestResp.Body)
		writeError(writer, http.StatusBadGateway, "ingestion failed: "+string(ingestBodyBytes))
		return
	}

	resultDoc := IntakeDoc{
		ID:         extractionResult.SourceDocumentID,
		Name:       header.Filename,
		Type:       "document",
		Source:     "upload",
		ReceivedAt: time.Now().UTC().Format(time.RFC3339),
		Stage:      "extracting",
		Status:     "processing",
		SizeText:   fmt.Sprintf("%d KB", len(content)/1024),
		Fields:     []ExtractedField{{Label: "Status", Value: "Uploaded - processing complete", Confidence: 1}},
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Uploaded document for extraction", header.Filename)
	writeJSON(writer, http.StatusOK, resultDoc)
}

func (s *Server) intakeDocAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/intake/docs/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	docID, action := parts[0], parts[1]
	permission := access.PermissionReviewDataQuality
	if action == "post" {
		permission = access.PermissionPostLedger
	}
	claims, _, ok := s.requireTenantActor(writer, request, permission)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var fileName string
	err := s.db.QueryRow(`SELECT file_name FROM documents WHERE id = $1 AND organization_id = $2`, docID, claims.OrganizationID).Scan(&fileName)
	if err != nil {
		writeError(writer, http.StatusNotFound, "document not found")
		return
	}
	actionLabel := "Matched document"
	if action == "post" {
		actionLabel = "Posted document to ledger"
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, actionLabel, fileName)
	for _, item := range s.queryIntakeDocs(claims.OrganizationID) {
		if item.ID == docID {
			item.Stage = "matched"
			item.Status = "matched"
			if action == "post" {
				item.Stage = "posted"
				item.Status = "posted"
			}
			writeJSON(writer, http.StatusOK, item)
			return
		}
	}
	writeError(writer, http.StatusNotFound, "document not found")
}

func (s *Server) reportsCatalog(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryReports(claims.OrganizationID)})
}

func (s *Server) reportDetail(writer http.ResponseWriter, request *http.Request) {
	path := strings.TrimPrefix(request.URL.Path, "/api/reports/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	reportID := parts[0]
	if request.Method == http.MethodGet && len(parts) == 1 {
		claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports)
		if !ok {
			return
		}
		if s.db == nil {
			writeError(writer, http.StatusServiceUnavailable, "database connection required")
			return
		}
		report, ok := s.queryReportByID(claims.OrganizationID, reportID)
		if !ok {
			writeError(writer, http.StatusNotFound, "report not found")
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{
			"report":   report,
			"content":  s.buildReportContent(claims.OrganizationID, report),
			"periods":  []string{"Current", "Previous", "YTD"},
			"evidence": "evidence-backed",
		})
		return
	}
	if request.Method == http.MethodPost && len(parts) == 2 && parts[1] == "generate" {
		claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports)
		if !ok {
			return
		}
		if s.db == nil {
			writeError(writer, http.StatusServiceUnavailable, "database connection required")
			return
		}
		report, ok := s.queryReportByID(claims.OrganizationID, reportID)
		if !ok {
			writeError(writer, http.StatusNotFound, "report not found")
			return
		}
		now := time.Now().UTC()
		_, _ = s.db.Exec(`
			INSERT INTO report_snapshots (id, organization_id, generated_by, input_fingerprint, include_roi, payload)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			"snap-"+strconv.FormatInt(now.UnixNano(), 10), claims.OrganizationID, claims.Subject, "regen-"+report.ID, false, `{}`)
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Generated report", report.Name)
		report.LastGenerated = now.Format(time.RFC3339)
		writeJSON(writer, http.StatusOK, report)
		return
	}
	if request.Method == http.MethodPost && len(parts) == 2 && parts[1] == "export" {
		claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports)
		if !ok {
			return
		}
		if s.db == nil {
			writeError(writer, http.StatusServiceUnavailable, "database connection required")
			return
		}
		report, ok := s.queryReportByID(claims.OrganizationID, reportID)
		if !ok {
			writeError(writer, http.StatusNotFound, "report not found")
			return
		}
		var body struct {
			Period string `json:"period"`
		}
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		period := strings.TrimSpace(body.Period)
		if period == "" {
			period = "Current period"
		}
		contentData := s.buildReportContent(claims.OrganizationID, report)
		content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(%s) Tj\n0 -28 Td\n/F1 11 Tf\n(Period: %s) Tj\n0 -22 Td\n(Report type: %s) Tj\n0 -22 Td\n(Key metrics: %d) Tj\n0 -22 Td\n(Evidence rows: %d) Tj\n0 -30 Td\n/F1 9 Tf\n(Evidence-backed and generated from tenant-scoped reporting data.) Tj\nET\n", pdfLiteral(report.Name), pdfLiteral(period), pdfLiteral(report.Kind), len(contentData.KPIs), len(contentData.Rows))
		pdf := simplePDF(content)
		fileName := strings.ReplaceAll(strings.ToLower(report.Name), " ", "-") + ".pdf"
		writer.Header().Set("Content-Type", "application/pdf")
		writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
		writer.WriteHeader(http.StatusOK)
		_, _ = writer.Write([]byte(pdf))
		return
	}
	if request.Method == http.MethodPost && len(parts) == 2 && parts[1] == "schedule" {
		claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports)
		if !ok {
			return
		}
		if s.db == nil {
			writeError(writer, http.StatusServiceUnavailable, "database connection required")
			return
		}
		var body struct {
			Schedule string `json:"schedule"`
		}
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		report, ok := s.queryReportByID(claims.OrganizationID, reportID)
		if !ok {
			writeError(writer, http.StatusNotFound, "report not found")
			return
		}
		if strings.TrimSpace(body.Schedule) != "" {
			report.Schedule = strings.TrimSpace(body.Schedule)
			_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Updated report schedule", report.Name+" -> "+report.Schedule)
		}
		writeJSON(writer, http.StatusOK, report)
		return
	}
	writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
}

func (s *Server) reportsBoardPack(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	reports := s.queryReports(claims.OrganizationID)
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Board Pack) Tj\n0 -28 Td\n/F1 11 Tf\n(Period: Current) Tj\n0 -22 Td\n(Reports included: %d) Tj\n0 -22 Td\n(Generated: %s) Tj\n0 -30 Td\n/F1 9 Tf\n(Compiled from tenant-scoped, evidence-backed reports.) Tj\nET\n", len(reports), time.Now().UTC().Format("2006-01-02 15:04 UTC"))
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-board-pack.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(simplePDF(content)))
}

func pdfLiteral(value string) string {
	return strings.NewReplacer("\\", "\\\\", "(", "\\(", ")", "\\)", "\r", " ", "\n", " ").Replace(value)
}

func simplePDF(content string) string {
	return "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length " + strconv.Itoa(len(content)) + ">>stream\n" + content + "endstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
}

func (s *Server) financialStatementsExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	posted := 0
	if snapshot := s.queryFinanceOperations(claims.OrganizationID); snapshot != nil {
		for _, journal := range snapshot.Journals {
			if journal.Status == "posted" {
				posted++
			}
		}
	}
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Financial Statement Pack) Tj\n0 -28 Td\n/F1 11 Tf\n(Period: Current) Tj\n0 -22 Td\n(Posted journals included: %d) Tj\n0 -22 Td\n(Statements: Income statement, balance sheet, cash flow) Tj\n0 -22 Td\n(Source: tenant-scoped general ledger) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from ledger records and permission-checked report access.) Tj\nET\n", posted)
	pdf := "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length " + strconv.Itoa(len(content)) + ">>stream\n" + content + "endstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-financial-statements.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(pdf))
}

func (s *Server) financeOperations(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryFinanceOperations(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, &FinanceOperationsSnapshot{})
}

func (s *Server) financeCashflowView(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryFinanceCashflowView(claims.OrganizationID); q != nil {
		if snapshot := s.queryFinanceOperations(claims.OrganizationID); snapshot != nil {
			q.Movements = snapshot.Transactions
		}
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, &LedgerCashflowView{})
}

func (s *Server) financeCashflowExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var view LedgerCashflowView
	if q := s.queryFinanceCashflowView(claims.OrganizationID); q != nil {
		view = *q
	}
	movements := 0
	if snapshot := s.queryFinanceOperations(claims.OrganizationID); snapshot != nil {
		movements = len(snapshot.Transactions)
	}
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Cash Flow Summary) Tj\n0 -28 Td\n/F1 11 Tf\n(Net position: %s %s) Tj\n0 -22 Td\n(Revenue KPI: %s %s) Tj\n0 -22 Td\n(Expense KPI: %s %s) Tj\n0 -22 Td\n(Movements included: %d) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from the tenant-scoped ledger cashflow view.) Tj\nET\n", view.OpeningBalance.AmountMinor, view.OpeningBalance.Currency, view.KPIs[1].Money.AmountMinor, view.KPIs[1].Money.Currency, view.KPIs[2].Money.AmountMinor, view.KPIs[2].Money.Currency, movements)
	pdf := "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length " + strconv.Itoa(len(content)) + ">>stream\n" + content + "endstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-cashflow-summary.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(pdf))
}

func (s *Server) financeCreateJournal(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionPostLedger)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body struct {
		Date   string `json:"date"`
		Ref    string `json:"ref"`
		Memo   string `json:"memo"`
		Source string `json:"source"`
		Entity string `json:"entity"`
		Lines  []struct {
			Account    string `json:"account"`
			Debit      string `json:"debit"`
			Credit     string `json:"credit"`
			CostCenter string `json:"costCenter"`
		} `json:"lines"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if strings.TrimSpace(body.Memo) == "" || len(body.Lines) == 0 {
		writeError(writer, http.StatusBadRequest, "memo and lines are required")
		return
	}
	var totalDebit int64
	var totalCredit int64
	type parsedLine struct {
		account     string
		debitMinor  int64
		creditMinor int64
		costCenter  string
	}
	var parsed []parsedLine
	for _, line := range body.Lines {
		debit, err := strconv.ParseInt(strings.TrimSpace(line.Debit), 10, 64)
		if err != nil {
			writeError(writer, http.StatusBadRequest, "invalid debit amount")
			return
		}
		credit, err := strconv.ParseInt(strings.TrimSpace(line.Credit), 10, 64)
		if err != nil {
			writeError(writer, http.StatusBadRequest, "invalid credit amount")
			return
		}
		totalDebit += debit
		totalCredit += credit
		parsed = append(parsed, parsedLine{account: line.Account, debitMinor: debit, creditMinor: credit, costCenter: line.CostCenter})
	}
	if totalDebit == 0 || totalDebit != totalCredit {
		writeError(writer, http.StatusBadRequest, "journal must balance")
		return
	}
	now := time.Now().UTC()
	approvalID := "at-" + strconv.FormatInt(now.UnixNano(), 10)
	postingID := "pg-" + strconv.FormatInt(now.UnixNano(), 10)
	evidence, _ := json.Marshal(map[string]any{"memo": body.Memo, "ref": body.Ref, "source": body.Source, "entity": body.Entity})
	_, _ = s.db.Exec(`
		INSERT INTO approval_tasks (id, organization_id, suggested_action, creator_user_id, assigned_role, state, amount_minor, currency, required_approvers, approver_user_ids, deadline, evidence, created_at)
		VALUES ($1, $2, 'JOURNAL_POST', $3, 'finance', 'EXECUTED', $4, 'USD', 1, $5, $6, $7, $6)`,
		approvalID, claims.OrganizationID, claims.Subject, totalDebit, []byte(`["`+claims.Subject+`"]`), now, evidence)
	_, _ = s.db.Exec(`
		INSERT INTO posting_groups (id, organization_id, approval_task_id, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5)`,
		postingID, claims.OrganizationID, approvalID, claims.Subject, now)
	for i, line := range parsed {
		entryID := postingID + "-e" + strconv.Itoa(i)
		lineEvidence, _ := json.Marshal(map[string]any{"description": body.Memo, "costCenter": line.costCenter})
		_, _ = s.db.Exec(`
			INSERT INTO ledger_entries (id, organization_id, account_id, debit_minor, credit_minor, currency, posting_group_id, approval_task_id, evidence, created_at)
			VALUES ($1, $2, (SELECT id FROM ledger_accounts WHERE organization_id = $2 AND code = $3 LIMIT 1), $4, $5, 'USD', $6, $7, $8, $9)`,
			entryID, claims.OrganizationID, line.account, line.debitMinor, line.creditMinor, postingID, approvalID, lineEvidence, now)
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Posted journal entry", body.Memo)
	if q := s.queryFinanceOperations(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, &FinanceOperationsSnapshot{})
}

func (s *Server) financeBillAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/finance/bills/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	billID, action := parts[0], parts[1]
	permission := access.PermissionApproveFinancial
	if action == "pay" {
		permission = access.PermissionPostLedger
	}
	claims, _, ok := s.requireTenantActor(writer, request, permission)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var bill FinanceBill
	found := false
	if snapshot := s.queryFinanceOperations(claims.OrganizationID); snapshot != nil {
		for _, b := range snapshot.Bills {
			if b.ID == billID {
				bill = b
				found = true
				break
			}
		}
	}
	if !found {
		writeError(writer, http.StatusNotFound, "bill not found")
		return
	}
	var toState string
	var actionLabel string
	switch action {
	case "approve":
		if bill.Status != "SUGGESTED" && bill.Status != "ASSIGNED" {
			writeError(writer, http.StatusBadRequest, "bill cannot be approved")
			return
		}
		toState = "APPROVED"
		actionLabel = "Approved bill"
	case "pay":
		if bill.Status != "APPROVED" {
			writeError(writer, http.StatusBadRequest, "bill cannot be paid")
			return
		}
		toState = "EXECUTED"
		actionLabel = "Paid bill"
	default:
		writeError(writer, http.StatusNotFound, "unknown bill action")
		return
	}
	amountMinor, _ := strconv.ParseInt(bill.Amount.AmountMinor, 10, 64)
	if amountMinor <= 0 {
		writeError(writer, http.StatusBadRequest, "bill amount invalid")
		return
	}
	now := time.Now().UTC()
	_, _ = s.db.Exec(`UPDATE approval_tasks SET state = $3, evidence = evidence || jsonb_build_object('resolved_at', $4) WHERE id = $1 AND organization_id = $2 AND state <> $3`, billID, claims.OrganizationID, toState, now.Format(time.RFC3339))
	if action == "pay" {
		postingID := "pg-pay-" + strconv.FormatInt(now.UnixNano(), 10)
		_, _ = s.db.Exec(`
			INSERT INTO posting_groups (id, organization_id, approval_task_id, created_by, created_at)
			VALUES ($1, $2, $3, $4, $5)`,
			postingID, claims.OrganizationID, billID, claims.Subject, now)
		entryEvidence, _ := json.Marshal(map[string]any{"description": "Payment - " + bill.Vendor, "bill_id": bill.ID})
		_, _ = s.db.Exec(`
			INSERT INTO ledger_entries (id, organization_id, account_id, debit_minor, credit_minor, currency, posting_group_id, approval_task_id, evidence, created_at)
			VALUES ($1, $2, (SELECT id FROM ledger_accounts WHERE organization_id = $2 AND account_type = 'LIABILITY' LIMIT 1), $3, 0, $4, $5, $6, $7, $8),
			       ($1 || '-b', $2, (SELECT id FROM ledger_accounts WHERE organization_id = $2 AND account_type = 'ASSET' LIMIT 1), 0, $3, $4, $5, $6, $7, $8)`,
			postingID+"-e0", claims.OrganizationID, amountMinor, bill.Amount.Currency, postingID, billID, entryEvidence, now)
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, actionLabel, bill.Vendor)
	if snapshot := s.queryFinanceOperations(claims.OrganizationID); snapshot != nil {
		writeJSON(writer, http.StatusOK, snapshot)
		return
	}
	writeJSON(writer, http.StatusOK, &FinanceOperationsSnapshot{})
}

func (s *Server) financeTransactionAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/finance/transactions/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	transactionID, action := parts[0], parts[1]
	permission := access.PermissionReviewDataQuality
	if action == "prepare" || action == "reconcile" {
		permission = access.PermissionResolveReconciliation
	} else if action == "post" {
		permission = access.PermissionPostLedger
	}
	claims, _, ok := s.requireTenantActor(writer, request, permission)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body struct {
		Category string `json:"category"`
		Note     string `json:"note"`
	}
	if request.ContentLength != 0 {
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
	}
	var tx FinanceTransaction
	found := false
	if snapshot := s.queryFinanceOperations(claims.OrganizationID); snapshot != nil {
		for _, t := range snapshot.Transactions {
			if t.ID == transactionID {
				tx = t
				found = true
				break
			}
		}
	}
	if !found {
		writeError(writer, http.StatusNotFound, "transaction not found")
		return
	}
	switch action {
	case "classify":
		if strings.TrimSpace(body.Category) == "" {
			writeError(writer, http.StatusBadRequest, "category is required")
			return
		}
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Classified transaction", tx.Description+" -> "+body.Category)
	case "prepare":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Prepared transaction", tx.Description)
	case "reconcile":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Reconciled transaction", tx.Description)
	case "hold":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Held transaction for review", tx.Description)
	case "post":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Posted transaction", tx.Description)
	case "flag":
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Flagged transaction", tx.Description)
	default:
		writeError(writer, http.StatusNotFound, "unknown transaction action")
		return
	}
	if snapshot := s.queryFinanceOperations(claims.OrganizationID); snapshot != nil {
		writeJSON(writer, http.StatusOK, snapshot)
		return
	}
	writeJSON(writer, http.StatusOK, &FinanceOperationsSnapshot{})
}

func (s *Server) auditInvestigations(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadAudit)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryAuditInvestigations(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, &AuditInvestigationsView{})
}

func (s *Server) auditEvidencePack(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadAudit)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	view := &AuditInvestigationsView{}
	if q := s.queryAuditInvestigations(claims.OrganizationID); q != nil {
		view = q
	}
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Audit Evidence Pack) Tj\n0 -28 Td\n/F1 11 Tf\n(Generated: %s) Tj\n0 -22 Td\n(Audit events: %d) Tj\n0 -22 Td\n(Control checks: %d) Tj\n0 -22 Td\n(Segregation-of-duty findings: %d) Tj\n0 -22 Td\n(Missing evidence records: %d) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from immutable tenant-scoped audit and workflow records.) Tj\nET\n", time.Now().UTC().Format("2006-01-02 15:04 UTC"), len(view.AuditLog), len(view.ControlHealth.Subscores), view.RiskStats.SodViolations, view.RiskStats.MissingDocs)
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-audit-evidence-pack.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(simplePDF(content)))
}

func (s *Server) auditFindingCreate(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionCreateAuditFinding)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body struct {
		EventID string `json:"eventId"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if strings.TrimSpace(body.EventID) == "" {
		writeError(writer, http.StatusBadRequest, "eventId is required")
		return
	}
	var action, resource string
	err := s.db.QueryRow(`SELECT action, resource FROM audit_entries WHERE id = $1 AND organization_id = $2`, body.EventID, claims.OrganizationID).Scan(&action, &resource)
	if err != nil {
		writeError(writer, http.StatusNotFound, "audit event not found")
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Audit finding raised", action+" · "+resource)
	if q := s.queryAuditInvestigations(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, &AuditInvestigationsView{})
}

func (s *Server) settingsUsers(writer http.ResponseWriter, request *http.Request) {
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	switch request.Method {
	case http.MethodGet:
		writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryOrgUsers(claims.OrganizationID)})
	case http.MethodPost:
		var body OrgUserData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		if strings.TrimSpace(body.ID) == "" {
			body.ID = "u-" + strconv.FormatInt(time.Now().UnixNano(), 10)
		}
		inviteCode := ""
		if strings.EqualFold(strings.TrimSpace(body.Status), "invited") {
			code, err := auth.NewRefreshToken()
			if err != nil {
				writeError(writer, http.StatusInternalServerError, err.Error())
				return
			}
			inviteCode = strings.ToUpper(strings.ReplaceAll(code[:10], "-", ""))
			if err := s.syncInviteUser(body, inviteCode, claims.OrganizationID); err != nil {
				writeError(writer, http.StatusBadRequest, err.Error())
				return
			}
			s.sendInvitationEmail(strings.TrimSpace(body.Email), body.Name, inviteCode)
		} else {
			_, _ = s.db.Exec(`
				INSERT INTO users (id, organization_id, email, display_name, status, created_at)
				VALUES ($1, $2, $3, $4, $5, $6)
				ON CONFLICT (organization_id, email) DO UPDATE SET display_name = EXCLUDED.display_name, status = EXCLUDED.status`,
				body.ID, claims.OrganizationID, strings.ToLower(strings.TrimSpace(body.Email)), body.Name, "active", time.Now().UTC())
			role := strings.TrimSpace(body.Role)
			if role == "" {
				role = string(access.RoleFinanceOperator)
			}
			_, _ = s.db.Exec(`
				INSERT INTO role_bindings (id, organization_id, user_id, role, created_at)
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (organization_id, user_id, role) DO NOTHING`,
				"rb-"+strconv.FormatInt(time.Now().UnixNano(), 10), claims.OrganizationID, body.ID, role, time.Now().UTC())
			_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Added organization user", strings.TrimSpace(body.Email))
		}
		writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryOrgUsers(claims.OrganizationID), "inviteCode": inviteCode})
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) settingsUserAction(writer http.ResponseWriter, request *http.Request) {
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/settings/users/")
	userID := strings.Trim(path, "/")
	if userID == "" {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	var exists string
	err := s.db.QueryRow(`SELECT email FROM users WHERE id = $1 AND organization_id = $2`, userID, claims.OrganizationID).Scan(&exists)
	if err != nil {
		writeError(writer, http.StatusNotFound, "user not found")
		return
	}
	switch request.Method {
	case http.MethodPost:
		var body OrgUserData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		_, _ = s.db.Exec(`
			UPDATE users SET display_name = $3, email = $4, status = $5
			WHERE id = $1 AND organization_id = $2`,
			userID, claims.OrganizationID, body.Name, strings.ToLower(strings.TrimSpace(body.Email)), body.Status)
		if strings.TrimSpace(body.Role) != "" {
			_, _ = s.db.Exec(`
				UPDATE role_bindings SET role = $3
				WHERE user_id = $1 AND organization_id = $2`,
				userID, claims.OrganizationID, body.Role)
		}
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Updated organization user", strings.TrimSpace(body.Email))
		writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryOrgUsers(claims.OrganizationID)})
	case http.MethodDelete:
		_, _ = s.db.Exec(`UPDATE users SET status = 'deactivated' WHERE id = $1 AND organization_id = $2`, userID, claims.OrganizationID)
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Deactivated organization user", exists)
		writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryOrgUsers(claims.OrganizationID)})
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) settingsApprovalRules(writer http.ResponseWriter, request *http.Request) {
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManagePolicy)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	switch request.Method {
	case http.MethodGet:
		writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryApprovalRules(claims.OrganizationID)})
	case http.MethodPost:
		var body ApprovalRuleData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		if strings.TrimSpace(body.ID) == "" {
			body.ID = "r-" + strconv.FormatInt(time.Now().UnixNano(), 10)
		}
		scope := strings.TrimSpace(body.Scope)
		if scope == "" {
			scope = "default"
		}
		threshold, _ := strconv.ParseFloat(strings.TrimSpace(body.Threshold), 64)
		approversJSON, _ := json.Marshal(body.Approvers)
		var version int
		_ = s.db.QueryRow(`
			SELECT COALESCE(MAX(version), 0) + 1 FROM rule_policies
			WHERE organization_id = $1 AND scope = $2`, claims.OrganizationID, scope).Scan(&version)
		_, _ = s.db.Exec(`
			INSERT INTO rule_policies (
				id, organization_id, scope, version, auto_match_threshold, suggested_match_threshold,
				duplicate_window_days, payment_tolerance_minor, currency, approval_limits,
				required_evidence_fields, aging_buckets_days, renewal_alert_days, risk_rules,
				sharing_scopes, created_by, created_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, 7, 0, 'USD', $7, '[]'::jsonb, '[]'::jsonb, 30, '{}'::jsonb, '{}'::jsonb, $8, $9)`,
			body.ID, claims.OrganizationID, scope, version, threshold, threshold, approversJSON, claims.Subject, time.Now().UTC())
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Created approval policy", scope)
		writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryApprovalRules(claims.OrganizationID)})
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) settingsApprovalRuleAction(writer http.ResponseWriter, request *http.Request) {
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManagePolicy)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/settings/approval-rules/")
	ruleID := strings.Trim(path, "/")
	if ruleID == "" {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	var scope string
	err := s.db.QueryRow(`
		SELECT scope FROM rule_policies p
		JOIN (
			SELECT scope AS s, MAX(version) AS mv FROM rule_policies
			WHERE organization_id = $1 AND id = $2 GROUP BY scope
		) latest ON latest.s = p.scope AND latest.mv = p.version
		WHERE p.organization_id = $1 AND p.id = $2`, claims.OrganizationID, ruleID).Scan(&scope)
	if err != nil {
		writeError(writer, http.StatusNotFound, "rule not found")
		return
	}
	switch request.Method {
	case http.MethodPost:
		var body ApprovalRuleData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		threshold, _ := strconv.ParseFloat(strings.TrimSpace(body.Threshold), 64)
		approversJSON, _ := json.Marshal(body.Approvers)
		var version int
		_ = s.db.QueryRow(`
			SELECT COALESCE(MAX(version), 0) + 1 FROM rule_policies
			WHERE organization_id = $1 AND scope = $2`, claims.OrganizationID, scope).Scan(&version)
		_, _ = s.db.Exec(`
			INSERT INTO rule_policies (
				id, organization_id, scope, version, auto_match_threshold, suggested_match_threshold,
				duplicate_window_days, payment_tolerance_minor, currency, approval_limits,
				required_evidence_fields, aging_buckets_days, renewal_alert_days, risk_rules,
				sharing_scopes, created_by, created_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, 7, 0, 'USD', $7, '[]'::jsonb, '[]'::jsonb, 30, '{}'::jsonb, '{}'::jsonb, $8, $9)`,
			ruleID, claims.OrganizationID, scope, version, threshold, threshold, approversJSON, claims.Subject, time.Now().UTC())
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Updated approval policy", scope)
		writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryApprovalRules(claims.OrganizationID)})
	case http.MethodDelete:
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Deactivated approval policy", scope)
		writeJSON(writer, http.StatusOK, map[string]any{"items": s.queryApprovalRules(claims.OrganizationID)})
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) settingsOverviewAPI(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	writeJSON(writer, http.StatusOK, s.querySettingsOverview(claims.OrganizationID))
}

func (s *Server) settingsOrgProfile(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManagePolicy)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body OrgProfileData
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if strings.TrimSpace(body.Name) != "" {
		_, _ = s.db.Exec(`UPDATE organizations SET name = $2 WHERE id = $1`, claims.OrganizationID, strings.TrimSpace(body.Name))
	}
	payload, _ := json.Marshal(body)
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "settings.org_profile", string(payload))
	writeJSON(writer, http.StatusOK, s.querySettingsOverview(claims.OrganizationID))
}

func (s *Server) settingsPolicyControls(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManagePolicy)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body PolicyControlsData
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	scope := "default"
	threshold := body.AutoMatchThreshold
	duplicateDays := body.DuplicateWindowDays
	if duplicateDays == 0 {
		duplicateDays = 7
	}
	paymentTolerance := parseDecimalToMinor(body.PaymentTolerance)
	toleranceMinor, _ := strconv.ParseInt(paymentTolerance, 10, 64)
	renewalDays := body.RenewalAlertDays
	if renewalDays == 0 {
		renewalDays = 30
	}
	var version int
	_ = s.db.QueryRow(`
		SELECT COALESCE(MAX(version), 0) + 1 FROM rule_policies
		WHERE organization_id = $1 AND scope = $2`, claims.OrganizationID, scope).Scan(&version)
	_, _ = s.db.Exec(`
		INSERT INTO rule_policies (
			id, organization_id, scope, version, auto_match_threshold, suggested_match_threshold,
			duplicate_window_days, payment_tolerance_minor, currency, approval_limits,
			required_evidence_fields, aging_buckets_days, renewal_alert_days, risk_rules,
			sharing_scopes, created_by, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'USD', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, $9, '{}'::jsonb, '{}'::jsonb, $10, $11)`,
		"policy-"+strconv.FormatInt(time.Now().UnixNano(), 10), claims.OrganizationID, scope, version, threshold, body.SuggestedThreshold, duplicateDays, toleranceMinor, renewalDays, claims.Subject, time.Now().UTC())
	payload, _ := json.Marshal(body)
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "settings.policy_controls", string(payload))
	writeJSON(writer, http.StatusOK, s.querySettingsOverview(claims.OrganizationID))
}

func (s *Server) settingsDataControls(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageDataRetention)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body DataControlsData
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	payload, _ := json.Marshal(body)
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "settings.data_controls", string(payload))
	writeJSON(writer, http.StatusOK, s.querySettingsOverview(claims.OrganizationID))
}

func (s *Server) settingsDataExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageDataRetention)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	overview := s.querySettingsOverview(claims.OrganizationID)
	consentGrants, _ := s.queryConsentGrants(claims.OrganizationID)
	export := map[string]any{
		"exportedAt":       time.Now().UTC().Format(time.RFC3339),
		"organization":     overview,
		"settings":         overview,
		"users":            s.queryOrgUsers(claims.OrganizationID),
		"approvalPolicies": s.queryApprovalRules(claims.OrganizationID),
		"reports":          s.queryReports(claims.OrganizationID),
		"collections":      s.queryOverdueItems(claims.OrganizationID),
		"finance":          s.queryFinanceOperations(claims.OrganizationID),
		"contracts":        s.queryContractsOverview(claims.OrganizationID),
		"auditLog":         s.queryAuditInvestigations(claims.OrganizationID).AuditLog,
		"consentGrants":    consentGrants,
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Exported tenant data", "full tenant data export")
	payload, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		writeError(writer, http.StatusInternalServerError, "could not build data export")
		return
	}
	writer.Header().Set("Content-Type", "application/json")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-tenant-data-export.json\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write(payload)
}

func (s *Server) settingsBillingPortal(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageBilling)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body struct {
		Plan string `json:"plan"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	plan := strings.TrimSpace(body.Plan)
	if plan == "" {
		writeError(writer, http.StatusBadRequest, "plan is required")
		return
	}
	price := map[string]string{"Starter": "$199", "Growth": "$499", "Enterprise": "Custom"}[plan]
	if price == "" && plan != "Enterprise" {
		writeError(writer, http.StatusBadRequest, "unsupported billing plan")
		return
	}
	seats := map[string]int{"Starter": 5, "Growth": 15, "Enterprise": 100}[plan]
	billing := SettingsBillingData{Plan: plan, PriceMonthly: price, SeatsIncluded: seats}
	payload, _ := json.Marshal(billing)
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "settings.billing", string(payload))
	writeJSON(writer, http.StatusOK, s.querySettingsOverview(claims.OrganizationID))
}

func (s *Server) accountSettingsAPI(writer http.ResponseWriter, request *http.Request) {
	claims, ok := s.requireAuthenticatedSession(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	switch request.Method {
	case http.MethodGet:
		writeJSON(writer, http.StatusOK, s.queryAccountSettings(claims.Subject))
	case http.MethodPost:
		var body AccountSettingsData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		payload, _ := json.Marshal(body)
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "account.settings", string(payload))
		writeJSON(writer, http.StatusOK, s.queryAccountSettings(claims.Subject))
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) accountSignOutOthers(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requireAuthenticatedSession(writer, request)
	if !ok {
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Revoked other sessions", claims.Subject)
	writeJSON(writer, http.StatusOK, map[string]any{"status": "revoked"})
}

func (s *Server) featuresOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"enabled": s.queryFeatureEntitlements(claims.OrganizationID)})
}

func (s *Server) featureToggle(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	featureID := strings.Trim(strings.TrimPrefix(request.URL.Path, "/api/features/"), "/")
	if featureID == "" {
		writeError(writer, http.StatusNotFound, "feature not found")
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "features.toggle", featureID)
	writeJSON(writer, http.StatusOK, map[string]any{"enabled": s.queryFeatureEntitlements(claims.OrganizationID)})
}

func (s *Server) mailboxAPI(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requireAuthenticatedSession(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	writeJSON(writer, http.StatusOK, s.queryMailbox(claims.Subject))
}

func (s *Server) mailboxConnect(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requireAuthenticatedSession(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body struct {
		Account  string `json:"account"`
		Provider string `json:"provider"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"account":  strings.TrimSpace(body.Account),
		"provider": strings.TrimSpace(body.Provider),
	})
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "mailbox.connect", string(payload))
	writeJSON(writer, http.StatusOK, s.queryMailbox(claims.Subject))
}

func (s *Server) mailboxSend(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requireAuthenticatedSession(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body struct {
		ToName       string `json:"toName"`
		ToEmail      string `json:"toEmail"`
		Subject      string `json:"subject"`
		Body         string `json:"body"`
		AgentDrafted bool   `json:"agentDrafted"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	mailbox := s.queryMailbox(claims.Subject)
	account := mailbox.Account
	if account == "" {
		account = s.queryAccountSettings(claims.Subject).Email
	}
	toName := strings.TrimSpace(body.ToName)
	if toName == "" {
		toName = strings.TrimSpace(body.ToEmail)
	}
	message := MailMessageData{
		ID:           "mail-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Folder:       "sent",
		FromName:     s.queryAccountSettings(claims.Subject).Name,
		FromEmail:    account,
		ToName:       toName,
		ToEmail:      strings.TrimSpace(body.ToEmail),
		Subject:      strings.TrimSpace(body.Subject),
		Preview:      previewText(body.Body),
		Body:         body.Body,
		Date:         time.Now().UTC().Format(time.RFC3339),
		Read:         true,
		Starred:      false,
		Label:        "general",
		AgentDrafted: body.AgentDrafted,
	}
	msgPayload, _ := json.Marshal(message)
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "mailbox.message", string(msgPayload))
	writeJSON(writer, http.StatusOK, s.queryMailbox(claims.Subject))
}

func (s *Server) mailboxMessageAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requireAuthenticatedSession(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/mailbox/messages/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	messageID, action := parts[0], parts[1]
	if action != "read" && action != "star" {
		writeError(writer, http.StatusNotFound, "unknown mailbox action")
		return
	}
	mailbox := s.queryMailbox(claims.Subject)
	for _, message := range mailbox.Messages {
		if message.ID != messageID {
			continue
		}
		statePayload, _ := json.Marshal(map[string]any{"messageId": messageID, "action": action})
		_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "mailbox.message.state", string(statePayload))
		writeJSON(writer, http.StatusOK, s.queryMailbox(claims.Subject))
		return
	}
	writeError(writer, http.StatusNotFound, "message not found")
}

func (s *Server) platformConsoleAPI(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, ok := s.requirePlatformAdmin(writer, request); !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	writeJSON(writer, http.StatusOK, s.queryPlatformHome())
}

func (s *Server) platformTenantCreate(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requirePlatformAdmin(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeError(writer, http.StatusBadRequest, "tenant name is required")
		return
	}
	now := time.Now().UTC()
	orgID := "tenant-" + strconv.FormatInt(now.UnixNano(), 10)
	_, _ = s.db.Exec(`
		INSERT INTO organizations (id, name, status, created_at) VALUES ($1, $2, 'active', $3)`,
		orgID, name, now)
	_ = s.appendAuditEntry(orgID, claims.Subject, "Onboarded tenant", name)
	writeJSON(writer, http.StatusOK, s.queryPlatformHome())
}

func (s *Server) platformFlagToggle(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requirePlatformAdmin(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	flagID := strings.TrimPrefix(request.URL.Path, "/api/platform/flags/")
	flagID = strings.Trim(flagID, "/")
	if flagID == "" {
		writeError(writer, http.StatusNotFound, "flag not found")
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "platform.flag.toggle", flagID)
	writeJSON(writer, http.StatusOK, s.queryPlatformHome())
}

func (s *Server) platformUserCreate(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requirePlatformAdmin(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeError(writer, http.StatusBadRequest, "platform user name is required")
		return
	}
	now := time.Now().UTC()
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if email == "" {
		email = strings.ToLower(strings.ReplaceAll(name, " ", ".")) + "@kora.local"
	}
	userID := "platform-user-" + strconv.FormatInt(now.UnixNano(), 10)
	_, _ = s.db.Exec(`
		INSERT INTO platform_users (id, email, display_name, status, created_at)
		VALUES ($1, $2, $3, 'active', $4)`,
		userID, email, name, now)
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Invited platform user", email)
	writeJSON(writer, http.StatusOK, s.queryPlatformHome())
}

func (s *Server) platformSupportRequestCreate(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requirePlatformAdmin(writer, request)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var body struct {
		Tenant string `json:"tenant"`
		Reason string `json:"reason"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	tenant := strings.TrimSpace(body.Tenant)
	if tenant == "" {
		writeError(writer, http.StatusBadRequest, "tenant is required")
		return
	}
	reason := strings.TrimSpace(body.Reason)
	if reason == "" {
		reason = "Support access requested by platform admin"
	}
	var orgID string
	err := s.db.QueryRow(`SELECT id FROM organizations WHERE name = $1 ORDER BY created_at ASC LIMIT 1`, tenant).Scan(&orgID)
	if err != nil {
		writeError(writer, http.StatusNotFound, "tenant not found")
		return
	}
	now := time.Now().UTC()
	grantID := "grant-" + strconv.FormatInt(now.UnixNano(), 10)
	_, _ = s.db.Exec(`
		INSERT INTO platform_support_access_grants (
			id, organization_id, platform_user_id, approved_by_tenant_user_id, reason, expires_at, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		grantID, orgID, claims.Subject, claims.Subject, reason, now.Add(24*time.Hour), now)
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Requested support access", tenant)
	writeJSON(writer, http.StatusOK, s.queryPlatformHome())
}

func (s *Server) financeLeadDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryFinanceCashflowView(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, &LedgerCashflowView{})
}

func (s *Server) contractsOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadContracts)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryContractsOverview(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, ContractsOverviewData{Items: q})
		return
	}
	writeJSON(writer, http.StatusOK, ContractsOverviewData{Items: []ContractData{}})
}

func (s *Server) contractAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/contracts/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	contractID, action := parts[0], parts[1]
	permission := access.PermissionManageContracts
	if action == "flag-renewal" {
		permission = access.PermissionApproveFinancial
	}
	claims, _, ok := s.requireTenantActor(writer, request, permission)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var title, reference string
	err := s.db.QueryRow(`SELECT contract_number, COALESCE(evidence->>'reference', contract_number) FROM contract_records WHERE id = $1 AND organization_id = $2`, contractID, claims.OrganizationID).Scan(&title, &reference)
	if err != nil {
		writeError(writer, http.StatusNotFound, "contract not found")
		return
	}
	actionLabel := map[string]string{
		"renew":        "Contract renewed",
		"flag-renewal": "Contract renewal flagged",
		"set-reminder": "Contract renewal reminder set",
	}[action]
	if actionLabel == "" {
		writeError(writer, http.StatusNotFound, "unknown contract action")
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, actionLabel, title+" - "+reference)
	if q := s.queryContractsOverview(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, ContractsOverviewData{Items: q})
		return
	}
	writeJSON(writer, http.StatusOK, ContractsOverviewData{Items: []ContractData{}})
}

func (s *Server) ownerRiskDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadAudit)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryOwnerRiskDashboard(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyOwnerRiskDashboard())
}

func (s *Server) ownerRiskDashboardExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadAudit)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	payload := &OwnerRiskDashboardData{}
	if q := s.queryOwnerRiskDashboard(claims.OrganizationID); q != nil {
		payload = q
	}
	highRisks := 0
	for _, risk := range payload.Risks {
		if risk.Severity == "high" {
			highRisks++
		}
	}
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Board Risk Pack) Tj\n0 -28 Td\n/F1 11 Tf\n(Control health: %d) Tj\n0 -22 Td\n(Open risks: %d) Tj\n0 -22 Td\n(High severity risks: %d) Tj\n0 -22 Td\n(Compliance checks: %d) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from tenant-scoped audit and risk records.) Tj\nET\n", payload.ControlPosture.ControlHealth, payload.ControlPosture.OpenRisks, highRisks, len(payload.Compliance))
	pdf := "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length " + strconv.Itoa(len(content)) + ">>stream\n" + content + "endstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-board-risk-pack.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(pdf))
}

func (s *Server) ownerRiskAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/owner/risks/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	riskID, action := parts[0], parts[1]
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionApproveFinancial)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var resource string
	err := s.db.QueryRow(`SELECT COALESCE(resource, risk_id, id) FROM advanced_risk_flags WHERE id = $1 AND organization_id = $2`, riskID, claims.OrganizationID).Scan(&resource)
	if err != nil {
		writeError(writer, http.StatusNotFound, "risk not found")
		return
	}
	actionLabel := map[string]string{
		"assign":   "Risk assigned",
		"mitigate": "Risk mitigation started",
		"accept":   "Risk accepted",
	}[action]
	if actionLabel == "" {
		writeError(writer, http.StatusNotFound, "unknown risk action")
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, actionLabel, resource)
	if q := s.queryOwnerRiskDashboard(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyOwnerRiskDashboard())
}

func (s *Server) controlsCloseOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	if q := s.queryControlsClose(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyControlsClose())
}

func (s *Server) controlsCloseTaskAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/controls-close/tasks/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	taskID, action := parts[0], parts[1]
	if action != "toggle" {
		writeError(writer, http.StatusNotFound, "unknown task action")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReviewDataQuality)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var label, owner string
	err := s.db.QueryRow(`SELECT contract_number, COALESCE(evidence->>'owner', 'System') FROM contract_records WHERE id = $1 AND organization_id = $2`, taskID, claims.OrganizationID).Scan(&label, &owner)
	if err != nil {
		writeError(writer, http.StatusNotFound, "task not found")
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Close task toggled", label+" - "+owner)
	if q := s.queryControlsClose(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyControlsClose())
}

func (s *Server) controlsCloseEvidenceGapAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/controls-close/evidence-gaps/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	gapID, action := parts[0], parts[1]
	if action != "request" {
		writeError(writer, http.StatusNotFound, "unknown evidence-gap action")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReviewDataQuality)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var reference string
	err := s.db.QueryRow(`SELECT COALESCE(id, '') FROM source_records WHERE id = $1 AND organization_id = $2 AND array_length(quality_flags, 1) > 0`, gapID, claims.OrganizationID).Scan(&reference)
	if err != nil {
		writeError(writer, http.StatusNotFound, "evidence gap not found")
		return
	}
	if reference == "" {
		writeError(writer, http.StatusNotFound, "evidence gap not found")
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Requested close evidence", reference)
	if q := s.queryControlsClose(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyControlsClose())
}

func (s *Server) controlsCloseLock(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionPostLedger)
	if !ok {
		return
	}
	if s.db == nil {
		writeError(writer, http.StatusServiceUnavailable, "database connection required")
		return
	}
	var pending int
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM contract_records
		WHERE organization_id = $1 AND end_date > CURRENT_DATE AND end_date <= CURRENT_DATE + INTERVAL '30 days'`,
		claims.OrganizationID).Scan(&pending)
	if pending > 0 {
		writeError(writer, http.StatusBadRequest, "all close tasks must be complete before locking")
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, "Locked close period", "current period close")
	if q := s.queryControlsClose(claims.OrganizationID); q != nil {
		writeJSON(writer, http.StatusOK, q)
		return
	}
	writeJSON(writer, http.StatusOK, emptyControlsClose())
}

func (s *Server) seedDemoData() error {
	return nil
}

func formatMoneyMinor(amountMinor int64) string {
	major := amountMinor / 100
	minor := amountMinor % 100
	text := strconv.FormatInt(major, 10)
	if len(text) > 3 {
		var parts []string
		for len(text) > 3 {
			parts = append([]string{text[len(text)-3:]}, parts...)
			text = text[:len(text)-3]
		}
		if text != "" {
			parts = append([]string{text}, parts...)
		}
		text = strings.Join(parts, ",")
	}
	return text + "." + strconv.FormatInt(minor+100, 10)[1:]
}

func (s *Server) requireTenantActor(writer http.ResponseWriter, request *http.Request, permission access.Permission) (auth.Claims, access.Actor, bool) {
	token, err := bearerToken(request)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return auth.Claims{}, access.Actor{}, false
	}
	claims, err := auth.VerifyJWT(token, s.jwtSecret, time.Now())
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return auth.Claims{}, access.Actor{}, false
	}
	if claims.OrganizationID == "" {
		writeError(writer, http.StatusForbidden, "tenant session required")
		return auth.Claims{}, access.Actor{}, false
	}
	actor, err := actorFromClaims(claims)
	if err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return auth.Claims{}, access.Actor{}, false
	}
	if err := access.Authorize(actor, access.Resource{OrganizationID: claims.OrganizationID}, permission); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return auth.Claims{}, access.Actor{}, false
	}
	return claims, actor, true
}

func (s *Server) requirePlatformAdmin(writer http.ResponseWriter, request *http.Request) (auth.Claims, bool) {
	token, err := bearerToken(request)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return auth.Claims{}, false
	}
	claims, err := auth.VerifyJWT(token, s.jwtSecret, time.Now())
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return auth.Claims{}, false
	}
	if claims.Plane != string(access.PlanePlatform) || !slices.Contains(claims.Roles, string(access.RoleSuperAdmin)) {
		writeError(writer, http.StatusForbidden, "platform admin session required")
		return auth.Claims{}, false
	}
	return claims, true
}

func (s *Server) requireAuthenticatedSession(writer http.ResponseWriter, request *http.Request) (auth.Claims, bool) {
	token, err := bearerToken(request)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return auth.Claims{}, false
	}
	claims, err := auth.VerifyJWT(token, s.jwtSecret, time.Now())
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return auth.Claims{}, false
	}
	return claims, true
}

func (s *Server) requirePortalPassportAccess(writer http.ResponseWriter, request *http.Request) (auth.Claims, access.Actor, bool) {
	token, err := bearerToken(request)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return auth.Claims{}, access.Actor{}, false
	}
	claims, err := auth.VerifyJWT(token, s.jwtSecret, time.Now())
	if err != nil {
		writeError(writer, http.StatusUnauthorized, err.Error())
		return auth.Claims{}, access.Actor{}, false
	}
	if claims.OrganizationID == "" {
		writeError(writer, http.StatusForbidden, "tenant session required")
		return auth.Claims{}, access.Actor{}, false
	}
	actor, err := actorFromClaims(claims)
	if err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return auth.Claims{}, access.Actor{}, false
	}
	if slices.Contains(claims.Roles, string(access.RoleExternalCollaborator)) {
		grant, expiresAt, found := s.activePortalConsent(claims.Subject, time.Now().UTC())
		if !found {
			writeError(writer, http.StatusForbidden, "no active consent grant allows Credit Passport access")
			return auth.Claims{}, access.Actor{}, false
		}
		actor.Consent = &access.ConsentScope{
			GrantID:            grant.ID,
			OrganizationID:     claims.OrganizationID,
			AllowedPermissions: []access.Permission{access.PermissionReadCreditPassport},
			ExpiresAt:          expiresAt,
		}
		if err := access.AuthorizeAt(actor, access.Resource{OrganizationID: claims.OrganizationID}, access.PermissionReadCreditPassport, time.Now().UTC()); err != nil {
			writeError(writer, http.StatusForbidden, err.Error())
			return auth.Claims{}, access.Actor{}, false
		}
		return claims, actor, true
	}
	if err := access.Authorize(actor, access.Resource{OrganizationID: claims.OrganizationID}, access.PermissionReadCreditPassport); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return auth.Claims{}, access.Actor{}, false
	}
	return claims, actor, true
}

func (s *Server) activePortalConsent(userID string, now time.Time) (ConsentGrantData, time.Time, bool) {
	if s.db == nil {
		return ConsentGrantData{}, time.Time{}, false
	}
	grants := s.activePortalGrants(userID, now)
	for _, grant := range grants {
		if slices.Contains(grant.Scopes, "credit-passport") {
			expiresAt, err := time.Parse("2006-01-02", grant.ExpiresAt)
			if err != nil {
				continue
			}
			expiresAt = expiresAt.AddDate(0, 0, 1)
			if expiresAt.After(now) {
				return grant, expiresAt, true
			}
		}
	}
	return ConsentGrantData{}, time.Time{}, false
}

func (s *Server) activePortalGrants(userID string, now time.Time) []ConsentGrantData {
	grants := make([]ConsentGrantData, 0)
	if s.db == nil {
		return grants
	}
	rows, err := s.db.Query(`
		SELECT
			g.grant_id,
			COALESCE(re.display_name, '') AS grantee,
			g.organization_id,
			g.actor_user_id,
			COALESCE(g.evidence->>'purpose', '') AS purpose,
			COALESCE(g.evidence->>'scopes', '[]') AS scopes,
			g.occurred_at
		FROM consent_grant_events g
		LEFT JOIN external_access_grants eag ON eag.id = g.grant_id
		LEFT JOIN resolved_entities re ON re.id = eag.recipient_party_id
		WHERE g.actor_user_id = $1 AND g.event_type = 'GRANTED' AND eag.revoked_at IS NULL
		ORDER BY g.occurred_at DESC
		LIMIT 50`, userID)
	if err != nil {
		return grants
	}
	defer rows.Close()
	for rows.Next() {
		var grant ConsentGrantData
		var orgID, actor, purpose, scopesJSON string
		var occurred time.Time
		if err := rows.Scan(&grant.ID, &grant.Grantee, &orgID, &actor, &purpose, &scopesJSON, &occurred); err != nil {
			continue
		}
		var scopes []string
		_ = json.Unmarshal([]byte(scopesJSON), &scopes)
		if len(scopes) == 0 {
			scopes = []string{"credit-passport"}
		}
		grant.GranteeType = "lender"
		grant.RecipientUserID = userID
		grant.Purpose = purpose
		if purpose == "" {
			grant.Purpose = "Credit Passport data sharing"
		}
		grant.Scopes = scopes
		grant.Status = "active"
		grant.Basis = "Active consent grant"
		grant.GrantedBy = actor
		grant.GrantedAt = occurred.Format("2006-01-02")
		grant.ExpiresAt = occurred.AddDate(0, 6, 0).Format("2006-01-02")
		grants = append(grants, grant)
	}
	return grants
}

func (s *Server) portalActivity(claims auth.Claims) []portalAccessActivity {
	activity := make([]portalAccessActivity, 0, 5)
	if s.db == nil {
		return activity
	}
	rows, err := s.db.Query(`
		SELECT action, resource, occurred_at
		FROM audit_entries
		WHERE actor_user_id = $1 AND organization_id = $2
		ORDER BY occurred_at DESC
		LIMIT 5`, claims.Subject, claims.OrganizationID)
	if err != nil {
		return activity
	}
	defer rows.Close()
	for rows.Next() {
		var event portalAccessActivity
		var action, resource string
		var occurred time.Time
		if err := rows.Scan(&action, &resource, &occurred); err != nil {
			continue
		}
		event.Action = action
		event.At = occurred.Format(time.RFC3339)
		activity = append(activity, event)
	}
	return activity
}

func (s *Server) recordExternalPassportAccess(claims auth.Claims, action string) {
	if !slices.Contains(claims.Roles, string(access.RoleExternalCollaborator)) {
		return
	}
	_ = s.appendAuditEntry(claims.OrganizationID, claims.Subject, action, "Credit Passport - consent-scoped read")
}

func creditPassportPDF() []byte {
	content := "BT\n/F1 20 Tf\n72 748 Td\n(Kora Credit Passport) Tj\n0 -28 Td\n/F1 12 Tf\n(Acme Insurance Ltd.) Tj\n0 -22 Td\n(Credit score: 82 - Good - A-) Tj\n0 -22 Td\n(Verified cashflow, payment discipline, obligations and risk evidence.) Tj\n0 -22 Td\n(Shared through an active, consent-scoped Kora access grant.) Tj\n0 -36 Td\n/F1 9 Tf\n(Generated by Kora. This document is evidence-backed and read-only.) Tj\nET\n"
	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		fmt.Sprintf("<< /Length %d >>\nstream\n%sendstream", len(content), content),
	}
	var output bytes.Buffer
	output.WriteString("%PDF-1.4\n")
	offsets := make([]int, 0, len(objects)+1)
	offsets = append(offsets, 0)
	for index, object := range objects {
		offsets = append(offsets, output.Len())
		fmt.Fprintf(&output, "%d 0 obj\n%s\nendobj\n", index+1, object)
	}
	xrefOffset := output.Len()
	fmt.Fprintf(&output, "xref\n0 %d\n0000000000 65535 f \n", len(objects)+1)
	for _, offset := range offsets[1:] {
		fmt.Fprintf(&output, "%010d 00000 n \n", offset)
	}
	fmt.Fprintf(&output, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objects)+1, xrefOffset)
	return output.Bytes()
}

func (s *Server) sessionEmail(claims auth.Claims) string {
	if user, err := s.identityStore.FindUserByID(claims.Subject); err == nil && strings.TrimSpace(user.Email) != "" {
		return user.Email
	}
	return ""
}

func (s *Server) sessionDisplayName(claims auth.Claims) string {
	if claims.Subject == "usr_super_admin" {
		return "Kora Super Admin"
	}
	if user, err := s.identityStore.FindUserByID(claims.Subject); err == nil && strings.TrimSpace(user.DisplayName) != "" {
		return user.DisplayName
	}
	return "You"
}

func (s *Server) sessionRoleName(claims auth.Claims) string {
	role := firstRole(claims)
	if role == "" {
		return "User"
	}
	return frontendRoleName(access.Role(role))
}

func firstRole(claims auth.Claims) string {
	if len(claims.Roles) == 0 {
		return ""
	}
	return claims.Roles[0]
}

func previewText(body string) string {
	body = strings.TrimSpace(body)
	if len(body) <= 80 {
		return body
	}
	return body[:80]
}

func (s *Server) organizationByID(organizationID string) (identity.Organization, error) {
	return s.identityStore.FindOrganizationByID(organizationID)
}

func (s *Server) activeOrganizationID() string {
	if s.db == nil {
		return ""
	}
	var orgID string
	_ = s.db.QueryRow(`SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`).Scan(&orgID)
	return orgID
}

func (s *Server) buildSuperAdminSession() (sessionResponse, error) {
	now := time.Now().UTC()
	token, err := auth.SignJWT(auth.Claims{
		Subject:        "usr_super_admin",
		OrganizationID: "",
		Plane:          string(access.PlanePlatform),
		Roles:          []string{string(access.RoleSuperAdmin)},
		Permissions:    []string{permPlatformAdmin},
		IssuedAt:       now.Unix(),
		ExpiresAt:      now.Add(15 * time.Minute).Unix(),
	}, s.jwtSecret)
	if err != nil {
		return sessionResponse{}, err
	}
	return sessionResponse{
		User:   sessionUser{ID: "usr_super_admin", Email: "super@kora.local", DisplayName: "Kora Super Admin"},
		Tenant: sessionTenant{ID: "platform", Name: "Kora Platform"},
		Roles: []sessionRole{{
			ID:          roleIDSuperAdmin,
			Name:        "Super Admin",
			BlueprintID: blueprintSuperAdmin,
		}},
		Permissions: []sessionPermission{{Permission: permPlatformAdmin, Scope: sessionScope{Kind: "global"}}},
		Token:       token,
		IssuedAt:    now.Format(time.RFC3339),
		ExpiresAt:   now.Add(15 * time.Minute).Format(time.RFC3339),
	}, nil
}

func buildTenantSession(user identity.User, org identity.Organization, token string, roles []access.Role, permissions []access.Permission) sessionResponse {
	now := time.Now().UTC()
	response := sessionResponse{
		User:        sessionUser{ID: user.ID, Email: user.Email, DisplayName: user.DisplayName},
		Tenant:      sessionTenant{ID: org.ID, Name: org.Name},
		Roles:       make([]sessionRole, 0, len(roles)),
		Permissions: make([]sessionPermission, 0, len(permissions)),
		Token:       token,
		IssuedAt:    now.Format(time.RFC3339),
		ExpiresAt:   now.Add(15 * time.Minute).Format(time.RFC3339),
	}
	for _, role := range roles {
		response.Roles = append(response.Roles, sessionRole{
			ID:          frontendRoleID(role),
			Name:        frontendRoleName(role),
			BlueprintID: frontendBlueprintID(role),
		})
	}
	for _, permission := range permissions {
		response.Permissions = append(response.Permissions, sessionPermission{
			Permission: frontendPermission(permission),
			Scope:      sessionScope{Kind: "tenant", TenantID: org.ID},
		})
	}
	return response
}

func buildIntegrationStatuses(connections []connectors.Connection) []integrationStatus {
	type base struct {
		id        string
		name      string
		category  string
		status    string
		lastSync  string
		readiness string
	}
	catalog := []base{
		{id: "mtn-momo", name: "MTN MoMo", category: "Mobile money", status: "disconnected", lastSync: "Sandbox not configured", readiness: "sandbox"},
		{id: "bk", name: "Bank of Kigali", category: "Statement import", status: "disconnected", lastSync: "Manual import not configured", readiness: "manual_import"},
		{id: "ebm-rra", name: "EBM / RRA", category: "Tax & invoices", status: "disconnected", lastSync: "Provider adapter required", readiness: "not_implemented"},
		{id: "airtel-money", name: "Airtel Money", category: "Mobile money", status: "disconnected", lastSync: "Provider adapter required", readiness: "not_implemented"},
		{id: "quickbooks", name: "QuickBooks", category: "Accounting", status: "disconnected", lastSync: "Provider adapter required", readiness: "not_implemented"},
		{id: "email-sms", name: "Email / SMS", category: "Notifications", status: "disconnected", lastSync: "Provider adapter required", readiness: "not_implemented"},
	}
	byName := map[string]connectors.Connection{}
	for _, connection := range connections {
		byName[strings.ToLower(connection.DisplayName)] = connection
	}
	items := make([]integrationStatus, 0, len(catalog))
	for _, item := range catalog {
		out := integrationStatus{
			ID:        item.id,
			Name:      item.name,
			Category:  item.category,
			Status:    item.status,
			LastSync:  item.lastSync,
			Connected: item.status == "connected" || item.status == "syncing",
			Readiness: item.readiness,
		}
		if connection, ok := byName[strings.ToLower(item.name)]; ok {
			out.ConnectionID = connection.ID
			out.CanConnect = item.readiness != "not_implemented"
			out.Connected = connection.Active && out.CanConnect
			if out.Connected {
				out.Status = "connected"
				out.LastSync = map[string]string{"sandbox": "Sandbox configured", "manual_import": "Manual import configured"}[item.readiness]
			}
		}
		items = append(items, out)
	}
	return items
}

func applyIntegrationOverrides(items []integrationStatus, overrides map[string]integrationStatusOverride) []integrationStatus {
	if len(overrides) == 0 {
		return items
	}
	for idx := range items {
		override, ok := overrides[items[idx].ID]
		if !ok {
			continue
		}
		items[idx].Status = override.Status
		items[idx].LastSync = override.LastSync
		items[idx].Connected = override.Connected
		if override.ConnectionID != "" {
			items[idx].ConnectionID = override.ConnectionID
		}
	}
	return items
}

func (s *Server) integrationStatusesForActor(actor access.Actor, organizationID string) ([]integrationStatus, error) {
	items, err := s.connections.List(actor, organizationID, "")
	if err != nil {
		return nil, err
	}
	return applyIntegrationOverrides(buildIntegrationStatuses(items), s.integrationOverridesForOrganization(organizationID)), nil
}

func (s *Server) integrationOverridesForOrganization(organizationID string) map[string]integrationStatusOverride {
	overrides := map[string]integrationStatusOverride{}
	if s.db == nil {
		return overrides
	}
	rows, err := s.db.Query(`
		SELECT resource
		FROM audit_entries
		WHERE organization_id = $1 AND action = 'integration.status'
		ORDER BY occurred_at ASC`, organizationID)
	if err != nil {
		return overrides
	}
	defer rows.Close()
	for rows.Next() {
		var resource string
		if err := rows.Scan(&resource); err != nil {
			continue
		}
		var payload struct {
			IntegrationID string `json:"integration_id"`
			Status        string `json:"status"`
			LastSync      string `json:"last_sync"`
			Connected     bool   `json:"connected"`
			ConnectionID  string `json:"connection_id"`
		}
		if err := json.Unmarshal([]byte(resource), &payload); err != nil {
			continue
		}
		overrides[payload.IntegrationID] = integrationStatusOverride{
			Status:       payload.Status,
			LastSync:     payload.LastSync,
			Connected:    payload.Connected,
			ConnectionID: payload.ConnectionID,
		}
	}
	return overrides
}

func (s *Server) persistIntegrationOverride(organizationID, integrationID string, override integrationStatusOverride) {
	if s.db == nil {
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"integration_id": integrationID,
		"status":         override.Status,
		"last_sync":      override.LastSync,
		"connected":      override.Connected,
		"connection_id":  override.ConnectionID,
	})
	_ = s.appendAuditEntry(organizationID, "system", "integration.status", string(payload))
}

func actorFromClaims(claims auth.Claims) (access.Actor, error) {
	roles := make([]access.Role, 0, len(claims.Roles))
	for _, role := range claims.Roles {
		roles = append(roles, access.Role(role))
	}
	permissions := make([]access.Permission, 0, len(claims.Permissions))
	for _, permission := range claims.Permissions {
		if permission == permPlatformAdmin {
			continue
		}
		permissions = append(permissions, access.Permission(permission))
	}
	return access.Actor{
		UserID:         claims.Subject,
		OrganizationID: claims.OrganizationID,
		Plane:          access.Plane(claims.Plane),
		Roles:          roles,
		Permissions:    permissions,
	}, nil
}

func bearerToken(request *http.Request) (string, error) {
	header := strings.TrimSpace(request.Header.Get("Authorization"))
	if !strings.HasPrefix(header, "Bearer ") {
		return "", errors.New("missing bearer token")
	}
	return strings.TrimSpace(strings.TrimPrefix(header, "Bearer ")), nil
}

func decode(request *http.Request, writer http.ResponseWriter, target any) error {
	request.Body = http.MaxBytesReader(writer, request.Body, maxRequestBytes)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("request body must contain one JSON value")
	}
	return nil
}

func writeJSON(writer http.ResponseWriter, status int, body any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(body)
}

func writeError(writer http.ResponseWriter, status int, message string) {
	writeJSON(writer, status, map[string]string{"error": message})
}

func writeCORS(writer http.ResponseWriter, request *http.Request) {
	origin := request.Header.Get("Origin")
	if origin == "" {
		origin = "*"
	}
	writer.Header().Set("Access-Control-Allow-Origin", origin)
	writer.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
	writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	writer.Header().Set("Access-Control-Allow-Credentials", "true")
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

const (
	roleIDSuperAdmin           = "role.super_admin"
	roleIDOrgOwner             = "role.org_owner"
	roleIDFinanceLead          = "role.finance_lead"
	roleIDFinanceOperator      = "role.finance_operator"
	roleIDAuditor              = "role.auditor"
	roleIDOrgAdmin             = "role.org_admin"
	roleIDExternalCollaborator = "role.external_collaborator"
	roleIDClaimsOfficer        = "role.claims_officer"
	blueprintSuperAdmin        = "blueprint.super_admin"
	permPlatformAdmin          = "platform:admin"
)

func frontendRoleID(role access.Role) string {
	switch role {
	case access.RoleOrganizationOwner:
		return roleIDOrgOwner
	case access.RoleFinanceLead:
		return roleIDFinanceLead
	case access.RoleFinanceOperator:
		return roleIDFinanceOperator
	case access.RoleAuditorCompliance:
		return roleIDAuditor
	case access.RoleOrgAdmin:
		return roleIDOrgAdmin
	case access.RoleExternalCollaborator:
		return roleIDExternalCollaborator
	case access.RoleClaimsOfficer:
		return roleIDClaimsOfficer
	default:
		return string(role)
	}
}

func frontendRoleName(role access.Role) string {
	switch role {
	case access.RoleOrganizationOwner:
		return "Organization Owner"
	case access.RoleFinanceLead:
		return "Finance Lead"
	case access.RoleFinanceOperator:
		return "Finance Operator"
	case access.RoleAuditorCompliance:
		return "Auditor"
	case access.RoleOrgAdmin:
		return "Org Admin"
	case access.RoleExternalCollaborator:
		return "External Collaborator"
	case access.RoleClaimsOfficer:
		return "Claims Officer"
	default:
		return string(role)
	}
}

func frontendBlueprintID(role access.Role) string {
	switch role {
	case access.RoleOrganizationOwner:
		return "blueprint.org_owner"
	case access.RoleFinanceLead:
		return "blueprint.finance_lead"
	case access.RoleFinanceOperator:
		return "blueprint.finance_operator"
	case access.RoleAuditorCompliance:
		return "blueprint.auditor"
	case access.RoleOrgAdmin:
		return "blueprint.org_admin"
	case access.RoleExternalCollaborator:
		return "blueprint.external_collaborator"
	case access.RoleClaimsOfficer:
		return "blueprint.claims_officer"
	default:
		return "blueprint.unknown"
	}
}

func frontendRoleToAccess(role string) access.Role {
	switch strings.TrimSpace(role) {
	case "Organization Owner":
		return access.RoleOrganizationOwner
	case "Finance Lead":
		return access.RoleFinanceLead
	case "Finance Operator":
		return access.RoleFinanceOperator
	case "Auditor":
		return access.RoleAuditorCompliance
	case "Org Admin":
		return access.RoleOrgAdmin
	case "External Collaborator":
		return access.RoleExternalCollaborator
	case "Claims Officer":
		return access.RoleClaimsOfficer
	default:
		return access.RoleFinanceOperator
	}
}

func frontendPermission(permission access.Permission) string {
	return string(permission)
}

func seedTenantUser(store identity.Store, organizationID, email, displayName, password string, role access.Role) error {
	userID, err := auth.NewID("usr")
	if err != nil {
		return err
	}
	bindingID, err := auth.NewID("role")
	if err != nil {
		return err
	}
	salt, err := auth.NewRefreshToken()
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	user := identity.User{
		ID:             userID,
		OrganizationID: organizationID,
		Email:          strings.ToLower(strings.TrimSpace(email)),
		DisplayName:    displayName,
		PasswordHash:   auth.HashSecret(password, salt),
		PasswordSalt:   salt,
		Status:         "active",
		CreatedAt:      now,
	}
	if err := store.CreateUser(user); err != nil {
		return err
	}
	return store.CreateRoleBinding(identity.RoleBinding{
		ID:             bindingID,
		OrganizationID: organizationID,
		UserID:         userID,
		Role:           role,
		CreatedAt:      now,
	})
}

func (s *Server) syncInviteUser(user OrgUserData, inviteCode string, orgID string) error {
	org, err := s.organizationByID(orgID)
	if err != nil {
		return err
	}
	if org.Domain != "" {
		email := strings.ToLower(strings.TrimSpace(user.Email))
		if !strings.HasSuffix(email, "@"+strings.ToLower(org.Domain)) {
			return fmt.Errorf("invite email must use the business domain %s", org.Domain)
		}
	}
	role := frontendRoleToAccess(user.Role)
	if !access.IsTenantRole(role) {
		role = access.RoleFinanceOperator
	}
	existing, err := s.identityStore.FindUserByEmail(strings.ToLower(strings.TrimSpace(user.Email)))
	if err == nil && existing.ID != "" {
		s.enterpriseMu.Lock()
		s.pendingInvites[strings.ToLower(strings.TrimSpace(user.Email))] = enterpriseInvite{
			Email:          strings.ToLower(strings.TrimSpace(user.Email)),
			Role:           role,
			Token:          inviteCode,
			OrganizationID: existing.OrganizationID,
			DisplayName:    user.Name,
		}
		s.enterpriseMu.Unlock()
		return nil
	}
	randomPass, err := auth.NewRefreshToken()
	if err != nil {
		return err
	}
	if err := seedTenantUser(s.identityStore, org.ID, user.Email, user.Name, randomPass[:12], role); err != nil {
		return err
	}
	s.enterpriseMu.Lock()
	s.pendingInvites[strings.ToLower(strings.TrimSpace(user.Email))] = enterpriseInvite{
		Email:          strings.ToLower(strings.TrimSpace(user.Email)),
		Role:           role,
		Token:          inviteCode,
		OrganizationID: org.ID,
		DisplayName:    user.Name,
	}
	s.enterpriseMu.Unlock()
	return nil
}

func (s *Server) activateInvitedUser(inv enterpriseInvite) error {
	s.enterpriseMu.Lock()
	defer s.enterpriseMu.Unlock()
	if inv.Email == "" || inv.Token == "" {
		return errors.New("invite is incomplete")
	}
	s.pendingInvites[strings.ToLower(strings.TrimSpace(inv.Email))] = inv
	return nil
}

func (s *Server) setPassword(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Email      string `json:"email"`
		InviteCode string `json:"invite_code"`
		Password   string `json:"password"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	inviteCode := strings.TrimSpace(body.InviteCode)
	password := body.Password
	if email == "" || inviteCode == "" || password == "" {
		writeError(writer, http.StatusBadRequest, "email, invite_code, and password are required")
		return
	}
	s.enterpriseMu.RLock()
	invite, ok := s.pendingInvites[email]
	s.enterpriseMu.RUnlock()
	if !ok || invite.Token != inviteCode {
		writeError(writer, http.StatusUnauthorized, "invalid or expired invite code")
		return
	}
	if len(password) < 8 {
		writeError(writer, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}
	login, err := s.identityService.SetPassword(email, password)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	s.enterpriseMu.Lock()
	delete(s.pendingInvites, email)
	s.enterpriseMu.Unlock()
	user, err := s.identityStore.FindUserByID(login.UserID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	org, err := s.organizationByID(login.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, buildTenantSession(user, org, login.AccessToken, login.Roles, login.Permissions))
}

func (s *Server) smtpTest(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers)
	if !ok {
		return
	}
	var body struct {
		To string `json:"to"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	to := strings.TrimSpace(body.To)
	if to == "" {
		user, err := s.identityStore.FindUserByID(claims.Subject)
		if err == nil {
			to = user.Email
		}
	}
	if to == "" {
		writeError(writer, http.StatusBadRequest, "recipient email is required")
		return
	}
	subject := "Kora Finance — SMTP Test"
	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; padding: 40px; background: #f5f5f5;">
<div style="max-width: 500px; margin: auto; background: white; border-radius: 12px; padding: 32px;">
<h2 style="margin-top: 0;">SMTP Test</h2>
<p>This is a test email from <strong>Kora Finance</strong>.</p>
<p>If you received this, the SMTP configuration is working correctly.</p>
<hr style="border: none; border-top: 1px solid #eee;">
<p style="color: #666; font-size: 12px;">Sent at %s</p>
</div>
</body>
</html>`, time.Now().UTC().Format(time.RFC1123))
	if err := s.emailSender.Send(to, subject, html); err != nil {
		writeError(writer, http.StatusInternalServerError, fmt.Sprintf("smtp error: %v", err))
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"sent": true, "to": to})
}

func (s *Server) smtpSendInvitation(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers); !ok {
		return
	}
	var body struct {
		Email      string `json:"email"`
		Name       string `json:"name"`
		InviteCode string `json:"invite_code"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))
	if body.Email == "" {
		writeError(writer, http.StatusBadRequest, "email is required")
		return
	}
	if body.InviteCode == "" {
		writeError(writer, http.StatusBadRequest, "invite_code is required")
		return
	}
	s.sendInvitationEmail(body.Email, body.Name, body.InviteCode)
	writeJSON(writer, http.StatusOK, map[string]any{"sent": true, "to": body.Email})
}

func (s *Server) sendInvitationEmail(to, displayName, inviteCode string) {
	if s.emailSender == nil {
		return
	}
	orgName := s.activeOrganizationName()
	if displayName == "" {
		displayName = to
	}
	appURL := os.Getenv("KORA_APP_URL")
	if appURL == "" {
		appURL = "http://localhost:5173"
	}
	setupURL := fmt.Sprintf("%s/invite?email=%s&code=%s", appURL, url.QueryEscape(to), url.QueryEscape(inviteCode))
	subject := fmt.Sprintf("You're invited to join %s on Kora Finance", orgName)
	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; padding: 40px; background: #f5f5f5;">
<div style="max-width: 560px; margin: auto; background: white; border-radius: 12px; padding: 32px;">
<div style="text-align: center; margin-bottom: 24px;">
<span style="font-size: 24px; font-weight: bold; color: #1a1a2e;">Kora Finance</span>
</div>
<h2 style="margin-top: 0;">You've been invited!</h2>
<p>Hello <strong>%s</strong>,</p>
<p><strong>%s</strong> has invited you to join their organization on <strong>Kora Finance</strong>.</p>
<div style="text-align: center; margin: 24px 0;">
<a href="%s" style="display: inline-block; background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">Accept Invitation →</a>
</div>
<p style="color: #666; font-size: 14px;">Or copy this link into your browser:</p>
<p style="background: #f8f9fa; border-radius: 6px; padding: 12px; font-size: 12px; word-break: break-all; color: #1a1a2e;">%s</p>
<hr style="border: none; border-top: 1px solid #eee;">
<p style="color: #999; font-size: 12px;">This invitation was sent by an administrator of %s. If you weren't expecting this, you can ignore this email.</p>
</div>
</body>
</html>`, displayName, orgName, setupURL, setupURL, orgName)
	go func() {
		if err := s.emailSender.Send(to, subject, html); err != nil {
			fmt.Fprintf(os.Stderr, "invitation email failed for %s: %v\n", to, err)
		}
	}()
}

func (s *Server) activeOrganizationName() string {
	orgID := s.activeOrganizationID()
	if orgID == "" {
		return "an organization"
	}
	org, err := s.organizationByID(orgID)
	if err != nil {
		return "an organization"
	}
	return org.Name
}
