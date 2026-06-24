CREATE TABLE IF NOT EXISTS report_snapshots (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 generated_by TEXT NOT NULL REFERENCES users(id),
 input_fingerprint TEXT NOT NULL,
 include_roi BOOLEAN NOT NULL DEFAULT false,
 payload JSONB NOT NULL,
 generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, input_fingerprint, include_roi)
);

CREATE TABLE IF NOT EXISTS roi_facts (
 id TEXT PRIMARY KEY,
 report_id TEXT NOT NULL REFERENCES report_snapshots(id),
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 impact_type TEXT NOT NULL CHECK(impact_type IN(
  'MONEY_RECOVERED','DUPLICATE_PAYMENT_AVOIDED','UNSUPPORTED_PAYMENT_CAUGHT',
  'LATE_INVOICE_COLLECTED','HOURS_SAVED','MISSING_DOCUMENT_FIXED'
 )),
 source_event_id TEXT NOT NULL REFERENCES business_events(id),
 approval_task_id TEXT REFERENCES approval_tasks(id),
 posting_group_id TEXT REFERENCES posting_groups(id),
 audit_entry_id TEXT NOT NULL REFERENCES audit_entries(id),
 currency TEXT NOT NULL DEFAULT '',
 amount_minor BIGINT NOT NULL DEFAULT 0 CHECK(amount_minor >= 0),
 minutes_saved BIGINT NOT NULL DEFAULT 0 CHECK(minutes_saved >= 0),
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, source_event_id)
);

CREATE OR REPLACE FUNCTION enforce_reporting_roi_tenant()
RETURNS TRIGGER AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'report_snapshots' THEN
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.generated_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
   RAISE EXCEPTION 'report generator belongs to another organization';
  END IF;
 ELSE
  SELECT organization_id INTO linked_org FROM report_snapshots WHERE id = NEW.report_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'report belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.source_event_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'ROI event belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM audit_entries WHERE id = NEW.audit_entry_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'ROI audit entry belongs to another organization'; END IF;
  IF NEW.approval_task_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM approval_tasks WHERE id = NEW.approval_task_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'ROI approval belongs to another organization'; END IF;
  END IF;
  IF NEW.posting_group_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM posting_groups WHERE id = NEW.posting_group_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'ROI posting belongs to another organization'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_snapshots_tenant_consistency
 BEFORE INSERT ON report_snapshots
 FOR EACH ROW EXECUTE FUNCTION enforce_reporting_roi_tenant();
CREATE TRIGGER roi_facts_tenant_consistency
 BEFORE INSERT ON roi_facts
 FOR EACH ROW EXECUTE FUNCTION enforce_reporting_roi_tenant();
CREATE TRIGGER report_snapshots_no_mutation
 BEFORE UPDATE OR DELETE ON report_snapshots
 FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER roi_facts_no_mutation
 BEFORE UPDATE OR DELETE ON roi_facts
 FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS roi_facts_report_idx ON roi_facts(report_id, impact_type, currency);

INSERT INTO schema_migrations(version)
VALUES('015_reporting_roi')
ON CONFLICT DO NOTHING;
