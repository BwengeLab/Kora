CREATE TABLE IF NOT EXISTS approval_tasks (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 suggested_action TEXT NOT NULL,
 creator_user_id TEXT NOT NULL REFERENCES users(id),
 assigned_role TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL CHECK(state IN('SUGGESTED','ASSIGNED','APPROVED','REJECTED','EXECUTED','ESCALATED','REVERSED')),
 amount_minor BIGINT NOT NULL CHECK(amount_minor >= 0),
 currency TEXT NOT NULL,
 required_approvers INTEGER NOT NULL CHECK(required_approvers IN(1,2)),
 approver_user_ids JSONB NOT NULL DEFAULT '[]',
 match_candidate_id TEXT REFERENCES match_candidates(id),
 deadline TIMESTAMPTZ,
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_transition_events (
 id TEXT PRIMARY KEY,
 task_id TEXT NOT NULL REFERENCES approval_tasks(id),
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 from_state TEXT NOT NULL,
 to_state TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id),
 evidence JSONB NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 code TEXT NOT NULL,
 name TEXT NOT NULL,
 account_type TEXT NOT NULL CHECK(account_type IN('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
 currency TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS posting_groups (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 approval_task_id TEXT NOT NULL REFERENCES approval_tasks(id),
 reversal_of_posting_group_id TEXT REFERENCES posting_groups(id),
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS posting_groups_one_reversal_idx
 ON posting_groups(reversal_of_posting_group_id) WHERE reversal_of_posting_group_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ledger_entries (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 account_id TEXT NOT NULL REFERENCES ledger_accounts(id),
 debit_minor BIGINT NOT NULL DEFAULT 0 CHECK(debit_minor >= 0),
 credit_minor BIGINT NOT NULL DEFAULT 0 CHECK(credit_minor >= 0),
 currency TEXT NOT NULL,
 posting_group_id TEXT NOT NULL REFERENCES posting_groups(id),
 approval_task_id TEXT NOT NULL REFERENCES approval_tasks(id),
 reversal_of_entry_id TEXT REFERENCES ledger_entries(id),
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((debit_minor > 0 AND credit_minor = 0) OR (credit_minor > 0 AND debit_minor = 0))
);

CREATE OR REPLACE FUNCTION enforce_workflow_ledger_tenant()
RETURNS TRIGGER AS $$
DECLARE linked_org TEXT; approval_state TEXT;
BEGIN
 IF TG_TABLE_NAME = 'approval_tasks' THEN
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.creator_user_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'task creator belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'approval_transition_events' THEN
  SELECT organization_id INTO linked_org FROM approval_tasks WHERE id = NEW.task_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'approval task belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.actor_user_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'transition actor belongs to another organization'; END IF;
 ELSIF TG_TABLE_NAME = 'posting_groups' THEN
 SELECT organization_id INTO linked_org FROM approval_tasks WHERE id = NEW.approval_task_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'posting approval belongs to another organization'; END IF;
  SELECT state INTO approval_state FROM approval_tasks WHERE id = NEW.approval_task_id;
  IF approval_state NOT IN ('APPROVED','EXECUTED') THEN RAISE EXCEPTION 'posting requires an approved task'; END IF;
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.created_by;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'posting actor belongs to another organization'; END IF;
  IF NEW.reversal_of_posting_group_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM posting_groups WHERE id = NEW.reversal_of_posting_group_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'reversed posting belongs to another organization'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME = 'ledger_entries' THEN
  SELECT organization_id INTO linked_org FROM ledger_accounts WHERE id = NEW.account_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'ledger account belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM posting_groups WHERE id = NEW.posting_group_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'posting group belongs to another organization'; END IF;
  SELECT organization_id INTO linked_org FROM approval_tasks WHERE id = NEW.approval_task_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'entry approval belongs to another organization'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_tasks_tenant_consistency BEFORE INSERT ON approval_tasks FOR EACH ROW EXECUTE FUNCTION enforce_workflow_ledger_tenant();
CREATE TRIGGER approval_transitions_tenant_consistency BEFORE INSERT ON approval_transition_events FOR EACH ROW EXECUTE FUNCTION enforce_workflow_ledger_tenant();
CREATE TRIGGER posting_groups_tenant_consistency BEFORE INSERT ON posting_groups FOR EACH ROW EXECUTE FUNCTION enforce_workflow_ledger_tenant();
CREATE TRIGGER ledger_entries_tenant_consistency BEFORE INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION enforce_workflow_ledger_tenant();

CREATE OR REPLACE FUNCTION validate_posting_group_balance(group_id TEXT)
RETURNS BOOLEAN AS $$
 SELECT COALESCE(SUM(debit_minor),0) = COALESCE(SUM(credit_minor),0)
   AND COUNT(*) >= 2
 FROM ledger_entries WHERE posting_group_id = group_id;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION enforce_posting_group_balance()
RETURNS TRIGGER AS $$
BEGIN
 IF NOT validate_posting_group_balance(NEW.posting_group_id) THEN
  RAISE EXCEPTION 'posting group must contain at least two balanced entries';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entries_balanced
AFTER INSERT ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_posting_group_balance();

CREATE VIEW ledger_account_balances AS
 SELECT organization_id, account_id, currency,
        SUM(debit_minor - credit_minor) AS balance_minor
 FROM ledger_entries
 GROUP BY organization_id, account_id, currency;

CREATE OR REPLACE FUNCTION enforce_approval_task_update()
RETURNS TRIGGER AS $$
BEGIN
 IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id
    OR OLD.suggested_action <> NEW.suggested_action OR OLD.creator_user_id <> NEW.creator_user_id
    OR OLD.amount_minor <> NEW.amount_minor OR OLD.currency <> NEW.currency
    OR OLD.required_approvers <> NEW.required_approvers
    OR OLD.match_candidate_id IS DISTINCT FROM NEW.match_candidate_id
    OR OLD.deadline IS DISTINCT FROM NEW.deadline OR OLD.evidence <> NEW.evidence
    OR OLD.created_at <> NEW.created_at THEN
  RAISE EXCEPTION 'immutable approval task fields cannot be changed';
 END IF;
 IF NOT (
   (OLD.state = 'SUGGESTED' AND NEW.state IN ('ASSIGNED','REJECTED')) OR
   (OLD.state = 'ASSIGNED' AND NEW.state IN ('ASSIGNED','APPROVED','REJECTED','ESCALATED')) OR
   (OLD.state = 'ESCALATED' AND NEW.state IN ('ASSIGNED','REJECTED')) OR
   (OLD.state = 'APPROVED' AND NEW.state IN ('EXECUTED','REVERSED')) OR
   (OLD.state = 'EXECUTED' AND NEW.state = 'REVERSED')
 ) THEN
  RAISE EXCEPTION 'invalid approval task state transition % -> %', OLD.state, NEW.state;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_tasks_valid_update BEFORE UPDATE ON approval_tasks FOR EACH ROW EXECUTE FUNCTION enforce_approval_task_update();
CREATE TRIGGER approval_tasks_no_delete BEFORE DELETE ON approval_tasks FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER approval_transitions_no_mutation BEFORE UPDATE OR DELETE ON approval_transition_events FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER posting_groups_no_mutation BEFORE UPDATE OR DELETE ON posting_groups FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER ledger_entries_no_mutation BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER ledger_accounts_no_delete BEFORE DELETE ON ledger_accounts FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

INSERT INTO schema_migrations(version) VALUES('010_workflow_ledger') ON CONFLICT DO NOTHING;
