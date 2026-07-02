from __future__ import annotations

import unittest

from agents.finance_intelligence_agent.agent import AGENT_NAME, run
from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import Confidence, Evidence, Money


class FinanceIntelligenceAgentTest(unittest.TestCase):
    def test_explains_deterministic_finance_report(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="explain finance",
                evidence=[evidence()],
                context={
                    "finance_report": {
                        "cashflow": {"net_cashflow_minor": 50000},
                        "profit_and_loss": {"revenue_minor": 100000, "net_profit_minor": 30000},
                        "receivables_aging": {"overdue_minor": 12000},
                    }
                },
            )
        )
        self.assertFalse(output.refused)
        self.assertEqual(output.output_type, "explanation")
        self.assertFalse(output.requires_human_approval)
        self.assertIn("explanation_only", output.metadata["guardrail"])

    def test_refuses_without_report_or_evidence(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="explain finance",
                evidence=[],
                context={},
            )
        )
        self.assertTrue(output.refused)


def evidence() -> Evidence:
    return Evidence(
        source_document_id="doc_1",
        source_record_id="row_1",
        transaction_reference="REF-1",
        occurred_on="2026-01-01",
        amount=Money(currency="RWF", minor_units=1000),
        confidence=Confidence(score=0.96, tier="auto", method="fixture"),
        reason="fixture",
        ingestion_batch_id="batch_1",
        extraction_version_id="extract_1",
    )


if __name__ == "__main__":
    unittest.main()
