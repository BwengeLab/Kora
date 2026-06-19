package access

import "testing"

func TestAuthorizeDeniesCrossTenantAccess(t *testing.T) {
	actor := Actor{UserID: "user-a", OrganizationID: "tenant-a", Roles: []Role{RoleCFO}}
	resource := Resource{OrganizationID: "tenant-b"}

	err := Authorize(actor, resource, PermissionReadOwnTenant)
	if err == nil {
		t.Fatal("expected cross-tenant access to be denied")
	}
}

func TestAuthorizeDeniesMissingPermission(t *testing.T) {
	actor := Actor{UserID: "user-a", OrganizationID: "tenant-a", Roles: []Role{RoleAccountant}}
	resource := Resource{OrganizationID: "tenant-a"}

	err := Authorize(actor, resource, PermissionApproveFinancial)
	if err == nil {
		t.Fatal("expected accountant financial approval to be denied")
	}
}

func TestAuthorizeAllowsRolePermission(t *testing.T) {
	actor := Actor{UserID: "user-a", OrganizationID: "tenant-a", Roles: []Role{RoleCFO}}
	resource := Resource{OrganizationID: "tenant-a"}

	if err := Authorize(actor, resource, PermissionApproveFinancial); err != nil {
		t.Fatalf("expected CFO approval to be allowed, got %v", err)
	}
}

func TestSegregationOfDutiesBlocksSelfApproval(t *testing.T) {
	err := EnforceSegregationOfDuties(ActionContext{
		CreatorUserID:  "user-a",
		ApproverUserID: "user-a",
		Action:         "approve-match",
	})
	if err == nil {
		t.Fatal("expected self-approval to fail")
	}
}

func TestSegregationOfDutiesAllowsDifferentApprover(t *testing.T) {
	err := EnforceSegregationOfDuties(ActionContext{
		CreatorUserID:  "user-a",
		ApproverUserID: "user-b",
		Action:         "approve-match",
	})
	if err != nil {
		t.Fatalf("expected different approver to pass, got %v", err)
	}
}

func TestHighRiskActionsAreDefined(t *testing.T) {
	for _, action := range []string{"approve_match", "post_ledger", "reverse_posting", "grant_external_access", "change_policy"} {
		if !IsHighRiskAction(action) {
			t.Fatalf("expected %s to be high risk", action)
		}
	}
}
