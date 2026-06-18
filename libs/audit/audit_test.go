package audit

import (
	"testing"
	"time"
)

func TestSealAndVerifyAuditEntry(t *testing.T) {
	entry := Seal(Entry{
		ID:          "audit-1",
		TenantID:    "tenant-a",
		ActorUserID: "user-a",
		Action:      "approval.created",
		Resource:    "approval-1",
		EvidenceID:  "evidence-1",
		OccurredAt:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	})

	if !Verify(entry) {
		t.Fatal("expected sealed audit entry to verify")
	}
}

func TestVerifyDetectsTampering(t *testing.T) {
	entry := Seal(Entry{
		ID:          "audit-1",
		TenantID:    "tenant-a",
		ActorUserID: "user-a",
		Action:      "approval.created",
		Resource:    "approval-1",
		EvidenceID:  "evidence-1",
		OccurredAt:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	})
	entry.Action = "approval.deleted"

	if Verify(entry) {
		t.Fatal("expected tampered audit entry to fail verification")
	}
}

