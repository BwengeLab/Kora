from __future__ import annotations

import unittest

from agents.audit_compliance_agent.agent import AGENT_NAME, run
from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import Confidence, Evidence, Money


class AuditComplianceAgentTest(unittest.TestCase):
    def test_requests_review_from_control_flags(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="audit controls",
                evidence=[evidence()],
                context={"risk_flags": [{"type": "MISSING_APPROVAL"}, {"type": "UNSUPPORTED_PAYMENT"}]},
            )
        )
        self.assertEqual(output.output_type, "review_request")
        self.assertTrue(output.requires_human_approval)
        self.assertIn("MISSING_APPROVAL", output.metadata["risk_types"])

    def test_refuses_without_compliance_flags(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org_1",
                user_id="u_1",
                agent_name=AGENT_NAME,
                objective="audit controls",
                evidence=[evidence()],
                context={"risk_flags": [{"type": "MARGIN_DROP"}]},
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
