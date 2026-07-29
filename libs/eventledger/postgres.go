package eventledger

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/kora-finance/kora/libs/corrections"
	"github.com/kora-finance/kora/libs/evidence"
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
	return &PostgresStore{db: db}, nil
}

func (s *PostgresStore) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *PostgresStore) Append(event Event) (AppendResult, error) {
	if event.ID == "" {
		event.ID = newID("evt")
	}
	if event.Status == "" {
		event.Status = Active
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	if err := Validate(event); err != nil {
		return AppendResult{}, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return AppendResult{}, err
	}
	defer tx.Rollback()

	var exists bool
	err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM business_events WHERE id=$1)`, event.ID).Scan(&exists)
	if err != nil {
		return AppendResult{}, err
	}
	if exists {
		return AppendResult{}, errors.New("business event id already exists")
	}

	var existingID string
	err = tx.QueryRowContext(ctx,
		`SELECT business_event_id FROM event_provenance
		 WHERE organization_id=$1 AND document_id=$2 AND extraction_version_id=$3 AND source_record_reference=$4`,
		event.OrganizationID, event.Evidence.SourceDocumentID, event.Evidence.ExtractionVersionID, event.Evidence.SourceRecordID).Scan(&existingID)
	if err == nil {
		existing, err := s.getEventByID(ctx, existingID)
		if err != nil {
			return AppendResult{}, err
		}
		return AppendResult{Event: existing, Created: false}, nil
	}
	if err != sql.ErrNoRows {
		return AppendResult{}, err
	}

	relatedJSON, err := json.Marshal(handleNilMap(event.RelatedEntityIDs))
	if err != nil {
		return AppendResult{}, err
	}
	evidenceJSON, err := json.Marshal(event.Evidence)
	if err != nil {
		return AppendResult{}, err
	}
	attributesJSON, err := json.Marshal(handleNilMap(event.Attributes))
	if err != nil {
		return AppendResult{}, err
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO business_events (id, organization_id, event_type, status, external_party_id, account_id, source_entity_id, related_entity_ids, evidence, attributes, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		event.ID, event.OrganizationID, string(event.Type), string(event.Status),
		nullIfEmpty(event.ExternalPartyID), nullIfEmpty(event.AccountID), nullIfEmpty(event.SourceEntityID),
		relatedJSON, evidenceJSON, attributesJSON, event.CreatedAt)
	if err != nil {
		return AppendResult{}, fmt.Errorf("insert business event: %w", err)
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO event_provenance (business_event_id, organization_id, ingestion_batch_id, document_id, extraction_version_id, source_record_id, source_record_reference, source_page, source_row, source_sheet, confidence)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		event.ID, event.OrganizationID, event.Evidence.IngestionBatchID,
		event.Evidence.SourceDocumentID, event.Evidence.ExtractionVersionID,
		event.Evidence.SourceRecordDBID, event.Evidence.SourceRecordID,
		event.Evidence.SourcePage, event.Evidence.SourceRow, event.Evidence.SourceSheet,
		event.Evidence.ConfidenceScore)
	if err != nil {
		return AppendResult{}, fmt.Errorf("insert event provenance: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return AppendResult{}, fmt.Errorf("commit: %w", err)
	}
	return AppendResult{Event: event, Created: true}, nil
}

func (s *PostgresStore) AppendCorrection(correction corrections.Event) (corrections.Event, error) {
	if correction.ID == "" {
		correction.ID = newID("cor")
	}
	if correction.CreatedAt.IsZero() {
		correction.CreatedAt = time.Now().UTC()
	}
	if err := corrections.Validate(correction); err != nil {
		return corrections.Event{}, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return corrections.Event{}, err
	}
	defer tx.Rollback()

	var exists bool
	err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM correction_events WHERE id=$1)`, correction.ID).Scan(&exists)
	if err != nil {
		return corrections.Event{}, err
	}
	if exists {
		return corrections.Event{}, errors.New("correction event id already exists")
	}

	if correction.Type != corrections.EventCreated {
		var found bool
		err = tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM business_events WHERE id=$1 AND organization_id=$2)`,
			correction.OriginalEventID, correction.OrganizationID).Scan(&found)
		if err != nil {
			return corrections.Event{}, err
		}
		if !found {
			return corrections.Event{}, errors.New("original business event not found")
		}
	}

	if correction.Type == corrections.EventAdjusted {
		var found bool
		err = tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM business_events WHERE id=$1 AND organization_id=$2)`,
			correction.ReplacementEventID, correction.OrganizationID).Scan(&found)
		if err != nil {
			return corrections.Event{}, err
		}
		if !found {
			return corrections.Event{}, errors.New("replacement business event not found")
		}
	}

	if correction.Type == corrections.EventReversed {
		var statusExists bool
		err = tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM correction_events
			 WHERE organization_id=$1 AND original_event_id=$2 AND correction_type=$3)`,
			correction.OrganizationID, correction.OriginalEventID, corrections.EventReversed).Scan(&statusExists)
		if err != nil {
			return corrections.Event{}, err
		}
		if statusExists {
			return corrections.Event{}, errors.New("business event is already reversed")
		}
	}

	evidenceJSON, err := json.Marshal(correction.Evidence)
	if err != nil {
		return corrections.Event{}, err
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO correction_events (id, organization_id, correction_type, original_event_id, replacement_event_id, evidence, reason, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		correction.ID, correction.OrganizationID, string(correction.Type),
		nullIfEmpty(correction.OriginalEventID), nullIfEmpty(correction.ReplacementEventID),
		evidenceJSON, correction.Reason, correction.CreatedAt)
	if err != nil {
		return corrections.Event{}, fmt.Errorf("insert correction event: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return corrections.Event{}, fmt.Errorf("commit: %w", err)
	}
	return correction, nil
}

func (s *PostgresStore) Reverse(organizationID string, eventID string, proof evidence.Evidence, reason string) (corrections.Event, error) {
	return s.AppendCorrection(corrections.Event{
		OrganizationID:  organizationID,
		Type:            corrections.EventReversed,
		OriginalEventID: eventID,
		Evidence:        proof,
		Reason:          reason,
	})
}

func (s *PostgresStore) Get(organizationID string, eventID string) (EventView, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	event, err := s.getEventByID(ctx, eventID)
	if err != nil {
		return EventView{}, err
	}
	if event.OrganizationID != organizationID {
		return EventView{}, errors.New("business event not found")
	}

	corrections, err := s.getCorrectionsForEvent(ctx, organizationID, eventID)
	if err != nil {
		return EventView{}, err
	}

	return EventView{
		Event:           event,
		EffectiveStatus: effectiveStatus(corrections),
		Corrections:     corrections,
	}, nil
}

func (s *PostgresStore) List(organizationID string) []EventView {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, organization_id, event_type, status,
		        COALESCE(external_party_id,''), COALESCE(account_id,''), COALESCE(source_entity_id,''),
		        related_entity_ids, evidence, attributes, created_at
		 FROM business_events WHERE organization_id=$1 ORDER BY created_at, id`, organizationID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		event, err := scanEvent(rows)
		if err != nil {
			continue
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil
	}
	if len(events) == 0 {
		return nil
	}

	corrRows, err := s.db.QueryContext(ctx,
		`SELECT id, organization_id, correction_type, COALESCE(original_event_id,''),
		        COALESCE(replacement_event_id,''), evidence, reason, created_at
		 FROM correction_events WHERE organization_id=$1
		 ORDER BY original_event_id, created_at`, organizationID)
	var correctionsByEvent map[string][]corrections.Event
	if err == nil {
		defer corrRows.Close()
		correctionsByEvent = map[string][]corrections.Event{}
		for corrRows.Next() {
			var c corrections.Event
			var evidenceJSON []byte
			var origID, replID string
			var corrType string
			if err := corrRows.Scan(&c.ID, &c.OrganizationID, &corrType, &origID, &replID, &evidenceJSON, &c.Reason, &c.CreatedAt); err != nil {
				continue
			}
			c.Type = corrections.Type(corrType)
			c.OriginalEventID = origID
			c.ReplacementEventID = replID
			if err := json.Unmarshal(evidenceJSON, &c.Evidence); err != nil {
				continue
			}
			correctionsByEvent[origID] = append(correctionsByEvent[origID], c)
		}
	}

	views := make([]EventView, 0, len(events))
	for _, event := range events {
		corrs := correctionsByEvent[event.ID]
		if corrs == nil {
			corrs = []corrections.Event{}
		}
		views = append(views, EventView{
			Event:           event,
			EffectiveStatus: effectiveStatus(corrs),
			Corrections:     corrs,
		})
	}
	return views
}

