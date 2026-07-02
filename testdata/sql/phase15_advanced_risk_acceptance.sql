BEGIN;

INSERT INTO organizations(id, name) VALUES('phase15-org', 'Phase 15 Test');
INSERT INTO users(id, organization_id, email, display_name) VALUES
 ('phase15-lead', 'phase15-org', 'lead@phase15.test', 'Finance Lead');

INSERT INTO risk_detection_runs(
 id, organization_id, as_of, detector_version, thresholds, input_fingerprint, created_by
) VALUES(
 'phase15-run', 'phase15-org', '2026-02-01', 'v1',
 '{"supplier_price_increase_bps":1500,"margin_drop_bps":1000}',
 repeat('e', 64), 'phase15-lead'
);

INSERT INTO advanced_risk_flags(
 id, organization_id, detection_run_id, flag_type, severity, source_id, reason, evidence
) VALUES
 ('phase15-supplier-hike', 'phase15-org', 'phase15-run', 'SUPPLIER_PRICE_HIKE',
  'HIGH', 'bill-new', 'supplier item price increased by 3000 bps',
  '{"source_document_id":"doc","source_record_id":"bill-new"}'),
 ('phase15-missing-approval', 'phase15-org', 'phase15-run', 'MISSING_APPROVAL',
  'HIGH', 'payment-1', 'payment does not have linked approval',
  '{"source_document_id":"doc","source_record_id":"payment-1"}'),
 ('phase15-duplicate-vendor', 'phase15-org', 'phase15-run', 'DUPLICATE_VENDOR',
  'MEDIUM', 'supplier-1', 'duplicate vendor records detected',
  '{"source_document_id":"entity-resolution","source_record_id":"supplier-1"}'),
 ('phase15-margin-drop', 'phase15-org', 'phase15-run', 'MARGIN_DROP',
  'HIGH', 'report-current', 'gross margin dropped by 2500 bps',
  '{"source_document_id":"doc","source_record_id":"report-current"}'),
 ('phase15-unsupported-payment', 'phase15-org', 'phase15-run', 'UNSUPPORTED_PAYMENT',
  'HIGH', 'payment-2', 'payment lacks required support',
  '{"source_document_id":"doc","source_record_id":"payment-2"}');

INSERT INTO risk_flag_feedback(
 id, organization_id, risk_flag_id, reviewer_user_id, label, comment
) VALUES(
 'phase15-feedback', 'phase15-org', 'phase15-supplier-hike',
 'phase15-lead', 'CORRECT', 'seeded anomaly confirmed'
);

DO $$
BEGIN
 BEGIN
  UPDATE advanced_risk_flags SET severity = 'LOW' WHERE id = 'phase15-supplier-hike';
  RAISE EXCEPTION 'append-only mutation unexpectedly succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'append-only mutation unexpectedly succeeded' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM advanced_risk_flags WHERE organization_id = 'phase15-org') <> 5 THEN
  RAISE EXCEPTION 'seeded risk flags missing';
 END IF;
 IF (SELECT count(*) FROM risk_flag_feedback WHERE organization_id = 'phase15-org') <> 1 THEN
  RAISE EXCEPTION 'risk feedback missing';
 END IF;
END;
$$;

ROLLBACK;
