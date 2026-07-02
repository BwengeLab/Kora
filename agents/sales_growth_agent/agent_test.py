from __future__ import annotations

import unittest

from agents.runtime.runtime import AgentRequest
from agents.sales_growth_agent.agent import AGENT_NAME, run
from agents.shared.schemas import Confidence, Evidence, Money


class SalesGrowthAgentTest(unittest.TestCase):
    def test_explains_growth_signal_from_report(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="explain growth",
                evidence=[evidence()],
                context={
                    "finance_report": {
                        "profit_and_loss": {
                            "revenue_minor": 200000,
                            "gross_margin_basis_points": 5500,
                        },
                        "receivables_aging": {"overdue_minor": 30000},
                    }
                },
            )
        )
        self.assertEqual(output.output_type, "explanation")
        self.assertFalse(output.requires_human_approval)
        self.assertIn("analysis_only", output.metadata["guardrail"])

    def test_refuses_without_report(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="explain growth",
                evidence=[evidence()],
                context={},
            )
        )
        self.assertTrue(output.refused)


def evidence() -> Evidence:
    return Evidence(
        source_document_id="doc_1",
        source_record_id="report_1",
        transaction_reference="REPORT-1",
        occurred_on="2026-01-01",
        amount=Money(currency="RWF", minor_units=1),
        confidence=Confidence(score=0.95, tier="auto", method="fixture"),
        reason="fixture",
        ingestion_batch_id="batch_1",
        extraction_version_id="extract_1",
    )


if __name__ == "__main__":
    unittest.main()
