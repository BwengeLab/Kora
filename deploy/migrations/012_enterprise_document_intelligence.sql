CREATE TABLE IF NOT EXISTS document_extraction_jobs (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 document_id TEXT NOT NULL REFERENCES documents(id),
 ingestion_batch_id TEXT NOT NULL REFERENCES ingestion_batches(id),
 extraction_version_id TEXT NOT NULL REFERENCES extraction_versions(id),
 idempotency_key TEXT NOT NULL,
 document_fingerprint TEXT NOT NULL CHECK(document_fingerprint ~ '^[0-9a-f]{64}$'),
 object_key TEXT NOT NULL CHECK(object_key LIKE organization_id || '/%'),
 file_name TEXT NOT NULL,
 content_type TEXT NOT NULL DEFAULT '',
 preferred_provider TEXT NOT NULL DEFAULT '',
 external_provider_allowed BOOLEAN NOT NULL DEFAULT false,
 ocr_language TEXT NOT NULL DEFAULT 'eng',
 state TEXT NOT NULL CHECK(state IN('QUEUED','PROCESSING','RETRY','NEEDS_REVIEW','COMPLETED','FAILED','DEAD_LETTER')),
 attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
 max_attempts INTEGER NOT NULL DEFAULT 3 CHECK(max_attempts > 0),
 last_error TEXT NOT NULL DEFAULT '',
 available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS document_extraction_job_events (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 job_id TEXT NOT NULL REFERENCES document_extraction_jobs(id),
 from_state TEXT NOT NULL,
 to_state TEXT NOT NULL,
 reason TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_extraction_results (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 job_id TEXT NOT NULL UNIQUE REFERENCES document_extraction_jobs(id),
 provider_name TEXT NOT NULL,
 provider_version TEXT NOT NULL,
 schema_version TEXT NOT NULL,
 requires_human_review BOOLEAN NOT NULL,
 inspection JSONB NOT NULL,
 result JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_page_artifacts (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 extraction_result_id TEXT NOT NULL REFERENCES document_extraction_results(id),
 page_number INTEGER NOT NULL CHECK(page_number > 0),
 width INTEGER NOT NULL DEFAULT 0 CHECK(width >= 0),
 height INTEGER NOT NULL DEFAULT 0 CHECK(height >= 0),
 text_object_key TEXT NOT NULL DEFAULT '',
 image_object_key TEXT NOT NULL DEFAULT '',
 ocr_method TEXT NOT NULL DEFAULT '',
 ocr_confidence NUMERIC(6,5) CHECK(ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1)),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(extraction_result_id, page_number)
);

CREATE TABLE IF NOT EXISTS extracted_field_lineage (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 extraction_result_id TEXT NOT NULL REFERENCES document_extraction_results(id),
 source_record_id TEXT NOT NULL,
 field_name TEXT NOT NULL,
 raw_text TEXT NOT NULL,
 normalized_value TEXT NOT NULL,
 confidence NUMERIC(6,5) NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
 calibrated BOOLEAN NOT NULL DEFAULT false,
 extraction_method TEXT NOT NULL,
 model_name TEXT NOT NULL,
 model_version TEXT NOT NULL,
 page_number INTEGER NOT NULL DEFAULT 0 CHECK(page_number >= 0),
 bounding_box JSONB,
 validation_codes TEXT[] NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_validation_issues (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 extraction_result_id TEXT NOT NULL REFERENCES document_extraction_results(id),
 code TEXT NOT NULL,
 severity TEXT NOT NULL CHECK(severity IN('info','warning','error','blocking')),
 message TEXT NOT NULL,
 field_name TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_document_intelligence_tenant()
RETURNS TRIGGER AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'document_extraction_jobs' THEN
  SELECT organization_id INTO linked_org FROM documents WHERE id = NEW.document_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'document belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM ingestion_batches
   WHERE id = NEW.ingestion_batch_id AND organization_id = NEW.organization_id;
  IF linked_org IS NULL THEN RAISE EXCEPTION 'ingestion batch belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM extraction_versions
   WHERE id = NEW.extraction_version_id AND document_id = NEW.document_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'extraction version belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'document_extraction_job_events' THEN
  SELECT organization_id INTO linked_org FROM document_extraction_jobs WHERE id = NEW.job_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'extraction job belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'document_extraction_results' THEN
  SELECT organization_id INTO linked_org FROM document_extraction_jobs WHERE id = NEW.job_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'extraction job belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME IN ('document_page_artifacts','extracted_field_lineage','document_validation_issues') THEN
  SELECT organization_id INTO linked_org FROM document_extraction_results WHERE id = NEW.extraction_result_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'extraction result belongs to another organization'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_extraction_job_update()
RETURNS TRIGGER AS $$
BEGIN
 IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id
    OR OLD.document_id <> NEW.document_id OR OLD.ingestion_batch_id <> NEW.ingestion_batch_id
    OR OLD.extraction_version_id <> NEW.extraction_version_id
    OR OLD.idempotency_key <> NEW.idempotency_key OR OLD.document_fingerprint <> NEW.document_fingerprint
    OR OLD.object_key <> NEW.object_key OR OLD.file_name <> NEW.file_name
    OR OLD.content_type <> NEW.content_type OR OLD.preferred_provider <> NEW.preferred_provider
    OR OLD.external_provider_allowed <> NEW.external_provider_allowed
    OR OLD.ocr_language <> NEW.ocr_language OR OLD.max_attempts <> NEW.max_attempts
    OR OLD.created_at <> NEW.created_at THEN
  RAISE EXCEPTION 'immutable extraction job fields cannot be changed';
 END IF;
 IF NOT (
   (OLD.state IN ('QUEUED','RETRY') AND NEW.state = 'PROCESSING') OR
   (OLD.state = 'PROCESSING' AND NEW.state IN ('RETRY','NEEDS_REVIEW','COMPLETED','FAILED','DEAD_LETTER'))
 ) THEN
  RAISE EXCEPTION 'invalid extraction job state transition % -> %', OLD.state, NEW.state;
 END IF;
 IF NEW.attempt_count < OLD.attempt_count OR NEW.attempt_count > OLD.attempt_count + 1 THEN
  RAISE EXCEPTION 'invalid extraction attempt count';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER extraction_jobs_tenant_consistency BEFORE INSERT ON document_extraction_jobs FOR EACH ROW EXECUTE FUNCTION enforce_document_intelligence_tenant();
CREATE TRIGGER extraction_job_events_tenant_consistency BEFORE INSERT ON document_extraction_job_events FOR EACH ROW EXECUTE FUNCTION enforce_document_intelligence_tenant();
CREATE TRIGGER extraction_results_tenant_consistency BEFORE INSERT ON document_extraction_results FOR EACH ROW EXECUTE FUNCTION enforce_document_intelligence_tenant();
CREATE TRIGGER page_artifacts_tenant_consistency BEFORE INSERT ON document_page_artifacts FOR EACH ROW EXECUTE FUNCTION enforce_document_intelligence_tenant();
CREATE TRIGGER field_lineage_tenant_consistency BEFORE INSERT ON extracted_field_lineage FOR EACH ROW EXECUTE FUNCTION enforce_document_intelligence_tenant();
CREATE TRIGGER validation_issues_tenant_consistency BEFORE INSERT ON document_validation_issues FOR EACH ROW EXECUTE FUNCTION enforce_document_intelligence_tenant();
CREATE TRIGGER extraction_jobs_valid_update BEFORE UPDATE ON document_extraction_jobs FOR EACH ROW EXECUTE FUNCTION enforce_extraction_job_update();
CREATE TRIGGER extraction_jobs_no_delete BEFORE DELETE ON document_extraction_jobs FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER extraction_job_events_no_mutation BEFORE UPDATE OR DELETE ON document_extraction_job_events FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER extraction_results_no_mutation BEFORE UPDATE OR DELETE ON document_extraction_results FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER page_artifacts_no_mutation BEFORE UPDATE OR DELETE ON document_page_artifacts FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER field_lineage_no_mutation BEFORE UPDATE OR DELETE ON extracted_field_lineage FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER validation_issues_no_mutation BEFORE UPDATE OR DELETE ON document_validation_issues FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS extraction_jobs_claim_idx ON document_extraction_jobs(state, available_at, created_at) WHERE state IN('QUEUED','RETRY');
CREATE INDEX IF NOT EXISTS field_lineage_result_field_idx ON extracted_field_lineage(extraction_result_id, field_name);

INSERT INTO schema_migrations(version) VALUES('012_enterprise_document_intelligence') ON CONFLICT DO NOTHING;
