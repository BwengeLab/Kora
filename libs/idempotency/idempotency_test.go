package idempotency

import "testing"

func TestFingerprintIsStable(t *testing.T) {
	first := Fingerprint([]byte("same source file"))
	second := Fingerprint([]byte("same source file"))
	if first != second {
		t.Fatal("expected stable fingerprint")
	}
}

func TestIsReplayRequiresKeyAndFingerprint(t *testing.T) {
	record := Record{Key: "req-1", Fingerprint: "abc", ResultID: "batch-1"}
	if !IsReplay(record, "req-1", "abc") {
		t.Fatal("expected matching key and fingerprint to be replay")
	}
	if IsReplay(record, "req-2", "abc") {
		t.Fatal("expected different key to not be replay")
	}
}

