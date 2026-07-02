CREATE TABLE IF NOT EXISTS finance_analytics_reports (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 period_start DATE NOT NULL,
 period_end DATE NOT NULL,
 as_of DATE NOT NULL,
 currency TEXT NOT NULL,
 input_fingerprint TEXT NOT NULL,
 payload JSONB NOT NULL,
 generated_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(period_end >= period_start AND as_of >= period_end),
 UNIQUE(organization_id, input_fingerprint)
);

CREATE TABLE IF NOT EXISTS finance_analytics_report_evidence (
 report_id TEXT NOT NULL REFERENCES finance_analytics_reports(id),
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 source_document_id TEXT NOT NULL REFERENCES documents(id),
 extraction_version_id TEXT NOT NULL REFERENCES extraction_versions(id),
 source_record_id TEXT NOT NULL REFERENCES source_records(id),
 evidence JSONB NOT NULL,
 PRIMARY KEY(report_id, source_document_id, extraction_version_id, source_record_id)
);

CREATE TABLE IF NOT EXISTS collection_cases (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 invoice_event_id TEXT NOT NULL REFERENCES business_events(id),
 external_party_id TEXT REFERENCES resolved_entities(id),
 amount_minor BIGINT NOT NULL CHECK(amount_minor >= 0),
 currency TEXT NOT NULL,
 due_date DATE NOT NULL,
 days_overdue INTEGER NOT NULL CHECK(days_overdue >= 0),
 state TEXT NOT NULL CHECK(state IN('OPEN','IN_REVIEW','REMINDER_DRAFTED','REMINDER_SENT','ESCALATED','CLOSED')),
 suggested_tone TEXT NOT NULL,
 draft_message TEXT NOT NULL,
 evidence JSONB NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, invoice_event_id, due_date)
);

CREATE TABLE IF NOT EXISTS collection_reminder_events (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 case_id TEXT NOT NULL REFERENCES collection_cases(id),
 sent_by TEXT NOT NULL REFERENCES users(id),
 delivery_channel TEXT NOT NULL,
 message TEXT NOT NULL,
 evidence JSONB NOT NULL,
 sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_records (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 event_id TEXT NOT NULL REFERENCES business_events(id),
 external_party_id TEXT REFERENCES resolved_entities(id),
 contract_number TEXT NOT NULL,
 start_date DATE NOT NULL,
 end_date DATE NOT NULL,
 renewal_date DATE,
 evidence JSONB NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(end_date >= start_date),
 UNIQUE(organization_id, contract_number)
);

CREATE TABLE IF NOT EXISTS contract_obligations (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 event_id TEXT NOT NULL REFERENCES business_events(id),
 contract_id TEXT REFERENCES contract_records(id),
 external_party_id TEXT REFERENCES resolved_entities(id),
 due_date DATE,
 amount_minor BIGINT NOT NULL CHECK(amount_minor >= 0),
 currency TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_renewal_alerts (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 contract_id TEXT NOT NULL REFERENCES contract_records(id),
 days_until_renewal INTEGER NOT NULL CHECK(days_until_renewal >= 0),
 alert_date DATE NOT NULL,
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, contract_id, alert_date)
);

CREATE TABLE IF NOT EXISTS payment_contract_mismatch_flags (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 event_id TEXT NOT NULL REFERENCES business_events(id),
 flag_type TEXT NOT NULL,
 reason TEXT NOT NULL,
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, event_id, flag_type)
);

CREATE TABLE IF NOT EXISTS relationship_graph_edges (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 from_node_id TEXT NOT NULL,
 to_node_id TEXT NOT NULL,
 edge_type TEXT NOT NULL,
 evidence JSONB NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, from_node_id, to_node_id, edge_type)
);

