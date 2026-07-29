package entities

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
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
	if err := store.ensureSchema(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *PostgresStore) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *PostgresStore) ensureSchema() error {
	_, err := s.db.ExecContext(context.Background(), `
		CREATE TABLE IF NOT EXISTS resolved_entities (
			id TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL REFERENCES organizations(id),
			entity_type TEXT NOT NULL CHECK (entity_type IN (
				'EXTERNAL_PARTY','ACCOUNT','DOCUMENT','CONTRACT','INVOICE','BILL','RECEIPT','PAYMENT','TRANSACTION','OBLIGATION'
			)),
			canonical_key TEXT NOT NULL,
			display_name TEXT NOT NULL DEFAULT '',
			external_reference TEXT NOT NULL DEFAULT '',
			resolution_method TEXT NOT NULL,
			resolution_confidence NUMERIC(5,4) NOT NULL CHECK (resolution_confidence >= 0 AND resolution_confidence <= 1),
			attributes JSONB NOT NULL DEFAULT '{}',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			UNIQUE (organization_id, entity_type, canonical_key)
		)`)
	return err
}

type scannable interface {
	Scan(dest ...any) error
}

func scanEntity(row scannable) (Entity, error) {
	var (
		id, orgID, typeStr, canonicalKey, displayName, externalRef, method string
		confidence                                                         float64
		attrsJSON                                                          []byte
		createdAt                                                          time.Time
	)
	if err := row.Scan(&id, &orgID, &typeStr, &canonicalKey, &displayName, &externalRef, &method, &confidence, &attrsJSON, &createdAt); err != nil {
		return Entity{}, err
	}
	var attrs map[string]string
	if err := json.Unmarshal(attrsJSON, &attrs); err != nil {
		return Entity{}, fmt.Errorf("unmarshal attributes: %w", err)
	}
	return Entity{
		ID:                   id,
		OrganizationID:       orgID,
		Type:                 Type(typeStr),
		CanonicalKey:         canonicalKey,
		DisplayName:          displayName,
		ExternalReference:    externalRef,
		ResolutionMethod:     method,
		ResolutionConfidence: confidence,
		Attributes:           attrs,
		CreatedAt:            createdAt,
	}, nil
}

func (s *PostgresStore) Resolve(organizationID string, entityType Type, candidate Candidate) (Entity, bool, error) {
	if organizationID == "" {
		return Entity{}, false, errors.New("organization id is required")
	}
	if !validTypes[entityType] {
		return Entity{}, false, fmt.Errorf("unsupported entity type %q", entityType)
	}
	canonicalKey, resolutionMethod, resolutionConfidence, err := canonicalKey(entityType, candidate)
	if err != nil {
		return Entity{}, false, err
	}

	attrsJSON, err := json.Marshal(cloneMap(candidate.Attributes))
	if err != nil {
		return Entity{}, false, fmt.Errorf("marshal attributes: %w", err)
	}

	now := time.Now().UTC()
	entityID := newID("ent")
	displayName := strings.TrimSpace(candidate.DisplayName)
	externalReference := strings.TrimSpace(candidate.ExternalReference)

	entity, err := scanEntity(s.db.QueryRowContext(context.Background(),
		`INSERT INTO resolved_entities (id, organization_id, entity_type, canonical_key, display_name, external_reference, resolution_method, resolution_confidence, attributes, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (organization_id, entity_type, canonical_key) DO NOTHING
		 RETURNING id, organization_id, entity_type, canonical_key, display_name, external_reference, resolution_method, resolution_confidence, attributes, created_at`,
		entityID, organizationID, string(entityType), canonicalKey,
		displayName, externalReference, resolutionMethod,
		resolutionConfidence, attrsJSON, now,
	))
	if err == nil {
		return entity, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Entity{}, false, err
	}

	entity, err = scanEntity(s.db.QueryRowContext(context.Background(),
		`SELECT id, organization_id, entity_type, canonical_key, display_name, external_reference, resolution_method, resolution_confidence, attributes, created_at
		 FROM resolved_entities
		 WHERE organization_id=$1 AND entity_type=$2 AND canonical_key=$3`,
		organizationID, string(entityType), canonicalKey,
	))
	if err != nil {
		return Entity{}, false, err
	}
	return entity, false, nil
}

func (s *PostgresStore) Get(organizationID string, entityID string) (Entity, error) {
	entity, err := scanEntity(s.db.QueryRowContext(context.Background(),
		`SELECT id, organization_id, entity_type, canonical_key, display_name, external_reference, resolution_method, resolution_confidence, attributes, created_at
		 FROM resolved_entities
		 WHERE id=$1 AND organization_id=$2`,
		entityID, organizationID,
	))
	if err == sql.ErrNoRows {
		return Entity{}, errors.New("entity not found")
	}
	return entity, err
}

func (s *PostgresStore) List(organizationID string) []Entity {
	rows, err := s.db.QueryContext(context.Background(),
		`SELECT id, organization_id, entity_type, canonical_key, display_name, external_reference, resolution_method, resolution_confidence, attributes, created_at
		 FROM resolved_entities
		 WHERE organization_id=$1
		 ORDER BY created_at`,
		organizationID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var entities []Entity
	for rows.Next() {
		entity, err := scanEntity(rows)
		if err != nil {
			continue
		}
		entities = append(entities, entity)
	}
	if entities == nil {
		return []Entity{}
	}
	return entities
}
