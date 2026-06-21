import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from agents.runtime.service import app
import agents.runtime.service as service


class AgentRuntimeServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health(self) -> None:
        response = self.client.get("/healthz")
        self.assertEqual(response.status_code, 200)

    def test_reconciliation_run_and_feedback(self) -> None:
        response = self.client.post(
            "/v1/agent-runs",
            json={
                "organization_id": "org-service",
                "user_id": "user-1",
                "agent_name": "reconciliation_agent",
                "objective": "review candidate",
                "evidence": [self.evidence("payment"), self.evidence("invoice")],
                "context": {
                    "candidate_id": "candidate-1",
                    "workflow_task_id": "task-1",
                    "candidate_score": 0.82,
                    "factors": {"reference": 1, "amount": 0.9},
                },
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["output"]["action"], "suggest reconciliation match")
        self.assertTrue(body["output"]["requires_human_approval"])
        feedback_response = self.client.post(
            "/v1/agent-feedback",
            json={
                "organization_id": "org-service",
                "run_id": body["run_id"],
                "reviewer_user_id": "reviewer-1",
                "label": "correct",
                "comment": "evidence is sufficient",
            },
        )
        self.assertEqual(feedback_response.status_code, 201, feedback_response.text)
        evaluation = self.client.post(
            "/v1/agent-evaluations",
            json={
                "organization_id": "org-service",
                "run_id": body["run_id"],
                "dataset_id": "agent_evaluation_cases",
                "case_id": "ambiguous-payment-invoice-001",
            },
        )
        self.assertEqual(evaluation.status_code, 200, evaluation.text)
        self.assertTrue(evaluation.json()["passed"])

    def test_missing_evidence_refuses(self) -> None:
        response = self.client.post(
            "/v1/agent-runs",
            json={
                "organization_id": "org-service",
                "user_id": "user-1",
                "agent_name": "data_intake_agent",
                "objective": "review extraction",
                "evidence": [],
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["output"]["refused"])

    def test_configured_internal_token_is_enforced(self) -> None:
        with patch.object(service, "INTERNAL_TOKEN", "secret"):
            denied = self.client.post(
                "/v1/agent-runs",
                json={
                    "organization_id": "org-service",
                    "user_id": "user-1",
                    "agent_name": "data_intake_agent",
                    "objective": "review extraction",
                },
            )
            self.assertEqual(denied.status_code, 401)
            allowed = self.client.post(
                "/v1/agent-runs",
                headers={"X-Kora-Internal-Token": "secret"},
                json={
                    "organization_id": "org-service",
                    "user_id": "user-1",
                    "agent_name": "data_intake_agent",
                    "objective": "review extraction",
                },
            )
            self.assertEqual(allowed.status_code, 200)

    @staticmethod
    def evidence(record_id: str) -> dict[str, object]:
        return {
            "source_document_id": "doc-1",
            "source_record_id": record_id,
            "transaction_reference": "INV-1",
            "occurred_on": "2026-06-01",
            "amount": {"currency": "RWF", "minor_units": 1000, "precision": 0},
            "confidence": {"score": 0.82, "tier": "suggested", "method": "fixture"},
            "reason": "fixture",
            "ingestion_batch_id": "batch-1",
            "extraction_version_id": "version-1",
        }


if __name__ == "__main__":
    unittest.main()
