package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/auth"
	"github.com/kora-finance/kora/libs/connectors"
	"github.com/kora-finance/kora/libs/identity"
	"github.com/kora-finance/kora/libs/servicekit"
	"github.com/kora-finance/kora/services/gateway/internal/demo"
)

const maxRequestBytes = 1 << 20

const demoPassword = "demo-pass-123"

type Server struct {
	mux                  *http.ServeMux
	identityService      *identity.Service
	identityStore        *identity.MemoryStore
	connections          connectors.ConnectionStore
	jwtSecret            []byte
	demoUsers            map[string]demoUser
	demoMu               sync.RWMutex
	intakeDocs           []demo.IntakeDoc
	intakeSources        map[string]bool
	reports              []demo.ReportDef
	financeSnapshot      demo.FinanceOperationsSnapshot
	financeLeadHome      demo.FinanceLeadDashboardData
	contracts            demo.ContractsOverviewData
	ownerRisk            demo.OwnerRiskDashboardData
	controlsClose        demo.ControlsCloseData
	auditViews           demo.AuditInvestigationsView
	collections          []demo.OverdueItem
	collectionsMgmt      demo.CollectionsManagementData
	relationships        demo.RelationshipsOverviewData
	agentsState          demo.AgentsOverviewData
	workflowState        demo.WorkflowSnapshot
	claimsState          demo.ClaimWorkspaceData
	consentState         []demo.ConsentGrantData
	adminDashboardState  demo.AdminDashboardData
	featureEntitlements  []string
	orgUsers             []demo.OrgUserData
	approvalRules        []demo.ApprovalRuleData
	settingsOverview     demo.SettingsOverviewData
	integrationOverrides map[string]integrationStatusOverride
	platformConsole      demo.PlatformConsoleData
	accountSettings      map[string]demo.AccountSettingsData
	mailboxes            map[string]demo.MailboxData
}

type demoUser struct {
	Email       string
	DisplayName string
	Role        access.Role
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
	OrganizationName string                  `json:"organizationName"`
	Grants           []demo.ConsentGrantData `json:"grants"`
	Activity         []portalAccessActivity  `json:"activity"`
}

func New(secret []byte) (*Server, error) {
	store := identity.NewMemoryStore()
	service := identity.NewService(store, secret)
	connectionStore := connectors.NewMemoryConnectionStore()
	server := &Server{
		mux:             http.NewServeMux(),
		identityService: service,
		identityStore:   store,
		connections:     connectionStore,
		jwtSecret:       secret,
	}
	if err := server.seedDemoData(); err != nil {
		return nil, err
	}
	server.routes()
	return server, nil
}

