from __future__ import annotations

import unittest

from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import Confidence, Evidence, Money
from agents.supplier_margin_agent.agent import AGENT_NAME, run


class SupplierMarginAgentTest(unittest.TestCase):
    def test_suggests_review_from_seeded_flags(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="review supplier margins",
                evidence=[evidence()],
                context={"risk_flags": [{"type": "SUPPLIER_PRICE_HIKE"}, {"type": "MARGIN_DROP"}]},
            )
        )
        self.assertEqual(output.output_type, "suggestion")
        self.assertTrue(output.requires_human_approval)
        self.assertIn("SUPPLIER_PRICE_HIKE", output.metadata["risk_types"])

    def test_refuses_without_seeded_flags(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="review supplier margins",
                evidence=[evidence()],
                context={"risk_flags": []},
            )
        )
        self.assertTrue(output.refused)


def evidence() -> Evidence:
    return Evidence(
        source_document_id="doc_1",
        source_record_id="risk_1",
        transaction_reference="RISK-1",
        occurred_on="2026-01-01",
        amount=Money(currency="RWF", minor_units=1),
        confidence=Confidence(score=0.95, tier="auto", method="fixture"),
        reason="fixture",
        ingestion_batch_id="batch_1",
        extraction_version_id="extract_1",
    )


if __name__ == "__main__":
    unittest.main()
