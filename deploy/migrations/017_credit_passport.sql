CREATE TABLE IF NOT EXISTS risk_flags (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 source_event_id TEXT NOT NULL REFERENCES business_events(id),
 flag_type TEXT NOT NULL,
 severity TEXT NOT NULL CHECK(severity IN('LOW','MEDIUM','HIGH','CRITICAL')),
 reason TEXT NOT NULL,
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, source_event_id, flag_type)
);

CREATE TABLE IF NOT EXISTS affordability_policies (
 id TEXT NOT NULL,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 version INTEGER NOT NULL CHECK(version > 0),
 currency TEXT NOT NULL,
 max_debt_service_basis_points INTEGER NOT NULL CHECK(max_debt_service_basis_points > 0 AND max_debt_service_basis_points <= 10000),
 stress_buffer_basis_points INTEGER NOT NULL CHECK(stress_buffer_basis_points >= 0 AND stress_buffer_basis_points < 10000),
 annual_interest_basis_points INTEGER NOT NULL CHECK(annual_interest_basis_points >= 0),
 term_months INTEGER NOT NULL CHECK(term_months > 0 AND term_months <= 360),
 evidence JSONB NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(id, version),
 UNIQUE(organization_id, id, version)
);

CREATE TABLE IF NOT EXISTS credit_passports (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 period_start DATE NOT NULL,
 period_end DATE NOT NULL,
 as_of DATE NOT NULL,
 affordability_policy_id TEXT NOT NULL,
 affordability_policy_version INTEGER NOT NULL,
 input_fingerprint TEXT NOT NULL,
 payload JSONB NOT NULL,
 generated_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(period_end >= period_start AND as_of >= period_end),
 FOREIGN KEY(affordability_policy_id, affordability_policy_version)
  REFERENCES affordability_policies(id, version),
 UNIQUE(organization_id, input_fingerprint)
);

CREATE TABLE IF NOT EXISTS credit_passport_evidence (
 passport_id TEXT NOT NULL REFERENCES credit_passports(id),
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 source_document_id TEXT NOT NULL REFERENCES documents(id),
 extraction_version_id TEXT NOT NULL REFERENCES extraction_versions(id),
 source_record_id TEXT NOT NULL REFERENCES source_records(id),
 evidence JSONB NOT NULL,
 PRIMARY KEY(passport_id, source_document_id, extraction_version_id, source_record_id)
);

CREATE TABLE IF NOT EXISTS credit_passport_risk_flags (
 passport_id TEXT NOT NULL REFERENCES credit_passports(id),
 risk_flag_id TEXT NOT NULL REFERENCES risk_flags(id),
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 PRIMARY KEY(passport_id, risk_flag_id)
);

CREATE OR REPLACE FUNCTION enforce_credit_passport_tenant()
RETURNS trigger AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'risk_flags' THEN
  SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.source_event_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'risk flag event belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'affordability_policies' THEN
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.created_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'affordability policy creator belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'credit_passports' THEN
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.generated_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'passport generator belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM affordability_policies
   WHERE id = NEW.affordability_policy_id AND version = NEW.affordability_policy_version;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'affordability policy belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'credit_passport_evidence' THEN
  SELECT organization_id INTO linked_org FROM credit_passports WHERE id = NEW.passport_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'passport evidence belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM documents WHERE id = NEW.source_document_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'evidence document belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM extraction_versions WHERE id = NEW.extraction_version_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'evidence extraction belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM source_records WHERE id = NEW.source_record_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'evidence record belongs to another organization'; END IF;
 ELSE
  SELECT organization_id INTO linked_org FROM credit_passports WHERE id = NEW.passport_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'passport risk link belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM risk_flags WHERE id = NEW.risk_flag_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'risk flag belongs to another organization'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER risk_flags_tenant_consistency BEFORE INSERT ON risk_flags FOR EACH ROW EXECUTE FUNCTION enforce_credit_passport_tenant();
CREATE TRIGGER affordability_policies_tenant_consistency BEFORE INSERT ON affordability_policies FOR EACH ROW EXECUTE FUNCTION enforce_credit_passport_tenant();
CREATE TRIGGER credit_passports_tenant_consistency BEFORE INSERT ON credit_passports FOR EACH ROW EXECUTE FUNCTION enforce_credit_passport_tenant();
CREATE TRIGGER credit_passport_evidence_tenant_consistency BEFORE INSERT ON credit_passport_evidence FOR EACH ROW EXECUTE FUNCTION enforce_credit_passport_tenant();
CREATE TRIGGER credit_passport_risks_tenant_consistency BEFORE INSERT ON credit_passport_risk_flags FOR EACH ROW EXECUTE FUNCTION enforce_credit_passport_tenant();

CREATE TRIGGER risk_flags_no_mutation BEFORE UPDATE OR DELETE ON risk_flags FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER affordability_policies_no_mutation BEFORE UPDATE OR DELETE ON affordability_policies FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER credit_passports_no_mutation BEFORE UPDATE OR DELETE ON credit_passports FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER credit_passport_evidence_no_mutation BEFORE UPDATE OR DELETE ON credit_passport_evidence FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER credit_passport_risks_no_mutation BEFORE UPDATE OR DELETE ON credit_passport_risk_flags FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS credit_passports_org_period_idx ON credit_passports(organization_id, period_end DESC);
CREATE INDEX IF NOT EXISTS risk_flags_org_severity_idx ON risk_flags(organization_id, severity, created_at DESC);

INSERT INTO schema_migrations(version) VALUES('017_credit_passport') ON CONFLICT DO NOTHING;
