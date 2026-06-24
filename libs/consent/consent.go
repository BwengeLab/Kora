package consent

import (
	"errors"
	"fmt"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/auth"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/workflow"
)

type Grant struct {
	ID                       string              `json:"id"`
	OrganizationID           string              `json:"organization_id"`
	ExternalUserID           string              `json:"external_user_id"`
	RecipientPartyID         string              `json:"recipient_party_id"`
	AllowedDataCategories    []string            `json:"allowed_data_categories"`
	AllowedPermissions       []access.Permission `json:"allowed_permissions"`
	PeriodStart              time.Time           `json:"period_start"`
	PeriodEnd                time.Time           `json:"period_end"`
	ExpiresAt                time.Time           `json:"expires_at"`
	Purpose                  string              `json:"purpose"`
	OngoingMonitoringAllowed bool                `json:"ongoing_monitoring_allowed"`
	ApprovalTaskID           string              `json:"approval_task_id"`
	ConsentedBy              string              `json:"consented_by"`
	Evidence                 evidence.Evidence   `json:"evidence"`
	RevokedAt                *time.Time          `json:"revoked_at,omitempty"`
	RevokedBy                string              `json:"revoked_by,omitempty"`
	RevocationEvidence       *evidence.Evidence  `json:"revocation_evidence,omitempty"`
	CreatedAt                time.Time           `json:"created_at"`
}

type AccessRequest struct {
	GrantID       string            `json:"grant_id"`
	ExternalActor access.Actor      `json:"external_actor"`
	Permission    access.Permission `json:"permission"`
	DataCategory  string            `json:"data_category"`
	PeriodStart   time.Time         `json:"period_start"`
	PeriodEnd     time.Time         `json:"period_end"`
	Monitoring    bool              `json:"monitoring"`
	Resource      string            `json:"resource"`
	OccurredAt    time.Time         `json:"occurred_at"`
}

type AccessLog struct {
	ID             string            `json:"id"`
	GrantID        string            `json:"grant_id"`
	OrganizationID string            `json:"organization_id"`
	ExternalUserID string            `json:"external_user_id"`
	Permission     access.Permission `json:"permission"`
	DataCategory   string            `json:"data_category"`
	PeriodStart    time.Time         `json:"period_start"`
	PeriodEnd      time.Time         `json:"period_end"`
	Monitoring     bool              `json:"monitoring"`
	Resource       string            `json:"resource"`
	Allowed        bool              `json:"allowed"`
	Reason         string            `json:"reason"`
	OccurredAt     time.Time         `json:"occurred_at"`
}

type Template struct {
	ID                    string              `json:"id"`
	Name                  string              `json:"name"`
	AllowedDataCategories []string            `json:"allowed_data_categories"`
	AllowedPermissions    []access.Permission `json:"allowed_permissions"`
	DefaultValidityDays   int                 `json:"default_validity_days"`
	OngoingMonitoring     bool                `json:"ongoing_monitoring"`
}

type Store struct {
	mu     sync.RWMutex
	grants map[string]Grant
	logs   []AccessLog
	now    func() time.Time
}

func NewStore() *Store {
	return &Store{grants: map[string]Grant{}, now: time.Now}
}

func (s *Store) Create(actor access.Actor, grant Grant, approval workflow.Task) (Grant, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: grant.OrganizationID}, access.PermissionManageConsent); err != nil {
		return Grant{}, err
	}
	if approval.OrganizationID != grant.OrganizationID || approval.ID == "" || approval.State != workflow.Approved || approval.SuggestedAction != "grant_external_access" {
		return Grant{}, errors.New("consent grant requires an approved external-access task")
	}
	if err := access.EnforceApprovalChain(approval.CreatorUserID, approval.ApproverUserIDs, approval.RequiredApprovers); err != nil {
		return Grant{}, fmt.Errorf("invalid consent approval chain: %w", err)
	}
	if err := validateGrant(grant, s.now().UTC()); err != nil {
		return Grant{}, err
	}
	if err := evidence.ValidateProvenance(grant.Evidence); err != nil {
		return Grant{}, err
	}
	id, err := auth.NewID("consent")
	if err != nil {
		return Grant{}, err
	}
	grant.ID = id
	grant.ApprovalTaskID = approval.ID
	grant.ConsentedBy = actor.UserID
	grant.AllowedDataCategories = normalizedUnique(grant.AllowedDataCategories)
	grant.AllowedPermissions = uniquePermissions(grant.AllowedPermissions)
	grant.RevokedAt, grant.RevocationEvidence = nil, nil
	grant.RevokedBy = ""
	grant.CreatedAt = s.now().UTC()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.grants[id] = cloneGrant(grant)
	return cloneGrant(grant), nil
}

