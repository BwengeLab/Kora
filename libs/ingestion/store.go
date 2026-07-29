package ingestion

type Store interface {
	IdempotencyResult(key string) (Result, bool)
	DocumentByFingerprint(orgID string, fingerprint string) (Document, bool)
	LatestResult(documentID string) (Result, error)
	SaveIdempotency(key string, result Result)
	Create(input IngestInput, fingerprint string) (Result, error)
	ListDocuments(orgID string) ([]Document, error)
	ListBatches(orgID string) ([]Batch, error)
}
