BEGIN;

INSERT INTO organizations(id, name) VALUES('phase18-org', 'Phase 18 Test');
INSERT INTO users(id, organization_id, email, display_name) VALUES
 ('phase18-user', 'phase18-org', 'ops@phase18.test', 'Ops User');

INSERT INTO operational_health_reports(
 id, service_name, status, dependencies, generated_at
) VALUES(
 'phase18-health', 'gateway', 'DEGRADED',
 '[{"name":"postgres","status":"HEALTHY"},{"name":"redis","status":"DEGRADED"}]',
 now()
);
INSERT INTO operational_request_logs(
 trace_id, service_name, organization_id, user_id, method, path,
 status_code, duration_ms, fields, occurred_at
) VALUES(
 'trace-phase18', 'gateway', 'phase18-org', 'phase18-user',
 'POST', '/v1/reports', 200, 12, '{"route":"reports"}', now()
);
INSERT INTO operational_metrics(
 id, organization_id, metric_name, metric_value, unit, labels, observed_at
) VALUES(
 'phase18-metric', 'phase18-org', 'http_requests_total', 1, 'count',
 '{"service":"gateway"}', now()
);
INSERT INTO backup_manifests(
 id, organization_id, scope, storage_uri, database_lsn, object_snapshot,
 checksum, evidence, created_by, created_at
) VALUES(
 'phase18-backup', 'phase18-org', 'tenant', 's3://kora/phase18',
 '0/123', 'minio-snapshot-1', 'checksum-1',
 '{"source_document_id":"ops","source_record_id":"backup"}',
 'phase18-user', now()
);
INSERT INTO restore_drills(
 id, backup_id, organization_id, started_at, completed_at, verified,
 verified_tables, restored_checksum, evidence
) VALUES(
 'phase18-restore', 'phase18-backup', 'phase18-org',
 now(), now() + interval '1 minute', true,
 '{business_events,ledger_entries}', 'checksum-1',
 '{"source_document_id":"ops","source_record_id":"restore"}'
);
INSERT INTO security_check_results(
 id, organization_id, check_name, passed, severity, reason, evidence, checked_at
) VALUES(
 'phase18-security', 'phase18-org', 'TENANT_ISOLATION', true,
 'CRITICAL', 'cross-tenant access attempt was denied',
 '{"source_document_id":"ops","source_record_id":"tenant"}', now()
);
INSERT INTO tenant_cost_usage(
 id, organization_id, service_name, agent_name, model_route, units,
 unit_cost_micros, total_cost_micros, observed_at
) VALUES(
 'phase18-cost', 'phase18-org', 'agent-runtime',
 'credit_passport_agent', 'local', 1000, 2, 2000, now()
);

DO $$
BEGIN
 BEGIN
  INSERT INTO tenant_cost_usage(
   id, organization_id, service_name, units, unit_cost_micros,
   total_cost_micros, observed_at
  ) VALUES(
   'phase18-bad-cost', 'phase18-org', 'agent-runtime',
   1000, 2, 999, now()
  );
  RAISE EXCEPTION 'bad cost unexpectedly succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'bad cost unexpectedly succeeded' THEN RAISE; END IF;
 END;
 BEGIN
  UPDATE backup_manifests SET checksum = 'changed' WHERE id = 'phase18-backup';
  RAISE EXCEPTION 'append-only mutation unexpectedly succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'append-only mutation unexpectedly succeeded' THEN RAISE; END IF;
 END;
 IF (SELECT verified FROM restore_drills WHERE id = 'phase18-restore') IS NOT TRUE THEN
  RAISE EXCEPTION 'restore drill was not verified';
 END IF;
END;
$$;

ROLLBACK;
