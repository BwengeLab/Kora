BEGIN;

INSERT INTO organizations(id, name) VALUES('phase13-org', 'Phase 13 Test');
INSERT INTO users(id, organization_id, email, display_name) VALUES
 ('phase13-lead', 'phase13-org', 'lead@phase13.test', 'Finance Lead');
INSERT INTO ingestion_batches(id, organization_id, status)
 VALUES('phase13-batch', 'phase13-org', 'completed');
INSERT INTO documents(
 id, organization_id, batch_id, file_name, content_type, object_key, fingerprint, size_bytes
) VALUES(
 'phase13-doc', 'phase13-org', 'phase13-batch', 'statement.csv', 'text/csv',
 'phase13-org/statement.csv', repeat('a', 64), 100
);
INSERT INTO extraction_versions(
 id, organization_id, document_id, version, extractor, quality_flags
) VALUES('phase13-version', 'phase13-org', 'phase13-doc', 1, 'fixture', '{}');
INSERT INTO source_records(
 id, organization_id, document_id, extraction_version_id, source_record_id,
 record_type, fields, confidence, quality_flags
) VALUES(
 'phase13-record', 'phase13-org', 'phase13-doc', 'phase13-version', 'row-1',
 'payment', '{}', 1, '{complete}'
);
INSERT INTO business_events(
 id, organization_id, event_type, status, evidence, attributes
) VALUES(
 'phase13-event', 'phase13-org', 'PAYMENT_RECEIVED', 'ACTIVE',
 '{"source_document_id":"phase13-doc","source_record_id":"row-1","extraction_version_id":"phase13-version"}', '{}'
);
INSERT INTO risk_flags(
 id, organization_id, source_event_id, flag_type, severity, reason, evidence
) VALUES(
 'phase13-risk', 'phase13-org', 'phase13-event', 'cashflow_concentration',
 'MEDIUM', 'single payment concentration',
 '{"source_document_id":"phase13-doc","source_record_id":"row-1"}'
);
INSERT INTO affordability_policies(
 id, organization_id, version, currency, max_debt_service_basis_points,
 stress_buffer_basis_points, annual_interest_basis_points, term_months,
 evidence, created_by
) VALUES(
 'phase13-policy', 'phase13-org', 1, 'RWF', 4000, 1000, 1800, 24,
 '{"source_document_id":"phase13-doc","source_record_id":"row-1"}', 'phase13-lead'
);
INSERT INTO credit_passports(
 id, organization_id, period_start, period_end, as_of,
 affordability_policy_id, affordability_policy_version,
 input_fingerprint, payload, generated_by
) VALUES(
 'phase13-passport', 'phase13-org', '2026-01-01', '2026-03-31', '2026-04-01',
 'phase13-policy', 1, repeat('b', 64), '{"id":"phase13-passport"}', 'phase13-lead'
);
INSERT INTO credit_passport_evidence(
 passport_id, organization_id, source_document_id, extraction_version_id,
 source_record_id, evidence
) VALUES(
 'phase13-passport', 'phase13-org', 'phase13-doc', 'phase13-version',
 'phase13-record', '{"source_record_id":"row-1"}'
);
INSERT INTO credit_passport_risk_flags(passport_id, risk_flag_id, organization_id)
 VALUES('phase13-passport', 'phase13-risk', 'phase13-org');

DO $$
BEGIN
 BEGIN
  UPDATE risk_flags SET reason = 'changed' WHERE id = 'phase13-risk';
  RAISE EXCEPTION 'append-only mutation unexpectedly succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'append-only mutation unexpectedly succeeded' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM credit_passport_evidence WHERE passport_id = 'phase13-passport') <> 1 THEN
  RAISE EXCEPTION 'passport evidence was not linked';
 END IF;
END;
$$;

ROLLBACK;