func (s *Store) Revoke(actor access.Actor, organizationID, grantID string, proof evidence.Evidence) (Grant, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: organizationID}, access.PermissionManageConsent); err != nil {
		return Grant{}, err
	}
	if err := evidence.ValidateProvenance(proof); err != nil {
		return Grant{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	grant, ok := s.grants[grantID]
	if !ok || grant.OrganizationID != organizationID {
		return Grant{}, errors.New("consent grant not found")
	}
	if grant.RevokedAt != nil {
		return Grant{}, errors.New("consent grant is already revoked")
	}
	now := s.now().UTC()
	grant.RevokedAt = &now
	grant.RevokedBy = actor.UserID
	grant.RevocationEvidence = &proof
	s.grants[grantID] = cloneGrant(grant)
	return cloneGrant(grant), nil
}

func (s *Store) Get(actor access.Actor, organizationID, grantID string) (Grant, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: organizationID}, access.PermissionManageConsent); err != nil {
		return Grant{}, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	grant, ok := s.grants[grantID]
	if !ok || grant.OrganizationID != organizationID {
		return Grant{}, errors.New("consent grant not found")
	}
	return cloneGrant(grant), nil
}

// AuthorizeAndLog is the partner API gate. It records both allowed and denied reads.
func (s *Store) AuthorizeAndLog(request AccessRequest) (AccessLog, error) {
	when := request.OccurredAt.UTC()
	if when.IsZero() {
		when = s.now().UTC()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	grant, ok := s.grants[request.GrantID]
	reason := "allowed by active consent"
	var decisionErr error
	if !ok {
		decisionErr = errors.New("consent grant not found")
	} else {
		decisionErr = authorize(grant, request, when)
	}
	if decisionErr != nil {
		reason = decisionErr.Error()
	}
	id, idErr := auth.NewID("external-access")
	if idErr != nil {
		return AccessLog{}, idErr
	}
	log := AccessLog{
		ID: id, GrantID: request.GrantID, ExternalUserID: request.ExternalActor.UserID,
		Permission: request.Permission, DataCategory: normalize(request.DataCategory),
		PeriodStart: request.PeriodStart.UTC(), PeriodEnd: request.PeriodEnd.UTC(),
		Monitoring: request.Monitoring, Resource: request.Resource,
		Allowed: decisionErr == nil, Reason: reason, OccurredAt: when,
	}
	if ok {
		log.OrganizationID = grant.OrganizationID
	} else {
		log.OrganizationID = request.ExternalActor.OrganizationID
	}
	s.logs = append(s.logs, log)
	return log, decisionErr
}

func (s *Store) Logs(actor access.Actor, organizationID string) ([]AccessLog, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: organizationID}, access.PermissionReadAudit); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]AccessLog, 0)
	for _, entry := range s.logs {
		if entry.OrganizationID == organizationID {
			out = append(out, entry)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].OccurredAt.Before(out[j].OccurredAt) })
	return out, nil
}

