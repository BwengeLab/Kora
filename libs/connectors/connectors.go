package connectors

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/ingestion"
	"github.com/kora-finance/kora/libs/normalization"
)

type Kind string

const (
	MoMo          Kind = "MOMO"
	EBMRRA        Kind = "EBM_RRA"
	BankStatement Kind = "BANK_STATEMENT"
	Accounting    Kind = "ACCOUNTING"
	EmailSMS      Kind = "EMAIL_SMS"
)

type Connection struct {
	ID             string            `json:"id"`
	OrganizationID string            `json:"organization_id"`
	Kind           Kind              `json:"kind"`
	DisplayName    string            `json:"display_name"`
	SecretRef      string            `json:"secret_ref"`
	Config         map[string]string `json:"config"`
	Active         bool              `json:"active"`
	CreatedAt      time.Time         `json:"created_at"`
}

type Record struct {
	SourceRecordID string                   `json:"source_record_id"`
	RecordType     string                   `json:"record_type"`
	Fields         map[string]string        `json:"fields"`
	Confidence     float64                  `json:"confidence"`
	Warnings       []string                 `json:"warnings"`
	Location       ingestion.SourceLocation `json:"location"`
}

type ImportInput struct {
	OrganizationID string   `json:"organization_id"`
	ConnectionID   string   `json:"connection_id"`
	Kind           Kind     `json:"kind"`
	SourceName     string   `json:"source_name"`
	WindowStart    string   `json:"window_start"`
	WindowEnd      string   `json:"window_end"`
	SyncCursor     string   `json:"sync_cursor"`
	IdempotencyKey string   `json:"idempotency_key"`
	Records        []Record `json:"records"`
}

type ImportedEvent struct {
	SourceRecordID string `json:"source_record_id"`
	EventID        string `json:"event_id"`
	Created        bool   `json:"created"`
}

type ImportResult struct {
	BatchID           string          `json:"batch_id"`
	DocumentID        string          `json:"document_id"`
	ExtractionVersion string          `json:"extraction_version_id"`
	Fingerprint       string          `json:"fingerprint"`
	Replayed          bool            `json:"replayed"`
	DuplicateSource   bool            `json:"duplicate_source"`
	NormalizedEvents  []ImportedEvent `json:"normalized_events"`
}

type Service struct {
	ingestion     *ingestion.Service
	normalization *normalization.Service
}

func NewService(ingestionService *ingestion.Service, normalizationService *normalization.Service) *Service {
	return &Service{ingestion: ingestionService, normalization: normalizationService}
}

