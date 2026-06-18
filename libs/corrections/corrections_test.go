package corrections

import "testing"

func TestValidateRequiresOriginalForReversal(t *testing.T) {
	err := Validate(Event{ID: "cor-1", Type: EventReversed, Reason: "wrong upload"})
	if err == nil {
		t.Fatal("expected reversal without original event to fail")
	}
}

func TestValidateAllowsCreatedWithoutOriginal(t *testing.T) {
	err := Validate(Event{ID: "cor-1", Type: EventCreated, Reason: "new event"})
	if err != nil {
		t.Fatalf("expected created event to pass, got %v", err)
	}
}

