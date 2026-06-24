BEGIN;

INSERT INTO organizations(id, name) VALUES('phase12-org', 'Phase 12 Test');
INSERT INTO users(id, organization_id, email, display_name) VALUES
 ('phase12-owner', 'phase12-org', 'owner@phase12.test', 'Owner'),
 ('phase12-admin', 'phase12-org', 'admin@phase12.test', 'Admin'),
 ('phase12-external', 'phase12-org', 'external@phase12.test', 'External');
INSERT INTO role_bindings(id, organization_id, user_id, role)
 VALUES('phase12-role', 'phase12-org', 'phase12-external', 'EXTERNAL_COLLABORATOR');
INSERT INTO resolved_entities(
 id, organization_id, entity_type, canonical_key, display_name,
 external_reference, resolution_method, resolution_confidence
) VALUES(
 'phase12-party', 'phase12-org', 'EXTERNAL_PARTY', 'phase12-lender',
 'Phase 12 Lender', 'LENDER-1', 'fixture', 1
);
INSERT INTO approval_tasks(
 id, organization_id, suggested_action, creator_user_id, assigned_role, state,
 amount_minor, currency, required_approvers, approver_user_ids, evidence
) VALUES(
 'phase12-approval', 'phase12-org', 'grant_external_access', 'phase12-admin',
 'ORGANIZATION_OWNER', 'APPROVED', 0, 'RWF', 1, '["phase12-owner"]', '{}'
);
INSERT INTO external_access_grants(
 id, organization_id, external_user_id, recipient_party_id,
 allowed_permissions, allowed_data_categories, period_start, period_end,
 purpose, consented_by, expires_at, ongoing_monitoring_allowed,
 approval_task_id, evidence
) VALUES(
 'phase12-grant', 'phase12-org', 'phase12-external', 'phase12-party',
 '["credit_passport:read"]', '["credit_passport"]',
 now() - interval '1 year', now(), 'credit review', 'phase12-owner',
 now() + interval '30 days', false, 'phase12-approval', '{}'
);
INSERT INTO consent_grant_events(
 id, grant_id, organization_id, event_type, actor_user_id, evidence
) VALUES('phase12-event-granted', 'phase12-grant', 'phase12-org', 'GRANTED', 'phase12-owner', '{}');
INSERT INTO external_access_logs(
 id, grant_id, organization_id, external_user_id, permission, data_category,
 period_start, period_end, monitoring, resource, allowed, reason
) VALUES(
 'phase12-log', 'phase12-grant', 'phase12-org', 'phase12-external',
 'credit_passport:read', 'credit_passport', now() - interval '1 year', now(),
 false, 'passport-1', true, 'allowed by active consent'
);
UPDATE external_access_grants SET
 revoked_at = now(), revoked_by = 'phase12-owner', revocation_evidence = '{}'
WHERE id = 'phase12-grant';
INSERT INTO consent_grant_events(
 id, grant_id, organization_id, event_type, actor_user_id, evidence
) VALUES('phase12-event-revoked', 'phase12-grant', 'phase12-org', 'REVOKED', 'phase12-owner', '{}');

DO $$
BEGIN
 IF (SELECT count(*) FROM external_access_logs WHERE grant_id = 'phase12-grant') <> 1 THEN
  RAISE EXCEPTION 'consent access log was not retained';
 END IF;
 IF (SELECT revoked_at FROM external_access_grants WHERE id = 'phase12-grant') IS NULL THEN
  RAISE EXCEPTION 'consent revocation was not persisted';
 END IF;
END;
$$;

ROLLBACK;
