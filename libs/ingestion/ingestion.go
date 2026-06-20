package ingestion

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/kora-finance/kora/libs/idempotency"
)

const (
	QualityComplete       = "complete"
	QualityIncomplete     = "incomplete"
	QualityDuplicateRisk  = "duplicate-risk"
	QualityLowConfidence  = "low-confidence"
	QualityMissingDoc     = "missing-document"
	QualityNeedsReview    = "needs-review"
	QualitySourceConflict = "source-conflict"
)

type IngestInput struct {
	OrganizationID   string                 `json:"organization_id"`
	IdempotencyKey   string                 `json:"idempotency_key"`
	FileName         string                 `json:"file_name"`
	ContentType      string                 `json:"content_type"`
	Content          []byte                 `json:"-"`
	Extractor        string                 `json:"extractor"`
	ForceReprocess   bool                   `json:"force_reprocess"`
	ExtractedRecords []ExtractedRecordInput `json:"extracted_records"`
}

type ExtractedRecordInput struct {
	SourceRecordID   string             `json:"source_record_id"`
	RecordType       string             `json:"record_type"`
	Fields           map[string]string  `json:"fields"`
	FieldConfidences map[string]float64 `json:"field_confidences"`
	Confidence       float64            `json:"confidence"`
	Warnings         []string           `json:"warnings"`
	SourceLocation   SourceLocation     `json:"source_location"`
}

type SourceLocation struct {
	PageNumber int    `json:"page_number"`
	RowNumber  int    `json:"row_number"`
	SheetName  string `json:"sheet_name"`
}

type Batch struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
}

type Document struct {
	ID                    string    `json:"id"`
	OrganizationID        string    `json:"organization_id"`
	BatchID               string    `json:"batch_id"`
	FileName              string    `json:"file_name"`
	ContentType           string    `json:"content_type"`
	Fingerprint           string    `json:"fingerprint"`
	SizeBytes             int       `json:"size_bytes"`
	DuplicateOfDocumentID string    `json:"duplicate_of_document_id,omitempty"`
	CreatedAt             time.Time `json:"created_at"`
}

type ExtractionVersion struct {
	ID           string    `json:"id"`
	DocumentID   string    `json:"document_id"`
	Version      int       `json:"version"`
	Extractor    string    `json:"extractor"`
	QualityFlags []string  `json:"quality_flags"`
	CreatedAt    time.Time `json:"created_at"`
}

type SourceRecord struct {
	ID                  string             `json:"id"`
	OrganizationID      string             `json:"organization_id"`
	DocumentID          string             `json:"document_id"`
	ExtractionVersionID string             `json:"extraction_version_id"`
	SourceRecordID      string             `json:"source_record_id"`
	RecordType          string             `json:"record_type"`
	Fields              map[string]string  `json:"fields"`
	FieldConfidences    map[string]float64 `json:"field_confidences"`
	Confidence          float64            `json:"confidence"`
	Warnings            []string           `json:"warnings"`
	SourceLocation      SourceLocation     `json:"source_location"`
	QualityFlags        []string           `json:"quality_flags"`
	CreatedAt           time.Time          `json:"created_at"`
}

type Result struct {
	Batch             Batch             `json:"batch"`
	Document          Document          `json:"document"`
	ExtractionVersion ExtractionVersion `json:"extraction_version"`
	SourceRecords     []SourceRecord    `json:"source_records"`
	Replayed          bool              `json:"replayed"`
	DuplicateSource   bool              `json:"duplicate_source"`
	Reprocessed       bool              `json:"reprocessed"`
}

type Service struct {
	store *MemoryStore
}

func NewService(store *MemoryStore) *Service {
	return &Service{store: store}
}

