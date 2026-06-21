import unittest

from agents.reconciliation_agent.agent import AGENT_NAME, run
from agents.runtime.runtime import AgentRequest
from agents.runtime.runtime_test import evidence


class ReconciliationAgentTests(unittest.TestCase):
    def test_ambiguous_candidate_produces_grounded_suggestion(self) -> None:
        output = run(self.request(0.82))
        self.assertEqual(output.action, "suggest reconciliation match")
        self.assertEqual(output.candidate_id, "candidate-1")
        self.assertEqual(output.workflow_task_id, "task-1")
        self.assertEqual(output.metadata["guardrail"], "suggestion_only")
        self.assertTrue(output.requires_human_approval)

    def test_auto_match_and_low_score_are_refused(self) -> None:
        self.assertTrue(run(self.request(0.95)).refused)
        self.assertTrue(run(self.request(0.69)).refused)

    @staticmethod
    def request(score: float) -> AgentRequest:
        return AgentRequest(
            organization_id="org-1",
            user_id="user-1",
            agent_name=AGENT_NAME,
            objective="review candidate",
            evidence=[evidence("payment"), evidence("invoice")],
            context={
                "candidate_id": "candidate-1",
                "workflow_task_id": "task-1",
                "candidate_score": score,
                "factors": {"reference": 1, "amount": 0.9},
            },
        )


if __name__ == "__main__":
    unittest.main()
