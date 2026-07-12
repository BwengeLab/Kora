package access

import (
	"slices"
	"testing"
	"time"
)

func TestSystemRolesAreLockedToSeven(t *testing.T) {
	want := []Role{
		RoleSuperAdmin,
		RoleOrganizationOwner,
		RoleFinanceLead,
		RoleFinanceOperator,
		RoleAuditorCompliance,
		RoleOrgAdmin,
		RoleExternalCollaborator,
	}
	if got := SystemRoles(); !slices.Equal(got, want) {
		t.Fatalf("unexpected system roles: %v", got)
	}
}

func TestAuthorizeDeniesCrossTenantAccess(t *testing.T) {
	actor := Actor{UserID: "user-a", OrganizationID: "tenant-a", Roles: []Role{RoleFinanceLead}}
	err := Authorize(actor, Resource{OrganizationID: "tenant-b"}, PermissionReadOwnTenant)
	if err == nil {
		t.Fatal("expected cross-tenant access to be denied")
	}
}

func TestFinanceOperatorCanPrepareButCannotApprove(t *testing.T) {
	actor := Actor{UserID: "user-a", OrganizationID: "tenant-a", Roles: []Role{RoleFinanceOperator}}
	resource := Resource{OrganizationID: "tenant-a"}

	if err := Authorize(actor, resource, PermissionResolveReconciliation); err != nil {
		t.Fatalf("expected finance operator to resolve reconciliation: %v", err)
	}
	if err := Authorize(actor, resource, PermissionCreateApproval); err != nil {
		t.Fatalf("expected finance operator to create approval: %v", err)
	}
	if err := Authorize(actor, resource, PermissionApproveFinancial); err == nil {
		t.Fatal("expected finance operator financial approval to be denied")
	}
	if err := Authorize(actor, resource, PermissionPostLedger); err == nil {
		t.Fatal("expected finance operator ledger posting to be denied")
	}
}

func TestClaimsOfficerIsVerticalAndCannotSettleOrApprove(t *testing.T) {
	if IsSystemRole(RoleClaimsOfficer) {
		t.Fatal("claims officer must remain outside the seven canonical system roles")
	}
	if !IsTenantRole(RoleClaimsOfficer) {
		t.Fatal("claims officer must be assignable within a tenant")
	}
	actor := Actor{UserID: "claims-a", OrganizationID: "tenant-a", Roles: []Role{RoleClaimsOfficer}}
	resource := Resource{OrganizationID: "tenant-a"}
	for _, permission := range []Permission{PermissionReadEvents, PermissionReviewClaims, PermissionPrepareClaims} {
		if err := Authorize(actor, resource, permission); err != nil {
			t.Fatalf("expected claims officer permission %s: %v", permission, err)
		}
	}
	for _, permission := range []Permission{PermissionSettleClaims, PermissionApproveFinancial, PermissionPostLedger} {
		if err := Authorize(actor, resource, permission); err == nil {
			t.Fatalf("expected claims officer permission %s to be denied", permission)
		}
	}
}

func TestFinanceLeadCanApproveAndPost(t *testing.T) {
	actor := Actor{UserID: "user-a", OrganizationID: "tenant-a", Roles: []Role{RoleFinanceLead}}
	resource := Resource{OrganizationID: "tenant-a"}
	for _, permission := range []Permission{PermissionApproveFinancial, PermissionPostLedger, PermissionReverseLedger} {
		if err := Authorize(actor, resource, permission); err != nil {
			t.Fatalf("expected finance lead permission %s: %v", permission, err)
		}
	}
}

func TestOrganizationOwnerApprovesButDoesNotPost(t *testing.T) {
	actor := Actor{UserID: "owner-a", OrganizationID: "tenant-a", Roles: []Role{RoleOrganizationOwner}}
	resource := Resource{OrganizationID: "tenant-a"}
	if err := Authorize(actor, resource, PermissionApproveFinancial); err != nil {
		t.Fatalf("expected organization owner to approve: %v", err)
	}
	if err := Authorize(actor, resource, PermissionPostLedger); err == nil {
		t.Fatal("expected organization owner ledger posting to require a finance role")
	}
}

func TestAuditorComplianceIsReadOnly(t *testing.T) {
	actor := Actor{UserID: "auditor-a", OrganizationID: "tenant-a", Roles: []Role{RoleAuditorCompliance}}
	resource := Resource{OrganizationID: "tenant-a"}
	for _, permission := range []Permission{PermissionReadEvents, PermissionReadReports, PermissionExportReports, PermissionReadAudit} {
		if err := Authorize(actor, resource, permission); err != nil {
			t.Fatalf("expected auditor read permission %s: %v", permission, err)
		}
	}
	for _, permission := range []Permission{PermissionUploadDocuments, PermissionResolveReconciliation, PermissionApproveFinancial, PermissionPostLedger} {
		if err := Authorize(actor, resource, permission); err == nil {
			t.Fatalf("expected auditor mutation permission %s to be denied", permission)
		}
	}
}