CREATE OR REPLACE FUNCTION enforce_phase14_tenant()
RETURNS trigger AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'finance_analytics_reports' THEN
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.generated_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'analytics generator belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'finance_analytics_report_evidence' THEN
  SELECT organization_id INTO linked_org FROM finance_analytics_reports WHERE id = NEW.report_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'analytics evidence report belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM documents WHERE id = NEW.source_document_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'analytics evidence document belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM extraction_versions WHERE id = NEW.extraction_version_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'analytics evidence extraction belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM source_records WHERE id = NEW.source_record_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'analytics evidence record belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'collection_cases' THEN
  SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.invoice_event_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'collection invoice event belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.created_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'collection creator belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'collection_reminder_events' THEN
  SELECT organization_id INTO linked_org FROM collection_cases WHERE id = NEW.case_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'collection reminder case belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.sent_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'collection sender belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'contract_records' THEN
  SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.event_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'contract event belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.created_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'contract creator belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'contract_obligations' THEN
  SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.event_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'obligation event belongs to another organization'; END IF;
  IF NEW.contract_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM contract_records WHERE id = NEW.contract_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'obligation contract belongs to another organization'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME = 'contract_renewal_alerts' THEN
  SELECT organization_id INTO linked_org FROM contract_records WHERE id = NEW.contract_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'renewal contract belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'payment_contract_mismatch_flags' THEN
  SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.event_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'mismatch event belongs to another organization'; END IF;
 ELSE
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.created_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'relationship graph creator belongs to another organization'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER finance_analytics_reports_tenant_consistency BEFORE INSERT ON finance_analytics_reports FOR EACH ROW EXECUTE FUNCTION enforce_phase14_tenant();
CREATE TRIGGER finance_analytics_evidence_tenant_consistency BEFORE INSERT ON finance_analytics_report_evidence FOR EACH ROW EXECUTE FUNCTION enforce_phase14_tenant();
CREATE TRIGGER collection_cases_tenant_consistency BEFORE INSERT ON collection_cases FOR EACH ROW EXECUTE FUNCTION enforce_phase14_tenant();
CREATE TRIGGER collection_reminders_tenant_consistency BEFORE INSERT ON collection_reminder_events FOR EACH ROW EXECUTE FUNCTION enforce_phase14_tenant();
CREATE TRIGGER contract_records_tenant_consistency BEFORE INSERT ON contract_records FOR EACH ROW EXECUTE FUNCTION enforce_phase14_tenant();
CREATE TRIGGER contract_obligations_tenant_consistency BEFORE INSERT ON contract_obligations FOR EACH ROW EXECUTE FUNCTION enforce_phase14_tenant();
CREATE TRIGGER contract_renewal_alerts_tenant_consistency BEFORE INSERT ON contract_renewal_alerts FOR EACH ROW EXECUTE FUNCTION enforce_phase14_tenant();
CREATE TRIGGER payment_contract_mismatch_tenant_consistency BEFORE INSERT ON payment_contract_mismatch_flags FOR EACH ROW EXECUTE FUNCTION enforce_phase14_tenant();
CREATE TRIGGER relationship_graph_edges_tenant_consistency BEFORE INSERT ON relationship_graph_edges FOR EACH ROW EXECUTE FUNCTION enforce_phase14_tenant();

CREATE TRIGGER finance_analytics_reports_no_mutation BEFORE UPDATE OR DELETE ON finance_analytics_reports FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER finance_analytics_evidence_no_mutation BEFORE UPDATE OR DELETE ON finance_analytics_report_evidence FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER collection_cases_no_mutation BEFORE UPDATE OR DELETE ON collection_cases FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER collection_reminders_no_mutation BEFORE UPDATE OR DELETE ON collection_reminder_events FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER contract_records_no_mutation BEFORE UPDATE OR DELETE ON contract_records FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER contract_obligations_no_mutation BEFORE UPDATE OR DELETE ON contract_obligations FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER contract_renewal_alerts_no_mutation BEFORE UPDATE OR DELETE ON contract_renewal_alerts FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER payment_contract_mismatch_no_mutation BEFORE UPDATE OR DELETE ON payment_contract_mismatch_flags FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER relationship_graph_edges_no_mutation BEFORE UPDATE OR DELETE ON relationship_graph_edges FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS finance_analytics_reports_org_period_idx ON finance_analytics_reports(organization_id, period_end DESC);
CREATE INDEX IF NOT EXISTS collection_cases_org_due_idx ON collection_cases(organization_id, due_date, state);
CREATE INDEX IF NOT EXISTS contract_records_org_end_idx ON contract_records(organization_id, end_date);
CREATE INDEX IF NOT EXISTS mismatch_flags_org_created_idx ON payment_contract_mismatch_flags(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS relationship_edges_org_from_idx ON relationship_graph_edges(organization_id, from_node_id);

INSERT INTO schema_migrations(version) VALUES('018_finance_collections_contracts') ON CONFLICT DO NOTHING;
