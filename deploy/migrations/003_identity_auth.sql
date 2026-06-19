ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS password_salt TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS refresh_sessions (
    token_hash TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_audit_entry_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_entries are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_entries_no_update ON audit_entries;
CREATE TRIGGER audit_entries_no_update
BEFORE UPDATE ON audit_entries
FOR EACH ROW EXECUTE FUNCTION prevent_audit_entry_mutation();

DROP TRIGGER IF EXISTS audit_entries_no_delete ON audit_entries;
CREATE TRIGGER audit_entries_no_delete
BEFORE DELETE ON audit_entries
FOR EACH ROW EXECUTE FUNCTION prevent_audit_entry_mutation();

INSERT INTO schema_migrations (version)
VALUES ('003_identity_auth')
ON CONFLICT (version) DO NOTHING;

