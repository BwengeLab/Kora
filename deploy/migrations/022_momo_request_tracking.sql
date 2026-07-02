CREATE TABLE IF NOT EXISTS momo_requests (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 connection_id TEXT NOT NULL REFERENCES connector_connections(id),
 reference_id TEXT NOT NULL,
 external_id TEXT NOT NULL DEFAULT '',
 amount TEXT NOT NULL DEFAULT '',
 currency TEXT NOT NULL DEFAULT '',
 payer_msisdn TEXT NOT NULL DEFAULT '',
 payer_name TEXT NOT NULL DEFAULT '',
 payer_message TEXT NOT NULL DEFAULT '',
 payee_note TEXT NOT NULL DEFAULT '',
 request_state TEXT NOT NULL CHECK(request_state IN('PENDING','SUCCESSFUL','FAILED','UNKNOWN','RECEIVED')),
 financial_transaction_id TEXT NOT NULL DEFAULT '',
 reason TEXT NOT NULL DEFAULT '',
 collection_class TEXT NOT NULL DEFAULT '',
 requested_at TIMESTAMPTZ NOT NULL,
 last_provider_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, reference_id)
);

CREATE TABLE IF NOT EXISTS momo_request_events (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES momo_requests(id),
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 reference_id TEXT NOT NULL,
 from_state TEXT NOT NULL DEFAULT '',
 to_state TEXT NOT NULL CHECK(to_state IN('PENDING','SUCCESSFUL','FAILED','UNKNOWN','RECEIVED')),
 financial_transaction_id TEXT NOT NULL DEFAULT '',
 reason TEXT NOT NULL DEFAULT '',
 raw_provider_payload JSONB NOT NULL DEFAULT '{}',
 occurred_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_momo_request_tenant()
RETURNS trigger AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'momo_requests' THEN
  SELECT organization_id INTO linked_org FROM connector_connections WHERE id = NEW.connection_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'momo request connection belongs to another organization'; END IF;
 ELSE
  SELECT organization_id INTO linked_org FROM momo_requests WHERE id = NEW.request_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'momo request event belongs to another organization'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER momo_requests_tenant_consistency BEFORE INSERT ON momo_requests FOR EACH ROW EXECUTE FUNCTION enforce_momo_request_tenant();
CREATE TRIGGER momo_request_events_tenant_consistency BEFORE INSERT ON momo_request_events FOR EACH ROW EXECUTE FUNCTION enforce_momo_request_tenant();

CREATE TRIGGER momo_requests_no_mutation BEFORE UPDATE OR DELETE ON momo_requests FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER momo_request_events_no_mutation BEFORE UPDATE OR DELETE ON momo_request_events FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS momo_requests_org_ref_idx ON momo_requests(organization_id, reference_id);
CREATE INDEX IF NOT EXISTS momo_request_events_org_request_idx ON momo_request_events(organization_id, request_id, occurred_at);

INSERT INTO schema_migrations(version) VALUES('022_momo_request_tracking') ON CONFLICT DO NOTHING;
