package access

import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"
)

type Plane string

const (
	PlanePlatform Plane = "PLATFORM"
	PlaneTenant   Plane = "TENANT"
)

type Role string

const (
	RoleSuperAdmin           Role = "SUPER_ADMIN"
	RoleOrganizationOwner    Role = "ORGANIZATION_OWNER"
	RoleFinanceLead          Role = "FINANCE_LEAD"
	RoleFinanceOperator      Role = "FINANCE_OPERATOR"
	RoleAuditorCompliance    Role = "AUDITOR_COMPLIANCE"
	RoleOrgAdmin             Role = "ORG_ADMIN"
	RoleExternalCollaborator Role = "EXTERNAL_COLLABORATOR"
)

type Permission string

const (
	PermissionReadOwnTenant          Permission = "tenant:read"
	PermissionManageUsers            Permission = "users:manage"
	PermissionManageRoles            Permission = "roles:manage"
	PermissionManagePolicy           Permission = "policy:manage"
	PermissionManageIntegrations     Permission = "integrations:manage"
	PermissionManageBilling          Permission = "billing:manage"
	PermissionManageDataRetention    Permission = "data:retention.manage"
	PermissionUploadDocuments        Permission = "documents:upload"
	PermissionReviewDataQuality      Permission = "data_quality:review"
	PermissionReadEvents             Permission = "events:read"
	PermissionReviewReconciliation   Permission = "reconciliation:review"
	PermissionResolveReconciliation  Permission = "reconciliation:resolve"
	PermissionCreateApproval         Permission = "approval:create"
	PermissionApproveFinancial       Permission = "financial:approve"
	PermissionPostLedger             Permission = "ledger:post"
	PermissionReverseLedger          Permission = "ledger:reverse"
	PermissionSendCollections        Permission = "collections:send"
	PermissionManageRelationships    Permission = "relationships:manage"
	PermissionManageContracts        Permission = "contracts:manage"
	PermissionManageSuppliers        Permission = "suppliers:manage"
	PermissionReadReports            Permission = "reports:read"
	PermissionExportReports          Permission = "reports:export"
	PermissionReadROI                Permission = "roi:read"
	PermissionGenerateCreditPassport Permission = "credit_passport:generate"
	PermissionReadCreditPassport     Permission = "credit_passport:read"
	PermissionManageConsent          Permission = "consent:manage"
	PermissionReadAudit              Permission = "audit:read"

	PermissionPlatformManageTenants Permission = "platform:tenants.manage"
	PermissionPlatformManageBilling Permission = "platform:billing.manage"
	PermissionPlatformManageConfig  Permission = "platform:config.manage"
	PermissionPlatformReadHealth    Permission = "platform:health.read"
	PermissionPlatformReadUsage     Permission = "platform:usage.read"
	PermissionPlatformManageStaff   Permission = "platform:staff.manage"
	PermissionPlatformSecurity      Permission = "platform:security.manage"
	PermissionPlatformSupportAccess Permission = "platform:support_access"
)

var tenantPermissionCatalog = []Permission{
	PermissionReadOwnTenant,
	PermissionManageUsers,
	PermissionManageRoles,
	PermissionManagePolicy,
	PermissionManageIntegrations,
	PermissionManageBilling,
	PermissionManageDataRetention,
	PermissionUploadDocuments,
	PermissionReviewDataQuality,
	PermissionReadEvents,
	PermissionReviewReconciliation,
	PermissionResolveReconciliation,
	PermissionCreateApproval,
	PermissionApproveFinancial,
	PermissionPostLedger,
	PermissionReverseLedger,
	PermissionSendCollections,
	PermissionManageRelationships,
	PermissionManageContracts,
	PermissionManageSuppliers,
	PermissionReadReports,
	PermissionExportReports,
	PermissionReadROI,
	PermissionGenerateCreditPassport,
	PermissionReadCreditPassport,
	PermissionManageConsent,
	PermissionReadAudit,
}

var platformPermissionCatalog = []Permission{
	PermissionPlatformManageTenants,
	PermissionPlatformManageBilling,
	PermissionPlatformManageConfig,
	PermissionPlatformReadHealth,
	PermissionPlatformReadUsage,
	PermissionPlatformManageStaff,
	PermissionPlatformSecurity,
	PermissionPlatformSupportAccess,
}

var externalShareablePermissions = []Permission{
	PermissionReadReports,
	PermissionExportReports,
	PermissionReadROI,
	PermissionReadCreditPassport,
	PermissionReadAudit,
}

var systemRoles = []Role{
	RoleSuperAdmin,
	RoleOrganizationOwner,
	RoleFinanceLead,
	RoleFinanceOperator,
	RoleAuditorCompliance,
	RoleOrgAdmin,
	RoleExternalCollaborator,
}