func (s *Service) Ingest(input IngestInput) (Result, error) {
	if input.OrganizationID == "" {
		return Result{}, errors.New("organization id is required")
	}
	if input.IdempotencyKey == "" {
		return Result{}, errors.New("idempotency key is required")
	}
	if input.FileName == "" {
		return Result{}, errors.New("file name is required")
	}

	fingerprint := idempotency.Fingerprint(input.Content)
	if existing, ok := s.store.idempotencyResult(input.IdempotencyKey); ok {
		if existing.Document.Fingerprint != fingerprint {
			return Result{}, errors.New("idempotency key reused with different content")
		}
		existing.Replayed = true
		return existing, nil
	}

	if existing, ok := s.store.documentByFingerprint(input.OrganizationID, fingerprint); ok && !input.ForceReprocess {
		result, err := s.store.latestResult(existing.ID)
		if err != nil {
			return Result{}, err
		}
		result.DuplicateSource = true
		s.store.saveIdempotency(input.IdempotencyKey, result)
		return result, nil
	}

	result, err := s.store.create(input, fingerprint)
	if err != nil {
		return Result{}, err
	}
	s.store.saveIdempotency(input.IdempotencyKey, result)
	return result, nil
}

type MemoryStore struct {
	mu                   sync.RWMutex
	idempotencyByKey     map[string]Result
	documentByOrgHash    map[string]Document
	documentsByID        map[string]Document
	batchesByID          map[string]Batch
	versionsByDocument   map[string][]ExtractionVersion
	recordsByVersion     map[string][]SourceRecord
	sourceRecordIdentity map[string]SourceRecord
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		idempotencyByKey:     map[string]Result{},
		documentByOrgHash:    map[string]Document{},
		documentsByID:        map[string]Document{},
		batchesByID:          map[string]Batch{},
		versionsByDocument:   map[string][]ExtractionVersion{},
		recordsByVersion:     map[string][]SourceRecord{},
		sourceRecordIdentity: map[string]SourceRecord{},
	}
}

func (s *MemoryStore) idempotencyResult(key string) (Result, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result, ok := s.idempotencyByKey[key]
	return result, ok
}

func (s *MemoryStore) documentByFingerprint(orgID string, fingerprint string) (Document, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	doc, ok := s.documentByOrgHash[orgHashKey(orgID, fingerprint)]
	return doc, ok
}

func (s *MemoryStore) latestResult(documentID string) (Result, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	doc, ok := s.documentsByID[documentID]
	if !ok {
		return Result{}, errors.New("document not found")
	}
	versions := s.versionsByDocument[documentID]
	if len(versions) == 0 {
		return Result{}, errors.New("document has no extraction version")
	}
	version := versions[len(versions)-1]
	return Result{
		Batch:             s.batchesByID[doc.BatchID],
		Document:          doc,
		ExtractionVersion: version,
		SourceRecords:     append([]SourceRecord(nil), s.recordsByVersion[version.ID]...),
	}, nil
}

func (s *MemoryStore) saveIdempotency(key string, result Result) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.idempotencyByKey[key] = result
}

func (s *MemoryStore) create(input IngestInput, fingerprint string) (Result, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	duplicate, hasDuplicate := s.documentByOrgHash[orgHashKey(input.OrganizationID, fingerprint)]
	batch := Batch{
		ID:             newID("batch"),
		OrganizationID: input.OrganizationID,
		Status:         "received",
		CreatedAt:      now,
	}

	doc := duplicate
	reprocessed := false
	if hasDuplicate {
		reprocessed = true
	} else {
		doc = Document{
			ID:             newID("doc"),
			OrganizationID: input.OrganizationID,
			BatchID:        batch.ID,
			FileName:       input.FileName,
			ContentType:    input.ContentType,
			Fingerprint:    fingerprint,
			SizeBytes:      len(input.Content),
			CreatedAt:      now,
		}
		s.documentByOrgHash[orgHashKey(input.OrganizationID, fingerprint)] = doc
		s.documentsByID[doc.ID] = doc
	}

	versions := s.versionsByDocument[doc.ID]
	qualityFlags := qualityFlags(input, hasDuplicate)
	version := ExtractionVersion{
		ID:           newID("xver"),
		DocumentID:   doc.ID,
		Version:      len(versions) + 1,
		Extractor:    defaultString(input.Extractor, "manual-fixture"),
		QualityFlags: qualityFlags,
		CreatedAt:    now,
	}

	records, err := s.sourceRecords(input, doc.ID, version.ID, qualityFlags, now)
	if err != nil {
		return Result{}, err
	}

	s.batchesByID[batch.ID] = batch
	s.versionsByDocument[doc.ID] = append(versions, version)
	s.recordsByVersion[version.ID] = records
	return Result{
		Batch:             batch,
		Document:          doc,
		ExtractionVersion: version,
		SourceRecords:     records,
		DuplicateSource:   hasDuplicate,
		Reprocessed:       reprocessed,
	}, nil
}