func ValidateConnection(actor access.Actor, connection Connection) error {
	if err := access.Authorize(actor, access.Resource{OrganizationID: connection.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		return err
	}
	if connection.OrganizationID == "" || connection.ID == "" || strings.TrimSpace(connection.DisplayName) == "" || !validKind(connection.Kind) {
		return errors.New("connection requires organization, id, display name, and supported kind")
	}
	if !connection.Active {
		return errors.New("connection must be active before import")
	}
	if strings.TrimSpace(connection.SecretRef) == "" {
		return errors.New("integration credentials must be stored by secret reference")
	}
	for key, value := range connection.Config {
		lowerKey := strings.ToLower(key)
		if strings.Contains(lowerKey, "secret") || strings.Contains(lowerKey, "token") || strings.Contains(lowerKey, "password") || strings.Contains(lowerKey, "key") {
			if strings.TrimSpace(value) != "" {
				return errors.New("raw integration credentials cannot be stored in connector config")
			}
		}
	}
	return nil
}

func (s *Service) Import(actor access.Actor, connection Connection, input ImportInput) (ImportResult, error) {
	if s.ingestion == nil || s.normalization == nil {
		return ImportResult{}, errors.New("connector service requires ingestion and normalization services")
	}
	if err := ValidateConnection(actor, connection); err != nil {
		return ImportResult{}, err
	}
	if err := validateInput(connection, input); err != nil {
		return ImportResult{}, err
	}
	extracted := make([]ingestion.ExtractedRecordInput, 0, len(input.Records))
	for index, record := range input.Records {
		extracted = append(extracted, toExtracted(input, record, index))
	}
	content := canonicalContent(input)
	result, err := s.ingestion.Ingest(ingestion.IngestInput{
		OrganizationID:   input.OrganizationID,
		IdempotencyKey:   input.IdempotencyKey,
		FileName:         fileName(input),
		ContentType:      "application/vnd.kora.connector+json",
		Content:          content,
		Extractor:        "connector:" + strings.ToLower(string(input.Kind)),
		ExtractedRecords: extracted,
	})
	if err != nil {
		return ImportResult{}, err
	}
	out := ImportResult{BatchID: result.Batch.ID, DocumentID: result.Document.ID, ExtractionVersion: result.ExtractionVersion.ID, Fingerprint: result.Document.Fingerprint, Replayed: result.Replayed, DuplicateSource: result.DuplicateSource}
	for _, source := range result.SourceRecords {
		normalized, err := s.normalization.Normalize(normalization.Input{IngestionBatchID: result.Batch.ID, Record: source})
		if err != nil {
			return ImportResult{}, err
		}
		out.NormalizedEvents = append(out.NormalizedEvents, ImportedEvent{SourceRecordID: source.SourceRecordID, EventID: normalized.Event.ID, Created: normalized.Created})
	}
	sort.SliceStable(out.NormalizedEvents, func(i, j int) bool {
		return out.NormalizedEvents[i].SourceRecordID < out.NormalizedEvents[j].SourceRecordID
	})
	return out, nil
}

func validateInput(connection Connection, input ImportInput) error {
	if input.OrganizationID == "" || input.OrganizationID != connection.OrganizationID || input.ConnectionID != connection.ID || input.Kind != connection.Kind {
		return errors.New("connector import must match the active connection and tenant")
	}
	if input.IdempotencyKey == "" {
		return errors.New("connector import idempotency key is required")
	}
	if input.SourceName == "" || len(input.Records) == 0 {
		return errors.New("connector import requires source name and at least one record")
	}
	ids := map[string]bool{}
	for _, record := range input.Records {
		if record.SourceRecordID == "" || record.RecordType == "" || record.Confidence <= 0 || record.Confidence > 1 {
			return errors.New("connector records require stable source id, type, and confidence")
		}
		if ids[record.SourceRecordID] {
			return fmt.Errorf("duplicate connector source record id %s", record.SourceRecordID)
		}
		ids[record.SourceRecordID] = true
		if _, ok := record.Fields["reference"]; !ok {
			return errors.New("connector records require a reference field")
		}
		if _, ok := record.Fields["date"]; !ok {
			return errors.New("connector records require a date field")
		}
		if _, ok := record.Fields["amount"]; !ok && strings.ToLower(record.RecordType) != "contract" {
			return errors.New("connector records require amount except contracts")
		}
		if _, ok := record.Fields["currency"]; !ok && strings.ToLower(record.RecordType) != "contract" {
			return errors.New("connector records require currency except contracts")
		}
	}
	return nil
}

func toExtracted(input ImportInput, record Record, index int) ingestion.ExtractedRecordInput {
	fields := cloneMap(record.Fields)
	fields["source_system"] = string(input.Kind)
	fields["connector_connection_id"] = input.ConnectionID
	fields["connector_source_record_id"] = record.SourceRecordID
	fields["connector_sync_cursor"] = input.SyncCursor
	fields["dedupe_key"] = dedupeKey(input, record)
	location := record.Location
	if location.RowNumber == 0 {
		location.RowNumber = index + 1
	}
	return ingestion.ExtractedRecordInput{SourceRecordID: stableSourceRecordID(input, record), RecordType: record.RecordType, Fields: fields, Confidence: record.Confidence, Warnings: append([]string(nil), record.Warnings...), SourceLocation: location}
}

func canonicalContent(input ImportInput) []byte {
	type canonicalRecord struct {
		ID     string            `json:"id"`
		Type   string            `json:"type"`
		Fields map[string]string `json:"fields"`
	}
	records := make([]canonicalRecord, 0, len(input.Records))
	for _, record := range input.Records {
		records = append(records, canonicalRecord{ID: record.SourceRecordID, Type: strings.ToLower(record.RecordType), Fields: cloneMap(record.Fields)})
	}
	sort.SliceStable(records, func(i, j int) bool { return records[i].ID < records[j].ID })
	payload := map[string]any{"kind": input.Kind, "connection_id": input.ConnectionID, "source": input.SourceName, "window_start": input.WindowStart, "window_end": input.WindowEnd, "records": records}
	encoded, err := json.Marshal(payload)
	if err != nil {
		panic(err)
	}
	return encoded
}

func dedupeKey(input ImportInput, record Record) string {
	parts := []string{input.OrganizationID, string(input.Kind), input.ConnectionID, record.SourceRecordID, record.RecordType, record.Fields["reference"], record.Fields["date"], record.Fields["amount"], record.Fields["currency"]}
	encoded, err := json.Marshal(parts)
	if err != nil {
		panic(err)
	}
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func stableSourceRecordID(input ImportInput, record Record) string {
	return strings.ToLower(string(input.Kind)) + ":" + input.ConnectionID + ":" + record.SourceRecordID
}

func fileName(input ImportInput) string {
	return strings.ToLower(string(input.Kind)) + "-" + input.ConnectionID + "-" + strings.ReplaceAll(input.WindowEnd, ":", "-") + ".json"
}

func validKind(kind Kind) bool {
	switch kind {
	case MoMo, EBMRRA, BankStatement, Accounting, EmailSMS:
		return true
	default:
		return false
	}
}

func cloneMap(input map[string]string) map[string]string {
	out := map[string]string{}
	for key, value := range input {
		out[key] = value
	}
	return out
}
