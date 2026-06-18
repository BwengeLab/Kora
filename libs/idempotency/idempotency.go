package idempotency

import (
	"crypto/sha256"
	"encoding/hex"
)

func Fingerprint(content []byte) string {
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:])
}

type Record struct {
	Key         string
	Fingerprint string
	ResultID    string
}

func IsReplay(existing Record, key string, fingerprint string) bool {
	return existing.Key == key && existing.Fingerprint == fingerprint
}

