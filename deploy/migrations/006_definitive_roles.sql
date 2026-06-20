CREATE TABLE IF NOT EXISTS permission_catalog (
    permission TEXT PRIMARY KEY,
    plane TEXT NOT NULL CHECK (plane IN ('PLATFORM', 'TENANT')),
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS system_roles (
    role TEXT PRIMARY KEY,
    plane TEXT NOT NULL CHECK (plane IN ('PLATFORM', 'TENANT')),
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_role_permissions (
    role TEXT NOT NULL REFERENCES system_roles(role),
    permission TEXT NOT NULL REFERENCES permission_catalog(permission),
    PRIMARY KEY (role, permission)
);

INSERT INTO permission_catalog (permission, plane) VALUES
    ('tenant:read', 'TENANT'),
    ('users:manage', 'TENANT'),
    ('roles:manage', 'TENANT'),
    ('policy:manage', 'TENANT'),
    ('integrations:manage', 'TENANT'),
    ('billing:manage', 'TENANT'),
    ('data:retention.manage', 'TENANT'),
    ('documents:upload', 'TENANT'),
    ('data_quality:review', 'TENANT'),
    ('events:read', 'TENANT'),
    ('reconciliation:review', 'TENANT'),
    ('reconciliation:resolve', 'TENANT'),
    ('approval:create', 'TENANT'),
    ('financial:approve', 'TENANT'),
    ('ledger:post', 'TENANT'),
    ('ledger:reverse', 'TENANT'),
    ('collections:send', 'TENANT'),
    ('relationships:manage', 'TENANT'),
    ('contracts:manage', 'TENANT'),
    ('suppliers:manage', 'TENANT'),
    ('reports:read', 'TENANT'),
    ('reports:export', 'TENANT'),
    ('roi:read', 'TENANT'),
    ('credit_passport:generate', 'TENANT'),
    ('credit_passport:read', 'TENANT'),
    ('consent:manage', 'TENANT'),
    ('audit:read', 'TENANT'),
    ('platform:tenants.manage', 'PLATFORM'),
    ('platform:billing.manage', 'PLATFORM'),
    ('platform:config.manage', 'PLATFORM'),
    ('platform:health.read', 'PLATFORM'),
    ('platform:usage.read', 'PLATFORM'),
    ('platform:staff.manage', 'PLATFORM'),
    ('platform:security.manage', 'PLATFORM'),
    ('platform:support_access', 'PLATFORM')
ON CONFLICT (permission) DO NOTHING;

INSERT INTO system_roles (role, plane, description) VALUES
    ('SUPER_ADMIN', 'PLATFORM', 'Operates the Kora platform without ordinary tenant data access'),
    ('ORGANIZATION_OWNER', 'TENANT', 'Ultimate organization authority and final approver'),
    ('FINANCE_LEAD', 'TENANT', 'Runs finance approvals, ledger posting, close, and reporting'),
    ('FINANCE_OPERATOR', 'TENANT', 'Prepares data, resolves reconciliation, and proposes actions'),
    ('AUDITOR_COMPLIANCE', 'TENANT', 'Independent read-only oversight'),
    ('ORG_ADMIN', 'TENANT', 'Manages tenant users, roles, policies, integrations, and settings'),
    ('EXTERNAL_COLLABORATOR', 'TENANT', 'Receives only active consent-scoped access')
ON CONFLICT (role) DO NOTHING;

INSERT INTO system_role_permissions (role, permission) VALUES
    ('SUPER_ADMIN', 'platform:tenants.manage'),
    ('SUPER_ADMIN', 'platform:billing.manage'),
    ('SUPER_ADMIN', 'platform:config.manage'),
    ('SUPER_ADMIN', 'platform:health.read'),
    ('SUPER_ADMIN', 'platform:usage.read'),
    ('SUPER_ADMIN', 'platform:staff.manage'),
    ('SUPER_ADMIN', 'platform:security.manage'),
    ('SUPER_ADMIN', 'platform:support_access'),
    ('ORGANIZATION_OWNER', 'tenant:read'),
    ('ORGANIZATION_OWNER', 'users:manage'),
    ('ORGANIZATION_OWNER', 'roles:manage'),
    ('ORGANIZATION_OWNER', 'billing:manage'),
    ('ORGANIZATION_OWNER', 'data_quality:review'),
    ('ORGANIZATION_OWNER', 'events:read'),
    ('ORGANIZATION_OWNER', 'reconciliation:review'),
    ('ORGANIZATION_OWNER', 'financial:approve'),
    ('ORGANIZATION_OWNER', 'reports:read'),
    ('ORGANIZATION_OWNER', 'reports:export'),
    ('ORGANIZATION_OWNER', 'roi:read'),
    ('ORGANIZATION_OWNER', 'credit_passport:generate'),
    ('ORGANIZATION_OWNER', 'credit_passport:read'),
    ('ORGANIZATION_OWNER', 'consent:manage'),
    ('ORGANIZATION_OWNER', 'audit:read'),
    ('FINANCE_LEAD', 'tenant:read'),
    ('FINANCE_LEAD', 'documents:upload'),
    ('FINANCE_LEAD', 'data_quality:review'),
    ('FINANCE_LEAD', 'events:read'),
    ('FINANCE_LEAD', 'reconciliation:review'),
    ('FINANCE_LEAD', 'reconciliation:resolve'),
    ('FINANCE_LEAD', 'approval:create'),
    ('FINANCE_LEAD', 'financial:approve'),
    ('FINANCE_LEAD', 'ledger:post'),
    ('FINANCE_LEAD', 'ledger:reverse'),
    ('FINANCE_LEAD', 'collections:send'),
    ('FINANCE_LEAD', 'relationships:manage'),
    ('FINANCE_LEAD', 'contracts:manage'),
    ('FINANCE_LEAD', 'suppliers:manage'),
    ('FINANCE_LEAD', 'reports:read'),
    ('FINANCE_LEAD', 'reports:export'),
    ('FINANCE_LEAD', 'roi:read'),
    ('FINANCE_LEAD', 'credit_passport:generate'),
    ('FINANCE_LEAD', 'credit_passport:read'),
    ('FINANCE_LEAD', 'audit:read'),
    ('FINANCE_OPERATOR', 'tenant:read'),
    ('FINANCE_OPERATOR', 'documents:upload'),
    ('FINANCE_OPERATOR', 'data_quality:review'),
    ('FINANCE_OPERATOR', 'events:read'),
    ('FINANCE_OPERATOR', 'reconciliation:review'),
    ('FINANCE_OPERATOR', 'reconciliation:resolve'),
    ('FINANCE_OPERATOR', 'approval:create'),
    ('FINANCE_OPERATOR', 'reports:read'),
    ('AUDITOR_COMPLIANCE', 'tenant:read'),
    ('AUDITOR_COMPLIANCE', 'data_quality:review'),
    ('AUDITOR_COMPLIANCE', 'events:read'),
    ('AUDITOR_COMPLIANCE', 'reconciliation:review'),
    ('AUDITOR_COMPLIANCE', 'reports:read'),
    ('AUDITOR_COMPLIANCE', 'reports:export'),
    ('AUDITOR_COMPLIANCE', 'roi:read'),
    ('AUDITOR_COMPLIANCE', 'credit_passport:read'),
    ('AUDITOR_COMPLIANCE', 'audit:read'),
    ('ORG_ADMIN', 'tenant:read'),
    ('ORG_ADMIN', 'users:manage'),
    ('ORG_ADMIN', 'roles:manage'),
    ('ORG_ADMIN', 'policy:manage'),
    ('ORG_ADMIN', 'integrations:manage'),
    ('ORG_ADMIN', 'billing:manage'),
    ('ORG_ADMIN', 'data:retention.manage'),
    ('ORG_ADMIN', 'consent:manage'),
    ('ORG_ADMIN', 'audit:read')
ON CONFLICT (role, permission) DO NOTHING;

-- Merge old title-based bindings before renaming them to canonical function roles.
WITH ranked_bindings AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY organization_id, user_id,
                   CASE role
                       WHEN 'OWNER' THEN 'ORGANIZATION_OWNER'
                       WHEN 'CEO' THEN 'ORGANIZATION_OWNER'
                       WHEN 'CFO' THEN 'FINANCE_LEAD'
                       WHEN 'FINANCE_MANAGER' THEN 'FINANCE_LEAD'
                       WHEN 'ACCOUNTANT' THEN 'FINANCE_OPERATOR'
                       WHEN 'AUDITOR' THEN 'AUDITOR_COMPLIANCE'
                       WHEN 'ADMIN' THEN 'ORG_ADMIN'
                       WHEN 'EXTERNAL_LENDER' THEN 'EXTERNAL_COLLABORATOR'
                       WHEN 'EXTERNAL_AUDITOR' THEN 'EXTERNAL_COLLABORATOR'
                       ELSE role
                   END
               ORDER BY created_at, id
           ) AS duplicate_rank
    FROM role_bindings
)
DELETE FROM role_bindings
WHERE id IN (SELECT id FROM ranked_bindings WHERE duplicate_rank > 1);

