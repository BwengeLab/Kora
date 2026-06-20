CREATE TABLE IF NOT EXISTS ingestion_batches (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    batch_id TEXT NOT NULL REFERENCES ingestion_batches(id),
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT '',
    object_key TEXT NOT NULL DEFAULT '',
    fingerprint TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    duplicate_of_document_id TEXT REFERENCES documents(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS extraction_versions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    document_id TEXT NOT NULL REFERENCES documents(id),
    version INTEGER NOT NULL,
    extractor TEXT NOT NULL,
    quality_flags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, version)
);

CREATE TABLE IF NOT EXISTS source_records (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    document_id TEXT NOT NULL REFERENCES documents(id),
    extraction_version_id TEXT NOT NULL REFERENCES extraction_versions(id),
    source_record_id TEXT NOT NULL,
    record_type TEXT NOT NULL,
    fields JSONB NOT NULL DEFAULT '{}',
    confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
    quality_flags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS source_records_org_source_idx
    ON source_records (organization_id, document_id, record_type, source_record_id);

CREATE TABLE IF NOT EXISTS idempotency_records (
    key TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    fingerprint TEXT NOT NULL,
    result_type TEXT NOT NULL,
    result_id TEXT NOT NULL,
    response JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version)
VALUES ('005_ingestion_idempotency')
ON CONFLICT (version) DO NOTHING;
