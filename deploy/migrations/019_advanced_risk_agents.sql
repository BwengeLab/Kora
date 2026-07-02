CREATE TABLE IF NOT EXISTS risk_detection_runs (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 as_of DATE NOT NULL,
 detector_version TEXT NOT NULL,
 thresholds JSONB NOT NULL,
 input_fingerprint TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, input_fingerprint)
);

CREATE TABLE IF NOT EXISTS advanced_risk_flags (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 detection_run_id TEXT NOT NULL REFERENCES risk_detection_runs(id),
 flag_type TEXT NOT NULL CHECK(flag_type IN(
  'SUPPLIER_PRICE_HIKE','MISSING_APPROVAL','DUPLICATE_VENDOR',
  'MARGIN_DROP','UNSUPPORTED_PAYMENT'
 )),
 severity TEXT NOT NULL CHECK(severity IN('LOW','MEDIUM','HIGH','CRITICAL')),
 source_id TEXT NOT NULL,
 reason TEXT NOT NULL,
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, detection_run_id, flag_type, source_id)
);

CREATE TABLE IF NOT EXISTS risk_flag_feedback (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 risk_flag_id TEXT NOT NULL REFERENCES advanced_risk_flags(id),
 reviewer_user_id TEXT NOT NULL REFERENCES users(id),
 label TEXT NOT NULL CHECK(label IN('CORRECT','INCORRECT','RISKY','UNCLEAR','FALSE_POSITIVE')),
 comment TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_advanced_risk_tenant()
RETURNS trigger AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'risk_detection_runs' THEN
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.created_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'risk detector creator belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'advanced_risk_flags' THEN
  SELECT organization_id INTO linked_org FROM risk_detection_runs WHERE id = NEW.detection_run_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'risk flag run belongs to another organization'; END IF;
 ELSE
  SELECT organization_id INTO linked_org FROM advanced_risk_flags WHERE id = NEW.risk_flag_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'risk feedback flag belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.reviewer_user_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'risk feedback reviewer belongs to another organization'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER risk_detection_runs_tenant_consistency BEFORE INSERT ON risk_detection_runs FOR EACH ROW EXECUTE FUNCTION enforce_advanced_risk_tenant();
CREATE TRIGGER advanced_risk_flags_tenant_consistency BEFORE INSERT ON advanced_risk_flags FOR EACH ROW EXECUTE FUNCTION enforce_advanced_risk_tenant();
CREATE TRIGGER risk_flag_feedback_tenant_consistency BEFORE INSERT ON risk_flag_feedback FOR EACH ROW EXECUTE FUNCTION enforce_advanced_risk_tenant();

CREATE TRIGGER risk_detection_runs_no_mutation BEFORE UPDATE OR DELETE ON risk_detection_runs FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER advanced_risk_flags_no_mutation BEFORE UPDATE OR DELETE ON advanced_risk_flags FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER risk_flag_feedback_no_mutation BEFORE UPDATE OR DELETE ON risk_flag_feedback FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS advanced_risk_flags_org_type_idx ON advanced_risk_flags(organization_id, flag_type, severity);
CREATE INDEX IF NOT EXISTS risk_flag_feedback_org_flag_idx ON risk_flag_feedback(organization_id, risk_flag_id, created_at DESC);

INSERT INTO schema_migrations(version) VALUES('019_advanced_risk_agents') ON CONFLICT DO NOTHING;