UPDATE role_bindings
SET role = CASE role
    WHEN 'OWNER' THEN 'ORGANIZATION_OWNER'
    WHEN 'CEO' THEN 'ORGANIZATION_OWNER'
    WHEN 'CFO' THEN 'FINANCE_LEAD'
    WHEN 'FINANCE_MANAGER' THEN 'FINANCE_LEAD'
    WHEN 'ACCOUNTANT' THEN 'FINANCE_OPERATOR'
    WHEN 'AUDITOR' THEN 'AUDITOR_COMPLIANCE'
    WHEN 'ADMIN' THEN 'ORG_ADMIN'
    WHEN 'EXTERNAL_LENDER' THEN 'EXTERNAL_COLLABORATOR'
    WHEN 'EXTERNAL_AUDITOR' THEN 'EXTERNAL_COLLABORATOR'
    ELSE role
END;

ALTER TABLE role_bindings DROP CONSTRAINT IF EXISTS role_bindings_canonical_role;
ALTER TABLE role_bindings ADD CONSTRAINT role_bindings_canonical_role CHECK (
    role IN (
        'ORGANIZATION_OWNER',
        'FINANCE_LEAD',
        'FINANCE_OPERATOR',
        'AUDITOR_COMPLIANCE',
        'ORG_ADMIN',
        'EXTERNAL_COLLABORATOR'
    )
);

