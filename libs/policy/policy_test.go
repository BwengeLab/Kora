package policy

import "testing"

func TestTierUsesThresholds(t *testing.T) {
	p := DefaultSME()
	if got := Tier(0.96, p); got != "auto" {
		t.Fatalf("expected auto, got %s", got)
	}
	if got := Tier(0.80, p); got != "suggested" {
		t.Fatalf("expected suggested, got %s", got)
	}
	if got := Tier(0.40, p); got != "review" {
		t.Fatalf("expected review, got %s", got)
	}
}

