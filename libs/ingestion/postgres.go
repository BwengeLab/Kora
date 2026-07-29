package ingestion

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(databaseURL string) (*PostgresStore, error) {
	if databaseURL == "" {
		return nil, errors.New("database url is required")
	}
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	store := &PostgresStore{db: db}
	return store, nil
}

func (s *PostgresStore) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *PostgresStore) IdempotencyResult(key string) (Result, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var (
		orgID      string
		fingerprint string
		resultType string
		resultID   string
		responseJSON []byte
	)
	err := s.db.QueryRowContext(ctx,
		`SELECT organization_id, fingerprint, result_type, result_id, response
		 FROM idempotency_records WHERE key = $1`, key).
		Scan(&orgID, &fingerprint, &resultType, &resultID, &responseJSON)
	if err == sql.ErrNoRows {
		return Result{}, false
	}
	if err != nil {
		return Result{}, false
	}
	var result Result
	if err := json.Unmarshal(responseJSON, &result); err != nil {
		return Result{}, false
	}
	return result, true
}

func (s *PostgresStore) DocumentByFingerprint(orgID string, fingerprint string) (Document, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var (
		doc              Document
		duplicateOfID    sql.NullString
		contentType      sql.NullString
		sizeBytes        sql.NullInt64
	)
	err := s.db.QueryRowContext(ctx,
		`SELECT id, organization_id, batch_id, file_name, COALESCE(content_type,''), COALESCE(object_key,''),
		        fingerprint, COALESCE(size_bytes,0), duplicate_of_document_id, created_at
		 FROM documents WHERE organization_id = $1 AND fingerprint = $2`, orgID, fingerprint).
		Scan(&doc.ID, &doc.OrganizationID, &doc.BatchID, &doc.FileName,
			&contentType, &doc.ObjectKey, &doc.Fingerprint, &sizeBytes,
			&duplicateOfID, &doc.CreatedAt)
	if err == sql.ErrNoRows {
		return Document{}, false
	}
	if err != nil {
		return Document{}, false
	}
	doc.ContentType = contentType.String
	doc.SizeBytes = int(sizeBytes.Int64)
	if duplicateOfID.Valid {
		doc.DuplicateOfDocumentID = duplicateOfID.String
	}
	return doc, true
}

func (s *PostgresStore) LatestResult(documentID string) (Result, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var doc Document
	var contentType sql.NullString
	var sizeBytes sql.NullInt64
	var duplicateOfID sql.NullString
	err := s.db.QueryRowContext(ctx,
		`SELECT id, organization_id, batch_id, file_name, COALESCE(content_type,''), COALESCE(object_key,''),
		        fingerprint, COALESCE(size_bytes,0), duplicate_of_document_id, created_at
		 FROM documents WHERE id = $1`, documentID).
		Scan(&doc.ID, &doc.OrganizationID, &doc.BatchID, &doc.FileName,
			&contentType, &doc.ObjectKey, &doc.Fingerprint, &sizeBytes,
			&duplicateOfID, &doc.CreatedAt)
	if err == sql.ErrNoRows {
		return Result{}, errors.New("document not found")
	}
	if err != nil {
		return Result{}, err
	}
	doc.ContentType = contentType.String
	doc.SizeBytes = int(sizeBytes.Int64)
	if duplicateOfID.Valid {
		doc.DuplicateOfDocumentID = duplicateOfID.String
	}

	var batch Batch
	err = s.db.QueryRowContext(ctx,
		`SELECT id, organization_id, status, created_at FROM ingestion_batches WHERE id = $1`, doc.BatchID).
		Scan(&batch.ID, &batch.OrganizationID, &batch.Status, &batch.CreatedAt)
	if err != nil {
		return Result{}, errors.New("batch not found")
	}

	var version ExtractionVersion
	err = s.db.QueryRowContext(ctx,
		`SELECT id, document_id, version, extractor, quality_flags, created_at
		 FROM extraction_versions WHERE document_id = $1 ORDER BY version DESC LIMIT 1`, documentID).
		Scan(&version.ID, &version.DocumentID, &version.Version, &version.Extractor,
			&version.QualityFlags, &version.CreatedAt)
	if err != nil {
		return Result{}, errors.New("document has no extraction version")
	}

	records, err := s.sourceRecordsByVersion(ctx, version.ID)
	if err != nil {
		return Result{}, err
	}

	return Result{
		Batch:             batch,
		Document:          doc,
		ExtractionVersion: version,
		SourceRecords:     records,
	}, nil
}

