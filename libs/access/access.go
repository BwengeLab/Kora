package access

import (
	"errors"
	"slices"
)

type Role string

const (
	RoleOwner           Role = "OWNER"
	RoleCEO             Role = "CEO"
	RoleCFO             Role = "CFO"
	RoleFinanceManager  Role = "FINANCE_MANAGER"
	RoleAccountant      Role = "ACCOUNTANT"
	RoleAuditor         Role = "AUDITOR"
	RoleAdmin           Role = "ADMIN"
	RoleExternalLender  Role = "EXTERNAL_LENDER"
	RoleExternalAuditor Role = "EXTERNAL_AUDITOR"
)

type Permission string

const (
	PermissionReadOwnTenant      Permission = "tenant:read"
	PermissionManageUsers        Permission = "users:manage"
	PermissionUploadDocuments    Permission = "documents:upload"
	PermissionReviewEvidence     Permission = "evidence:review"
	PermissionCreateApproval     Permission = "approval:create"
	PermissionApproveFinancial   Permission = "financial:approve"
	PermissionPostLedger         Permission = "ledger:post"
	PermissionReadAudit          Permission = "audit:read"
	PermissionManageConsent      Permission = "consent:manage"
	PermissionReadCreditPassport Permission = "credit_passport:read"
)

type Actor struct {
	UserID         string
	OrganizationID string
	Roles          []Role
	Permissions    []Permission
}

type Resource struct {
	OrganizationID string
}

type ActionContext struct {
	CreatorUserID  string
	ApproverUserID string
	Action         string
}

var highRiskActions = map[string]bool{
	"approve_match":         true,
	"post_ledger":           true,
	"reverse_posting":       true,
	"grant_external_access": true,
	"change_policy":         true,
}

var defaultRolePermissions = map[Role][]Permission{
	RoleOwner: {
		PermissionReadOwnTenant,
		PermissionManageUsers,
		PermissionUploadDocuments,
		PermissionReviewEvidence,
		PermissionCreateApproval,
		PermissionApproveFinancial,
		PermissionPostLedger,
		PermissionReadAudit,
		PermissionManageConsent,
		PermissionReadCreditPassport,
	},
	RoleCEO: {
		PermissionReadOwnTenant,
		PermissionReviewEvidence,
		PermissionApproveFinancial,
		PermissionReadAudit,
		PermissionManageConsent,
		PermissionReadCreditPassport,
	},
	RoleCFO: {
		PermissionReadOwnTenant,
		PermissionUploadDocuments,
		PermissionReviewEvidence,
		PermissionCreateApproval,
		PermissionApproveFinancial,
		PermissionPostLedger,
		PermissionReadAudit,
		PermissionReadCreditPassport,
	},
	RoleFinanceManager: {
		PermissionReadOwnTenant,
		PermissionUploadDocuments,
		PermissionReviewEvidence,
		PermissionCreateApproval,
		PermissionApproveFinancial,
		PermissionReadAudit,
	},
	RoleAccountant: {
		PermissionReadOwnTenant,
		PermissionUploadDocuments,
		PermissionReviewEvidence,
		PermissionCreateApproval,
	},
	RoleAuditor: {
		PermissionReadOwnTenant,
		PermissionReviewEvidence,
		PermissionReadAudit,
	},
	RoleAdmin: {
		PermissionReadOwnTenant,
		PermissionManageUsers,
	},
	RoleExternalLender: {
		PermissionReadCreditPassport,
	},
	RoleExternalAuditor: {
		PermissionReadAudit,
	},
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
	if actor.OrganizationID == "" {
		return errors.New("actor organization is required")
	}
	if resource.OrganizationID == "" {
		return errors.New("resource organization is required")
	}
	if actor.OrganizationID != resource.OrganizationID {
		return errors.New("cross-tenant access denied")
	}
	if !HasPermission(actor, permission) {
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

func EnforceSegregationOfDuties(ctx ActionContext) error {
	if ctx.CreatorUserID == "" || ctx.ApproverUserID == "" {
		return errors.New("creator and approver are required")
	}
	if ctx.CreatorUserID == ctx.ApproverUserID {
		return errors.New("segregation of duties violation: creator cannot approve own action")
	}
	return nil
}

func IsHighRiskAction(action string) bool {
	return highRiskActions[action]
}