func authorize(grant Grant, request AccessRequest, now time.Time) error {
	if grant.RevokedAt != nil {
		return errors.New("consent grant is revoked")
	}
	if !grant.ExpiresAt.After(now) {
		return errors.New("consent grant is expired")
	}
	if request.ExternalActor.UserID != grant.ExternalUserID || request.ExternalActor.OrganizationID != grant.OrganizationID || !slices.Equal(request.ExternalActor.Roles, []access.Role{access.RoleExternalCollaborator}) {
		return errors.New("external actor does not match consent recipient")
	}
	if !slices.Contains(grant.AllowedPermissions, request.Permission) || !access.IsExternalShareablePermission(request.Permission) {
		return errors.New("permission is outside consent scope")
	}
	if !slices.Contains(grant.AllowedDataCategories, normalize(request.DataCategory)) {
		return errors.New("data category is outside consent scope")
	}
	if strings.TrimSpace(request.Resource) == "" || request.PeriodStart.IsZero() || request.PeriodEnd.Before(request.PeriodStart) {
		return errors.New("valid resource and data period are required")
	}
	if request.PeriodStart.Before(grant.PeriodStart) {
		return errors.New("requested data begins before consent period")
	}
	if request.Monitoring {
		if !grant.OngoingMonitoringAllowed {
			return errors.New("ongoing monitoring is outside consent scope")
		}
		if request.PeriodEnd.After(now) {
			return errors.New("monitoring cannot read future data")
		}
	} else if request.PeriodEnd.After(grant.PeriodEnd) {
		return errors.New("requested data ends after consent period")
	}
	scope := &access.ConsentScope{
		GrantID: grant.ID, OrganizationID: grant.OrganizationID,
		AllowedPermissions: grant.AllowedPermissions, ExpiresAt: grant.ExpiresAt,
	}
	actor := request.ExternalActor
	actor.Consent = scope
	return access.AuthorizeAt(actor, access.Resource{OrganizationID: grant.OrganizationID}, request.Permission, now)
}

func validateGrant(grant Grant, now time.Time) error {
	if grant.OrganizationID == "" || grant.ExternalUserID == "" || grant.RecipientPartyID == "" || strings.TrimSpace(grant.Purpose) == "" {
		return errors.New("organization, external user, recipient party, and purpose are required")
	}
	if len(grant.AllowedDataCategories) == 0 || len(grant.AllowedPermissions) == 0 {
		return errors.New("consent requires data categories and permissions")
	}
	for _, permission := range grant.AllowedPermissions {
		if !access.IsExternalShareablePermission(permission) {
			return fmt.Errorf("permission %q cannot be shared externally", permission)
		}
	}
	if grant.PeriodStart.IsZero() || grant.PeriodEnd.Before(grant.PeriodStart) {
		return errors.New("valid consent data period is required")
	}
	if !grant.ExpiresAt.After(now) {
		return errors.New("consent expiry must be in the future")
	}
	return nil
}

func Templates() []Template {
	return []Template{
		{ID: "lender", Name: "Lender credit review", AllowedDataCategories: []string{"credit_passport", "cashflow", "payment_discipline", "obligations", "risk_flags"}, AllowedPermissions: []access.Permission{access.PermissionReadCreditPassport}, DefaultValidityDays: 30},
		{ID: "auditor", Name: "External audit", AllowedDataCategories: []string{"ledger", "reports", "evidence", "audit_log"}, AllowedPermissions: []access.Permission{access.PermissionReadReports, access.PermissionExportReports, access.PermissionReadAudit}, DefaultValidityDays: 90},
		{ID: "advisor", Name: "Financial advisor", AllowedDataCategories: []string{"reports", "roi", "cashflow"}, AllowedPermissions: []access.Permission{access.PermissionReadReports, access.PermissionReadROI}, DefaultValidityDays: 60, OngoingMonitoring: true},
	}
}

func normalizedUnique(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = normalize(value)
		if value != "" && !seen[value] {
			seen[value] = true
			out = append(out, value)
		}
	}
	sort.Strings(out)
	return out
}

func uniquePermissions(values []access.Permission) []access.Permission {
	seen := map[access.Permission]bool{}
	out := make([]access.Permission, 0, len(values))
	for _, value := range values {
		if !seen[value] {
			seen[value] = true
			out = append(out, value)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out
}

func normalize(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func cloneGrant(grant Grant) Grant {
	grant.AllowedDataCategories = slices.Clone(grant.AllowedDataCategories)
	grant.AllowedPermissions = slices.Clone(grant.AllowedPermissions)
	if grant.RevokedAt != nil {
		value := *grant.RevokedAt
		grant.RevokedAt = &value
	}
	if grant.RevocationEvidence != nil {
		value := *grant.RevocationEvidence
		grant.RevocationEvidence = &value
	}
	return grant
}