func (s *PostgresStore) SaveIdempotency(key string, result Result) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	responseJSON, err := json.Marshal(result)
	if err != nil {
		return
	}
	_, _ = s.db.ExecContext(ctx,
		`INSERT INTO idempotency_records (key, organization_id, fingerprint, result_type, result_id, response, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (key) DO NOTHING`,
		key, result.Document.OrganizationID, result.Document.Fingerprint,
		"document", result.Document.ID, responseJSON, time.Now().UTC())
}

func (s *PostgresStore) Create(input IngestInput, fingerprint string) (Result, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Result{}, err
	}
	defer tx.Rollback()

	now := time.Now().UTC()

	var duplicateOfID *string
	var existingDocID string
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM documents WHERE organization_id = $1 AND fingerprint = $2`, input.OrganizationID, fingerprint).
		Scan(&existingDocID)
	if err == nil {
		duplicateOfID = &existingDocID
	}

	batchID := newID("batch")
	_, err = tx.ExecContext(ctx,
		`INSERT INTO ingestion_batches (id, organization_id, status, created_at) VALUES ($1, $2, $3, $4)`,
		batchID, input.OrganizationID, "received", now)
	if err != nil {
		return Result{}, fmt.Errorf("insert batch: %w", err)
	}

	docID := newID("doc")
	_, err = tx.ExecContext(ctx,
		`INSERT INTO documents (id, organization_id, batch_id, file_name, content_type, object_key, fingerprint, size_bytes, duplicate_of_document_id, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (organization_id, fingerprint) DO NOTHING`,
		docID, input.OrganizationID, batchID, input.FileName, input.ContentType,
		"", fingerprint, len(input.Content), duplicateOfID, now)
	if err != nil {
		return Result{}, fmt.Errorf("insert document: %w", err)
	}

	hasDuplicate := duplicateOfID != nil
	qualityFlags := qualityFlags(input, hasDuplicate)
	versionID := newID("xver")
	extractor := input.Extractor
	if extractor == "" {
		extractor = "manual-fixture"
	}
	_, err = tx.ExecContext(ctx,
		`INSERT INTO extraction_versions (id, organization_id, document_id, version, extractor, quality_flags, created_at)
		 VALUES ($1, $2, $3, (SELECT COALESCE(MAX(version),0) + 1 FROM extraction_versions WHERE document_id = $3), $4, $5, $6)`,
		versionID, input.OrganizationID, docID, extractor, qualityFlags, now)
	if err != nil {
		return Result{}, fmt.Errorf("insert extraction version: %w", err)
	}

	records, err := s.insertSourceRecords(tx, ctx, input, docID, versionID, qualityFlags, now)
	if err != nil {
		return Result{}, err
	}

	if err := tx.Commit(); err != nil {
		return Result{}, fmt.Errorf("commit transaction: %w", err)
	}

	reprocessed := false
	doc := Document{
		ID:                    docID,
		OrganizationID:        input.OrganizationID,
		BatchID:               batchID,
		FileName:              input.FileName,
		ContentType:           input.ContentType,
		Fingerprint:           fingerprint,
		SizeBytes:             len(input.Content),
		DuplicateOfDocumentID: duplicateOfIDString(duplicateOfID),
		CreatedAt:             now,
	}
	version := ExtractionVersion{
		ID:           versionID,
		DocumentID:   docID,
		Extractor:    extractor,
		QualityFlags: qualityFlags,
		CreatedAt:    now,
	}
	batch := Batch{
		ID:             batchID,
		OrganizationID: input.OrganizationID,
		Status:         "received",
		CreatedAt:      now,
	}

	return Result{
		Batch:             batch,
		Document:          doc,
		ExtractionVersion: version,
		SourceRecords:     records,
		DuplicateSource:   hasDuplicate,
		Reprocessed:       reprocessed,
	}, nil
}

func (s *PostgresStore) ListDocuments(orgID string) ([]Document, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, organization_id, batch_id, file_name, COALESCE(content_type,''), COALESCE(object_key,''),
		        fingerprint, COALESCE(size_bytes,0), duplicate_of_document_id, created_at
		 FROM documents WHERE organization_id = $1 ORDER BY created_at DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []Document
	for rows.Next() {
		var doc Document
		var contentType, objectKey sql.NullString
		var sizeBytes sql.NullInt64
		var duplicateOfID sql.NullString
		if err := rows.Scan(&doc.ID, &doc.OrganizationID, &doc.BatchID, &doc.FileName,
			&contentType, &objectKey, &doc.Fingerprint, &sizeBytes, &duplicateOfID, &doc.CreatedAt); err != nil {
			return nil, err
		}
		doc.ContentType = contentType.String
		doc.ObjectKey = objectKey.String
		doc.SizeBytes = int(sizeBytes.Int64)
		if duplicateOfID.Valid {
			doc.DuplicateOfDocumentID = duplicateOfID.String
		}
		docs = append(docs, doc)
	}
	return docs, rows.Err()
}

func (s *PostgresStore) ListBatches(orgID string) ([]Batch, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, organization_id, status, created_at FROM ingestion_batches WHERE organization_id = $1 ORDER BY created_at DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var batches []Batch
	for rows.Next() {
		var batch Batch
		if err := rows.Scan(&batch.ID, &batch.OrganizationID, &batch.Status, &batch.CreatedAt); err != nil {
			return nil, err
		}
		batches = append(batches, batch)
	}
	return batches, rows.Err()
}

func (s *PostgresStore) sourceRecordsByVersion(ctx context.Context, versionID string) ([]SourceRecord, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, organization_id, document_id, extraction_version_id, source_record_id,
		        record_type, fields, field_confidences, confidence, warnings,
		        source_page, source_row, source_sheet, quality_flags, created_at
		 FROM source_records WHERE extraction_version_id = $1`, versionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []SourceRecord
	for rows.Next() {
		var (
			rec              SourceRecord
			fieldsJSON       []byte
			confidencesJSON  []byte
			warnings         []string
			sourcePage       int
			sourceRow        int
			sourceSheet      string
		)
		if err := rows.Scan(&rec.ID, &rec.OrganizationID, &rec.DocumentID, &rec.ExtractionVersionID,
			&rec.SourceRecordID, &rec.RecordType, &fieldsJSON, &confidencesJSON,
			&rec.Confidence, &warnings, &sourcePage, &sourceRow, &sourceSheet,
			&rec.QualityFlags, &rec.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(fieldsJSON, &rec.Fields); err != nil {
			rec.Fields = map[string]string{}
		}
		if err := json.Unmarshal(confidencesJSON, &rec.FieldConfidences); err != nil {
			rec.FieldConfidences = map[string]float64{}
		}
		rec.Warnings = warnings
		rec.SourceLocation = SourceLocation{
			PageNumber: sourcePage,
			RowNumber:  sourceRow,
			SheetName:  sourceSheet,
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}

func (s *PostgresStore) insertSourceRecords(tx *sql.Tx, ctx context.Context, input IngestInput, documentID, versionID string, documentQuality []string, now time.Time) ([]SourceRecord, error) {
	identityKeys := map[string]bool{}
	var records []SourceRecord

	for index, extracted := range input.ExtractedRecords {
		sourceID := extracted.SourceRecordID
		if sourceID == "" {
			sourceID = fmt.Sprintf("row-%d", index+1)
		}
		flags := recordQualityFlags(extracted, documentQuality)

		recID := newID("src")
		fieldsJSON, _ := json.Marshal(extracted.Fields)
		confidencesJSON, _ := json.Marshal(extracted.FieldConfidences)

		warnings := extracted.Warnings
		if warnings == nil {
			warnings = []string{}
		}

		_, err := tx.ExecContext(ctx,
			`INSERT INTO source_records (id, organization_id, document_id, extraction_version_id, source_record_id,
			 record_type, fields, field_confidences, confidence, warnings,
			 source_page, source_row, source_sheet, quality_flags, created_at)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
			recID, input.OrganizationID, documentID, versionID, sourceID,
			defaultString(extracted.RecordType, "unknown"), fieldsJSON, confidencesJSON,
			extracted.Confidence, warnings,
			extracted.SourceLocation.PageNumber, extracted.SourceLocation.RowNumber,
			extracted.SourceLocation.SheetName, flags, now)
		if err != nil {
			return nil, fmt.Errorf("insert source record: %w", err)
		}

		identityKey := fmt.Sprintf("%s:%s:%s:%s", input.OrganizationID, documentID, extracted.RecordType, sourceID)
		if identityKeys[identityKey] {
			flags = append(flags, QualityDuplicateRisk)
			sort.Strings(flags)
			_, _ = tx.ExecContext(ctx,
				`UPDATE source_records SET quality_flags = $1 WHERE id = $2`, flags, recID)
		}
		identityKeys[identityKey] = true

		records = append(records, SourceRecord{
			ID:                  recID,
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
		})
	}
	return records, nil
}

func duplicateOfIDString(id *string) string {
	if id == nil {
		return ""
	}
	return *id
}

func isPGUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "duplicate key") || strings.Contains(msg, "23505")
}
