CREATE TABLE IF NOT EXISTS operational_health_reports (
 id TEXT PRIMARY KEY,
 service_name TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('HEALTHY','DEGRADED','DOWN')),
 dependencies JSONB NOT NULL DEFAULT '[]',
 generated_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operational_request_logs (
 id BIGSERIAL PRIMARY KEY,
 trace_id TEXT NOT NULL,
 service_name TEXT NOT NULL,
 organization_id TEXT REFERENCES organizations(id),
 user_id TEXT REFERENCES users(id),
 method TEXT NOT NULL,
 path TEXT NOT NULL,
 status_code INTEGER NOT NULL CHECK(status_code >= 100 AND status_code <= 599),
 duration_ms BIGINT NOT NULL CHECK(duration_ms >= 0),
 fields JSONB NOT NULL DEFAULT '{}',
 occurred_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS operational_metrics (
 id TEXT PRIMARY KEY,
 organization_id TEXT REFERENCES organizations(id),
 metric_name TEXT NOT NULL,
 metric_value NUMERIC NOT NULL,
 unit TEXT NOT NULL,
 labels JSONB NOT NULL DEFAULT '{}',
 observed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS backup_manifests (
 id TEXT PRIMARY KEY,
 organization_id TEXT REFERENCES organizations(id),
 scope TEXT NOT NULL CHECK(scope IN('platform','tenant')),
 storage_uri TEXT NOT NULL,
 database_lsn TEXT NOT NULL,
 object_snapshot TEXT NOT NULL DEFAULT '',
 checksum TEXT NOT NULL,
 evidence JSONB NOT NULL,
 created_by TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS restore_drills (
 id TEXT PRIMARY KEY,
 backup_id TEXT NOT NULL REFERENCES backup_manifests(id),
 organization_id TEXT REFERENCES organizations(id),
 started_at TIMESTAMPTZ NOT NULL,
 completed_at TIMESTAMPTZ NOT NULL,
 verified BOOLEAN NOT NULL,
 verified_tables TEXT[] NOT NULL DEFAULT '{}',
 restored_checksum TEXT NOT NULL,
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(completed_at >= started_at)
);

CREATE TABLE IF NOT EXISTS security_check_results (
 id TEXT PRIMARY KEY,
 organization_id TEXT REFERENCES organizations(id),
 check_name TEXT NOT NULL,
 passed BOOLEAN NOT NULL,
 severity TEXT NOT NULL CHECK(severity IN('INFO','WARNING','CRITICAL')),
 reason TEXT NOT NULL,
 evidence JSONB NOT NULL,
 checked_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_cost_usage (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 service_name TEXT NOT NULL,
 agent_name TEXT NOT NULL DEFAULT '',
 model_route TEXT NOT NULL DEFAULT '',
 units BIGINT NOT NULL CHECK(units >= 0),
 unit_cost_micros BIGINT NOT NULL CHECK(unit_cost_micros >= 0),
 total_cost_micros BIGINT NOT NULL CHECK(total_cost_micros >= 0),
 observed_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_production_hardening_tenant()
RETURNS trigger AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'operational_request_logs' THEN
  IF NEW.user_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM users WHERE id = NEW.user_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'request log user belongs to another organization'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME = 'restore_drills' THEN
  SELECT organization_id INTO linked_org FROM backup_manifests WHERE id = NEW.backup_id;
  IF linked_org IS DISTINCT FROM NEW.organization_id THEN RAISE EXCEPTION 'restore drill backup belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'tenant_cost_usage' THEN
  IF NEW.total_cost_micros <> NEW.units * NEW.unit_cost_micros THEN RAISE EXCEPTION 'total cost must equal units times unit cost'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER request_logs_tenant_consistency BEFORE INSERT ON operational_request_logs FOR EACH ROW EXECUTE FUNCTION enforce_production_hardening_tenant();
CREATE TRIGGER restore_drills_tenant_consistency BEFORE INSERT ON restore_drills FOR EACH ROW EXECUTE FUNCTION enforce_production_hardening_tenant();
CREATE TRIGGER tenant_cost_usage_consistency BEFORE INSERT ON tenant_cost_usage FOR EACH ROW EXECUTE FUNCTION enforce_production_hardening_tenant();

CREATE TRIGGER operational_health_no_mutation BEFORE UPDATE OR DELETE ON operational_health_reports FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER request_logs_no_mutation BEFORE UPDATE OR DELETE ON operational_request_logs FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER operational_metrics_no_mutation BEFORE UPDATE OR DELETE ON operational_metrics FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER backup_manifests_no_mutation BEFORE UPDATE OR DELETE ON backup_manifests FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER restore_drills_no_mutation BEFORE UPDATE OR DELETE ON restore_drills FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER security_checks_no_mutation BEFORE UPDATE OR DELETE ON security_check_results FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER tenant_cost_usage_no_mutation BEFORE UPDATE OR DELETE ON tenant_cost_usage FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS request_logs_trace_idx ON operational_request_logs(trace_id);
CREATE INDEX IF NOT EXISTS request_logs_org_time_idx ON operational_request_logs(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS metrics_org_name_time_idx ON operational_metrics(organization_id, metric_name, observed_at DESC);
CREATE INDEX IF NOT EXISTS backup_manifests_org_time_idx ON backup_manifests(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS security_checks_org_time_idx ON security_check_results(organization_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS cost_usage_org_time_idx ON tenant_cost_usage(organization_id, observed_at DESC);

INSERT INTO schema_migrations(version) VALUES('021_production_hardening') ON CONFLICT DO NOTHING;
