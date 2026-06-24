ALTER TABLE document_extraction_jobs
 ADD COLUMN IF NOT EXISTS claimed_by TEXT NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

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

 IF OLD.state IN ('QUEUED','RETRY') AND NEW.state = 'PROCESSING' THEN
  IF NEW.attempt_count <> OLD.attempt_count + 1
     OR NEW.claimed_by = '' OR NEW.lease_expires_at IS NULL THEN
   RAISE EXCEPTION 'processing claim requires owner, lease, and one new attempt';
  END IF;
 ELSIF OLD.state = 'PROCESSING' AND NEW.state = 'PROCESSING' THEN
  IF NEW.attempt_count <> OLD.attempt_count
     OR NEW.claimed_by = '' OR NEW.claimed_by <> OLD.claimed_by
     OR NEW.lease_expires_at IS NULL
     OR NEW.lease_expires_at <= OLD.lease_expires_at THEN
   RAISE EXCEPTION 'processing lease renewal is invalid';
  END IF;
 ELSIF OLD.state = 'PROCESSING'
       AND NEW.state IN ('RETRY','NEEDS_REVIEW','COMPLETED','FAILED','DEAD_LETTER') THEN
  IF NEW.attempt_count <> OLD.attempt_count
     OR NEW.claimed_by <> '' OR NEW.lease_expires_at IS NOT NULL THEN
   RAISE EXCEPTION 'processing completion must release worker ownership';
  END IF;
 ELSE
  RAISE EXCEPTION 'invalid extraction job state transition % -> %', OLD.state, NEW.state;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS extraction_jobs_stale_lease_idx
 ON document_extraction_jobs(lease_expires_at)
 WHERE state = 'PROCESSING';

INSERT INTO schema_migrations(version)
VALUES('013_extraction_job_leases')
ON CONFLICT DO NOTHING;
