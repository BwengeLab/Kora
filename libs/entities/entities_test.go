package entities

import "testing"

func TestResolveReturnsExistingEntityForCanonicalIdentity(t *testing.T) {
	resolver := NewResolver()
	first, created, err := resolver.Resolve("org-a", ExternalParty, Candidate{DisplayName: "Kigali Brokers Ltd."})
	if err != nil || !created {
		t.Fatalf("expected first entity creation, got created=%v err=%v", created, err)
	}
	second, created, err := resolver.Resolve("org-a", ExternalParty, Candidate{DisplayName: " KIGALI BROKERS LTD "})
	if err != nil {
		t.Fatal(err)
	}
	if created || second.ID != first.ID {
		t.Fatalf("expected canonical resolution to reuse entity, got first=%s second=%s", first.ID, second.ID)
	}
	if first.ResolutionMethod != "normalized_name" || first.ResolutionConfidence != 0.80 {
		t.Fatalf("expected transparent name-only resolution, got %+v", first)
	}
}

func TestResolutionIsTenantScoped(t *testing.T) {
	resolver := NewResolver()
	left, _, _ := resolver.Resolve("org-a", Invoice, Candidate{ExternalReference: "INV-1"})
	right, _, _ := resolver.Resolve("org-b", Invoice, Candidate{ExternalReference: "INV-1"})
	if left.ID == right.ID {
		t.Fatal("expected separate entities for separate tenants")
	}
	if _, err := resolver.Get("org-b", left.ID); err == nil {
		t.Fatal("expected cross-tenant entity read to fail")
	}
}

func TestResolutionRequiresStableIdentifier(t *testing.T) {
	resolver := NewResolver()
	if _, _, err := resolver.Resolve("org-a", Payment, Candidate{}); err == nil {
		t.Fatal("expected missing identifier to fail")
	}
}
