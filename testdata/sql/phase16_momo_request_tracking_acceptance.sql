BEGIN;

INSERT INTO organizations(id, name) VALUES('phase16-momo-org', 'Phase 16 MoMo');
INSERT INTO users(id, organization_id, email, display_name) VALUES
 ('phase16-momo-admin', 'phase16-momo-org', 'admin@momo.test', 'MoMo Admin');

INSERT INTO connector_connections(
 id, organization_id, connector_kind, display_name, secret_ref, config, created_by
) VALUES(
 'phase16-momo-conn', 'phase16-momo-org', 'MOMO', 'MTN MoMo',
 'secret://phase16/momo', '{"environment":"sandbox"}', 'phase16-momo-admin'
);

INSERT INTO momo_requests(
 id, organization_id, connection_id, reference_id, external_id, amount, currency,
 payer_msisdn, payer_name, request_state, requested_at
) VALUES(
 'momo-req-1', 'phase16-momo-org', 'phase16-momo-conn', 'req-1', 'invoice-1',
 '1000', 'RWF', '250780000000', 'Alice', 'PENDING', now()
);

INSERT INTO momo_request_events(
 id, request_id, organization_id, reference_id, from_state, to_state, occurred_at
) VALUES(
 'momo-evt-1', 'momo-req-1', 'phase16-momo-org', 'req-1', '', 'PENDING', now()
);

INSERT INTO momo_request_events(
 id, request_id, organization_id, reference_id, from_state, to_state, financial_transaction_id, reason, raw_provider_payload, occurred_at
) VALUES(
 'momo-evt-2', 'momo-req-1', 'phase16-momo-org', 'req-1', 'PENDING', 'SUCCESSFUL', 'fin-1', 'ok', '{"provider":"mtn"}', now()
);

DO $$
BEGIN
 BEGIN
  UPDATE momo_requests SET request_state = 'FAILED' WHERE id = 'momo-req-1';
  RAISE EXCEPTION 'append-only mutation unexpectedly succeeded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'append-only mutation unexpectedly succeeded' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM momo_request_events WHERE organization_id = 'phase16-momo-org') <> 2 THEN
  RAISE EXCEPTION 'momo request event history missing';
 END IF;
END;
$$;

ROLLBACK;
