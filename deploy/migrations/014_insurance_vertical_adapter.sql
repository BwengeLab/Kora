CREATE TABLE IF NOT EXISTS insurance_adapter_mappings (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 record_type TEXT NOT NULL CHECK(record_type IN(
  'policy','claim','broker','premium','claim_payment','commission',
  'supplier_payment','bank_charge','refund'
 )),
 reference TEXT NOT NULL,
 source_document_id TEXT NOT NULL REFERENCES documents(id),
 source_record_id TEXT NOT NULL,
 extraction_version_id TEXT NOT NULL REFERENCES extraction_versions(id),
 related_ids JSONB NOT NULL DEFAULT '{}',
 quality_flags TEXT[] NOT NULL DEFAULT '{}',
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, source_document_id, extraction_version_id, source_record_id, record_type)
);

CREATE TABLE IF NOT EXISTS insurance_adapter_event_links (
 mapping_id TEXT NOT NULL REFERENCES insurance_adapter_mappings(id),
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 business_event_id TEXT NOT NULL REFERENCES business_events(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(mapping_id, business_event_id)
);

CREATE OR REPLACE FUNCTION enforce_insurance_adapter_tenant()
RETURNS TRIGGER AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'insurance_adapter_mappings' THEN
  SELECT organization_id INTO linked_org FROM documents WHERE id = NEW.source_document_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
   RAISE EXCEPTION 'insurance mapping document belongs to another organization';
  END IF;
  SELECT organization_id INTO linked_org FROM extraction_versions
   WHERE id = NEW.extraction_version_id AND document_id = NEW.source_document_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
   RAISE EXCEPTION 'insurance mapping extraction belongs to another organization';
  END IF;
 ELSE
  SELECT organization_id INTO linked_org FROM insurance_adapter_mappings WHERE id = NEW.mapping_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
   RAISE EXCEPTION 'insurance mapping belongs to another organization';
  END IF;
  SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.business_event_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN
   RAISE EXCEPTION 'insurance event belongs to another organization';
  END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER insurance_mappings_tenant_consistency
 BEFORE INSERT ON insurance_adapter_mappings
 FOR EACH ROW EXECUTE FUNCTION enforce_insurance_adapter_tenant();
CREATE TRIGGER insurance_event_links_tenant_consistency
 BEFORE INSERT ON insurance_adapter_event_links
 FOR EACH ROW EXECUTE FUNCTION enforce_insurance_adapter_tenant();
CREATE TRIGGER insurance_mappings_no_mutation
 BEFORE UPDATE OR DELETE ON insurance_adapter_mappings
 FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER insurance_event_links_no_mutation
 BEFORE UPDATE OR DELETE ON insurance_adapter_event_links
 FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS insurance_mappings_reference_idx
 ON insurance_adapter_mappings(organization_id, record_type, reference);

INSERT INTO schema_migrations(version)
VALUES('014_insurance_vertical_adapter')
ON CONFLICT DO NOTHING;
