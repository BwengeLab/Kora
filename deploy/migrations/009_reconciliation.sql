CREATE TABLE IF NOT EXISTS reconciliation_runs (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), policy_id TEXT NOT NULL,
 policy_version INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS match_candidates (
 id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES reconciliation_runs(id), organization_id TEXT NOT NULL REFERENCES organizations(id),
 left_event_id TEXT NOT NULL REFERENCES business_events(id), right_event_id TEXT REFERENCES business_events(id),
 state TEXT NOT NULL CHECK(state IN('MATCHED','SUGGESTED','REJECTED','UNMATCHED','DUPLICATE','SUSPICIOUS')),
 score NUMERIC(5,4) NOT NULL CHECK(score>=0 AND score<=1), confidence_tier TEXT NOT NULL,
 factors JSONB NOT NULL DEFAULT '{}', evidence JSONB NOT NULL, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
 id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES reconciliation_runs(id), organization_id TEXT NOT NULL REFERENCES organizations(id),
 event_id TEXT NOT NULL REFERENCES business_events(id), state TEXT NOT NULL, reason TEXT NOT NULL, evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS match_candidates_run_pair_idx ON match_candidates(run_id,left_event_id,COALESCE(right_event_id,''));
CREATE TRIGGER reconciliation_runs_no_mutation BEFORE UPDATE OR DELETE ON reconciliation_runs FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER match_candidates_no_mutation BEFORE UPDATE OR DELETE ON match_candidates FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER reconciliation_exceptions_no_mutation BEFORE UPDATE OR DELETE ON reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE OR REPLACE FUNCTION enforce_match_candidate_tenant()
RETURNS TRIGGER AS $$
DECLARE linked_org TEXT;
BEGIN
 SELECT organization_id INTO linked_org FROM reconciliation_runs WHERE id = NEW.run_id;
 IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'reconciliation run belongs to another organization'; END IF;
 SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.left_event_id;
 IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'left event belongs to another organization'; END IF;
 IF NEW.right_event_id IS NOT NULL THEN
  SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.right_event_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'right event belongs to another organization'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_reconciliation_exception_tenant()
RETURNS TRIGGER AS $$
DECLARE linked_org TEXT;
BEGIN
 SELECT organization_id INTO linked_org FROM reconciliation_runs WHERE id = NEW.run_id;
 IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'reconciliation run belongs to another organization'; END IF;
 SELECT organization_id INTO linked_org FROM business_events WHERE id = NEW.event_id;
 IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'event belongs to another organization'; END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_candidates_tenant_consistency BEFORE INSERT ON match_candidates FOR EACH ROW EXECUTE FUNCTION enforce_match_candidate_tenant();
CREATE TRIGGER reconciliation_exceptions_tenant_consistency BEFORE INSERT ON reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION enforce_reconciliation_exception_tenant();
INSERT INTO schema_migrations(version) VALUES('009_reconciliation') ON CONFLICT DO NOTHING;
