import unittest

from agents.credit_passport_agent.agent import AGENT_NAME, run
from agents.runtime.runtime import AgentRequest, AgentRuntime
from agents.shared.schemas import Confidence, Evidence, Money


class CreditPassportAgentTests(unittest.TestCase):
    def test_explains_deterministic_result_without_making_decision(self) -> None:
        output = run(self.request())
        self.assertFalse(output.refused)
        self.assertEqual(output.action, "explain credit passport affordability")
        self.assertEqual(output.metadata["guardrail"], "explanation_only_not_a_credit_decision")
        self.assertIn("162000 RWF", output.metadata["summary"])
        self.assertFalse(output.requires_human_approval)

    def test_refuses_missing_evidence_or_assumptions(self) -> None:
        request = self.request()
        self.assertTrue(run(AgentRequest(**{**request.__dict__, "evidence": []})).refused)
        context = dict(request.context)
        context["affordability"] = {**context["affordability"], "assumptions": []}
        self.assertTrue(run(AgentRequest(**{**request.__dict__, "context": context})).refused)

    def test_runtime_enforces_grounding_and_idempotency(self) -> None:
        runtime = AgentRuntime()
        runtime.register(AGENT_NAME, run, {"explanation"})
        request = self.request()
        first = runtime.run(request)
        second = runtime.run(request)
        self.assertEqual(first.run_id, second.run_id)
        self.assertFalse(first.external_model)
        self.assertEqual(first.output.evidence, tuple(request.evidence))

    @staticmethod
    def request() -> AgentRequest:
        return AgentRequest(
            organization_id="org-1",
            user_id="lead",
            agent_name=AGENT_NAME,
            objective="explain the generated credit passport",
            evidence=[passport_evidence()],
            context={
                "passport_id": "passport-1",
                "affordability": {
                    "currency": "RWF",
                    "max_monthly_payment_minor": 13500,
                    "estimated_principal_minor": 162000,
                    "term_months": 12,
                    "annual_interest_basis_points": 0,
                    "policy_id": "affordability-sme",
                    "policy_version": 1,
                    "assumptions": ["two months of verified net cashflow"],
                },
                "risk_flags": [
                    {
                        "type": "cash_outflow_concentration",
                        "severity": "MEDIUM",
                        "reason": "large single outflow",
                    }
                ],
            },
            idempotency_key="passport-explanation-1",
        )


def passport_evidence() -> Evidence:
    return Evidence(
        source_document_id="doc-1",
        source_record_id="payment-1",
        transaction_reference="PAY-1",
        occurred_on="2026-01-15",
        amount=Money(currency="RWF", minor_units=120000, precision=0),
        confidence=Confidence(score=0.99, tier="auto", method="fixture"),
        reason="verified cashflow",
        ingestion_batch_id="batch-1",
        extraction_version_id="version-1",
    )


if __name__ == "__main__":
    unittest.main()