func (s *MemoryStore) sourceRecords(input IngestInput, documentID string, versionID string, documentQuality []string, now time.Time) ([]SourceRecord, error) {
	records := make([]SourceRecord, 0, len(input.ExtractedRecords))
	for index, extracted := range input.ExtractedRecords {
		sourceID := extracted.SourceRecordID
		if sourceID == "" {
			sourceID = fmt.Sprintf("row-%d", index+1)
		}
		flags := recordQualityFlags(extracted, documentQuality)
		record := SourceRecord{
			ID:                  newID("src"),
			OrganizationID:      input.OrganizationID,
			DocumentID:          documentID,
			ExtractionVersionID: versionID,
			SourceRecordID:      sourceID,
			RecordType:          defaultString(extracted.RecordType, "unknown"),
			Fields:              cloneMap(extracted.Fields),
			FieldConfidences:    cloneFloatMap(extracted.FieldConfidences),
			Confidence:          extracted.Confidence,
			Warnings:            append([]string(nil), extracted.Warnings...),
			SourceLocation:      extracted.SourceLocation,
			QualityFlags:        flags,
			CreatedAt:           now,
		}
		identityKey := fmt.Sprintf("%s:%s:%s:%s", input.OrganizationID, documentID, record.RecordType, sourceID)
		if previous, exists := s.sourceRecordIdentity[identityKey]; exists && previous.ID != "" {
			record.QualityFlags = mergeFlags(record.QualityFlags, []string{QualityDuplicateRisk})
		}
		s.sourceRecordIdentity[identityKey] = record
		records = append(records, record)
	}
	return records, nil
}

func qualityFlags(input IngestInput, duplicate bool) []string {
	var flags []string
	if len(input.Content) == 0 {
		flags = append(flags, QualityMissingDoc, QualityIncomplete, QualityNeedsReview)
	}
	if duplicate {
		flags = append(flags, QualityDuplicateRisk)
	}
	if len(input.ExtractedRecords) == 0 {
		flags = append(flags, QualityIncomplete, QualityNeedsReview)
	}
	if len(flags) == 0 {
		flags = append(flags, QualityComplete)
	}
	return uniqueSorted(flags)
}

func recordQualityFlags(record ExtractedRecordInput, documentQuality []string) []string {
	flags := make([]string, 0, len(documentQuality)+2)
	for _, flag := range documentQuality {
		if flag != QualityComplete {
			flags = append(flags, flag)
		}
	}
	if record.Confidence > 0 && record.Confidence < 0.70 {
		flags = append(flags, QualityLowConfidence, QualityNeedsReview)
	}
	if record.SourceRecordID == "" {
		flags = append(flags, QualityIncomplete)
	}
	if len(record.Fields) == 0 {
		flags = append(flags, QualityIncomplete, QualityNeedsReview)
	}
	if len(record.Warnings) > 0 {
		flags = append(flags, QualityNeedsReview)
	}
	if len(flags) == 0 {
		flags = append(flags, QualityComplete)
	}
	return uniqueSorted(flags)
}

func mergeFlags(left []string, right []string) []string {
	merged := append([]string{}, left...)
	merged = append(merged, right...)
	return uniqueSorted(merged)
}

func uniqueSorted(flags []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, flag := range flags {
		if flag == "" || seen[flag] {
			continue
		}
		seen[flag] = true
		out = append(out, flag)
	}
	sort.Strings(out)
	return out
}

func orgHashKey(orgID string, fingerprint string) string {
	return orgID + ":" + fingerprint
}

func defaultString(value string, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func cloneMap(in map[string]string) map[string]string {
	out := map[string]string{}
	for key, value := range in {
		out[key] = value
	}
	return out
}

func cloneFloatMap(in map[string]float64) map[string]float64 {
	out := map[string]float64{}
	for key, value := range in {
		out[key] = value
	}
	return out
}

func newID(prefix string) string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return prefix + "_" + hex.EncodeToString(b[:])
}