var defaultRolePermissions = map[Role][]Permission{
	RoleSuperAdmin: {
		PermissionPlatformManageTenants,
		PermissionPlatformManageBilling,
		PermissionPlatformManageConfig,
		PermissionPlatformReadHealth,
		PermissionPlatformReadUsage,
		PermissionPlatformManageStaff,
		PermissionPlatformSecurity,
		PermissionPlatformSupportAccess,
	},
	RoleOrganizationOwner: {
		PermissionReadOwnTenant,
		PermissionManageUsers,
		PermissionManageRoles,
		PermissionManageBilling,
		PermissionReviewDataQuality,
		PermissionReadEvents,
		PermissionReviewReconciliation,
		PermissionApproveFinancial,
		PermissionReadReports,
		PermissionExportReports,
		PermissionReadROI,
		PermissionGenerateCreditPassport,
		PermissionReadCreditPassport,
		PermissionManageConsent,
		PermissionReadAudit,
	},
	RoleFinanceLead: {
		PermissionReadOwnTenant,
		PermissionUploadDocuments,
		PermissionReviewDataQuality,
		PermissionReadEvents,
		PermissionReviewReconciliation,
		PermissionResolveReconciliation,
		PermissionCreateApproval,
		PermissionApproveFinancial,
		PermissionPostLedger,
		PermissionReverseLedger,
		PermissionSendCollections,
		PermissionManageRelationships,
		PermissionManageContracts,
		PermissionManageSuppliers,
		PermissionReadReports,
		PermissionExportReports,
		PermissionReadROI,
		PermissionGenerateCreditPassport,
		PermissionReadCreditPassport,
		PermissionReadAudit,
	},
	RoleFinanceOperator: {
		PermissionReadOwnTenant,
		PermissionUploadDocuments,
		PermissionReviewDataQuality,
		PermissionReadEvents,
		PermissionReviewReconciliation,
		PermissionResolveReconciliation,
		PermissionCreateApproval,
		PermissionReadReports,
	},
	RoleAuditorCompliance: {
		PermissionReadOwnTenant,
		PermissionReviewDataQuality,
		PermissionReadEvents,
		PermissionReviewReconciliation,
		PermissionReadReports,
		PermissionExportReports,
		PermissionReadROI,
		PermissionReadCreditPassport,
		PermissionReadAudit,
	},
	RoleOrgAdmin: {
		PermissionReadOwnTenant,
		PermissionManageUsers,
		PermissionManageRoles,
		PermissionManagePolicy,
		PermissionManageIntegrations,
		PermissionManageBilling,
		PermissionManageDataRetention,
		PermissionManageConsent,
		PermissionReadAudit,
	},
	// External access is resolved from an active consent grant, never from the role itself.
	RoleExternalCollaborator: {},
}

type ConsentScope struct {
	GrantID            string
	OrganizationID     string
	AllowedPermissions []Permission
	ExpiresAt          time.Time
	Revoked            bool
}

func (s *ConsentScope) Allows(organizationID string, permission Permission, now time.Time) bool {
	return s != nil &&
		!s.Revoked &&
		s.OrganizationID == organizationID &&
		s.ExpiresAt.After(now) &&
		slices.Contains(s.AllowedPermissions, permission)
}

type Actor struct {
	UserID         string
	OrganizationID string
	Plane          Plane
	Roles          []Role
	Permissions    []Permission
	Consent        *ConsentScope
}

type Resource struct {
	OrganizationID string
}

type ActionContext struct {
	CreatorUserID  string
	ApproverUserID string
	Action         string
}

type CustomRole struct {
	ID             string
	OrganizationID string
	Name           string
	Permissions    []Permission
	Version        int
	Active         bool
}

type RoleTemplate struct {
	ID          string
	Vertical    string
	Name        string
	Permissions []Permission
}

var highRiskActions = map[string]bool{
	"approve_match":         true,
	"post_ledger":           true,
	"reverse_posting":       true,
	"grant_external_access": true,
	"change_policy":         true,
	"manage_roles":          true,
}

func SystemRoles() []Role {
	return slices.Clone(systemRoles)
}

func TenantPermissions() []Permission {
	return slices.Clone(tenantPermissionCatalog)
}

func PlatformPermissions() []Permission {
	return slices.Clone(platformPermissionCatalog)
}

func IsSystemRole(role Role) bool {
	return slices.Contains(systemRoles, role)
}

func IsTenantRole(role Role) bool {
	return role != RoleSuperAdmin && IsSystemRole(role)
}

func IsTenantPermission(permission Permission) bool {
	return slices.Contains(tenantPermissionCatalog, permission)
}

func IsPlatformPermission(permission Permission) bool {
	return slices.Contains(platformPermissionCatalog, permission)
}

func IsExternalShareablePermission(permission Permission) bool {
	return slices.Contains(externalShareablePermissions, permission)
}

func PermissionsForRoles(roles ...Role) []Permission {
	seen := map[Permission]bool{}
	var permissions []Permission
	for _, role := range roles {
		for _, permission := range defaultRolePermissions[role] {
			if !seen[permission] {
				seen[permission] = true
				permissions = append(permissions, permission)
			}
		}
	}
	return permissions
}

func Authorize(actor Actor, resource Resource, permission Permission) error {
	return AuthorizeAt(actor, resource, permission, time.Now())
}