func (s *Server) routes() {
	s.mux.HandleFunc("/healthz", servicekit.HealthHandler("gateway"))
	s.mux.HandleFunc("/api/session/demo-login", s.demoLogin)
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

func (s *Server) demoLogin(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		RoleID string `json:"role_id"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if body.RoleID == roleIDSuperAdmin {
		session, err := s.buildSuperAdminSession()
		if err != nil {
			writeError(writer, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(writer, http.StatusOK, session)
		return
	}
	demo, ok := s.demoUsers[body.RoleID]
	if !ok {
		writeError(writer, http.StatusNotFound, "unknown demo role")
		return
	}
	login, err := s.identityService.Login(demo.Email, demoPassword)
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
	override := integrationStatusOverride{
		Status:       current.Status,
		LastSync:     current.LastSync,
		Connected:    current.Connected,
		ConnectionID: current.ConnectionID,
	}
	actionLabel := ""
	switch action {
	case "connect":
		override.Connected = true
		override.Status = "connected"
		override.LastSync = "ready"
		if override.ConnectionID == "" {
			override.ConnectionID = "conn_demo_" + strings.ReplaceAll(integrationID, "-", "_")
		}
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
	s.demoMu.Lock()
	if s.integrationOverrides == nil {
		s.integrationOverrides = map[string]integrationStatusOverride{}
	}
	s.integrationOverrides[integrationID] = override
	s.workflowState.AuditLog = append([]demo.AuditEvent{{
		ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		At:          time.Now().UTC().Format(time.RFC3339),
		Actor:       s.sessionDisplayName(claims),
		Role:        s.sessionRoleName(claims),
		Kind:        "integration",
		Action:      actionLabel,
		Target:      current.Name,
		HasEvidence: true,
	}}, s.workflowState.AuditLog...)
	s.demoMu.Unlock()
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
	actor, err := actorFromClaims(claims)
	if err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	if claims.OrganizationID == "" {
		writeError(writer, http.StatusForbidden, "tenant session required")
		return
	}
	if err := access.Authorize(actor, access.Resource{OrganizationID: claims.OrganizationID}, access.PermissionReadEvents); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	s.demoMu.RLock()
	payload := s.workflowState
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) workflowApprovalAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requireAuthenticatedSession(writer, request)
	if !ok {
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/workflow/approvals/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	approvalID, action := parts[0], parts[1]
	actorName := s.sessionDisplayName(claims)
	actorRole := s.sessionRoleName(claims)

	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.workflowState.Approvals {
		item := &s.workflowState.Approvals[idx]
		if item.ID != approvalID {
			continue
		}
		result := ""
		switch action {
		case "approve":
			if item.PreparedBy.Name == actorName || item.IsOwnItem {
				result = "sod"
				break
			}
			for _, approval := range item.Approvals {
				if approval.Name == actorName {
					result = "duplicate"
					break
				}
			}
			if result != "" {
				break
			}
			if item.RequiresDualApproval && len(item.Approvals) == 0 && strings.Contains(strings.ToLower(actorRole), "owner") {
				result = "needs-first"
				break
			}
			item.Approvals = append(item.Approvals, demo.Approver{Name: actorName, Role: actorRole, At: time.Now().UTC().Format(time.RFC3339)})
			if item.RequiresDualApproval && len(item.Approvals) < 2 {
				item.Stage = "partial"
				result = "partial"
				item.History = append(item.History, demo.HistoryEvent{ID: "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, ActorRole: actorRole, Kind: "user", Action: "Approved (1 of 2)"})
				s.workflowState.AuditLog = append([]demo.AuditEvent{{ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, Role: actorRole, Kind: "approval", Action: "Approved (1 of 2)", Target: item.Title + " · " + item.Subtitle, Amount: &item.Amount, HasEvidence: len(item.Evidence) > 0}}, s.workflowState.AuditLog...)
			} else {
				item.Stage = "approved"
				result = "approved"
				item.History = append(item.History, demo.HistoryEvent{ID: "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, ActorRole: actorRole, Kind: "user", Action: "Approved & posted · audited"})
				s.workflowState.AuditLog = append([]demo.AuditEvent{{ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, Role: actorRole, Kind: "posting", Action: "Approved & posted · audited", Target: item.Title + " · " + item.Subtitle, Amount: &item.Amount, HasEvidence: len(item.Evidence) > 0}}, s.workflowState.AuditLog...)
			}
		case "reject":
			item.Stage = "rejected"
			result = "rejected"
			item.History = append(item.History, demo.HistoryEvent{ID: "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, ActorRole: actorRole, Kind: "user", Action: "Rejected approval"})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, Role: actorRole, Kind: "approval", Action: "Rejected approval", Target: item.Title + " · " + item.Subtitle, Amount: &item.Amount, HasEvidence: len(item.Evidence) > 0}}, s.workflowState.AuditLog...)
		case "withdraw":
			item.Stage = "rejected"
			result = "withdrawn"
			item.History = append(item.History, demo.HistoryEvent{ID: "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, ActorRole: actorRole, Kind: "user", Action: "Withdrawn to drafts"})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, Role: actorRole, Kind: "approval", Action: "Withdrew approval request", Target: item.Title + " - " + item.Subtitle, Amount: &item.Amount, HasEvidence: len(item.Evidence) > 0}}, s.workflowState.AuditLog...)
		case "nudge":
			result = "nudged"
			item.History = append(item.History, demo.HistoryEvent{ID: "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, ActorRole: actorRole, Kind: "user", Action: "Nudged approver"})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, Role: actorRole, Kind: "approval", Action: "Nudged approver", Target: item.Title + " - " + item.Subtitle, Amount: &item.Amount, HasEvidence: len(item.Evidence) > 0}}, s.workflowState.AuditLog...)
		case "resubmit":
			item.Stage = "awaiting"
			result = "resubmitted"
			item.History = append(item.History, demo.HistoryEvent{ID: "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, ActorRole: actorRole, Kind: "user", Action: "Reopened and resubmitted"})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, Role: actorRole, Kind: "approval", Action: "Resubmitted approval", Target: item.Title + " - " + item.Subtitle, Amount: &item.Amount, HasEvidence: len(item.Evidence) > 0}}, s.workflowState.AuditLog...)
		case "request-info":
			result = "requested-info"
			item.History = append(item.History, demo.HistoryEvent{ID: "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, ActorRole: actorRole, Kind: "user", Action: "Requested more info"})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, Role: actorRole, Kind: "approval", Action: "Requested approval info", Target: item.Title + " - " + item.Subtitle, Amount: &item.Amount, HasEvidence: len(item.Evidence) > 0}}, s.workflowState.AuditLog...)
		case "reassign":
			result = "reassigned"
			item.History = append(item.History, demo.HistoryEvent{ID: "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, ActorRole: actorRole, Kind: "user", Action: "Reassigned approver"})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, Role: actorRole, Kind: "approval", Action: "Reassigned approval", Target: item.Title + " - " + item.Subtitle, Amount: &item.Amount, HasEvidence: len(item.Evidence) > 0}}, s.workflowState.AuditLog...)
		case "escalate":
			item.Stage = "escalated"
			result = "escalated"
			item.History = append(item.History, demo.HistoryEvent{ID: "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, ActorRole: actorRole, Kind: "user", Action: "Escalated to owner"})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339), Actor: actorName, Role: actorRole, Kind: "approval", Action: "Escalated approval", Target: item.Title + " - " + item.Subtitle, Amount: &item.Amount, HasEvidence: len(item.Evidence) > 0}}, s.workflowState.AuditLog...)
		default:
			writeError(writer, http.StatusNotFound, "unknown workflow action")
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"result": result, "snapshot": s.workflowState})
		return
	}
	writeError(writer, http.StatusNotFound, "approval not found")
}

func (s *Server) workflowReconciliationAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requireAuthenticatedSession(writer, request)
	if !ok {
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/workflow/reconciliations/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	reconID, action := parts[0], parts[1]
	actorName := s.sessionDisplayName(claims)
	actorRole := s.sessionRoleName(claims)
	now := time.Now().UTC().Format(time.RFC3339)

	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.workflowState.Reconciliations {
		recon := &s.workflowState.Reconciliations[idx]
		if recon.ID != reconID {
			continue
		}
		result := ""
		switch action {
		case "prepare":
			if recon.Stage == "posted" {
				result = "already-posted"
				break
			}
			recon.Stage = "prepared"
			recon.AgeText = "Prepared just now"
			recon.History = append(recon.History, demo.HistoryEvent{
				ID:        "h-" + strconv.FormatInt(time.Now().UnixNano(), 10),
				At:        now,
				Actor:     actorName,
				ActorRole: actorRole,
				Kind:      "user",
				Action:    "Prepared match - routed for approval",
			})
			s.ensurePreparedApprovalLocked(*recon, actorName, actorRole, now)
			result = "prepared"
		case "reject":
			recon.Stage = "detected"
			recon.AgeText = "Rejected - back to review"
			recon.History = append(recon.History, demo.HistoryEvent{
				ID:        "h-" + strconv.FormatInt(time.Now().UnixNano(), 10),
				At:        now,
				Actor:     actorName,
				ActorRole: actorRole,
				Kind:      "user",
				Action:    "Rejected match - returned to review",
			})
			result = "rejected"
		case "approve":
			recon.Stage = "posted"
			recon.AgeText = "Posted just now"
			recon.History = append(recon.History, demo.HistoryEvent{
				ID:        "h-" + strconv.FormatInt(time.Now().UnixNano(), 10),
				At:        now,
				Actor:     actorName,
				ActorRole: actorRole,
				Kind:      "user",
				Action:    "Approved match - posted",
			})
			s.markLinkedApprovalPostedLocked(*recon, actorName, actorRole, now)
			s.workflowState.AuditLog = append([]demo.AuditEvent{{
				ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
				At:          now,
				Actor:       actorName,
				Role:        actorRole,
				Kind:        "posting",
				Action:      "Reconciliation approved & posted - audited",
				Target:      recon.Transaction.Counterparty + " - " + coalesce(recordReference(recon.SuggestedRecord), recon.Transaction.Reference, "match"),
				Amount:      &recon.Transaction.Amount,
				HasEvidence: len(recon.Evidence) > 0,
			}}, s.workflowState.AuditLog...)
			result = "approved"
		case "dismiss":
			if !slices.Contains(s.workflowState.DismissedReconIDs, reconID) {
				s.workflowState.DismissedReconIDs = append(s.workflowState.DismissedReconIDs, reconID)
			}
			result = "dismissed"
		case "assign":
			recon.AgeText = "Delegated to finance"
			recon.History = append(recon.History, demo.HistoryEvent{
				ID: "h-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: now, Actor: actorName, ActorRole: actorRole,
				Kind: "user", Action: "Delegated exception to Finance Operator",
			})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{
				ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: now, Actor: actorName, Role: actorRole,
				Kind: "workflow", Action: "Delegated reconciliation exception", Target: recon.Transaction.Counterparty,
				Amount: &recon.Transaction.Amount, HasEvidence: len(recon.Evidence) > 0,
			}}, s.workflowState.AuditLog...)
			result = "assigned"
		case "ask":
			recon.AgeText = "Explanation requested"
			recon.History = append(recon.History, demo.HistoryEvent{
				ID: "h-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: now, Actor: actorName, ActorRole: actorRole,
				Kind: "user", Action: "Requested explanation from Finance Operator",
			})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{
				ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: now, Actor: actorName, Role: actorRole,
				Kind: "workflow", Action: "Requested reconciliation explanation", Target: recon.Transaction.Counterparty,
				Amount: &recon.Transaction.Amount, HasEvidence: len(recon.Evidence) > 0,
			}}, s.workflowState.AuditLog...)
			result = "asked"
		case "acknowledge":
			recon.AgeText = "Reviewed just now"
			recon.History = append(recon.History, demo.HistoryEvent{
				ID: "h-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: now, Actor: actorName, ActorRole: actorRole,
				Kind: "user", Action: "Acknowledged exception review",
			})
			s.workflowState.AuditLog = append([]demo.AuditEvent{{
				ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: now, Actor: actorName, Role: actorRole,
				Kind: "review", Action: "Acknowledged reconciliation exception", Target: recon.Transaction.Counterparty,
				Amount: &recon.Transaction.Amount, HasEvidence: len(recon.Evidence) > 0,
			}}, s.workflowState.AuditLog...)
			result = "acknowledged"
		default:
			writeError(writer, http.StatusNotFound, "unknown workflow action")
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"result": result, "snapshot": s.workflowState})
		return
	}
	writeError(writer, http.StatusNotFound, "reconciliation not found")
}

func (s *Server) reconciliationExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents); !ok {
		return
	}
	s.demoMu.RLock()
	items := append([]demo.Reconciliation(nil), s.workflowState.Reconciliations...)
	s.demoMu.RUnlock()
	open := 0
	for _, item := range items {
		if item.Stage == "reviewing" || item.Stage == "detected" {
			open++
		}
	}
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Reconciliation Control Summary) Tj\n0 -28 Td\n/F1 11 Tf\n(Total reconciliation items: %d) Tj\n0 -22 Td\n(Open exceptions: %d) Tj\n0 -22 Td\n(Audit evidence is linked to each workflow item.) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from the tenant-scoped reconciliation workflow.) Tj\nET\n", len(items), open)
	pdf := "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length " + strconv.Itoa(len(content)) + ">>stream\n" + content + "endstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-reconciliation-summary.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(pdf))
}

func (s *Server) ensurePreparedApprovalLocked(recon demo.Reconciliation, actorName, actorRole, now string) {
	approvalID := "ap-from-" + recon.ID
	for _, item := range s.workflowState.Approvals {
		if item.ID == approvalID {
			return
		}
	}
	requiresDual := false
	if amountMinor, err := strconv.ParseInt(recon.Transaction.Amount.AmountMinor, 10, 64); err == nil {
		requiresDual = amountMinor > 10000000
	}
	subtitle := "prepared"
	if reference := recordReference(recon.SuggestedRecord); reference != "" {
		subtitle = reference + " - prepared"
	}
	s.workflowState.Approvals = append([]demo.ApprovalItem{{
		ID:                   approvalID,
		Type:                 "match",
		Title:                "Approve match: " + recon.Transaction.Counterparty,
		Subtitle:             subtitle,
		Amount:               recon.Transaction.Amount,
		Risk:                 riskFromReconTier(recon.Tier),
		PreparedBy:           demo.Approver{Name: actorName, Role: actorRole},
		PreparedAt:           now,
		DeadlineText:         "Due in 2d",
		Urgent:               false,
		Confidence:           &recon.Confidence,
		Stage:                "awaiting",
		RequiresDualApproval: requiresDual,
		PolicyLimit:          demo.Money{AmountMinor: "10000000", Currency: recon.Transaction.Amount.Currency},
		WithinLimit:          !requiresDual,
		Approvals:            []demo.Approver{},
		IsOwnItem:            false,
		AgentRecommendation:  recon.Reason,
		Evidence:             append([]demo.EvidenceDoc(nil), recon.Evidence...),
		History: []demo.HistoryEvent{{
			ID:        "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			At:        now,
			Actor:     actorName,
			ActorRole: actorRole,
			Kind:      "user",
			Action:    "Prepared match - routed for approval",
		}},
	}}, s.workflowState.Approvals...)
}

func (s *Server) markLinkedApprovalPostedLocked(recon demo.Reconciliation, actorName, actorRole, now string) {
	for idx := range s.workflowState.Approvals {
		item := &s.workflowState.Approvals[idx]
		if item.Stage == "approved" {
			continue
		}
		if item.ID == "ap-from-"+recon.ID || approvalMatchesRecon(*item, recon) {
			item.Stage = "approved"
			item.History = append(item.History, demo.HistoryEvent{
				ID:        "ah-" + strconv.FormatInt(time.Now().UnixNano(), 10),
				At:        now,
				Actor:     actorName,
				ActorRole: actorRole,
				Kind:      "user",
				Action:    "Approved & posted - audited",
			})
			return
		}
	}
}

func approvalMatchesRecon(item demo.ApprovalItem, recon demo.Reconciliation) bool {
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

func recordReference(record *demo.BusinessRecord) string {
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

func advanceClaimStage(claim *demo.ClaimRecord) (string, bool) {
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

func deriveClaimStats(claims []demo.ClaimRecord) demo.ClaimStats {
	stats := demo.ClaimStats{
		TotalReserves:    demo.Money{AmountMinor: "0", Currency: "USD"},
		AvgCycleDays:     6.4,
		LeakagePrevented: demo.Money{AmountMinor: "8640000", Currency: "USD"},
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
	stats.TotalReserves = demo.Money{AmountMinor: strconv.FormatInt(totalReserve, 10), Currency: "USD"}
	return stats
}

func (s *Server) collectionsOverdue(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageIntegrations); !ok {
		return
	}
	s.demoMu.RLock()
	items := append([]demo.OverdueItem(nil), s.collections...)
	s.demoMu.RUnlock()
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
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents); !ok {
		return
	}
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.collections {
		item := &s.collections[idx]
		if item.ID != itemID {
			continue
		}
		switch action {
		case "remind":
			item.ActionStatus = "reminded"
			item.LastContact = time.Now().UTC().Format("2006-01-02")
			item.ReminderCount++
		case "promise":
			item.ActionStatus = "promised"
			item.LastContact = time.Now().UTC().Format("2006-01-02")
		case "escalate":
			item.ActionStatus = "escalated"
			item.LastContact = time.Now().UTC().Format("2006-01-02")
		case "hand-to-finance":
			item.ActionStatus = "handed_to_finance"
		case "flag-owner-call":
			item.ActionStatus = "owner_call"
		case "request-update":
			item.ActionStatus = "finance_update_requested"
		default:
			writeError(writer, http.StatusNotFound, "unknown collections action")
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"item": *item, "items": append([]demo.OverdueItem(nil), s.collections...)})
		return
	}
	writeError(writer, http.StatusNotFound, "overdue item not found")
}

func (s *Server) collectionsExportSummary(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{
		"status":   "ready",
		"fileName": "receivables-summary.pdf",
	})
}

func (s *Server) claimsWorkspace(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.claimsState
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) claimsAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, ok := s.requireAuthenticatedSession(writer, request)
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
	actorRole := s.sessionRoleName(claims)

	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.claimsState.Claims {
		claim := &s.claimsState.Claims[idx]
		if claim.ID != claimID {
			continue
		}
		actionLabel := map[string]string{"advance": "Advanced claim workflow", "refer-siu": "Referred claim to SIU", "request-docs": "Requested claim documents"}[action]
		if actionLabel == "" {
			writeError(writer, http.StatusNotFound, "unknown claim action")
			return
		}
		s.workflowState.AuditLog = append([]demo.AuditEvent{{
			ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: time.Now().UTC().Format(time.RFC3339),
			Actor: actorName, Role: actorRole, Kind: "claim", Action: actionLabel,
			Target: claim.ID + " · " + claim.Claimant, Amount: &claim.ClaimedAmount, HasEvidence: len(claim.Evidence) > 0,
		}}, s.workflowState.AuditLog...)
		switch action {
		case "advance":
			next, changed := advanceClaimStage(claim)
			if !changed {
				writeJSON(writer, http.StatusOK, map[string]any{"result": "unchanged", "payload": s.claimsState})
				return
			}
			claim.SLAText = claimSLAText(next, claim.SLAText)
			if next == "closed" {
				reconciled := true
				claim.PaymentReconciled = &reconciled
			}
			s.claimsState.Stats = deriveClaimStats(s.claimsState.Claims)
			writeJSON(writer, http.StatusOK, map[string]any{"result": string(next), "payload": s.claimsState})
			return
		case "refer-siu":
			if !slices.Contains(claim.FraudFlags, "Referred to SIU") {
				claim.FraudFlags = append(claim.FraudFlags, "Referred to SIU")
			}
			claim.SLAText = "SIU review"
			claim.AssignedTo = actorName
			s.claimsState.Stats = deriveClaimStats(s.claimsState.Claims)
			writeJSON(writer, http.StatusOK, map[string]any{"result": "referred-siu", "payload": s.claimsState})
			return
		case "request-docs":
			claim.SLAText = "Docs requested"
			s.claimsState.Stats = deriveClaimStats(s.claimsState.Claims)
			writeJSON(writer, http.StatusOK, map[string]any{"result": "requested-docs", "payload": s.claimsState})
			return
		}
	}
	writeError(writer, http.StatusNotFound, "claim not found")
}

func (s *Server) consentGrants(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet && request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionManageConsent)
	if !ok {
		return
	}
	if request.Method == http.MethodPost {
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
		s.demoMu.Lock()
		defer s.demoMu.Unlock()
		item := demo.ConsentGrantData{
			ID:          "cs-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			Grantee:     grantee,
			GranteeType: granteeType,
			Purpose:     purpose,
			Scopes:      append([]string(nil), body.Scopes...),
			Status:      "active",
			Basis:       basis,
			GrantedBy:   s.sessionDisplayName(claims),
			GrantedAt:   time.Now().UTC().Format("2006-01-02"),
			ExpiresAt:   expiresAt,
		}
		s.consentState = append([]demo.ConsentGrantData{item}, s.consentState...)
		s.workflowState.AuditLog = append([]demo.AuditEvent{{
			ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			At:          time.Now().UTC().Format(time.RFC3339),
			Actor:       s.sessionDisplayName(claims),
			Role:        s.sessionRoleName(claims),
			Kind:        "consent",
			Action:      "Consent create",
			Target:      item.Grantee + " Â· " + item.Purpose,
			HasEvidence: true,
		}}, s.workflowState.AuditLog...)
		writeJSON(writer, http.StatusOK, map[string]any{"items": append([]demo.ConsentGrantData(nil), s.consentState...)})
		return
	}
	s.demoMu.RLock()
	items := append([]demo.ConsentGrantData(nil), s.consentState...)
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, map[string]any{"items": items})
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

	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.consentState {
		grant := &s.consentState[idx]
		if grant.ID != grantID {
			continue
		}
		switch action {
		case "approve":
			grant.Status = "active"
			if grant.Basis == "Awaiting authorisation" {
				grant.Basis = "Explicit consent - approved"
			}
		case "revoke":
			grant.Status = "revoked"
			grant.Basis = "Consent withdrawn"
		default:
			writeError(writer, http.StatusNotFound, "action not found")
			return
		}
		s.workflowState.AuditLog = append([]demo.AuditEvent{{
			ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			At:          time.Now().UTC().Format(time.RFC3339),
			Actor:       s.sessionDisplayName(claims),
			Role:        s.sessionRoleName(claims),
			Kind:        "consent",
			Action:      "Consent " + action,
			Target:      grant.Grantee + " · " + grant.Purpose,
			HasEvidence: true,
		}}, s.workflowState.AuditLog...)
		writeJSON(writer, http.StatusOK, map[string]any{"items": append([]demo.ConsentGrantData(nil), s.consentState...)})
		return
	}
	writeError(writer, http.StatusNotFound, "consent grant not found")
}

func (s *Server) relationshipsOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.relationships
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) relationshipPartyAction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
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
	if action != "email-contact" && action != "review-terms" && action != "send-statement" && action != "schedule-payment" {
		writeError(writer, http.StatusNotFound, "unknown relationship action")
		return
	}
	if action != "email-contact" {
		if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageRelationships); !ok {
			return
		}
	}

	now := time.Now().UTC()
	actorName := s.sessionDisplayName(claims)
	actorRole := s.sessionRoleName(claims)

	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.relationships.Parties {
		party := &s.relationships.Parties[idx]
		if party.ID != partyID {
			continue
		}
		activityText := ""
		auditAction := ""
		switch action {
		case "email-contact":
			activityText = "Contact email drafted for " + party.Contact
			auditAction = "Relationship email contact"
		case "review-terms":
			activityText = "Credit terms review requested"
			auditAction = "Relationship review terms"
		case "send-statement":
			activityText = "Account statement sent to " + party.Contact
			auditAction = "Relationship send statement"
		case "schedule-payment":
			activityText = "Payment scheduled for next run"
			auditAction = "Relationship schedule payment"
			party.Overdue = false
		}
		party.Activity = append([]demo.PartyActivityData{{
			Date: now.Format("2006-01-02"),
			Text: activityText,
		}}, party.Activity...)
		s.workflowState.AuditLog = append([]demo.AuditEvent{{
			ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			At:          now.Format(time.RFC3339),
			Actor:       actorName,
			Role:        actorRole,
			Kind:        "relationship",
			Action:      auditAction,
			Target:      party.Name,
			HasEvidence: true,
		}}, s.workflowState.AuditLog...)
		writeJSON(writer, http.StatusOK, s.relationships)
		return
	}
	writeError(writer, http.StatusNotFound, "party not found")
}

func (s *Server) roiSummary(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadROI); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, demo.ROISummaryDemoData())
}

func (s *Server) roiExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadROI); !ok {
		return
	}
	data := demo.ROISummaryDemoData()
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora ROI Summary) Tj\n0 -28 Td\n/F1 12 Tf\n(Total value delivered: %s %s) Tj\n0 -22 Td\n(Subscription cost: %s %s) Tj\n0 -22 Td\n(ROI multiple: %.1fx) Tj\n0 -22 Td\n(Hours saved: %d) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from tenant-scoped, evidence-backed ROI records.) Tj\nET\n", data.TotalValue.AmountMinor, data.TotalValue.Currency, data.SubscriptionCost.AmountMinor, data.SubscriptionCost.Currency, data.ROIMultiple, data.HoursSaved)
	pdf := "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length " + strconv.Itoa(len(content)) + ">>stream\n" + content + "endstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
	writer.Header().Set("Content-Type", "application/pdf")
	writer.Header().Set("Content-Disposition", "attachment; filename=\"kora-roi-summary.pdf\"")
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte(pdf))
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
	s.recordExternalPassportAccess(claims, "External Credit Passport accessed")
	writeJSON(writer, http.StatusOK, demo.CreditPassportPortalDemoData())
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

	user, err := s.identityStore.FindUserByID(claims.Subject)
	if err != nil {
		writeError(writer, http.StatusUnauthorized, "external user not found")
		return
	}
	now := time.Now().UTC()
	item := demo.ConsentGrantData{
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
	s.demoMu.Lock()
	s.consentState = append([]demo.ConsentGrantData{item}, s.consentState...)
	s.workflowState.AuditLog = append([]demo.AuditEvent{{
		ID:          "al-" + strconv.FormatInt(now.UnixNano(), 10),
		At:          now.Format(time.RFC3339),
		Actor:       user.DisplayName,
		Role:        s.sessionRoleName(claims),
		Kind:        "consent",
		Action:      "External access scope requested",
		Target:      scope,
		HasEvidence: true,
	}}, s.workflowState.AuditLog...)
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusAccepted, map[string]demo.ConsentGrantData{"item": item})
}

func (s *Server) agentsOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.agentsState
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) agentRun(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	agentID := strings.Trim(strings.TrimPrefix(request.URL.Path, "/api/agents/run/"), "/")
	if agentID == "" {
		writeError(writer, http.StatusNotFound, "agent not found")
		return
	}
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	if !s.runAgentLocked(agentID, s.sessionDisplayName(claims)) {
		writeError(writer, http.StatusNotFound, "agent not found")
		return
	}
	writeJSON(writer, http.StatusOK, s.agentsState)
}

func (s *Server) agentRunAll(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
	if !ok {
		return
	}
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	actorName := s.sessionDisplayName(claims)
	for _, agentID := range []string{"a-intake", "a-recon", "a-cfo", "a-rel", "a-contract", "a-coll", "a-credit", "a-supplier", "a-sales", "a-audit"} {
		s.runAgentLocked(agentID, actorName)
	}
	writeJSON(writer, http.StatusOK, s.agentsState)
}

func (s *Server) agentFeedback(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant)
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
	actorName := s.sessionDisplayName(claims)
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	var agentName string
	for _, agent := range s.agentsState.Agents {
		if agent.ID == agentID {
			agentName = agent.Name
			break
		}
	}
	if agentName == "" {
		writeError(writer, http.StatusNotFound, "agent not found")
		return
	}
	updated := false
	for idx := range s.agentsState.Feedback {
		feedback := &s.agentsState.Feedback[idx]
		if feedback.AgentID == agentID && feedback.SubmittedBy == actorName {
			feedback.Rating = rating
			feedback.SubmittedAt = now.Format(time.RFC3339)
			updated = true
			break
		}
	}
	if !updated {
		s.agentsState.Feedback = append(s.agentsState.Feedback, demo.AgentFeedbackData{
			ID:          "af-" + strconv.FormatInt(now.UnixNano(), 10),
			AgentID:     agentID,
			Rating:      rating,
			SubmittedAt: now.Format(time.RFC3339),
			SubmittedBy: actorName,
		})
	}
	action := "Agent feedback recorded"
	if updated {
		action = "Agent feedback updated"
	}
	s.workflowState.AuditLog = append([]demo.AuditEvent{{
		ID:          "al-" + strconv.FormatInt(now.UnixNano(), 10),
		At:          now.Format(time.RFC3339),
		Actor:       actorName,
		Role:        s.sessionRoleName(claims),
		Kind:        "agent",
		Action:      action,
		Target:      agentName + " - " + rating,
		HasEvidence: true,
	}}, s.workflowState.AuditLog...)
	writeJSON(writer, http.StatusOK, s.agentsState)
}

func (s *Server) collectionsManagement(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionSendCollections); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.collectionsMgmt
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
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
	path := strings.Trim(strings.TrimPrefix(request.URL.Path, "/api/collections/management/"), "/")
	parts := strings.Split(path, "/")
	if len(parts) == 2 && parts[0] == "policy" && parts[1] == "update" {
		s.demoMu.Lock()
		defer s.demoMu.Unlock()
		s.workflowState.AuditLog = append([]demo.AuditEvent{{
			ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			At:          time.Now().UTC().Format(time.RFC3339),
			Actor:       s.sessionDisplayName(claims),
			Role:        s.sessionRoleName(claims),
			Kind:        "config",
			Action:      "Updated collections policy",
			Target:      s.collectionsMgmt.Policy.ReminderCadence + " · auto-escalate " + s.collectionsMgmt.Policy.AutoEscalateAt,
			HasEvidence: true,
		}}, s.workflowState.AuditLog...)
		writeJSON(writer, http.StatusOK, s.collectionsMgmt)
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
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.collectionsMgmt.Escalations {
		item := s.collectionsMgmt.Escalations[idx]
		if item.ID != escalationID {
			continue
		}
		s.collectionsMgmt.Escalations = append(s.collectionsMgmt.Escalations[:idx], s.collectionsMgmt.Escalations[idx+1:]...)
		action := map[string]string{
			"approved": "Approved collections escalation",
			"declined": "Declined collections escalation",
		}[decision]
		s.workflowState.AuditLog = append([]demo.AuditEvent{{
			ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			At:          time.Now().UTC().Format(time.RFC3339),
			Actor:       s.sessionDisplayName(claims),
			Role:        s.sessionRoleName(claims),
			Kind:        "approval",
			Action:      action,
			Target:      item.Customer + " · " + item.Invoice,
			Amount:      &item.Amount,
			HasEvidence: true,
		}}, s.workflowState.AuditLog...)
		writeJSON(writer, http.StatusOK, s.collectionsMgmt)
		return
	}
	writeError(writer, http.StatusNotFound, "escalation not found")
}

func (s *Server) ownerSummary(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, demo.OwnerHomeSummaryData())
}

func (s *Server) ownerDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, demo.OwnerDashboardCardsData())
}

func (s *Server) adminDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.adminDashboardState
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
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
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	index := -1
	var item demo.AccessRequest
	for idx := range s.adminDashboardState.AccessRequests {
		if s.adminDashboardState.AccessRequests[idx].ID == requestID {
			index = idx
			item = s.adminDashboardState.AccessRequests[idx]
			break
		}
	}
	if index == -1 {
		writeError(writer, http.StatusNotFound, "access request not found")
		return
	}
	s.adminDashboardState.AccessRequests = append(s.adminDashboardState.AccessRequests[:index], s.adminDashboardState.AccessRequests[index+1:]...)
	s.adminDashboardState.Stats.PendingRequests = len(s.adminDashboardState.AccessRequests)
	now := time.Now().UTC().Format(time.RFC3339)
	actionLabel := "Access request denied"
	if action == "grant" {
		actionLabel = "Access request granted"
	}
	s.workflowState.AuditLog = append([]demo.AuditEvent{{
		ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		At:          now,
		Actor:       s.sessionDisplayName(claims),
		Role:        s.sessionRoleName(claims),
		Kind:        "access",
		Action:      actionLabel,
		Target:      item.Name + " · " + item.RequestedRole,
		HasEvidence: true,
	}}, s.workflowState.AuditLog...)
	writeJSON(writer, http.StatusOK, s.adminDashboardState)
}

func (s *Server) operatorDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, demo.OperatorHomeDemoData())
}

func (s *Server) auditorDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, demo.AuditorHomeDemoData())
}

func (s *Server) platformDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, ok := s.requirePlatformAdmin(writer, request); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, demo.PlatformHomeDemoData())
}

func (s *Server) intakeDocsAPI(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents); !ok {
		return
	}
	s.demoMu.RLock()
	items := append([]demo.IntakeDoc(nil), s.intakeDocs...)
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) intakeSourcesAPI(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageIntegrations); !ok {
		return
	}
	s.demoMu.RLock()
	sources := map[string]bool{}
	for key, connected := range s.intakeSources {
		sources[key] = connected
	}
	s.demoMu.RUnlock()
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
	s.demoMu.Lock()
	if s.intakeSources == nil {
		s.intakeSources = map[string]bool{}
	}
	s.intakeSources[parts[0]] = true
	now := time.Now().UTC().Format(time.RFC3339)
	s.workflowState.AuditLog = append([]demo.AuditEvent{{
		ID: "al-" + strconv.FormatInt(time.Now().UnixNano(), 10), At: now,
		Actor: s.sessionDisplayName(claims), Role: s.sessionRoleName(claims), Kind: "integration",
		Action: "Connected intake source", Target: parts[0], HasEvidence: true,
	}}, s.workflowState.AuditLog...)
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, map[string]any{"source": parts[0], "connected": true})
}

func (s *Server) intakeUpload(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionUploadDocuments); !ok {
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
	doc := demo.IntakeDoc{
		ID:         "doc-upload-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Name:       name,
		Kind:       "invoice",
		Source:     "upload",
		ReceivedAt: time.Now().UTC().Format(time.RFC3339),
		Stage:      "extracting",
		SizeText:   "- KB",
		Fields:     []demo.ExtractedField{{Label: "Status", Value: "Extracting...", Confidence: 0}},
	}
	s.demoMu.Lock()
	s.intakeDocs = append([]demo.IntakeDoc{doc}, s.intakeDocs...)
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, doc)
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
	if _, _, ok := s.requireTenantActor(writer, request, permission); !ok {
		return
	}
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.intakeDocs {
		if s.intakeDocs[idx].ID != docID {
			continue
		}
		switch action {
		case "match":
			s.intakeDocs[idx].Stage = "matched"
		case "post":
			s.intakeDocs[idx].Stage = "posted"
		default:
			writeError(writer, http.StatusNotFound, "unknown intake action")
			return
		}
		writeJSON(writer, http.StatusOK, s.intakeDocs[idx])
		return
	}
	writeError(writer, http.StatusNotFound, "document not found")
}

func (s *Server) reportsCatalog(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports); !ok {
		return
	}
	s.demoMu.RLock()
	items := append([]demo.ReportDef(nil), s.reports...)
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, map[string]any{"items": items})
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
		if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports); !ok {
			return
		}
		report, ok := s.findReport(reportID)
		if !ok {
			writeError(writer, http.StatusNotFound, "report not found")
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{
			"report":   report,
			"content":  demo.BuildReportContent(report.Kind),
			"periods":  []string{"May 2025", "April 2025", "Q2 2025", "YTD 2025"},
			"evidence": "evidence-backed",
		})
		return
	}
	if request.Method == http.MethodPost && len(parts) == 2 && parts[1] == "generate" {
		if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports); !ok {
			return
		}
		report, ok := s.touchReport(reportID)
		if !ok {
			writeError(writer, http.StatusNotFound, "report not found")
			return
		}
		writeJSON(writer, http.StatusOK, report)
		return
	}
	if request.Method == http.MethodPost && len(parts) == 2 && parts[1] == "export" {
		if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports); !ok {
			return
		}
		report, ok := s.findReport(reportID)
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
		writeJSON(writer, http.StatusOK, map[string]any{
			"status":   "ready",
			"fileName": strings.ReplaceAll(strings.ToLower(report.Name), " ", "-") + ".pdf",
			"period":   body.Period,
		})
		return
	}
	if request.Method == http.MethodPost && len(parts) == 2 && parts[1] == "schedule" {
		if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports); !ok {
			return
		}
		var body struct {
			Schedule string `json:"schedule"`
		}
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		report, ok := s.updateReportSchedule(reportID, body.Schedule)
		if !ok {
			writeError(writer, http.StatusNotFound, "report not found")
			return
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
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{
		"status":   "building",
		"fileName": "board-pack.pdf",
	})
}

func (s *Server) financialStatementsExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadReports); !ok {
		return
	}
	s.demoMu.RLock()
	journals := append([]demo.FinanceJournalEntry(nil), s.financeSnapshot.Journals...)
	s.demoMu.RUnlock()
	posted := 0
	for _, journal := range journals {
		if journal.Status == "posted" {
			posted++
		}
	}
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Financial Statement Pack) Tj\n0 -28 Td\n/F1 11 Tf\n(Period: May 2025) Tj\n0 -22 Td\n(Posted journals included: %d) Tj\n0 -22 Td\n(Statements: Income statement, balance sheet, cash flow) Tj\n0 -22 Td\n(Source: tenant-scoped general ledger) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from ledger records and permission-checked report access.) Tj\nET\n", posted)
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
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadEvents); !ok {
		return
	}
	s.demoMu.RLock()
	snapshot := s.financeSnapshot
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, snapshot)
}

func (s *Server) financeCashflowView(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	s.demoMu.RLock()
	view := demo.LedgerCashflowStaticData()
	view.Movements = append([]demo.FinanceTransaction(nil), s.financeSnapshot.Transactions...)
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, view)
}

func (s *Server) financeCashflowExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	s.demoMu.RLock()
	view := demo.LedgerCashflowStaticData()
	view.Movements = append([]demo.FinanceTransaction(nil), s.financeSnapshot.Transactions...)
	s.demoMu.RUnlock()
	content := fmt.Sprintf("BT\n/F1 20 Tf\n72 748 Td\n(Kora Cash Flow Summary) Tj\n0 -28 Td\n/F1 11 Tf\n(Opening balance: %s %s) Tj\n0 -22 Td\n(Current cash: %s %s) Tj\n0 -22 Td\n(Projected cash: %s %s) Tj\n0 -22 Td\n(Movements included: %d) Tj\n0 -30 Td\n/F1 9 Tf\n(Generated from the tenant-scoped ledger cashflow view.) Tj\nET\n", view.OpeningBalance.AmountMinor, view.OpeningBalance.Currency, view.Forecast.Current.AmountMinor, view.Forecast.Current.Currency, view.Forecast.Projected.AmountMinor, view.Forecast.Projected.Currency, len(view.Movements))
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
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionPostLedger); !ok {
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
	entry := demo.FinanceJournalEntry{
		ID:     "je-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Date:   body.Date,
		Ref:    body.Ref,
		Memo:   body.Memo,
		Source: body.Source,
		Status: "posted",
		Entity: body.Entity,
	}
	var totalDebit int64
	var totalCredit int64
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
		entry.Lines = append(entry.Lines, demo.FinanceJournalLine{
			Account:    line.Account,
			Debit:      demo.Money{AmountMinor: strconv.FormatInt(debit, 10), Currency: "USD"},
			Credit:     demo.Money{AmountMinor: strconv.FormatInt(credit, 10), Currency: "USD"},
			CostCenter: line.CostCenter,
		})
	}
	if totalDebit == 0 || totalDebit != totalCredit {
		writeError(writer, http.StatusBadRequest, "journal must balance")
		return
	}
	s.demoMu.Lock()
	s.financeSnapshot.Journals = append([]demo.FinanceJournalEntry{entry}, s.financeSnapshot.Journals...)
	snapshot := s.financeSnapshot
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, snapshot)
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
	if _, _, ok := s.requireTenantActor(writer, request, permission); !ok {
		return
	}
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.financeSnapshot.Bills {
		bill := &s.financeSnapshot.Bills[idx]
		if bill.ID != billID {
			continue
		}
		switch action {
		case "approve":
			if bill.Status != "draft" {
				writeError(writer, http.StatusBadRequest, "bill cannot be approved")
				return
			}
			bill.Status = "approved"
			amountMinor := int64(bill.Amount * 100)
			entry := demo.FinanceJournalEntry{
				ID:     "je-" + strconv.FormatInt(time.Now().UnixNano(), 10),
				Date:   time.Now().UTC().Format("2006-01-02"),
				Ref:    bill.Ref,
				Memo:   "Bill - " + bill.Vendor,
				Source: "AP",
				Status: "posted",
				Entity: bill.Entity,
				Lines: []demo.FinanceJournalLine{
					{Account: bill.Account, Debit: demo.Money{AmountMinor: strconv.FormatInt(amountMinor, 10), Currency: "USD"}, Credit: demo.Money{AmountMinor: "0", Currency: "USD"}, CostCenter: bill.CostCenter},
					{Account: "2000", Debit: demo.Money{AmountMinor: "0", Currency: "USD"}, Credit: demo.Money{AmountMinor: strconv.FormatInt(amountMinor, 10), Currency: "USD"}},
				},
			}
			s.financeSnapshot.Journals = append([]demo.FinanceJournalEntry{entry}, s.financeSnapshot.Journals...)
		case "pay":
			if bill.Status != "approved" {
				writeError(writer, http.StatusBadRequest, "bill cannot be paid")
				return
			}
			bill.Status = "paid"
			amountMinor := int64(bill.Amount * 100)
			entry := demo.FinanceJournalEntry{
				ID:     "je-" + strconv.FormatInt(time.Now().UnixNano(), 10),
				Date:   time.Now().UTC().Format("2006-01-02"),
				Ref:    "PAY-" + bill.Ref,
				Memo:   "Payment - " + bill.Vendor,
				Source: "AP",
				Status: "posted",
				Entity: bill.Entity,
				Lines: []demo.FinanceJournalLine{
					{Account: "2000", Debit: demo.Money{AmountMinor: strconv.FormatInt(amountMinor, 10), Currency: "USD"}, Credit: demo.Money{AmountMinor: "0", Currency: "USD"}},
					{Account: "1010", Debit: demo.Money{AmountMinor: "0", Currency: "USD"}, Credit: demo.Money{AmountMinor: strconv.FormatInt(amountMinor, 10), Currency: "USD"}},
				},
			}
			s.financeSnapshot.Journals = append([]demo.FinanceJournalEntry{entry}, s.financeSnapshot.Journals...)
		default:
			writeError(writer, http.StatusNotFound, "unknown bill action")
			return
		}
		writeJSON(writer, http.StatusOK, s.financeSnapshot)
		return
	}
	writeError(writer, http.StatusNotFound, "bill not found")
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
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReviewDataQuality); !ok {
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
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.financeSnapshot.Transactions {
		tx := &s.financeSnapshot.Transactions[idx]
		if tx.ID != transactionID {
			continue
		}
		switch action {
		case "classify":
			if strings.TrimSpace(body.Category) == "" {
				writeError(writer, http.StatusBadRequest, "category is required")
				return
			}
			tx.Category = body.Category
			if tx.Review == "needs-review" {
				tx.Review = "reviewed"
			}
		case "prepare":
			tx.Review = "prepared"
		case "reconcile":
			tx.Reconciled = true
			if tx.Review == "needs-review" {
				tx.Review = "reviewed"
			}
		case "hold":
			tx.Reconciled = false
			tx.Review = "needs-review"
			if strings.TrimSpace(body.Note) != "" {
				tx.Note = body.Note
			}
		case "post":
			tx.Review = "posted"
			tx.Reconciled = true
		case "flag":
			tx.Review = "flagged"
			if strings.TrimSpace(body.Note) != "" {
				tx.Note = body.Note
			}
		default:
			writeError(writer, http.StatusNotFound, "unknown transaction action")
			return
		}
		writeJSON(writer, http.StatusOK, s.financeSnapshot)
		return
	}
	writeError(writer, http.StatusNotFound, "transaction not found")
}

func (s *Server) auditInvestigations(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadAudit); !ok {
		return
	}
	s.demoMu.RLock()
	view := s.auditViews
	view.AuditLog = append([]demo.AuditEvent(nil), s.workflowState.AuditLog...)
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, view)
}

func (s *Server) auditEvidencePack(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadAudit); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{
		"status":   "ready",
		"fileName": "kora-audit-evidence-pack.pdf",
	})
}

func (s *Server) auditFindingCreate(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _, ok := s.requireTenantActor(writer, request, access.PermissionReadAudit)
	if !ok {
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

	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	var target *demo.AuditEvent
	for idx := range s.workflowState.AuditLog {
		if s.workflowState.AuditLog[idx].ID == body.EventID {
			target = &s.workflowState.AuditLog[idx]
			break
		}
	}
	if target == nil {
		writeError(writer, http.StatusNotFound, "audit event not found")
		return
	}
	now := time.Now().UTC()
	s.workflowState.AuditLog = append([]demo.AuditEvent{{
		ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		At:          now.Format(time.RFC3339),
		Actor:       s.sessionDisplayName(claims),
		Role:        s.sessionRoleName(claims),
		Kind:        "audit",
		Action:      "Audit finding raised",
		Target:      target.Action + " · " + target.Target,
		HasEvidence: true,
	}}, s.workflowState.AuditLog...)
	view := s.auditViews
	view.AuditLog = append([]demo.AuditEvent(nil), s.workflowState.AuditLog...)
	writeJSON(writer, http.StatusOK, view)
}

func (s *Server) settingsUsers(writer http.ResponseWriter, request *http.Request) {
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers); !ok {
		return
	}
	switch request.Method {
	case http.MethodGet:
		s.demoMu.RLock()
		items := append([]demo.OrgUserData(nil), s.orgUsers...)
		s.demoMu.RUnlock()
		writeJSON(writer, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var body demo.OrgUserData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		if strings.TrimSpace(body.ID) == "" {
			body.ID = "u-" + strconv.FormatInt(time.Now().UnixNano(), 10)
		}
		s.demoMu.Lock()
		s.orgUsers = append([]demo.OrgUserData{body}, s.orgUsers...)
		items := append([]demo.OrgUserData(nil), s.orgUsers...)
		s.demoMu.Unlock()
		writeJSON(writer, http.StatusOK, map[string]any{"items": items})
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) settingsUserAction(writer http.ResponseWriter, request *http.Request) {
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageUsers); !ok {
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/settings/users/")
	userID := strings.Trim(path, "/")
	if userID == "" {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	switch request.Method {
	case http.MethodPost:
		var body demo.OrgUserData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		s.demoMu.Lock()
		defer s.demoMu.Unlock()
		for idx := range s.orgUsers {
			if s.orgUsers[idx].ID == userID {
				body.ID = userID
				s.orgUsers[idx] = body
				writeJSON(writer, http.StatusOK, map[string]any{"items": append([]demo.OrgUserData(nil), s.orgUsers...)})
				return
			}
		}
		writeError(writer, http.StatusNotFound, "user not found")
	case http.MethodDelete:
		s.demoMu.Lock()
		defer s.demoMu.Unlock()
		before := len(s.orgUsers)
		s.orgUsers = slices.DeleteFunc(s.orgUsers, func(item demo.OrgUserData) bool { return item.ID == userID })
		if len(s.orgUsers) == before {
			writeError(writer, http.StatusNotFound, "user not found")
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"items": append([]demo.OrgUserData(nil), s.orgUsers...)})
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) settingsApprovalRules(writer http.ResponseWriter, request *http.Request) {
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManagePolicy); !ok {
		return
	}
	switch request.Method {
	case http.MethodGet:
		s.demoMu.RLock()
		items := append([]demo.ApprovalRuleData(nil), s.approvalRules...)
		s.demoMu.RUnlock()
		writeJSON(writer, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var body demo.ApprovalRuleData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		if strings.TrimSpace(body.ID) == "" {
			body.ID = "r-" + strconv.FormatInt(time.Now().UnixNano(), 10)
		}
		s.demoMu.Lock()
		s.approvalRules = append(s.approvalRules, body)
		items := append([]demo.ApprovalRuleData(nil), s.approvalRules...)
		s.demoMu.Unlock()
		writeJSON(writer, http.StatusOK, map[string]any{"items": items})
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) settingsApprovalRuleAction(writer http.ResponseWriter, request *http.Request) {
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManagePolicy); !ok {
		return
	}
	path := strings.TrimPrefix(request.URL.Path, "/api/settings/approval-rules/")
	ruleID := strings.Trim(path, "/")
	if ruleID == "" {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	switch request.Method {
	case http.MethodPost:
		var body demo.ApprovalRuleData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		s.demoMu.Lock()
		defer s.demoMu.Unlock()
		for idx := range s.approvalRules {
			if s.approvalRules[idx].ID == ruleID {
				body.ID = ruleID
				s.approvalRules[idx] = body
				writeJSON(writer, http.StatusOK, map[string]any{"items": append([]demo.ApprovalRuleData(nil), s.approvalRules...)})
				return
			}
		}
		writeError(writer, http.StatusNotFound, "rule not found")
	case http.MethodDelete:
		s.demoMu.Lock()
		defer s.demoMu.Unlock()
		before := len(s.approvalRules)
		s.approvalRules = slices.DeleteFunc(s.approvalRules, func(item demo.ApprovalRuleData) bool { return item.ID == ruleID })
		if len(s.approvalRules) == before {
			writeError(writer, http.StatusNotFound, "rule not found")
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"items": append([]demo.ApprovalRuleData(nil), s.approvalRules...)})
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) settingsOverviewAPI(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.settingsOverview
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) settingsOrgProfile(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManagePolicy); !ok {
		return
	}
	var body demo.OrgProfileData
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	s.demoMu.Lock()
	s.settingsOverview.OrgProfile = body
	payload := s.settingsOverview
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) settingsPolicyControls(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManagePolicy); !ok {
		return
	}
	var body demo.PolicyControlsData
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	s.demoMu.Lock()
	s.settingsOverview.PolicyControls = body
	payload := s.settingsOverview
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) settingsDataControls(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageDataRetention); !ok {
		return
	}
	var body demo.DataControlsData
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	s.demoMu.Lock()
	s.settingsOverview.DataControls = body
	payload := s.settingsOverview
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) settingsDataExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageDataRetention); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"status": "queued"})
}

func (s *Server) settingsBillingPortal(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionManageBilling); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"status": "ready"})
}

func (s *Server) accountSettingsAPI(writer http.ResponseWriter, request *http.Request) {
	claims, ok := s.requireAuthenticatedSession(writer, request)
	if !ok {
		return
	}
	email := s.sessionEmail(claims)
	switch request.Method {
	case http.MethodGet:
		s.demoMu.Lock()
		settings := s.ensureAccountSettingsLocked(email, claims)
		s.demoMu.Unlock()
		writeJSON(writer, http.StatusOK, settings)
	case http.MethodPost:
		var body demo.AccountSettingsData
		if err := decode(request, writer, &body); err != nil {
			writeError(writer, http.StatusBadRequest, err.Error())
			return
		}
		s.demoMu.Lock()
		s.accountSettings[email] = body
		payload := s.accountSettings[email]
		s.demoMu.Unlock()
		writeJSON(writer, http.StatusOK, payload)
	default:
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Server) accountSignOutOthers(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, ok := s.requireAuthenticatedSession(writer, request); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"status": "revoked"})
}

func (s *Server) featuresOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	s.demoMu.RLock()
	enabled := append([]string(nil), s.featureEntitlements...)
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, map[string]any{"enabled": enabled})
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
	featureID := strings.Trim(strings.TrimPrefix(request.URL.Path, "/api/features/"), "/")
	if featureID == "" {
		writeError(writer, http.StatusNotFound, "feature not found")
		return
	}
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	if slices.Contains(s.featureEntitlements, featureID) {
		s.featureEntitlements = filterStrings(s.featureEntitlements, featureID)
		s.platformConsole.AuditEvents = append([]demo.PlatformAuditEventData{{
			ID:     "audit-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			Actor:  s.sessionDisplayName(claims),
			Action: "Disabled tenant feature",
			Target: featureID,
			At:     "just now",
			Icon:   "ban",
			Tone:   "warning",
		}}, s.platformConsole.AuditEvents...)
	} else {
		s.featureEntitlements = append(s.featureEntitlements, featureID)
		s.platformConsole.AuditEvents = append([]demo.PlatformAuditEventData{{
			ID:     "audit-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			Actor:  s.sessionDisplayName(claims),
			Action: "Enabled tenant feature",
			Target: featureID,
			At:     "just now",
			Icon:   "check",
			Tone:   "success",
		}}, s.platformConsole.AuditEvents...)
	}
	writeJSON(writer, http.StatusOK, map[string]any{"enabled": append([]string(nil), s.featureEntitlements...)})
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
	email := s.sessionEmail(claims)
	s.demoMu.Lock()
	payload := s.ensureMailboxLocked(email, claims)
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, payload)
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
	var body struct {
		Account  string `json:"account"`
		Provider string `json:"provider"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	email := s.sessionEmail(claims)
	s.demoMu.Lock()
	mailbox := s.ensureMailboxLocked(email, claims)
	mailbox.Connected = true
	mailbox.Account = strings.TrimSpace(body.Account)
	mailbox.Provider = strings.TrimSpace(body.Provider)
	s.mailboxes[email] = mailbox
	payload := mailbox
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, payload)
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
	email := s.sessionEmail(claims)
	displayName := s.sessionDisplayName(claims)
	s.demoMu.Lock()
	mailbox := s.ensureMailboxLocked(email, claims)
	account := mailbox.Account
	if account == "" {
		account = email
	}
	message := demo.MailMessageData{
		ID:           "mail-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Folder:       "sent",
		FromName:     displayName,
		FromEmail:    account,
		ToName:       strings.TrimSpace(body.ToName),
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
	if message.ToName == "" {
		message.ToName = message.ToEmail
	}
	mailbox.Messages = append([]demo.MailMessageData{message}, mailbox.Messages...)
	s.mailboxes[email] = mailbox
	payload := mailbox
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, payload)
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
	path := strings.TrimPrefix(request.URL.Path, "/api/mailbox/messages/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(writer, http.StatusNotFound, "not found")
		return
	}
	messageID, action := parts[0], parts[1]
	email := s.sessionEmail(claims)
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	mailbox := s.ensureMailboxLocked(email, claims)
	for idx := range mailbox.Messages {
		message := &mailbox.Messages[idx]
		if message.ID != messageID {
			continue
		}
		switch action {
		case "read":
			message.Read = true
		case "star":
			message.Starred = !message.Starred
		default:
			writeError(writer, http.StatusNotFound, "unknown mailbox action")
			return
		}
		s.mailboxes[email] = mailbox
		writeJSON(writer, http.StatusOK, mailbox)
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
	s.demoMu.RLock()
	payload := s.platformConsole
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) platformTenantCreate(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, ok := s.requirePlatformAdmin(writer, request); !ok {
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
		name = "New Tenant Workspace"
	}
	row := demo.PlatformTenantRowData{
		ID:     "tenant-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Name:   name,
		Plan:   "Starter",
		Users:  1,
		MRR:    "$149",
		Health: "success",
		Since:  strconv.Itoa(time.Now().UTC().Year()),
	}
	s.demoMu.Lock()
	s.platformConsole.Tenants = append([]demo.PlatformTenantRowData{row}, s.platformConsole.Tenants...)
	activeTenants, _ := strconv.Atoi(strings.TrimSpace(s.platformConsole.TenantMetrics.ActiveTenants))
	s.platformConsole.TenantMetrics.ActiveTenants = strconv.Itoa(activeTenants + 1)
	s.platformConsole.AuditEvents = append([]demo.PlatformAuditEventData{{
		ID:     "audit-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Actor:  "super@kora.local",
		Action: "Onboarded tenant",
		Target: name,
		At:     "just now",
		Icon:   "plus",
		Tone:   "brand",
	}}, s.platformConsole.AuditEvents...)
	payload := s.platformConsole
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) platformFlagToggle(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, ok := s.requirePlatformAdmin(writer, request); !ok {
		return
	}
	flagID := strings.TrimPrefix(request.URL.Path, "/api/platform/flags/")
	flagID = strings.Trim(flagID, "/")
	if flagID == "" {
		writeError(writer, http.StatusNotFound, "flag not found")
		return
	}
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.platformConsole.FeatureFlags {
		flag := &s.platformConsole.FeatureFlags[idx]
		if flag.ID != flagID {
			continue
		}
		flag.On = !flag.On
		s.platformConsole.AuditEvents = append([]demo.PlatformAuditEventData{{
			ID:     "audit-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			Actor:  "Sandrine Uwera",
			Action: map[bool]string{true: "Enabled feature flag", false: "Disabled feature flag"}[flag.On],
			Target: flag.Name,
			At:     "just now",
			Icon:   "check",
			Tone:   map[bool]string{true: "success", false: "warning"}[flag.On],
		}}, s.platformConsole.AuditEvents...)
		writeJSON(writer, http.StatusOK, s.platformConsole)
		return
	}
	writeError(writer, http.StatusNotFound, "flag not found")
}

func (s *Server) platformUserCreate(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, ok := s.requirePlatformAdmin(writer, request); !ok {
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
		name = "New Platform User"
	}
	emailSlug := strings.ToLower(strings.ReplaceAll(name, " ", "."))
	row := demo.PlatformUserData{
		ID:    "platform-user-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Name:  name,
		Email: emailSlug + "@kora.local",
		Role:  "Support Engineer",
		Last:  "invited",
	}
	s.demoMu.Lock()
	s.platformConsole.PlatformUsers = append([]demo.PlatformUserData{row}, s.platformConsole.PlatformUsers...)
	s.platformConsole.AuditEvents = append([]demo.PlatformAuditEventData{{
		ID:     "audit-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Actor:  "super@kora.local",
		Action: "Invited platform user",
		Target: row.Email,
		At:     "just now",
		Icon:   "plus",
		Tone:   "brand",
	}}, s.platformConsole.AuditEvents...)
	payload := s.platformConsole
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) platformSupportRequestCreate(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, ok := s.requirePlatformAdmin(writer, request); !ok {
		return
	}
	var body struct {
		Tenant string `json:"tenant"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	tenant := strings.TrimSpace(body.Tenant)
	if tenant == "" {
		tenant = "Acme Insurance"
	}
	row := demo.PlatformSupportGrantData{
		ID:     "grant-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Tenant: tenant,
		Status: "Requested",
		Detail: "awaiting tenant approval",
		Tone:   "warning",
	}
	s.demoMu.Lock()
	s.platformConsole.SupportGrants = append([]demo.PlatformSupportGrantData{row}, s.platformConsole.SupportGrants...)
	s.platformConsole.AuditEvents = append([]demo.PlatformAuditEventData{{
		ID:     "audit-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		Actor:  "David Mutoni",
		Action: "Requested support access",
		Target: tenant,
		At:     "just now",
		Icon:   "activity",
		Tone:   "info",
	}}, s.platformConsole.AuditEvents...)
	payload := s.platformConsole
	s.demoMu.Unlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) financeLeadDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.financeLeadHome
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) contractsOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.contracts
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
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
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.contracts.Items {
		item := &s.contracts.Items[idx]
		if item.ID != contractID {
			continue
		}
		auditAction := ""
		switch action {
		case "renew":
			endDate, err := time.Parse("2006-01-02", item.EndDate)
			if err != nil {
				writeError(writer, http.StatusInternalServerError, "invalid contract end date")
				return
			}
			item.Status = "active"
			item.StartDate = item.EndDate
			item.EndDate = endDate.AddDate(1, 0, 0).Format("2006-01-02")
			auditAction = "Contract renewed"
		case "flag-renewal":
			if item.Status == "active" {
				item.Status = "renewal-due"
			}
			auditAction = "Contract renewal flagged"
		case "set-reminder":
			auditAction = "Contract renewal reminder set"
		default:
			writeError(writer, http.StatusNotFound, "unknown contract action")
			return
		}
		now := time.Now().UTC()
		target := item.Title + " - " + item.Reference
		if action == "set-reminder" {
			target += " - 30 days before expiry"
		}
		s.workflowState.AuditLog = append([]demo.AuditEvent{{
			ID:          "al-" + strconv.FormatInt(now.UnixNano(), 10),
			At:          now.Format(time.RFC3339),
			Actor:       s.sessionDisplayName(claims),
			Role:        s.sessionRoleName(claims),
			Kind:        "contract",
			Action:      auditAction,
			Target:      target,
			HasEvidence: true,
		}}, s.workflowState.AuditLog...)
		writeJSON(writer, http.StatusOK, s.contracts)
		return
	}
	writeError(writer, http.StatusNotFound, "contract not found")
}

func (s *Server) ownerRiskDashboard(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadAudit); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.ownerRisk
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
}

func (s *Server) ownerRiskDashboardExport(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadAudit); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.ownerRisk
	s.demoMu.RUnlock()
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
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionApproveFinancial); !ok {
		return
	}
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.ownerRisk.Risks {
		risk := &s.ownerRisk.Risks[idx]
		if risk.ID != riskID {
			continue
		}
		switch action {
		case "assign":
			if risk.Status == "" {
				risk.Status = "open"
			}
		case "mitigate":
			risk.Status = "mitigating"
		case "accept":
			risk.Status = "accepted"
		default:
			writeError(writer, http.StatusNotFound, "unknown risk action")
			return
		}
		s.ownerRisk.ControlPosture.OpenRisks = countOpenRisks(s.ownerRisk.Risks)
		writeJSON(writer, http.StatusOK, s.ownerRisk)
		return
	}
	writeError(writer, http.StatusNotFound, "risk not found")
}

func (s *Server) controlsCloseOverview(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if _, _, ok := s.requireTenantActor(writer, request, access.PermissionReadOwnTenant); !ok {
		return
	}
	s.demoMu.RLock()
	payload := s.controlsClose
	s.demoMu.RUnlock()
	writeJSON(writer, http.StatusOK, payload)
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
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.controlsClose.Tasks {
		task := &s.controlsClose.Tasks[idx]
		if task.ID != taskID {
			continue
		}
		if task.Blocked {
			writeError(writer, http.StatusBadRequest, "task is blocked")
			return
		}
		task.Done = !task.Done
		s.syncCloseTasksLocked()
		status := "reopened"
		if task.Done {
			status = "completed"
		}
		s.workflowState.AuditLog = append([]demo.AuditEvent{{
			ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			At:          time.Now().UTC().Format(time.RFC3339),
			Actor:       s.sessionDisplayName(claims),
			Role:        s.sessionRoleName(claims),
			Kind:        "control",
			Action:      "Close task " + status,
			Target:      task.Label + " - " + task.Owner,
			HasEvidence: true,
		}}, s.workflowState.AuditLog...)
		writeJSON(writer, http.StatusOK, s.controlsClose)
		return
	}
	writeError(writer, http.StatusNotFound, "task not found")
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
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.controlsClose.EvidenceGaps {
		gap := &s.controlsClose.EvidenceGaps[idx]
		if gap.ID != gapID {
			continue
		}
		gap.Requested = true
		s.workflowState.AuditLog = append([]demo.AuditEvent{{
			ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			At:          time.Now().UTC().Format(time.RFC3339),
			Actor:       s.sessionDisplayName(claims),
			Role:        s.sessionRoleName(claims),
			Kind:        "control",
			Action:      "Requested close evidence",
			Target:      gap.Reference + " - " + gap.Party,
			HasEvidence: false,
		}}, s.workflowState.AuditLog...)
		writeJSON(writer, http.StatusOK, s.controlsClose)
		return
	}
	writeError(writer, http.StatusNotFound, "evidence gap not found")
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
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	allReady := true
	for _, task := range s.controlsClose.Tasks {
		if task.ID == "ct-11" {
			continue
		}
		if !task.Done {
			allReady = false
			break
		}
	}
	if !allReady {
		writeError(writer, http.StatusBadRequest, "all close tasks must be complete before locking")
		return
	}
	for idx := range s.controlsClose.Tasks {
		task := &s.controlsClose.Tasks[idx]
		if task.ID == "ct-11" {
			task.Blocked = false
			task.Note = ""
			task.Done = true
			break
		}
	}
	s.syncCloseTasksLocked()
	s.workflowState.AuditLog = append([]demo.AuditEvent{{
		ID:          "al-" + strconv.FormatInt(time.Now().UnixNano(), 10),
		At:          time.Now().UTC().Format(time.RFC3339),
		Actor:       s.sessionDisplayName(claims),
		Role:        s.sessionRoleName(claims),
		Kind:        "posting",
		Action:      "Locked close period",
		Target:      "May 2025 close",
		HasEvidence: true,
	}}, s.workflowState.AuditLog...)
	writeJSON(writer, http.StatusOK, s.controlsClose)
}

func (s *Server) seedDemoData() error {
	orgName := env("KORA_DEMO_ORG_NAME", "Acme Insurance Ltd.")
	ownerEmail := env("KORA_DEMO_OWNER_EMAIL", "owner@acme.local")
	ownerName := env("KORA_DEMO_OWNER_NAME", "Aline Mukamana")

	registered, err := s.identityService.RegisterOrganization(identity.RegisterInput{
		OrganizationName: orgName,
		OwnerEmail:       ownerEmail,
		OwnerDisplayName: ownerName,
		OwnerPassword:    demoPassword,
	})
	if err != nil {
		return err
	}

	org, err := s.organizationByID(registered.OrganizationID)
	if err != nil {
		return err
	}

	s.demoUsers = map[string]demoUser{
		roleIDOrgOwner:             {Email: ownerEmail, DisplayName: ownerName, Role: access.RoleOrganizationOwner},
		roleIDFinanceLead:          {Email: "cfo@acme.local", DisplayName: "Eric Habimana", Role: access.RoleFinanceLead},
		roleIDFinanceOperator:      {Email: "accountant@acme.local", DisplayName: "Diane Uwase", Role: access.RoleFinanceOperator},
		roleIDAuditor:              {Email: "auditor@acme.local", DisplayName: "Patrick Niyonsenga", Role: access.RoleAuditorCompliance},
		roleIDOrgAdmin:             {Email: "admin@acme.local", DisplayName: "Sarah Ingabire", Role: access.RoleOrgAdmin},
		roleIDExternalCollaborator: {Email: "officer@bk.local", DisplayName: "BK Lender Officer", Role: access.RoleExternalCollaborator},
	}

	for _, demo := range s.demoUsers {
		if demo.Role == access.RoleOrganizationOwner {
			continue
		}
		if err := seedTenantUser(s.identityStore, org.ID, demo.Email, demo.DisplayName, demoPassword, demo.Role); err != nil {
			return err
		}
	}

	adminActor, err := s.loginActor("admin@acme.local")
	if err != nil {
		return err
	}
	connections := []connectors.Connection{
		{
			ID:             "conn_momo_demo",
			OrganizationID: adminActor.OrganizationID,
			Kind:           connectors.MoMo,
			DisplayName:    "MTN MoMo",
			SecretRef:      "secret://" + adminActor.OrganizationID + "/momo",
			Active:         true,
			Config:         map[string]string{"environment": "sandbox"},
		},
		{
			ID:             "conn_bank_bk",
			OrganizationID: adminActor.OrganizationID,
			Kind:           connectors.BankStatement,
			DisplayName:    "Bank of Kigali",
			SecretRef:      "secret://" + adminActor.OrganizationID + "/bk",
			Active:         true,
			Config:         map[string]string{"feed": "sftp"},
		},
		{
			ID:             "conn_qb",
			OrganizationID: adminActor.OrganizationID,
			Kind:           connectors.Accounting,
			DisplayName:    "QuickBooks",
			SecretRef:      "secret://" + adminActor.OrganizationID + "/quickbooks",
			Active:         true,
			Config:         map[string]string{"tenant": "acme-books"},
		},
	}
	for _, connection := range connections {
		if _, err := s.connections.Create(adminActor, connection); err != nil && !strings.Contains(err.Error(), "already exists") {
			return err
		}
	}
	s.intakeDocs = demo.IntakeDocsData()
	s.intakeSources = map[string]bool{"bank-feed": false, "email": false, "scan": false}
	s.reports = demo.ReportsCatalogData()
	s.financeSnapshot = demo.FinanceOperationsDemoData()
	s.financeLeadHome = demo.FinanceLeadDashboardDemoData()
	s.contracts = demo.ContractsOverviewDemoData()
	s.ownerRisk = demo.OwnerRiskDashboardDemoData()
	s.controlsClose = demo.ControlsCloseDemoData()
	s.auditViews = demo.AuditInvestigationsDemoData()
	s.collections = demo.CollectionsData()
	s.collectionsMgmt = demo.CollectionsManagementDemoData()
	s.relationships = demo.RelationshipsOverviewDemoData()
	s.adminDashboardState = demo.AdminDashboardCardsData()
	s.agentsState = demo.AgentsOverviewDemoData()
	s.workflowState = demo.WorkflowSnapshotData()
	s.claimsState = demo.ClaimsWorkspaceDemoData()
	s.consentState = demo.ConsentGrantsDemoData()
	externalUser, err := s.identityStore.FindUserByEmail(s.demoUsers[roleIDExternalCollaborator].Email)
	if err != nil {
		return err
	}
	for idx := range s.consentState {
		if s.consentState[idx].ID == "cs-1" {
			s.consentState[idx].RecipientUserID = externalUser.ID
			break
		}
	}
	s.featureEntitlements = []string{}
	s.orgUsers = demo.OrgUsersDemoData()
	s.approvalRules = demo.ApprovalRulesDemoData()
	s.settingsOverview = demo.SettingsOverviewDemoData()
	s.platformConsole = demo.PlatformConsoleDemoData()
	s.accountSettings = map[string]demo.AccountSettingsData{}
	s.mailboxes = map[string]demo.MailboxData{}
	return nil
}

func (s *Server) runAgentLocked(agentID string, actorName string) bool {
	now := time.Now().UTC()
	agentIndex := -1
	for idx := range s.agentsState.Agents {
		if s.agentsState.Agents[idx].ID == agentID {
			agentIndex = idx
			break
		}
	}
	if agentIndex == -1 {
		return false
	}

	agent := &s.agentsState.Agents[agentIndex]
	agent.LastRun = "just now"
	agent.Status = "active"

	type runEvent struct {
		action string
		detail string
		tone   string
		link   *demo.AgentActivityLinkData
	}

	processed := 4
	events := []runEvent{{
		action: "Run complete",
		detail: "Scanned its data and found nothing new to action.",
		tone:   "info",
	}}

	switch agentID {
	case "a-recon":
		moved := s.agentSuggestMatchesLocked(2)
		processed = 18 + moved
		if moved > 0 {
			agent.Insight = strconv.Itoa(moved) + " fresh matches moved into review for approval."
			events = []runEvent{{
				action: "Suggested " + strconv.Itoa(moved) + " new matches",
				detail: "Moved detected bank items into review for the finance team to approve.",
				tone:   "ai",
				link:   &demo.AgentActivityLinkData{Label: "View reconciliation", To: "/reconciliation"},
			}}
		} else {
			agent.Insight = "No new unmatched items - everything is already suggested or matched."
			events = []runEvent{{
				action: "Swept the bank feed",
				detail: "No new unmatched items - everything is already suggested or matched.",
				tone:   "success",
				link:   &demo.AgentActivityLinkData{Label: "View reconciliation", To: "/reconciliation"},
			}}
		}
	case "a-coll":
		totalMinor := int64(0)
		for _, item := range s.collections {
			amountMinor, _ := strconv.ParseInt(item.Amount.AmountMinor, 10, 64)
			totalMinor += amountMinor
		}
		processed = len(s.collections)
		agent.Insight = "$214,890 overdue across 7 invoices - reminder drafts refreshed."
		events = []runEvent{{
			action: "Drafted " + strconv.Itoa(len(s.collections)) + " reminders",
			detail: "$" + formatMoneyMinor(totalMinor) + " overdue across " + strconv.Itoa(len(s.collections)) + " invoices - reminder drafts ready for approval.",
			tone:   "warning",
			link:   &demo.AgentActivityLinkData{Label: "Open collections", To: "/collections"},
		}}
	case "a-supplier":
		processed = 6
		agent.Insight = "Vendor 7741 remains unmatched - missing invoice or PO."
		events = []runEvent{{
			action: "Checked supplier spend",
			detail: "Flagged Vendor 7741 for missing invoice or PO support before payment approval.",
			tone:   "danger",
			link:   &demo.AgentActivityLinkData{Label: "Open payables", To: "/payables"},
		}}
	case "a-audit":
		processed = 32
		agent.Insight = "OFFSHORE LTD remains flagged; no supporting contract on file."
		events = []runEvent{
			{
				action: "Flagged suspicious transfer",
				detail: "$15,400 to OFFSHORE LTD - no contract on file. Referred for review.",
				tone:   "danger",
				link:   &demo.AgentActivityLinkData{Label: "Open audit", To: "/audit"},
			},
			{
				action: "2 SoD checks passed",
				detail: "No preparer approved their own item this period.",
				tone:   "success",
			},
		}
	case "a-cfo":
		processed = 12
		agent.Insight = "Projected $3.21M cash by month-end (+23%)."
		events = []runEvent{{
			action: "Refreshed the forecast",
			detail: "Projected $3.21M cash by month-end (+23%). Net positive across all entities.",
			tone:   "ai",
			link:   &demo.AgentActivityLinkData{Label: "Open cash flow", To: "/ledger"},
		}}
	case "a-intake":
		processed = 6
		agent.Insight = "6 documents processed; 1 low-confidence field still needs review."
		events = []runEvent{{
			action: "Processed the inbox",
			detail: "6 documents extracted; 1 low-confidence field needs a human check.",
			tone:   "info",
			link:   &demo.AgentActivityLinkData{Label: "Open data intake", To: "/data-intake"},
		}}
	case "a-credit":
		processed = 1
		agent.Insight = "Business health score holding at 82 (Good)."
		events = []runEvent{{
			action: "Recomputed the score",
			detail: "Business health score holding at 82 (Good) - lender-ready.",
			tone:   "success",
		}}
	case "a-rel":
		processed = 8
		agent.Insight = "3 contracts expire within 30 days; PT Imports risk remains high."
		events = []runEvent{{
			action: "Updated the relationship graph",
			detail: "3 contracts expiring within 30 days; PT Imports risk raised to high.",
			tone:   "warning",
			link:   &demo.AgentActivityLinkData{Label: "Open relationships", To: "/relationships"},
		}}
	case "a-contract":
		processed = 5
		agent.Insight = "Office lease renewal needs a decision in 14 days."
		events = []runEvent{{
			action: "Reviewed contract deadlines",
			detail: "Office lease renewal needs a decision within 14 days.",
			tone:   "warning",
			link:   &demo.AgentActivityLinkData{Label: "Open contracts", To: "/contracts"},
		}}
	case "a-sales":
		processed = 4
		agent.Insight = "Still waiting for cleaner sales data to activate stronger recommendations."
		events = []runEvent{{
			action: "Scanned growth signals",
			detail: "Insufficient structured sales data for stronger recommendations yet.",
			tone:   "info",
		}}
	}

	agent.ProcessedToday += processed
	stamped := make([]demo.AgentActivityEventData, 0, len(events))
	for idx, item := range events {
		stamped = append(stamped, demo.AgentActivityEventData{
			ID:        "agt-" + strconv.FormatInt(now.UnixNano()+int64(idx), 10),
			AgentID:   agent.ID,
			AgentName: agent.Name,
			At:        now.Add(time.Duration(idx) * time.Second).Format(time.RFC3339),
			Action:    item.action,
			Detail:    item.detail,
			Tone:      item.tone,
			Link:      item.link,
		})
	}
	s.agentsState.Activity = append(stamped, s.agentsState.Activity...)
	if len(s.agentsState.Activity) > 40 {
		s.agentsState.Activity = s.agentsState.Activity[:40]
	}
	s.agentsState.RunningID = ""
	s.recomputeAgentStatsLocked()
	s.platformConsole.AuditEvents = append([]demo.PlatformAuditEventData{{
		ID:     "audit-" + strconv.FormatInt(now.UnixNano(), 10),
		Actor:  actorName,
		Action: "Ran AI agent",
		Target: agent.Name,
		At:     "just now",
		Icon:   "activity",
		Tone:   "info",
	}}, s.platformConsole.AuditEvents...)
	return true
}

func (s *Server) agentSuggestMatchesLocked(max int) int {
	moved := 0
	for idx := range s.workflowState.Reconciliations {
		recon := &s.workflowState.Reconciliations[idx]
		if recon.Stage != "detected" {
			continue
		}
		recon.Stage = "reviewing"
		recon.AgeText = "Suggested by agent"
		recon.History = append(recon.History, demo.HistoryEvent{
			ID:        "h-" + strconv.FormatInt(time.Now().UnixNano(), 10),
			At:        time.Now().UTC().Format(time.RFC3339),
			Actor:     "Reconciliation Agent",
			ActorRole: "Kora AI",
			Kind:      "agent",
			Action:    "Suggested match (" + strconv.Itoa(recon.Confidence) + "%)",
		})
		moved++
		if moved >= max {
			break
		}
	}
	return moved
}

func (s *Server) recomputeAgentStatsLocked() {
	totalProcessed := 0
	totalAccuracy := 0
	activeAgents := 0
	for _, agent := range s.agentsState.Agents {
		totalProcessed += agent.ProcessedToday
		totalAccuracy += agent.AccuracyPct
		if agent.Status == "active" || agent.Status == "running" {
			activeAgents++
		}
	}
	suggestions := 0
	for _, recon := range s.workflowState.Reconciliations {
		if recon.Stage == "reviewing" || recon.Stage == "prepared" {
			suggestions++
		}
	}
	for _, approval := range s.workflowState.Approvals {
		if approval.Stage == "awaiting" || approval.Stage == "partial" {
			suggestions++
		}
	}
	s.agentsState.Stats = demo.AgentStatsData{
		AgentsActive:        activeAgents,
		ProcessedToday:      totalProcessed,
		SuggestionsAwaiting: suggestions,
		AvgAccuracyPct:      totalAccuracy / max(1, len(s.agentsState.Agents)),
	}
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

func (s *Server) syncCloseTasksLocked() {
	s.financeLeadHome.CloseTasks = append([]demo.CloseTaskData(nil), s.controlsClose.Tasks...)
}

func countOpenRisks(items []demo.BusinessRiskData) int {
	total := 0
	for _, item := range items {
		if item.Status != "accepted" {
			total++
		}
	}
	return total
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

func (s *Server) activePortalConsent(userID string, now time.Time) (demo.ConsentGrantData, time.Time, bool) {
	s.demoMu.RLock()
	defer s.demoMu.RUnlock()
	for _, grant := range s.consentState {
		if grant.RecipientUserID != userID || grant.Status != "active" || !slices.Contains(grant.Scopes, "credit-passport") {
			continue
		}
		expiresAt, err := time.Parse("2006-01-02", grant.ExpiresAt)
		if err != nil {
			continue
		}
		expiresAt = expiresAt.AddDate(0, 0, 1)
		if !expiresAt.After(now) {
			continue
		}
		return grant, expiresAt, true
	}
	return demo.ConsentGrantData{}, time.Time{}, false
}

func (s *Server) activePortalGrants(userID string, now time.Time) []demo.ConsentGrantData {
	s.demoMu.RLock()
	defer s.demoMu.RUnlock()
	grants := make([]demo.ConsentGrantData, 0)
	for _, grant := range s.consentState {
		if grant.RecipientUserID != userID || grant.Status != "active" {
			continue
		}
		expiresAt, err := time.Parse("2006-01-02", grant.ExpiresAt)
		if err != nil || !expiresAt.AddDate(0, 0, 1).After(now) {
			continue
		}
		grant.Scopes = append([]string(nil), grant.Scopes...)
		grants = append(grants, grant)
	}
	return grants
}

func (s *Server) portalActivity(claims auth.Claims) []portalAccessActivity {
	s.demoMu.RLock()
	defer s.demoMu.RUnlock()
	actorName := s.sessionDisplayName(claims)
	activity := make([]portalAccessActivity, 0, 5)
	for _, event := range s.workflowState.AuditLog {
		if event.Actor != actorName || event.Kind != "consent" {
			continue
		}
		activity = append(activity, portalAccessActivity{Action: event.Action, At: event.At})
		if len(activity) == 5 {
			break
		}
	}
	return activity
}

func (s *Server) recordExternalPassportAccess(claims auth.Claims, action string) {
	if !slices.Contains(claims.Roles, string(access.RoleExternalCollaborator)) {
		return
	}
	now := time.Now().UTC()
	s.demoMu.Lock()
	s.workflowState.AuditLog = append([]demo.AuditEvent{{
		ID:          "al-" + strconv.FormatInt(now.UnixNano(), 10),
		At:          now.Format(time.RFC3339),
		Actor:       s.sessionDisplayName(claims),
		Role:        s.sessionRoleName(claims),
		Kind:        "consent",
		Action:      action,
		Target:      "Credit Passport - consent-scoped read",
		HasEvidence: true,
	}}, s.workflowState.AuditLog...)
	s.demoMu.Unlock()
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

func (s *Server) ensureAccountSettingsLocked(email string, claims auth.Claims) demo.AccountSettingsData {
	if settings, ok := s.accountSettings[email]; ok {
		return settings
	}
	settings := demo.AccountSettingsDemoData(s.sessionDisplayName(claims), s.sessionRoleName(claims))
	s.accountSettings[email] = settings
	return settings
}

func (s *Server) ensureMailboxLocked(email string, claims auth.Claims) demo.MailboxData {
	if mailbox, ok := s.mailboxes[email]; ok {
		return mailbox
	}
	mailbox := demo.MailboxDemoData(email, s.sessionDisplayName(claims), s.sessionRoleName(claims))
	s.mailboxes[email] = mailbox
	return mailbox
}

func (s *Server) sessionEmail(claims auth.Claims) string {
	if demoUser, ok := s.demoUsers[frontendRoleID(access.Role(firstRole(claims)))]; ok {
		return demoUser.Email
	}
	if claims.Subject == "usr_super_admin" {
		return "super@kora.local"
	}
	if user, err := s.identityStore.FindUserByID(claims.Subject); err == nil && strings.TrimSpace(user.Email) != "" {
		return user.Email
	}
	return "guest@kora.local"
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

func (s *Server) findReport(reportID string) (demo.ReportDef, bool) {
	s.demoMu.RLock()
	defer s.demoMu.RUnlock()
	for _, report := range s.reports {
		if report.ID == reportID {
			return report, true
		}
	}
	return demo.ReportDef{}, false
}

func (s *Server) touchReport(reportID string) (demo.ReportDef, bool) {
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.reports {
		if s.reports[idx].ID == reportID {
			s.reports[idx].LastGenerated = "just now"
			return s.reports[idx], true
		}
	}
	return demo.ReportDef{}, false
}

func (s *Server) updateReportSchedule(reportID, schedule string) (demo.ReportDef, bool) {
	s.demoMu.Lock()
	defer s.demoMu.Unlock()
	for idx := range s.reports {
		if s.reports[idx].ID == reportID {
			if strings.TrimSpace(schedule) != "" {
				s.reports[idx].Schedule = strings.TrimSpace(schedule)
			}
			return s.reports[idx], true
		}
	}
	return demo.ReportDef{}, false
}

func (s *Server) organizationByID(organizationID string) (identity.Organization, error) {
	return s.identityStore.FindOrganizationByID(organizationID)
}

func (s *Server) loginActor(email string) (access.Actor, error) {
	output, err := s.identityService.Login(email, demoPassword)
	if err != nil {
		return access.Actor{}, err
	}
	return access.Actor{
		UserID:         output.UserID,
		OrganizationID: output.OrganizationID,
		Plane:          output.Plane,
		Roles:          output.Roles,
		Permissions:    output.Permissions,
	}, nil
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
		id       string
		name     string
		category string
		status   string
		lastSync string
	}
	catalog := []base{
		{id: "mtn-momo", name: "MTN MoMo", category: "Mobile money", status: "connected", lastSync: "2m ago"},
		{id: "bk", name: "Bank of Kigali", category: "Bank feed", status: "connected", lastSync: "12m ago"},
		{id: "airtel-money", name: "Airtel Money", category: "Mobile money", status: "disconnected", lastSync: "Not connected"},
		{id: "quickbooks", name: "QuickBooks", category: "Accounting", status: "error", lastSync: "failed 2h ago"},
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
		}
		if connection, ok := byName[strings.ToLower(item.name)]; ok {
			out.Connected = connection.Active
			out.ConnectionID = connection.ID
			if out.Status == "disconnected" && connection.Active {
				out.Status = "connected"
				out.LastSync = "ready"
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
	s.demoMu.RLock()
	overrides := mapsCloneIntegrationOverrides(s.integrationOverrides)
	s.demoMu.RUnlock()
	return applyIntegrationOverrides(buildIntegrationStatuses(items), overrides), nil
}

func mapsCloneIntegrationOverrides(input map[string]integrationStatusOverride) map[string]integrationStatusOverride {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]integrationStatusOverride, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
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
	default:
		return "blueprint.unknown"
	}
}

func frontendPermission(permission access.Permission) string {
	return string(permission)
}

func seedTenantUser(store *identity.MemoryStore, organizationID, email, displayName, password string, role access.Role) error {
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
