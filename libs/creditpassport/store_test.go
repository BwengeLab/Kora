package creditpassport

import "testing"

func TestStoreGenerationIsIdempotent(t *testing.T) {
	store := NewStore()
	first, created, err := store.Generate(lead("org-1"), passportInput())
	if err != nil || !created {
		t.Fatalf("first generation failed: created=%v err=%v", created, err)
	}
	second, created, err := store.Generate(lead("org-1"), passportInput())
	if err != nil || created || first.ID != second.ID {
		t.Fatalf("passport replay was not idempotent: created=%v err=%v", created, err)
	}
	if _, err := store.Read(lead("org-1"), "org-1", first.ID); err != nil {
		t.Fatal(err)
	}
}
