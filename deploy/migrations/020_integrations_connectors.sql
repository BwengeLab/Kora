CREATE TABLE IF NOT EXISTS connector_connections (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 connector_kind TEXT NOT NULL CHECK(connector_kind IN('MOMO','EBM_RRA','BANK_STATEMENT','ACCOUNTING','EMAIL_SMS')),
 display_name TEXT NOT NULL,
 secret_ref TEXT NOT NULL,
 config JSONB NOT NULL DEFAULT '{}',
 active BOOLEAN NOT NULL DEFAULT true,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(secret_ref <> ''),
 CHECK(NOT (
  config ? 'password' OR config ? 'token' OR config ? 'api_key'
  OR config ? 'secret' OR config ? 'client_secret'
 )),
 UNIQUE(organization_id, connector_kind, display_name)
);

CREATE TABLE IF NOT EXISTS connector_sync_runs (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 connection_id TEXT NOT NULL REFERENCES connector_connections(id),
 idempotency_key TEXT NOT NULL,
 source_name TEXT NOT NULL,
 window_start TEXT NOT NULL DEFAULT '',
 window_end TEXT NOT NULL DEFAULT '',
 sync_cursor TEXT NOT NULL DEFAULT '',
 fingerprint TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('STARTED','COMPLETED','FAILED','REPLAYED','DUPLICATE_SOURCE')),
 ingestion_batch_id TEXT REFERENCES ingestion_batches(id),
 document_id TEXT REFERENCES documents(id),
 extraction_version_id TEXT REFERENCES extraction_versions(id),
 result JSONB NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, idempotency_key),
 UNIQUE(organization_id, connection_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS connector_source_records (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 sync_run_id TEXT NOT NULL REFERENCES connector_sync_runs(id),
 source_record_id TEXT NOT NULL,
 record_type TEXT NOT NULL,
 source_record_db_id TEXT REFERENCES source_records(id),
 fields JSONB NOT NULL DEFAULT '{}',
 confidence NUMERIC(5,4) NOT NULL CHECK(confidence > 0 AND confidence <= 1),
 quality_flags TEXT[] NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, sync_run_id, source_record_id)
);

CREATE TABLE IF NOT EXISTS connector_normalized_events (
 sync_run_id TEXT NOT NULL REFERENCES connector_sync_runs(id),
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 connector_source_record_id TEXT NOT NULL REFERENCES connector_source_records(id),
 business_event_id TEXT NOT NULL REFERENCES business_events(id),
 created BOOLEAN NOT NULL,
 PRIMARY KEY(sync_run_id, connector_source_record_id, business_event_id)
);

CREATE OR REPLACE FUNCTION enforce_connector_tenant()
RETURNS trigger AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'connector_connections' THEN
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.created_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector creator belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'connector_sync_runs' THEN
  SELECT organization_id INTO linked_org FROM connector_connections WHERE id = NEW.connection_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector sync connection belongs to another organization'; END IF;
  IF NEW.ingestion_batch_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM ingestion_batches WHERE id = NEW.ingestion_batch_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector sync batch belongs to another organization'; END IF;
  END IF;
  IF NEW.document_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM documents WHERE id = NEW.document_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector sync document belongs to another organization'; END IF;
  END IF;
  IF NEW.extraction_version_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM extraction_versions WHERE id = NEW.extraction_version_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector sync extraction belongs to another organization'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME = 'connector_source_records' THEN
  SELECT organization_id INTO linked_org FROM connector_sync_runs WHERE id = NEW.sync_run_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector source sync belongs to another organization'; END IF;
  IF NEW.source_record_db_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM source_records WHERE id = NEW.source_record_db_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector source record belongs to another organization'; END IF;
  END IF;
 ELSE
  SELECT organization_id INTO linked_org FROM connector_sync_runs WHERE id = NEW.sync_run_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector event sync belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM connector_source_records WHERE id = NEW.connector_source_record_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector event source belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.business_event_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'connector event belongs to another organization'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connector_connections_tenant_consistency BEFORE INSERT ON connector_connections FOR EACH ROW EXECUTE FUNCTION enforce_connector_tenant();
CREATE TRIGGER connector_sync_runs_tenant_consistency BEFORE INSERT ON connector_sync_runs FOR EACH ROW EXECUTE FUNCTION enforce_connector_tenant();
CREATE TRIGGER connector_source_records_tenant_consistency BEFORE INSERT ON connector_source_records FOR EACH ROW EXECUTE FUNCTION enforce_connector_tenant();
CREATE TRIGGER connector_normalized_events_tenant_consistency BEFORE INSERT ON connector_normalized_events FOR EACH ROW EXECUTE FUNCTION enforce_connector_tenant();

CREATE TRIGGER connector_connections_no_mutation BEFORE UPDATE OR DELETE ON connector_connections FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER connector_sync_runs_no_mutation BEFORE UPDATE OR DELETE ON connector_sync_runs FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER connector_source_records_no_mutation BEFORE UPDATE OR DELETE ON connector_source_records FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER connector_normalized_events_no_mutation BEFORE UPDATE OR DELETE ON connector_normalized_events FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS connector_connections_org_kind_idx ON connector_connections(organization_id, connector_kind);
CREATE INDEX IF NOT EXISTS connector_sync_runs_org_connection_idx ON connector_sync_runs(organization_id, connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS connector_source_records_org_source_idx ON connector_source_records(organization_id, source_record_id);

INSERT INTO schema_migrations(version) VALUES('020_integrations_connectors') ON CONFLICT DO NOTHING;
