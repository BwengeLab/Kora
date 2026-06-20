CREATE TABLE IF NOT EXISTS resolved_entities (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'EXTERNAL_PARTY', 'ACCOUNT', 'DOCUMENT', 'CONTRACT', 'INVOICE',
        'BILL', 'RECEIPT', 'PAYMENT', 'TRANSACTION', 'OBLIGATION'
    )),
    canonical_key TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    external_reference TEXT NOT NULL DEFAULT '',
    resolution_method TEXT NOT NULL,
    resolution_confidence NUMERIC(5,4) NOT NULL CHECK (resolution_confidence >= 0 AND resolution_confidence <= 1),
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, entity_type, canonical_key)
);

CREATE TABLE IF NOT EXISTS business_events (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'TRANSACTION_OBSERVED', 'PAYMENT_RECEIVED', 'PAYMENT_SENT',
        'INVOICE_ISSUED', 'BILL_RECEIVED', 'RECEIPT_RECORDED',
        'CONTRACT_SIGNED', 'OBLIGATION_CREATED', 'DOCUMENT_MISSING',
        'APPROVAL_REQUIRED'
    )),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status = 'ACTIVE'),
    external_party_id TEXT REFERENCES resolved_entities(id),
    account_id TEXT REFERENCES resolved_entities(id),
    source_entity_id TEXT REFERENCES resolved_entities(id),
    related_entity_ids JSONB NOT NULL DEFAULT '{}',
    evidence JSONB NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_provenance (
    business_event_id TEXT PRIMARY KEY REFERENCES business_events(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    ingestion_batch_id TEXT NOT NULL REFERENCES ingestion_batches(id),
    document_id TEXT NOT NULL REFERENCES documents(id),
    extraction_version_id TEXT NOT NULL REFERENCES extraction_versions(id),
    source_record_id TEXT NOT NULL REFERENCES source_records(id),
    source_record_reference TEXT NOT NULL,
    source_page INTEGER NOT NULL DEFAULT 0 CHECK (source_page >= 0),
    source_row INTEGER NOT NULL DEFAULT 0 CHECK (source_row >= 0),
    source_sheet TEXT NOT NULL DEFAULT '',
    confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, document_id, extraction_version_id, source_record_reference)
);

CREATE TABLE IF NOT EXISTS correction_events (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    correction_type TEXT NOT NULL CHECK (correction_type IN (
        'EVENT_CREATED', 'EVENT_REVERSED', 'EVENT_ADJUSTED',
        'MATCH_APPROVED', 'MATCH_REJECTED', 'POSTING_CREATED',
        'POSTING_REVERSED', 'DOCUMENT_REPLACED', 'EVIDENCE_ADDED'
    )),
    original_event_id TEXT REFERENCES business_events(id),
    replacement_event_id TEXT REFERENCES business_events(id),
    evidence JSONB NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (correction_type = 'EVENT_CREATED' AND original_event_id IS NULL)
        OR (correction_type <> 'EVENT_CREATED' AND original_event_id IS NOT NULL)
    ),
    CHECK (correction_type <> 'EVENT_ADJUSTED' OR replacement_event_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS resolved_entities_tenant_type_idx
    ON resolved_entities (organization_id, entity_type);

CREATE INDEX IF NOT EXISTS business_events_tenant_created_idx
    ON business_events (organization_id, created_at, id);

CREATE INDEX IF NOT EXISTS correction_events_original_idx
    ON correction_events (organization_id, original_event_id, created_at);

CREATE OR REPLACE FUNCTION validate_business_event_tenant_links()
RETURNS trigger AS $$
BEGIN
    IF NEW.external_party_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM resolved_entities
        WHERE id = NEW.external_party_id
          AND organization_id = NEW.organization_id
          AND entity_type = 'EXTERNAL_PARTY'
    ) THEN
        RAISE EXCEPTION 'external party must belong to the event organization';
    END IF;
    IF NEW.account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM resolved_entities
        WHERE id = NEW.account_id
          AND organization_id = NEW.organization_id
          AND entity_type = 'ACCOUNT'
    ) THEN
        RAISE EXCEPTION 'account must belong to the event organization';
    END IF;
    IF NEW.source_entity_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM resolved_entities
        WHERE id = NEW.source_entity_id
          AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'source entity must belong to the event organization';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_events_validate_tenant_links ON business_events;
CREATE TRIGGER business_events_validate_tenant_links
BEFORE INSERT ON business_events
FOR EACH ROW EXECUTE FUNCTION validate_business_event_tenant_links();

CREATE OR REPLACE FUNCTION validate_event_provenance_tenant_links()
RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM business_events WHERE id = NEW.business_event_id AND organization_id = NEW.organization_id)
       OR NOT EXISTS (SELECT 1 FROM ingestion_batches WHERE id = NEW.ingestion_batch_id AND organization_id = NEW.organization_id)
       OR NOT EXISTS (SELECT 1 FROM documents WHERE id = NEW.document_id AND organization_id = NEW.organization_id)
       OR NOT EXISTS (SELECT 1 FROM extraction_versions WHERE id = NEW.extraction_version_id AND organization_id = NEW.organization_id)
       OR NOT EXISTS (SELECT 1 FROM source_records WHERE id = NEW.source_record_id AND organization_id = NEW.organization_id) THEN
        RAISE EXCEPTION 'event provenance resources must belong to the event organization';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_provenance_validate_tenant_links ON event_provenance;
CREATE TRIGGER event_provenance_validate_tenant_links
BEFORE INSERT ON event_provenance
FOR EACH ROW EXECUTE FUNCTION validate_event_provenance_tenant_links();

CREATE OR REPLACE FUNCTION validate_correction_event_tenant_links()
RETURNS trigger AS $$
BEGIN
    IF NEW.original_event_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM business_events WHERE id = NEW.original_event_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'original event must belong to the correction organization';
    END IF;
    IF NEW.replacement_event_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM business_events WHERE id = NEW.replacement_event_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'replacement event must belong to the correction organization';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS correction_events_validate_tenant_links ON correction_events;
CREATE TRIGGER correction_events_validate_tenant_links
BEFORE INSERT ON correction_events
FOR EACH ROW EXECUTE FUNCTION validate_correction_event_tenant_links();

CREATE OR REPLACE FUNCTION prevent_append_only_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_events_no_update ON business_events;
CREATE TRIGGER business_events_no_update
BEFORE UPDATE OR DELETE ON business_events
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

DROP TRIGGER IF EXISTS event_provenance_no_update ON event_provenance;
CREATE TRIGGER event_provenance_no_update
BEFORE UPDATE OR DELETE ON event_provenance
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

DROP TRIGGER IF EXISTS correction_events_no_update ON correction_events;
CREATE TRIGGER correction_events_no_update
BEFORE UPDATE OR DELETE ON correction_events
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

INSERT INTO schema_migrations (version)
VALUES ('008_generic_business_events')
ON CONFLICT (version) DO NOTHING;
