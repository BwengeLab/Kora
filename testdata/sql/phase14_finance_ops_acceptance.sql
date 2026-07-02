BEGIN;

INSERT INTO organizations(id, name) VALUES('phase14-org', 'Phase 14 Test');
INSERT INTO users(id, organization_id, email, display_name) VALUES
 ('phase14-lead', 'phase14-org', 'lead@phase14.test', 'Finance Lead');
INSERT INTO ingestion_batches(id, organization_id, status)
 VALUES('phase14-batch', 'phase14-org', 'completed');
INSERT INTO documents(
 id, organization_id, batch_id, file_name, content_type, object_key, fingerprint, size_bytes
) VALUES(
 'phase14-doc', 'phase14-org', 'phase14-batch', 'invoice.csv', 'text/csv',
 'phase14-org/invoice.csv', repeat('c', 64), 100
);
INSERT INTO extraction_versions(
 id, organization_id, document_id, version, extractor, quality_flags
) VALUES('phase14-version', 'phase14-org', 'phase14-doc', 1, 'fixture', '{}');
INSERT INTO source_records(
 id, organization_id, document_id, extraction_version_id, source_record_id,
 record_type, fields, confidence, quality_flags
) VALUES(
 'phase14-record', 'phase14-org', 'phase14-doc', 'phase14-version', 'row-1',
 'invoice', '{}', 1, '{complete}'
);
INSERT INTO business_events(
 id, organization_id, event_type, status, evidence, attributes
) VALUES
 ('phase14-invoice', 'phase14-org', 'INVOICE_ISSUED', 'ACTIVE',
  '{"source_document_id":"phase14-doc","source_record_id":"row-1","extraction_version_id":"phase14-version"}',
  '{"due_date":"2026-01-10"}'),
 ('phase14-contract-event', 'phase14-org', 'CONTRACT_SIGNED', 'ACTIVE',
  '{"source_document_id":"phase14-doc","source_record_id":"row-1","extraction_version_id":"phase14-version"}',
  '{"contract_number":"CON-14","start_date":"2026-01-01","end_date":"2026-12-31"}'),
 ('phase14-payment', 'phase14-org', 'PAYMENT_SENT', 'ACTIVE',
  '{"source_document_id":"phase14-doc","source_record_id":"row-1","extraction_version_id":"phase14-version"}',
  '{}');

INSERT INTO finance_analytics_reports(
 id, organization_id, period_start, period_end, as_of, currency,
 input_fingerprint, payload, generated_by
) VALUES(
 'phase14-report', 'phase14-org', '2026-01-01', '2026-01-31', '2026-02-20',
 'RWF', repeat('d', 64), '{"cashflow":{"net_cashflow_minor":50000}}', 'phase14-lead'
);
INSERT INTO finance_analytics_report_evidence(
 report_id, organization_id, source_document_id, extraction_version_id,
 source_record_id, evidence
) VALUES(
 'phase14-report', 'phase14-org', 'phase14-doc', 'phase14-version',
 'phase14-record', '{"source_record_id":"row-1"}'
);
INSERT INTO collection_cases(
 id, organization_id, invoice_event_id, amount_minor, currency, due_date,
 days_overdue, state, suggested_tone, draft_message, evidence, created_by
) VALUES(
 'phase14-case', 'phase14-org', 'phase14-invoice', 100000, 'RWF',
 '2026-01-10', 41, 'ESCALATED', 'firm', 'Please confirm payment date.',
 '{"source_document_id":"phase14-doc","source_record_id":"row-1"}', 'phase14-lead'
);
INSERT INTO collection_reminder_events(
 id, organization_id, case_id, sent_by, delivery_channel, message, evidence
) VALUES(
 'phase14-reminder', 'phase14-org', 'phase14-case', 'phase14-lead',
 'email', 'Please confirm payment date.',
 '{"source_document_id":"phase14-doc","source_record_id":"row-1"}'
);
INSERT INTO contract_records(
 id, organization_id, event_id, contract_number, start_date, end_date,
 evidence, created_by
) VALUES(
 'phase14-contract', 'phase14-org', 'phase14-contract-event', 'CON-14',
 '2026-01-01', '2026-12-31',
 '{"source_document_id":"phase14-doc","source_record_id":"row-1"}', 'phase14-lead'
);
INSERT INTO contract_obligations(
 id, organization_id, event_id, contract_id, amount_minor, currency,
 description, evidence
) VALUES(
 'phase14-obligation', 'phase14-org', 'phase14-invoice', 'phase14-contract',
 100000, 'RWF', 'invoice obligation',
 '{"source_document_id":"phase14-doc","source_record_id":"row-1"}'
);
INSERT INTO contract_renewal_alerts(
 id, organization_id, contract_id, days_until_renewal, alert_date, evidence
) VALUES(
 'phase14-renewal', 'phase14-org', 'phase14-contract', 30, '2026-12-01',
 '{"source_document_id":"phase14-doc","source_record_id":"row-1"}'
);
INSERT INTO payment_contract_mismatch_flags(
 id, organization_id, event_id, flag_type, reason, evidence
) VALUES(
 'phase14-mismatch', 'phase14-org', 'phase14-payment',
 'PAYMENT_WITHOUT_CONTRACT_OR_PO', 'payment has no contract link',
 '{"source_document_id":"phase14-doc","source_record_id":"row-1"}'
);
INSERT INTO relationship_graph_edges(
 id, organization_id, from_node_id, to_node_id, edge_type, evidence, created_by
) VALUES(
 'phase14-edge', 'phase14-org', 'phase14-invoice', 'phase14-contract',
 'EVENT_CONTRACT', '{"source_document_id":"phase14-doc","source_record_id":"row-1"}',
 'phase14-lead'
);

DO $$
BEGIN
 BEGIN
  UPDATE collection_cases SET state = 'CLOSED' WHERE id = 'phase14-case';
  RAISE EXCEPTION 'append-only mutation unexpectedly succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'append-only mutation unexpectedly succeeded' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM payment_contract_mismatch_flags WHERE organization_id = 'phase14-org') <> 1 THEN
  RAISE EXCEPTION 'mismatch flag was not stored';
 END IF;
 IF (SELECT count(*) FROM relationship_graph_edges WHERE organization_id = 'phase14-org') <> 1 THEN
  RAISE EXCEPTION 'relationship edge was not stored';
 END IF;
END;
$$;

ROLLBACK;
