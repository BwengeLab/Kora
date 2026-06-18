package audit

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"
)

type Entry struct {
	ID             string
	TenantID       string
	ActorUserID    string
	Action         string
	Resource       string
	EvidenceID     string
	OccurredAt     time.Time
	PreviousHash   string
	IntegrityHash  string
}

func Seal(entry Entry) Entry {
	entry.IntegrityHash = Hash(entry)
	return entry
}

func Hash(entry Entry) string {
	parts := []string{
		entry.ID,
		entry.TenantID,
		entry.ActorUserID,
		entry.Action,
		entry.Resource,
		entry.EvidenceID,
		entry.OccurredAt.UTC().Format(time.RFC3339Nano),
		entry.PreviousHash,
	}
	sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(sum[:])
}

func Verify(entry Entry) bool {
	return entry.IntegrityHash == Hash(entry)
}

