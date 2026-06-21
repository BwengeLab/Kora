import unittest
from datetime import datetime, timezone

from agents.runtime.postgres_repository import PostgresAgentRepository


class PostgresRepositoryTests(unittest.TestCase):
    def test_decodes_persisted_structured_output(self) -> None:
        row = {
            "id": "run-1",
            "organization_id": "org-1",
            "user_id": "user-1",
            "idempotency_key": "key-1",
            "request_fingerprint": "hash-1",
            "agent_name": "reconciliation_agent",
            "objective": "review",
            "model_route": "local-or-private-model",
            "external_model": False,
            "redacted_fields": ["account_number"],
            "output": {
                "organization_id": "org-1",
                "agent_name": "reconciliation_agent",
                "output_type": "suggestion",
                "action": "suggest reconciliation match",
                "confidence": {
                    "score": 0.82,
                    "tier": "suggested",
                    "method": "fixture",
                    "calibration_version": "v1",
                },
                "evidence": [
                    {
                        "source_document_id": "doc-1",
                        "source_record_id": "row-1",
                        "transaction_reference": "INV-1",
                        "occurred_on": "2026-06-01",
                        "amount": {
                            "currency": "RWF",
                            "minor_units": 1000,
                            "precision": 0,
                        },
                        "confidence": {
                            "score": 0.82,
                            "tier": "suggested",
                            "method": "fixture",
                            "calibration_version": "v1",
                        },
                        "reason": "fixture",
                        "ingestion_batch_id": "batch-1",
                        "extraction_version_id": "version-1",
                    }
                ],
                "requires_human_approval": True,
                "refused": False,
                "refusal_reason": "",
                "workflow_task_id": "task-1",
                "candidate_id": "candidate-1",
                "run_id": "run-1",
                "schema_version": "v1",
                "metadata": {},
            },
            "created_at": datetime.now(timezone.utc),
        }
        record = PostgresAgentRepository._decode_record(row)
        self.assertEqual(record.output.evidence[0].amount.minor_units, 1000)
        self.assertEqual(record.redacted_fields, ("account_number",))


if __name__ == "__main__":
    unittest.main()
