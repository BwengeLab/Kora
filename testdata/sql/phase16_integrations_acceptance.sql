BEGIN;

INSERT INTO organizations(id, name) VALUES('phase16-org', 'Phase 16 Test');
INSERT INTO users(id, organization_id, email, display_name) VALUES
 ('phase16-admin', 'phase16-org', 'admin@phase16.test', 'Org Admin');
INSERT INTO ingestion_batches(id, organization_id, status)
 VALUES('phase16-batch', 'phase16-org', 'completed');
INSERT INTO documents(
 id, organization_id, batch_id, file_name, content_type, object_key, fingerprint, size_bytes
) VALUES(
 'phase16-doc', 'phase16-org', 'phase16-batch', 'momo.json',
 'application/vnd.kora.connector+json', 'phase16/momo.json', repeat('f', 64), 100
);
INSERT INTO extraction_versions(
 id, organization_id, document_id, version, extractor, quality_flags
) VALUES('phase16-version', 'phase16-org', 'phase16-doc', 1, 'connector:momo', '{}');
INSERT INTO source_records(
 id, organization_id, document_id, extraction_version_id, source_record_id,
 record_type, fields, confidence, quality_flags
) VALUES(
 'phase16-source', 'phase16-org', 'phase16-doc', 'phase16-version',
 'momo:conn:txn-1', 'payment',
 '{"reference":"MOMO-1","date":"2026-01-01","amount":"1000","currency":"RWF"}',
 0.99, '{complete}'
);
INSERT INTO business_events(
 id, organization_id, event_type, status, evidence, attributes
) VALUES(
 'phase16-event', 'phase16-org', 'PAYMENT_RECEIVED', 'ACTIVE',
 '{"source_document_id":"phase16-doc","source_record_id":"momo:conn:txn-1","extraction_version_id":"phase16-version"}',
 '{"source_system":"MOMO"}'
);
INSERT INTO connector_connections(
 id, organization_id, connector_kind, display_name, secret_ref, config, created_by
) VALUES(
 'phase16-conn', 'phase16-org', 'MOMO', 'MTN MoMo',
 'secret://phase16/momo', '{"environment":"sandbox"}', 'phase16-admin'
);
INSERT INTO connector_sync_runs(
 id, organization_id, connection_id, idempotency_key, source_name,
 window_start, window_end, sync_cursor, fingerprint, status,
 ingestion_batch_id, document_id, extraction_version_id, result
) VALUES(
 'phase16-sync', 'phase16-org', 'phase16-conn', 'idem-1', 'momo-statement',
 '2026-01-01', '2026-01-31', 'cursor-1', repeat('a', 64), 'COMPLETED',
 'phase16-batch', 'phase16-doc', 'phase16-version', '{"normalized_events":1}'
);
INSERT INTO connector_source_records(
 id, organization_id, sync_run_id, source_record_id, record_type,
 source_record_db_id, fields, confidence, quality_flags
) VALUES(
 'phase16-connector-source', 'phase16-org', 'phase16-sync',
 'txn-1', 'payment', 'phase16-source',
 '{"reference":"MOMO-1"}', 0.99, '{complete}'
);
INSERT INTO connector_normalized_events(
 sync_run_id, organization_id, connector_source_record_id, business_event_id, created
) VALUES(
 'phase16-sync', 'phase16-org', 'phase16-connector-source', 'phase16-event', true
);

DO $$
BEGIN
 BEGIN
  INSERT INTO connector_connections(
   id, organization_id, connector_kind, display_name, secret_ref, config, created_by
  ) VALUES(
   'phase16-bad-conn', 'phase16-org', 'MOMO', 'Bad MoMo',
   'secret://phase16/bad', '{"api_key":"raw"}', 'phase16-admin'
  );
  RAISE EXCEPTION 'raw credential config unexpectedly succeeded';
 EXCEPTION WHEN check_violation THEN
 END;
 BEGIN
  UPDATE connector_sync_runs SET status = 'FAILED' WHERE id = 'phase16-sync';
  RAISE EXCEPTION 'append-only mutation unexpectedly succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'append-only mutation unexpectedly succeeded' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM connector_normalized_events WHERE organization_id = 'phase16-org') <> 1 THEN
  RAISE EXCEPTION 'connector normalized event link missing';
 END IF;
END;
$$;

ROLLBACK;
