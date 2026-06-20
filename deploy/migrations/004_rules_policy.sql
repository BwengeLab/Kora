CREATE TABLE IF NOT EXISTS rule_policies (
    id TEXT NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    scope TEXT NOT NULL,
    version INTEGER NOT NULL,
    auto_match_threshold NUMERIC NOT NULL,
    suggested_match_threshold NUMERIC NOT NULL,
    duplicate_window_days INTEGER NOT NULL,
    payment_tolerance_minor BIGINT NOT NULL,
    currency TEXT NOT NULL,
    approval_limits JSONB NOT NULL DEFAULT '{}',
    required_evidence_fields JSONB NOT NULL DEFAULT '[]',
    aging_buckets_days JSONB NOT NULL DEFAULT '[]',
    renewal_alert_days INTEGER NOT NULL DEFAULT 30,
    risk_rules JSONB NOT NULL DEFAULT '{}',
    sharing_scopes JSONB NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, version),
    UNIQUE (organization_id, scope, version)
);

CREATE TABLE IF NOT EXISTS rule_policy_audit_entries (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    policy_id TEXT NOT NULL,
    policy_version INTEGER NOT NULL,
    actor_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version)
VALUES ('004_rules_policy')
ON CONFLICT (version) DO NOTHING;