func (s *PostgresStore) getEventByID(ctx context.Context, eventID string) (Event, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT id, organization_id, event_type, status,
		        COALESCE(external_party_id,''), COALESCE(account_id,''), COALESCE(source_entity_id,''),
		        related_entity_ids, evidence, attributes, created_at
		 FROM business_events WHERE id=$1`, eventID)
	return scanEvent(row)
}

func (s *PostgresStore) getCorrectionsForEvent(ctx context.Context, organizationID string, eventID string) ([]corrections.Event, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, organization_id, correction_type, COALESCE(original_event_id,''),
		        COALESCE(replacement_event_id,''), evidence, reason, created_at
		 FROM correction_events WHERE organization_id=$1 AND original_event_id=$2
		 ORDER BY created_at`, organizationID, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var corrs []corrections.Event
	for rows.Next() {
		var c corrections.Event
		var evidenceJSON []byte
		var origID, replID string
		var corrType string
		if err := rows.Scan(&c.ID, &c.OrganizationID, &corrType, &origID, &replID, &evidenceJSON, &c.Reason, &c.CreatedAt); err != nil {
			return nil, err
		}
		c.Type = corrections.Type(corrType)
		c.OriginalEventID = origID
		c.ReplacementEventID = replID
		if err := json.Unmarshal(evidenceJSON, &c.Evidence); err != nil {
			return nil, err
		}
		corrs = append(corrs, c)
	}
	return corrs, rows.Err()
}

type scanner interface {
	Scan(dest ...any) error
}

func scanEvent(row scanner) (Event, error) {
	var (
		event       Event
		eventType   string
		status      string
		relatedJSON []byte
		evidenceJSON []byte
		attrsJSON   []byte
	)
	err := row.Scan(
		&event.ID, &event.OrganizationID, &eventType, &status,
		&event.ExternalPartyID, &event.AccountID, &event.SourceEntityID,
		&relatedJSON, &evidenceJSON, &attrsJSON, &event.CreatedAt,
	)
	if err != nil {
		return Event{}, err
	}

	event.Type = EventType(eventType)
	event.Status = Status(status)

	if err := json.Unmarshal(relatedJSON, &event.RelatedEntityIDs); err != nil {
		event.RelatedEntityIDs = map[string]string{}
	}
	if err := json.Unmarshal(evidenceJSON, &event.Evidence); err != nil {
		return Event{}, err
	}
	if err := json.Unmarshal(attrsJSON, &event.Attributes); err != nil {
		event.Attributes = map[string]string{}
	}

	return event, nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func handleNilMap(m map[string]string) map[string]string {
	if m == nil {
		return map[string]string{}
	}
	return m
}
