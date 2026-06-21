import unittest
from dataclasses import replace

from agents.runtime.runtime import AgentRequest, AgentRuntime
from agents.shared.schemas import AgentOutput, Confidence, Evidence, Money


class RuntimeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.runtime = AgentRuntime()
        self.runtime.register("fixture_agent", self.handler)

    def test_run_is_grounded_redacted_and_audited(self) -> None:
        request = self.request()
        record = self.runtime.run(request)
        self.assertTrue(record.run_id.startswith("agent_run_"))
        self.assertEqual(record.output.run_id, record.run_id)
        self.assertEqual(record.model_route, "local-or-private-model")
        self.assertIn("account_number", record.redacted_fields)
        self.assertEqual(self.runtime.get_run("org-1", record.run_id), record)
        with self.assertRaises(ValueError):
            self.runtime.get_run("org-2", record.run_id)

    def test_missing_evidence_returns_structured_refusal(self) -> None:
        request = replace(self.request(), evidence=[])
        record = self.runtime.run(request)
        self.assertTrue(record.output.refused)
        self.assertIn("insufficient evidence", record.output.refusal_reason)

    def test_idempotent_retry_returns_original_run(self) -> None:
        request = replace(self.request(), idempotency_key="request-1")
        first = self.runtime.run(request)
        second = self.runtime.run(request)
        self.assertEqual(first.run_id, second.run_id)
        with self.assertRaisesRegex(ValueError, "different request"):
            self.runtime.run(replace(request, objective="different objective"))

    def test_fabricated_evidence_is_rejected(self) -> None:
        def fabricating_handler(request: AgentRequest) -> AgentOutput:
            return replace(self.handler(request), evidence=[evidence("fabricated")])

        runtime = AgentRuntime()
        runtime.register("fixture_agent", fabricating_handler)
        with self.assertRaisesRegex(ValueError, "not supplied"):
            runtime.run(self.request())

    def test_modified_evidence_and_unauthorized_output_type_are_rejected(self) -> None:
        def modifying_handler(request: AgentRequest) -> AgentOutput:
            changed = replace(request.evidence[0], reason="invented reason")
            return replace(self.handler(request), evidence=[changed])

        runtime = AgentRuntime()
        runtime.register("fixture_agent", modifying_handler)
        with self.assertRaisesRegex(ValueError, "not supplied"):
            runtime.run(self.request())

        runtime = AgentRuntime()
        runtime.register("fixture_agent", self.handler, {"suggestion"})
        with self.assertRaisesRegex(ValueError, "unauthorized output type"):
            runtime.run(self.request())

    def test_repository_preserves_idempotency_across_runtime_restart(self) -> None:
        repository = FakeRepository()
        first_runtime = AgentRuntime(repository=repository)
        first_runtime.register("fixture_agent", self.handler)
        request = replace(self.request(), idempotency_key="durable-request")
        first = first_runtime.run(request)

        second_runtime = AgentRuntime(repository=repository)
        second_runtime.register("fixture_agent", self.handler)
        second = second_runtime.run(request)
        self.assertEqual(first.run_id, second.run_id)

    @staticmethod
    def handler(request: AgentRequest) -> AgentOutput:
        return AgentOutput(
            organization_id=request.organization_id,
            agent_name=request.agent_name,
            output_type="classification",
            action="classify extraction",
            confidence=Confidence(score=0.9, tier="auto", method="fixture"),
            evidence=request.evidence,
            requires_human_approval=False,
        )

    @staticmethod
    def request() -> AgentRequest:
        return AgentRequest(
            organization_id="org-1",
            user_id="user-1",
            agent_name="fixture_agent",
            objective="classify a record",
            evidence=[evidence("row-1")],
            context={"account_number": "secret", "quality": "clean"},
        )


class FakeRepository:
    def __init__(self) -> None:
        self.runs = {}

    def find_by_idempotency(self, organization_id, idempotency_key):
        return next(
            (
                record
                for record in self.runs.values()
                if record.organization_id == organization_id
                and record.idempotency_key == idempotency_key
            ),
            None,
        )

    def get_run(self, organization_id, run_id):
        record = self.runs.get(run_id)
        return record if record and record.organization_id == organization_id else None

    def save_run(self, record):
        self.runs[record.run_id] = record
        return record

def evidence(record_id: str) -> Evidence:
    return Evidence(
        source_document_id="doc-1",
        source_record_id=record_id,
        transaction_reference="TXN-1",
        occurred_on="2026-06-01",
        amount=Money(currency="RWF", minor_units=1000, precision=0),
        confidence=Confidence(score=0.9, tier="suggested", method="fixture"),
        reason="fixture",
        ingestion_batch_id="batch-1",
        extraction_version_id="version-1",
    )


if __name__ == "__main__":
    unittest.main()
