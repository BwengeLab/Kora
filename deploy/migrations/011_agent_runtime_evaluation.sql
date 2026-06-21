CREATE TABLE IF NOT EXISTS agent_runs (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 idempotency_key TEXT NOT NULL,
 request_fingerprint TEXT NOT NULL,
 agent_name TEXT NOT NULL,
 output_type TEXT NOT NULL CHECK(output_type IN('classification','explanation','refusal','review_request','suggestion')),
 objective TEXT NOT NULL,
 model_route TEXT NOT NULL,
 external_model BOOLEAN NOT NULL DEFAULT false,
 redacted_fields JSONB NOT NULL DEFAULT '[]',
 output JSONB NOT NULL,
 refused BOOLEAN NOT NULL DEFAULT false,
 refusal_reason TEXT NOT NULL DEFAULT '',
 workflow_task_id TEXT REFERENCES approval_tasks(id),
 match_candidate_id TEXT REFERENCES match_candidates(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS agent_run_evidence (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 agent_run_id TEXT NOT NULL REFERENCES agent_runs(id),
 source_document_id TEXT NOT NULL,
 source_record_id TEXT NOT NULL,
 evidence JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(agent_run_id, source_document_id, source_record_id)
);

CREATE TABLE IF NOT EXISTS agent_evaluation_results (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 agent_run_id TEXT NOT NULL REFERENCES agent_runs(id),
 dataset_id TEXT NOT NULL,
 case_id TEXT NOT NULL,
 expected_action TEXT NOT NULL,
 actual_action TEXT NOT NULL,
 action_matches BOOLEAN NOT NULL,
 evidence_grounded BOOLEAN NOT NULL,
 hallucination_detected BOOLEAN NOT NULL,
 refusal_correct BOOLEAN NOT NULL,
 confidence_error NUMERIC(6,5) NOT NULL CHECK(confidence_error >= 0),
 confidence_calibrated BOOLEAN NOT NULL,
 passed BOOLEAN NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(agent_run_id, dataset_id, case_id)
);

CREATE TABLE IF NOT EXISTS agent_feedback (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 agent_run_id TEXT NOT NULL REFERENCES agent_runs(id),
 reviewer_user_id TEXT NOT NULL REFERENCES users(id),
 label TEXT NOT NULL CHECK(label IN('correct','incorrect','risky','unclear')),
 comment TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_agent_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE linked_org TEXT;
BEGIN
 IF TG_TABLE_NAME = 'agent_runs' THEN
  SELECT organization_id INTO linked_org FROM users WHERE id = NEW.user_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'agent user belongs to another organization'; END IF;
  IF NEW.workflow_task_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM approval_tasks WHERE id = NEW.workflow_task_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'workflow task belongs to another organization'; END IF;
  END IF;
  IF NEW.match_candidate_id IS NOT NULL THEN
   SELECT organization_id INTO linked_org FROM match_candidates WHERE id = NEW.match_candidate_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'match candidate belongs to another organization'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME IN ('agent_run_evidence','agent_evaluation_results','agent_feedback') THEN
  SELECT organization_id INTO linked_org FROM agent_runs WHERE id = NEW.agent_run_id;
  IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'agent run belongs to another organization'; END IF;
  IF TG_TABLE_NAME = 'agent_feedback' THEN
   SELECT organization_id INTO linked_org FROM users WHERE id = NEW.reviewer_user_id;
   IF linked_org IS NULL OR linked_org <> NEW.organization_id THEN RAISE EXCEPTION 'feedback reviewer belongs to another organization'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_runs_tenant_consistency BEFORE INSERT ON agent_runs FOR EACH ROW EXECUTE FUNCTION enforce_agent_tenant_consistency();
CREATE TRIGGER agent_run_evidence_tenant_consistency BEFORE INSERT ON agent_run_evidence FOR EACH ROW EXECUTE FUNCTION enforce_agent_tenant_consistency();
CREATE TRIGGER agent_evaluations_tenant_consistency BEFORE INSERT ON agent_evaluation_results FOR EACH ROW EXECUTE FUNCTION enforce_agent_tenant_consistency();
CREATE TRIGGER agent_feedback_tenant_consistency BEFORE INSERT ON agent_feedback FOR EACH ROW EXECUTE FUNCTION enforce_agent_tenant_consistency();

CREATE TRIGGER agent_runs_no_mutation BEFORE UPDATE OR DELETE ON agent_runs FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER agent_run_evidence_no_mutation BEFORE UPDATE OR DELETE ON agent_run_evidence FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER agent_evaluations_no_mutation BEFORE UPDATE OR DELETE ON agent_evaluation_results FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
CREATE TRIGGER agent_feedback_no_mutation BEFORE UPDATE OR DELETE ON agent_feedback FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

INSERT INTO schema_migrations(version) VALUES('011_agent_runtime_evaluation') ON CONFLICT DO NOTHING;
