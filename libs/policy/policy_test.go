package policy

import "testing"

func TestTierUsesThresholds(t *testing.T) {
	p := DefaultSME("org-1")
	if got := Tier(0.96, p); got != "auto" {
		t.Fatalf("expected auto, got %s", got)
	}
	if got := Tier(0.80, p); got != "suggested" {
		t.Fatalf("expected suggested, got %s", got)
	}
	if got := Tier(0.40, p); got != "review" {
		t.Fatalf("expected review, got %s", got)
	}
	if _, exists := p.ApprovalLimitsMinor["FINANCE_LEAD"]; !exists {
		t.Fatal("expected finance lead approval limit")
	}
	for _, obsolete := range []string{"ACCOUNTANT", "FINANCE_MANAGER", "CFO", "CEO"} {
		if _, exists := p.ApprovalLimitsMinor[obsolete]; exists {
			t.Fatalf("obsolete role %s must not remain in policy defaults", obsolete)
		}
	}
}

func TestPoliciesCanDifferPerTenant(t *testing.T) {
	store := NewMemoryStore()
	sme, err := store.Save(DefaultSME("tenant-a"), AuditEvent{ActorUserID: "user-a"})
	if err != nil {
		t.Fatal(err)
	}
	insurance := DefaultInsurance("tenant-b")
	insurance.AutoMatchThreshold = 0.99
	storedInsurance, err := store.Save(insurance, AuditEvent{ActorUserID: "user-b"})
	if err != nil {
		t.Fatal(err)
	}

	if sme.OrganizationID == storedInsurance.OrganizationID {
		t.Fatal("expected policies for different tenants")
	}
	if sme.AutoMatchThreshold == storedInsurance.AutoMatchThreshold {
		t.Fatal("expected different threshold by tenant")
	}
}

func TestPolicyRequiresTwoApproverThreshold(t *testing.T) {
	p := DefaultSME("tenant-a")
	p.TwoApproverThresholdMinor = 0
	if err := Validate(p); err == nil {
		t.Fatal("expected missing two-approver threshold to fail validation")
	}
}

func TestPolicyVersioningAndAuditTrail(t *testing.T) {
	store := NewMemoryStore()
	first, err := store.Save(DefaultSME("tenant-a"), AuditEvent{ActorUserID: "user-a"})
	if err != nil {
		t.Fatal(err)
	}
	updated := first
	updated.AutoMatchThreshold = 0.98
	second, err := store.Save(updated, AuditEvent{ActorUserID: "user-a"})
	if err != nil {
		t.Fatal(err)
	}
	if second.Version != first.Version+1 {
		t.Fatalf("expected version %d, got %d", first.Version+1, second.Version)
	}
	audit, err := store.AuditTrail("tenant-a", second.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(audit) != 2 {
		t.Fatalf("expected two audit events, got %d", len(audit))
	}
}