func AuthorizeAt(actor Actor, resource Resource, permission Permission, now time.Time) error {
	if err := validateTenantActor(actor); err != nil {
		return err
	}
	if resource.OrganizationID == "" {
		return errors.New("resource organization is required")
	}
	if actor.OrganizationID != resource.OrganizationID {
		return errors.New("cross-tenant access denied")
	}
	if !IsTenantPermission(permission) {
		return errors.New("platform permission cannot be used on tenant resources")
	}
	if slices.Contains(actor.Roles, RoleExternalCollaborator) {
		if !IsExternalShareablePermission(permission) {
			return errors.New("external collaborators can receive only shareable read permissions")
		}
		if !actor.Consent.Allows(resource.OrganizationID, permission, now) {
			return errors.New("active consent grant does not allow this access")
		}
		return nil
	}
	if !HasPermission(actor, permission) {
		return errors.New("permission denied")
	}
	return nil
}

func AuthorizePlatform(actor Actor, permission Permission) error {
	if effectivePlane(actor) != PlanePlatform {
		return errors.New("platform access requires a platform actor")
	}
	if actor.OrganizationID != "" {
		return errors.New("platform actor cannot belong to a tenant")
	}
	if len(actor.Roles) != 1 || actor.Roles[0] != RoleSuperAdmin {
		return errors.New("platform actor must have only the super admin role")
	}
	if !IsPlatformPermission(permission) || !HasPermission(actor, permission) {
		return errors.New("permission denied")
	}
	return nil
}

func HasPermission(actor Actor, permission Permission) bool {
	if slices.Contains(actor.Permissions, permission) {
		return true
	}
	for _, role := range actor.Roles {
		if slices.Contains(defaultRolePermissions[role], permission) {
			return true
		}
	}
	return false
}

func ValidateCustomRole(manager Actor, role CustomRole) error {
	if strings.TrimSpace(role.OrganizationID) == "" || role.OrganizationID != manager.OrganizationID {
		return errors.New("custom role must belong to the manager's organization")
	}
	if strings.TrimSpace(role.Name) == "" {
		return errors.New("custom role name is required")
	}
	if !HasPermission(manager, PermissionManageRoles) {
		return errors.New("roles:manage permission is required")
	}
	if len(role.Permissions) == 0 {
		return errors.New("custom role requires at least one permission")
	}
	for _, permission := range role.Permissions {
		if !IsTenantPermission(permission) {
			return fmt.Errorf("permission %q is not a tenant permission", permission)
		}
		if !HasPermission(manager, permission) {
			return fmt.Errorf("cannot grant permission %q that the manager does not hold", permission)
		}
	}
	return nil
}

func EnforceSegregationOfDuties(ctx ActionContext) error {
	if ctx.CreatorUserID == "" || ctx.ApproverUserID == "" {
		return errors.New("creator and approver are required")
	}
	if ctx.CreatorUserID == ctx.ApproverUserID {
		return errors.New("segregation of duties violation: creator cannot approve own action")
	}
	return nil
}

func EnforceApprovalChain(creatorUserID string, approverUserIDs []string, requiredApprovers int) error {
	if requiredApprovers < 1 {
		return errors.New("at least one approver is required")
	}
	if len(approverUserIDs) < requiredApprovers {
		return fmt.Errorf("%d distinct approvers are required", requiredApprovers)
	}
	seen := map[string]bool{}
	for _, approverUserID := range approverUserIDs {
		if err := EnforceSegregationOfDuties(ActionContext{CreatorUserID: creatorUserID, ApproverUserID: approverUserID}); err != nil {
			return err
		}
		if seen[approverUserID] {
			return errors.New("approval chain requires distinct approvers")
		}
		seen[approverUserID] = true
	}
	return nil
}

func RequiredApprovers(amountMinor int64, twoApproverThresholdMinor int64) int {
	if twoApproverThresholdMinor > 0 && amountMinor > twoApproverThresholdMinor {
		return 2
	}
	return 1
}

func IsHighRiskAction(action string) bool {
	return highRiskActions[action]
}

func validateTenantActor(actor Actor) error {
	if effectivePlane(actor) != PlaneTenant {
		return errors.New("platform users cannot access tenant resources")
	}
	if actor.OrganizationID == "" {
		return errors.New("actor organization is required")
	}
	if slices.Contains(actor.Roles, RoleSuperAdmin) {
		return errors.New("super admin cannot be a tenant user")
	}
	if slices.Contains(actor.Roles, RoleExternalCollaborator) && len(actor.Roles) != 1 {
		return errors.New("external collaborator cannot hold internal tenant roles")
	}
	for _, role := range actor.Roles {
		if !IsTenantRole(role) {
			return fmt.Errorf("unknown tenant role %q", role)
		}
	}
	return nil
}

func effectivePlane(actor Actor) Plane {
	if actor.Plane != "" {
		return actor.Plane
	}
	if slices.Contains(actor.Roles, RoleSuperAdmin) {
		return PlanePlatform
	}
	return PlaneTenant
}
