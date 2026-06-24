package consent

import (
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestConsentScopesAccessAndLogsEveryAttempt(t *testing.T) {
	store, grant := createGrant(t, false)
	request := validAccess(grant)
	log, err := store.AuthorizeAndLog(request)
	if err != nil || !log.Allowed {
		t.Fatalf("expected consented access: log=%+v err=%v", log, err)
	}
	request.DataCategory = "ledger"
	log, err = store.AuthorizeAndLog(request)
	if err == nil || log.Allowed {
		t.Fatalf("out-of-scope category must be denied: %+v", log)
	}
	logs, err := store.Logs(owner("org-1"), "org-1")
	if err != nil || len(logs) != 2 || !logs[0].Allowed || logs[1].Allowed {
		t.Fatalf("allowed and denied attempts must be logged: logs=%+v err=%v", logs, err)
	}
}

func TestRevocationStopsFutureReadsImmediately(t *testing.T) {
	store, grant := createGrant(t, false)
	if _, err := store.Revoke(owner("org-1"), "org-1", grant.ID, consentProof("revoke")); err != nil {
		t.Fatal(err)
	}
	log, err := store.AuthorizeAndLog(validAccess(grant))
	if err == nil || log.Allowed || log.Reason != "consent grant is revoked" {
		t.Fatalf("revoked grant remained active: log=%+v err=%v", log, err)
	}
}

func TestConsentEnforcesPeriodExpiryAndMonitoring(t *testing.T) {
	store, grant := createGrant(t, false)
	request := validAccess(grant)
	request.PeriodStart = grant.PeriodStart.Add(-time.Hour)
	if _, err := store.AuthorizeAndLog(request); err == nil {
		t.Fatal("data before the consent period must be denied")
	}
	request = validAccess(grant)
	request.Monitoring = true
	if _, err := store.AuthorizeAndLog(request); err == nil {
		t.Fatal("monitoring must be explicitly granted")
	}

	monitoringStore, monitoringGrant := createGrant(t, true)
	request = validAccess(monitoringGrant)
	request.Monitoring = true
	request.PeriodEnd = request.OccurredAt
	if _, err := monitoringStore.AuthorizeAndLog(request); err != nil {
		t.Fatalf("consented monitoring should be allowed: %v", err)
	}
	request.OccurredAt = monitoringGrant.ExpiresAt
	if _, err := monitoringStore.AuthorizeAndLog(request); err == nil {
		t.Fatal("expired access must be denied")
	}
}

func TestGrantRequiresPermissionEvidenceAndIndependentApproval(t *testing.T) {
	now := time.Date(2026, 6, 24, 12, 0, 0, 0, time.UTC)
	store := NewStore()
	store.now = func() time.Time { return now }
	grant := baseGrant(now)
	approval := approvedTask()
	approval.ApproverUserIDs = []string{approval.CreatorUserID}
	if _, err := store.Create(owner("org-1"), grant, approval); err == nil {
		t.Fatal("self-approved external sharing must be rejected")
	}
	approval = approvedTask()
	grant.AllowedPermissions = []access.Permission{access.PermissionPostLedger}
	if _, err := store.Create(owner("org-1"), grant, approval); err == nil {
		t.Fatal("mutation permissions must not be shareable")
	}
	grant = baseGrant(now)
	grant.Evidence = evidence.Evidence{}
	if _, err := store.Create(owner("org-1"), grant, approval); err == nil {
		t.Fatal("consent without evidence must be rejected")
	}
}

func TestConsentTemplatesCoverInitialPartners(t *testing.T) {
	templates := Templates()
	if len(templates) != 3 || templates[0].ID != "lender" || templates[1].ID != "auditor" || templates[2].ID != "advisor" {
		t.Fatalf("unexpected consent templates: %+v", templates)
	}
}

func createGrant(t *testing.T, monitoring bool) (*Store, Grant) {
	t.Helper()
	now := time.Date(2026, 6, 24, 12, 0, 0, 0, time.UTC)
	store := NewStore()
	store.now = func() time.Time { return now }
	input := baseGrant(now)
	input.OngoingMonitoringAllowed = monitoring
	grant, err := store.Create(owner("org-1"), input, approvedTask())
	if err != nil {
		t.Fatal(err)
	}
	return store, grant
}

func baseGrant(now time.Time) Grant {
	return Grant{
		OrganizationID: "org-1", ExternalUserID: "lender-user", RecipientPartyID: "lender-party",
		AllowedDataCategories: []string{"credit_passport", "cashflow"},
		AllowedPermissions:    []access.Permission{access.PermissionReadCreditPassport},
		PeriodStart:           now.AddDate(-1, 0, 0), PeriodEnd: now,
		ExpiresAt: now.Add(30 * 24 * time.Hour), Purpose: "credit application review",
		Evidence: consentProof("grant"),
	}
}

func validAccess(grant Grant) AccessRequest {
	when := time.Date(2026, 6, 24, 13, 0, 0, 0, time.UTC)
	return AccessRequest{
		GrantID: grant.ID,
		ExternalActor: access.Actor{
			UserID: grant.ExternalUserID, OrganizationID: grant.OrganizationID,
			Roles: []access.Role{access.RoleExternalCollaborator},
		},
		Permission: access.PermissionReadCreditPassport, DataCategory: "credit_passport",
		PeriodStart: grant.PeriodStart, PeriodEnd: grant.PeriodEnd,
		Resource: "passport-1", OccurredAt: when,
	}
}

func approvedTask() workflow.Task {
	return workflow.Task{
		ID: "approval-consent", OrganizationID: "org-1", SuggestedAction: "grant_external_access",
		CreatorUserID: "admin", State: workflow.Approved, RequiredApprovers: 1,
		ApproverUserIDs: []string{"owner"}, Evidence: consentProof("approval"),
	}
}

func owner(organizationID string) access.Actor {
	return access.Actor{UserID: "owner", OrganizationID: organizationID, Roles: []access.Role{access.RoleOrganizationOwner}}
}

func consentProof(source string) evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID: "doc-" + source, SourceRecordID: "record-" + source,
		IngestionBatchID: "batch-1", ExtractionVersionID: "version-1",
		Reason: "consent test", ConfidenceScore: 1, ConfidenceMethod: "human",
	}
}