func TestOrgAdminManagesConfigurationButCannotApproveFinance(t *testing.T) {
	actor := Actor{UserID: "admin-a", OrganizationID: "tenant-a", Roles: []Role{RoleOrgAdmin}}
	resource := Resource{OrganizationID: "tenant-a"}
	for _, permission := range []Permission{PermissionManageUsers, PermissionManageRoles, PermissionManagePolicy, PermissionManageIntegrations} {
		if err := Authorize(actor, resource, permission); err != nil {
			t.Fatalf("expected org admin permission %s: %v", permission, err)
		}
	}
	if err := Authorize(actor, resource, PermissionApproveFinancial); err == nil {
		t.Fatal("expected org admin financial approval to be denied")
	}
}

func TestExternalCollaboratorRequiresActiveConsent(t *testing.T) {
	now := time.Date(2026, 6, 20, 12, 0, 0, 0, time.UTC)
	actor := Actor{
		UserID:         "external-a",
		OrganizationID: "tenant-a",
		Roles:          []Role{RoleExternalCollaborator},
		Consent: &ConsentScope{
			GrantID:            "grant-a",
			OrganizationID:     "tenant-a",
			AllowedPermissions: []Permission{PermissionReadCreditPassport},
			ExpiresAt:          now.Add(time.Hour),
		},
	}
	if err := AuthorizeAt(actor, Resource{OrganizationID: "tenant-a"}, PermissionReadCreditPassport, now); err != nil {
		t.Fatalf("expected consent-scoped access: %v", err)
	}
	actor.Consent.AllowedPermissions = append(actor.Consent.AllowedPermissions, PermissionPostLedger)
	if err := AuthorizeAt(actor, Resource{OrganizationID: "tenant-a"}, PermissionPostLedger, now); err == nil {
		t.Fatal("expected external mutation permission to be denied even when present in consent")
	}

	actor.Consent.ExpiresAt = now.Add(-time.Second)
	if err := AuthorizeAt(actor, Resource{OrganizationID: "tenant-a"}, PermissionReadCreditPassport, now); err == nil {
		t.Fatal("expected expired consent to deny access")
	}
}

func TestSuperAdminUsesOnlyPlatformPlane(t *testing.T) {
	actor := Actor{UserID: "platform-a", Plane: PlanePlatform, Roles: []Role{RoleSuperAdmin}}
	if err := AuthorizePlatform(actor, PermissionPlatformManageTenants); err != nil {
		t.Fatalf("expected super admin platform access: %v", err)
	}
	if err := Authorize(actor, Resource{OrganizationID: "tenant-a"}, PermissionReadOwnTenant); err == nil {
		t.Fatal("expected super admin tenant access to be denied")
	}
}

func TestMultiRolePermissionsAreAdditive(t *testing.T) {
	actor := Actor{
		UserID:         "solo-owner",
		OrganizationID: "tenant-a",
		Roles:          []Role{RoleOrganizationOwner, RoleFinanceLead, RoleOrgAdmin},
	}
	resource := Resource{OrganizationID: "tenant-a"}
	for _, permission := range []Permission{PermissionApproveFinancial, PermissionPostLedger, PermissionManagePolicy} {
		if err := Authorize(actor, resource, permission); err != nil {
			t.Fatalf("expected additive permission %s: %v", permission, err)
		}
	}
}

func TestCustomRolePreventsPrivilegeEscalation(t *testing.T) {
	manager := Actor{UserID: "admin-a", OrganizationID: "tenant-a", Roles: []Role{RoleOrgAdmin}}
	valid := CustomRole{
		OrganizationID: "tenant-a",
		Name:           "Integration Administrator",
		Permissions:    []Permission{PermissionManageIntegrations},
	}
	if err := ValidateCustomRole(manager, valid); err != nil {
		t.Fatalf("expected custom role to validate: %v", err)
	}

	valid.Permissions = []Permission{PermissionApproveFinancial}
	if err := ValidateCustomRole(manager, valid); err == nil {
		t.Fatal("expected privilege escalation to be rejected")
	}
}

func TestSegregationOfDutiesAndTwoApproverControl(t *testing.T) {
	if err := EnforceSegregationOfDuties(ActionContext{CreatorUserID: "user-a", ApproverUserID: "user-a"}); err == nil {
		t.Fatal("expected self-approval to fail")
	}
	if got := RequiredApprovers(1_000_001, 1_000_000); got != 2 {
		t.Fatalf("expected two approvers, got %d", got)
	}
	if err := EnforceApprovalChain("creator", []string{"approver-a", "approver-b"}, 2); err != nil {
		t.Fatalf("expected valid two-approver chain: %v", err)
	}
	if err := EnforceApprovalChain("creator", []string{"approver-a", "approver-a"}, 2); err == nil {
		t.Fatal("expected duplicate approver to fail")
	}
}

func TestHighRiskActionsAreDefined(t *testing.T) {
	for _, action := range []string{"approve_match", "post_ledger", "reverse_posting", "grant_external_access", "change_policy", "manage_roles"} {
		if !IsHighRiskAction(action) {
			t.Fatalf("expected %s to be high risk", action)
		}
	}
}