CREATE TABLE IF NOT EXISTS platform_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_role_bindings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES platform_users(id),
    role TEXT NOT NULL REFERENCES system_roles(role) CHECK (role = 'SUPER_ADMIN'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS custom_roles (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name, version)
);

CREATE TABLE IF NOT EXISTS custom_role_permissions (
    custom_role_id TEXT NOT NULL REFERENCES custom_roles(id),
    permission TEXT NOT NULL REFERENCES permission_catalog(permission),
    PRIMARY KEY (custom_role_id, permission)
);

CREATE TABLE IF NOT EXISTS custom_role_bindings (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    custom_role_id TEXT NOT NULL REFERENCES custom_roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, user_id, custom_role_id)
);

CREATE TABLE IF NOT EXISTS vertical_role_templates (
    id TEXT PRIMARY KEY,
    vertical TEXT NOT NULL,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (vertical, name)
);

CREATE TABLE IF NOT EXISTS vertical_role_template_permissions (
    template_id TEXT NOT NULL REFERENCES vertical_role_templates(id),
    permission TEXT NOT NULL REFERENCES permission_catalog(permission),
    PRIMARY KEY (template_id, permission)
);

CREATE TABLE IF NOT EXISTS external_access_grants (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    external_user_id TEXT NOT NULL REFERENCES users(id),
    allowed_permissions JSONB NOT NULL,
    purpose TEXT NOT NULL,
    consented_by TEXT NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION validate_external_access_grant()
RETURNS trigger AS $$
DECLARE
    granted_permission TEXT;
BEGIN
    IF jsonb_typeof(NEW.allowed_permissions) <> 'array' THEN
        RAISE EXCEPTION 'allowed_permissions must be a JSON array';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM role_bindings
        WHERE organization_id = NEW.organization_id
          AND user_id = NEW.external_user_id
          AND role = 'EXTERNAL_COLLABORATOR'
    ) THEN
        RAISE EXCEPTION 'external user must have EXTERNAL_COLLABORATOR role in the organization';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = NEW.consented_by AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'consenting user must belong to the organization';
    END IF;

    FOR granted_permission IN SELECT jsonb_array_elements_text(NEW.allowed_permissions)
    LOOP
        IF granted_permission NOT IN (
            'reports:read',
            'reports:export',
            'roi:read',
            'credit_passport:read',
            'audit:read'
        ) THEN
            RAISE EXCEPTION 'permission % is not shareable with an external collaborator', granted_permission;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS external_access_grants_validate ON external_access_grants;
CREATE TRIGGER external_access_grants_validate
BEFORE INSERT OR UPDATE ON external_access_grants
FOR EACH ROW EXECUTE FUNCTION validate_external_access_grant();

CREATE TABLE IF NOT EXISTS platform_support_access_grants (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    platform_user_id TEXT NOT NULL REFERENCES platform_users(id),
    approved_by_tenant_user_id TEXT NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rule_policies
    ADD COLUMN IF NOT EXISTS two_approver_threshold_minor BIGINT NOT NULL DEFAULT 10000000;

INSERT INTO schema_migrations (version)
VALUES ('006_definitive_roles')
ON CONFLICT (version) DO NOTHING;
