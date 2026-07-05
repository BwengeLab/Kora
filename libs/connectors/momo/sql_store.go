package momo

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type SQLStore struct {
	db *sql.DB
}

func NewSQLStore(databaseURL string) (*SQLStore, error) {
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
	store := &SQLStore{db: db}
	if err := store.ensureSchema(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func NewSQLStoreFromDB(db *sql.DB) (*SQLStore, error) {
	if db == nil {
		return nil, errors.New("db is required")
	}
	store := &SQLStore{db: db}
	if err := store.ensureSchema(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *SQLStore) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *SQLStore) Create(request Request) (Request, error) {
	if request.OrganizationID == "" || request.ReferenceID == "" {
		return Request{}, errors.New("organization and reference are required")
	}
	if request.State != RequestReceived && (request.Amount == "" || request.Currency == "") {
		return Request{}, errors.New("amount and currency are required")
	}
	if request.State == "" {
		request.State = RequestPending
	}
	if request.RequestedAt.IsZero() {
		request.RequestedAt = time.Now().UTC()
	}
	if request.ID == "" {
		request.ID = newID("momo_req")
	}
	query := `
INSERT INTO momo_requests(
 id, organization_id, connection_id, reference_id, external_id, amount, currency,
 payer_msisdn, payer_name, payer_message, payee_note, request_state,
 financial_transaction_id, reason, collection_class, requested_at, last_provider_at
) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`
	if _, err := s.db.ExecContext(context.Background(), query,
		request.ID, request.OrganizationID, request.ConnectionID, request.ReferenceID, request.ExternalID, request.Amount, request.Currency,
		request.PayerMSISDN, request.PayerName, request.PayerMessage, request.PayeeNote, string(request.State),
		request.FinancialTxnID, request.Reason, request.CollectionClass, request.RequestedAt, nullableTime(request.LastProviderAt),
	); err != nil {
		return Request{}, err
	}
	event := RequestEvent{
		ID:             newID("momo_evt"),
		RequestID:      request.ID,
		OrganizationID: request.OrganizationID,
		ReferenceID:    request.ReferenceID,
		From:           "",
		To:             request.State,
		OccurredAt:     request.RequestedAt,
	}
	if err := s.insertEvent(event); err != nil {
		return Request{}, err
	}
	return request, nil
}

func (s *SQLStore) GetByReference(organizationID string, referenceID string) (Request, error) {
	query := `
SELECT id, organization_id, connection_id, reference_id, external_id, amount, currency,
 payer_msisdn, payer_name, payer_message, payee_note, request_state,
 financial_transaction_id, reason, requested_at, last_provider_at, collection_class
FROM momo_requests
WHERE organization_id = $1 AND reference_id = $2`
	var request Request
	var state string
	var lastProvider sql.NullTime
	err := s.db.QueryRowContext(context.Background(), query, organizationID, referenceID).Scan(
		&request.ID, &request.OrganizationID, &request.ConnectionID, &request.ReferenceID, &request.ExternalID, &request.Amount, &request.Currency,
		&request.PayerMSISDN, &request.PayerName, &request.PayerMessage, &request.PayeeNote, &state,
		&request.FinancialTxnID, &request.Reason, &request.RequestedAt, &lastProvider, &request.CollectionClass,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Request{}, errors.New("momo request not found")
		}
		return Request{}, err
	}
	request.State = RequestState(state)
	if lastProvider.Valid {
		request.LastProviderAt = lastProvider.Time
	}
	if latest, err := s.latestEvent(request.ID); err == nil {
		request.State = latest.To
		if latest.FinancialTxnID != "" {
			request.FinancialTxnID = latest.FinancialTxnID
		}
		if latest.Reason != "" {
			request.Reason = latest.Reason
		}
		request.LastProviderAt = latest.OccurredAt
	}
	return request, nil
}

func (s *SQLStore) UpdateFromProvider(organizationID string, referenceID string, update RequestEvent) (Request, error) {
	request, err := s.GetByReference(organizationID, referenceID)
	if err != nil {
		return Request{}, err
	}
	update.ID = newID("momo_evt")
	update.RequestID = request.ID
	update.OrganizationID = organizationID
	update.ReferenceID = referenceID
	update.From = request.State
	if update.To == "" {
		update.To = request.State
	}
	if update.OccurredAt.IsZero() {
		update.OccurredAt = time.Now().UTC()
	}
	if err := s.insertEvent(update); err != nil {
		return Request{}, err
	}
	return s.GetByReference(organizationID, referenceID)
}

func (s *SQLStore) SaveOrUpdateFromCallback(seed Request, update RequestEvent) (Request, error) {
	if _, err := s.GetByReference(seed.OrganizationID, seed.ReferenceID); err == nil {
		return s.UpdateFromProvider(seed.OrganizationID, seed.ReferenceID, update)
	}
	if seed.State == "" {
		seed.State = RequestReceived
	}
	created, err := s.Create(seed)
	if err != nil {
		return Request{}, err
	}
	return s.UpdateFromProvider(created.OrganizationID, created.ReferenceID, update)
}

func (s *SQLStore) History(organizationID string, referenceID string) ([]RequestEvent, error) {
	request, err := s.GetByReference(organizationID, referenceID)
	if err != nil {
		return nil, err
	}
	query := `
SELECT id, request_id, organization_id, reference_id, from_state, to_state,
 financial_transaction_id, reason, raw_provider_payload, occurred_at
FROM momo_request_events
WHERE request_id = $1
ORDER BY occurred_at ASC, id ASC`
	rows, err := s.db.QueryContext(context.Background(), query, request.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var events []RequestEvent
	for rows.Next() {
		var event RequestEvent
		var fromState, toState string
		var raw []byte
		if err := rows.Scan(&event.ID, &event.RequestID, &event.OrganizationID, &event.ReferenceID, &fromState, &toState, &event.FinancialTxnID, &event.Reason, &raw, &event.OccurredAt); err != nil {
			return nil, err
		}
		event.From = RequestState(fromState)
		event.To = RequestState(toState)
		if len(raw) > 0 && string(raw) != "null" {
			_ = json.Unmarshal(raw, &event.RawProviderPayload)
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

func (s *SQLStore) List(filter ListFilter) []Request {
	query := `
SELECT id, organization_id, connection_id, reference_id, external_id, amount, currency,
 payer_msisdn, payer_name, payer_message, payee_note, request_state,
 financial_transaction_id, reason, requested_at, last_provider_at, collection_class
FROM momo_requests
WHERE organization_id = $1`
	rows, err := s.db.QueryContext(context.Background(), query, filter.OrganizationID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	stateSet := map[RequestState]bool{}
	for _, state := range filter.States {
		stateSet[state] = true
	}
	var requests []Request
	for rows.Next() {
		var request Request
		var state string
		var lastProvider sql.NullTime
		if err := rows.Scan(
			&request.ID, &request.OrganizationID, &request.ConnectionID, &request.ReferenceID, &request.ExternalID, &request.Amount, &request.Currency,
			&request.PayerMSISDN, &request.PayerName, &request.PayerMessage, &request.PayeeNote, &state,
			&request.FinancialTxnID, &request.Reason, &request.RequestedAt, &lastProvider, &request.CollectionClass,
		); err != nil {
			return nil
		}
		request.State = RequestState(state)
		if latest, err := s.latestEvent(request.ID); err == nil {
			request.State = latest.To
			if latest.FinancialTxnID != "" {
				request.FinancialTxnID = latest.FinancialTxnID
			}
			if latest.Reason != "" {
				request.Reason = latest.Reason
			}
			request.LastProviderAt = latest.OccurredAt
		} else if lastProvider.Valid {
			request.LastProviderAt = lastProvider.Time
		}
		if len(stateSet) > 0 && !stateSet[request.State] {
			continue
		}
		requests = append(requests, request)
	}
	slices.SortFunc(requests, func(a, b Request) int {
		if a.RequestedAt.Before(b.RequestedAt) {
			return -1
		}
		if a.RequestedAt.After(b.RequestedAt) {
			return 1
		}
		if a.ReferenceID < b.ReferenceID {
			return -1
		}
		if a.ReferenceID > b.ReferenceID {
			return 1
		}
		return 0
	})
	return requests
}

func (s *SQLStore) latestEvent(requestID string) (RequestEvent, error) {
	query := `
SELECT id, request_id, organization_id, reference_id, from_state, to_state,
 financial_transaction_id, reason, raw_provider_payload, occurred_at
FROM momo_request_events
WHERE request_id = $1
ORDER BY occurred_at DESC, id DESC
LIMIT 1`
	var event RequestEvent
	var fromState, toState string
	var raw []byte
	err := s.db.QueryRowContext(context.Background(), query, requestID).Scan(
		&event.ID, &event.RequestID, &event.OrganizationID, &event.ReferenceID, &fromState, &toState,
		&event.FinancialTxnID, &event.Reason, &raw, &event.OccurredAt,
	)
	if err != nil {
		return RequestEvent{}, err
	}
	event.From = RequestState(fromState)
	event.To = RequestState(toState)
	if len(raw) > 0 && string(raw) != "null" {
		_ = json.Unmarshal(raw, &event.RawProviderPayload)
	}
	return event, nil
}

func (s *SQLStore) insertEvent(event RequestEvent) error {
	rawPayload, err := json.Marshal(event.RawProviderPayload)
	if err != nil {
		return err
	}
	query := `
INSERT INTO momo_request_events(
 id, request_id, organization_id, reference_id, from_state, to_state,
 financial_transaction_id, reason, raw_provider_payload, occurred_at
) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`
	_, err = s.db.ExecContext(context.Background(), query,
		event.ID, event.RequestID, event.OrganizationID, event.ReferenceID, string(event.From), string(event.To),
		event.FinancialTxnID, event.Reason, rawPayload, event.OccurredAt,
	)
	return err
}

func nullableTime(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value
}

func (s *SQLStore) ensureSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS momo_requests (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL,
			connection_id TEXT NOT NULL,
			reference_id TEXT NOT NULL,
			external_id TEXT NOT NULL DEFAULT '',
			amount TEXT NOT NULL DEFAULT '',
			currency TEXT NOT NULL DEFAULT '',
			payer_msisdn TEXT NOT NULL DEFAULT '',
			payer_name TEXT NOT NULL DEFAULT '',
			payer_message TEXT NOT NULL DEFAULT '',
			payee_note TEXT NOT NULL DEFAULT '',
			request_state TEXT NOT NULL,
			financial_transaction_id TEXT NOT NULL DEFAULT '',
			reason TEXT NOT NULL DEFAULT '',
			collection_class TEXT NOT NULL DEFAULT '',
			requested_at TIMESTAMPTZ NOT NULL,
			last_provider_at TIMESTAMPTZ NULL
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_momo_requests_org_reference
			ON momo_requests (organization_id, reference_id)`,
		`CREATE INDEX IF NOT EXISTS idx_momo_requests_org_requested
			ON momo_requests (organization_id, requested_at, reference_id)`,
		`CREATE TABLE IF NOT EXISTS momo_request_events (
			id TEXT PRIMARY KEY,
			request_id TEXT NOT NULL,
			organization_id TEXT NOT NULL,
			reference_id TEXT NOT NULL,
			from_state TEXT NOT NULL DEFAULT '',
			to_state TEXT NOT NULL,
			financial_transaction_id TEXT NOT NULL DEFAULT '',
			reason TEXT NOT NULL DEFAULT '',
			raw_provider_payload JSONB NULL,
			occurred_at TIMESTAMPTZ NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_momo_request_events_request_occurred
			ON momo_request_events (request_id, occurred_at DESC, id DESC)`,
	}
	for _, statement := range statements {
		if _, err := s.db.ExecContext(context.Background(), statement); err != nil {
			return fmt.Errorf("ensure momo tracker schema: %w", err)
		}
	}
	return nil
}
