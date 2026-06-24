ALTER TABLE external_access_grants
 ADD COLUMN IF NOT EXISTS recipient_party_id TEXT NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS allowed_data_categories JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
 ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ NOT NULL DEFAULT now(),
 ADD COLUMN IF NOT EXISTS ongoing_monitoring_allowed BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS approval_task_id TEXT REFERENCES approval_tasks(id),
 ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS revoked_by TEXT REFERENCES users(id),
 ADD COLUMN IF NOT EXISTS revocation_evidence JSONB;

ALTER TABLE external_access_grants
 ADD CONSTRAINT external_grant_recipient_required CHECK(recipient_party_id <> '') NOT VALID,
 ADD CONSTRAINT external_grant_categories_nonempty CHECK(
  jsonb_typeof(allowed_data_categories) = 'array' AND jsonb_array_length(allowed_data_categories) > 0
 ) NOT VALID,
 ADD CONSTRAINT external_grant_period_valid CHECK(period_end >= period_start) NOT VALID;

CREATE OR REPLACE FUNCTION validate_external_access_grant()
RETURNS trigger AS $$
DECLARE granted_permission TEXT; linked_org TEXT;
BEGIN
 IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.allowed_permissions) <> 'array' OR jsonb_array_length(NEW.allowed_permissions) = 0 THEN
  RAISE EXCEPTION 'allowed_permissions must be a non-empty JSON array';
 END IF;
 IF jsonb_typeof(NEW.allowed_data_categories) <> 'array' OR jsonb_array_length(NEW.allowed_data_categories) = 0 THEN
  RAISE EXCEPTION 'allowed_data_categories must be a non-empty JSON array';
 END IF;
 IF NEW.period_end < NEW.period_start OR NEW.expires_at <= now() THEN
  RAISE EXCEPTION 'consent period and future expiry are required';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM role_bindings WHERE organization_id = NEW.organization_id
   AND user_id = NEW.external_user_id AND role = 'EXTERNAL_COLLABORATOR'
 ) THEN RAISE EXCEPTION 'external user must have EXTERNAL_COLLABORATOR role in the organization'; END IF;
 IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.consented_by AND organization_id = NEW.organization_id) THEN
  RAISE EXCEPTION 'consenting user must belong to the organization';
 END IF;
 SELECT organization_id INTO linked_org FROM resolved_entities
  WHERE id = NEW.recipient_party_id AND entity_type = 'EXTERNAL_PARTY';
 IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'consent recipient must be an external party in the organization'; END IF;
 IF NEW.approval_task_id IS NULL THEN RAISE EXCEPTION 'approved external-access task is required'; END IF;
 SELECT organization_id INTO linked_org FROM approval_tasks
  WHERE id = NEW.approval_task_id AND state IN('APPROVED','EXECUTED') AND suggested_action = 'grant_external_access';
 IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'external-access approval is invalid'; END IF;
 FOR granted_permission IN SELECT jsonb_array_elements_text(NEW.allowed_permissions)
 LOOP
  IF granted_permission NOT IN ('reports:read','reports:export','roi:read','credit_passport:read','audit:read') THEN
   RAISE EXCEPTION 'permission % is not shareable with an external collaborator', granted_permission;
  END IF;
 END LOOP;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_external_grant_update()
RETURNS trigger AS $$
DECLARE linked_org TEXT;
BEGIN
 IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id
  OR OLD.external_user_id <> NEW.external_user_id OR OLD.recipient_party_id <> NEW.recipient_party_id
  OR OLD.allowed_permissions <> NEW.allowed_permissions OR OLD.allowed_data_categories <> NEW.allowed_data_categories
  OR OLD.period_start <> NEW.period_start OR OLD.period_end <> NEW.period_end
  OR OLD.expires_at <> NEW.expires_at OR OLD.purpose <> NEW.purpose
  OR OLD.consented_by <> NEW.consented_by OR OLD.ongoing_monitoring_allowed <> NEW.ongoing_monitoring_allowed
  OR OLD.approval_task_id IS DISTINCT FROM NEW.approval_task_id OR OLD.evidence <> NEW.evidence
  OR OLD.created_at <> NEW.created_at THEN
  RAISE EXCEPTION 'consent grant scope is immutable';
 END IF;
 IF OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL OR NEW.revoked_by IS NULL OR NEW.revocation_evidence IS NULL THEN
  RAISE EXCEPTION 'only one evidence-backed revocation is allowed';
 END IF;
 SELECT organization_id INTO linked_org FROM users WHERE id = NEW.revoked_by;
 IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'revoking user belongs to another organization'; END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER external_access_grants_immutable_scope
 BEFORE UPDATE ON external_access_grants
 FOR EACH ROW EXECUTE FUNCTION enforce_external_grant_update();
CREATE TRIGGER external_access_grants_no_delete
 BEFORE DELETE ON external_access_grants
 FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TABLE IF NOT EXISTS consent_grant_events (
 id TEXT PRIMARY KEY,
 grant_id TEXT NOT NULL REFERENCES external_access_grants(id),
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 event_type TEXT NOT NULL CHECK(event_type IN('GRANTED','REVOKED')),
 actor_user_id TEXT NOT NULL REFERENCES users(id),
 evidence JSONB NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_access_logs (
 id TEXT PRIMARY KEY,
 grant_id TEXT NOT NULL,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 external_user_id TEXT NOT NULL,
 permission TEXT NOT NULL,
 data_category TEXT NOT NULL,
 period_start TIMESTAMPTZ NOT NULL,
 period_end TIMESTAMPTZ NOT NULL,
 monitoring BOOLEAN NOT NULL DEFAULT false,
 resource TEXT NOT NULL,
 allowed BOOLEAN NOT NULL,
 reason TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_consent_event_tenant()
RETURNS trigger AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'consent_grant_events' THEN
  SELECT organization_id INTO linked_org FROM external_access_grants WHERE id = NEW.grant_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'consent grant belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.actor_user_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'consent actor belongs to another organization'; END IF;
 ELSE
  SELECT organization_id INTO linked_org FROM external_access_grants WHERE id = NEW.grant_id;
  IF linked_org IS NOT NULL AND linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'access grant belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.external_user_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'external access user belongs to another organization'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_grant_events_tenant_consistency BEFORE INSERT ON consent_grant_events
 FOR EACH ROW EXECUTE FUNCTION enforce_consent_event_tenant();
CREATE TRIGGER external_access_logs_tenant_consistency BEFORE INSERT ON external_access_logs
 FOR EACH ROW EXECUTE FUNCTION enforce_consent_event_tenant();
CREATE TRIGGER consent_grant_events_no_mutation BEFORE UPDATE OR DELETE ON consent_grant_events
 FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER external_access_logs_no_mutation BEFORE UPDATE OR DELETE ON external_access_logs
 FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS active_external_grants_idx
 ON external_access_grants(organization_id, external_user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS external_access_logs_org_time_idx
 ON external_access_logs(organization_id, occurred_at DESC);

INSERT INTO schema_migrations(version) VALUES('016_consent_data_sharing') ON CONFLICT DO NOTHING;
