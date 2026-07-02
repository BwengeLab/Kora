from __future__ import annotations

import unittest

from agents.collections_agent.agent import AGENT_NAME, run
from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import Confidence, Evidence, Money


class CollectionsAgentTest(unittest.TestCase):
    def test_drafts_collection_reminder_only(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="draft reminder",
                evidence=[evidence()],
                context={
                    "collection_case": {
                        "id": "case_1",
                        "due_date": "2026-01-01",
                        "days_overdue": 35,
                        "amount_minor": 120000,
                        "currency": "RWF",
                    }
                },
            )
        )
        self.assertFalse(output.refused)
        self.assertEqual(output.output_type, "suggestion")
        self.assertTrue(output.requires_human_approval)
        self.assertIn("draft_only", output.metadata["guardrail"])

    def test_refuses_without_case(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="draft reminder",
                evidence=[evidence()],
                context={},
            )
        )
        self.assertTrue(output.refused)


def evidence() -> Evidence:
    return Evidence(
        source_document_id="doc_1",
        source_record_id="invoice_1",
        transaction_reference="INV-1",
        occurred_on="2026-01-01",
        amount=Money(currency="RWF", minor_units=120000),
        confidence=Confidence(score=0.95, tier="auto", method="fixture"),
        reason="fixture",
        ingestion_batch_id="batch_1",
        extraction_version_id="extract_1",
    )


if __name__ == "__main__":
    unittest.main()
