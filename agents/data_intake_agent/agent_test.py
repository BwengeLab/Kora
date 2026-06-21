import unittest

from agents.data_intake_agent.agent import AGENT_NAME, run
from agents.runtime.runtime import AgentRequest
from agents.runtime.runtime_test import evidence


class DataIntakeAgentTests(unittest.TestCase):
    def test_quality_problem_creates_explained_review_suggestion(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org-1",
                user_id="user-1",
                agent_name=AGENT_NAME,
                objective="review extraction",
                evidence=[evidence("row-1")],
                context={
                    "quality_flags": ["low-confidence"],
                    "missing_fields": ["counterparty"],
                    "classification": "PAYMENT_RECEIVED",
                    "workflow_task_id": "task-1",
                },
            )
        )
        self.assertEqual(output.action, "request extraction review")
        self.assertEqual(output.workflow_task_id, "task-1")
        self.assertTrue(output.requires_human_approval)
        self.assertIn("counterparty", output.metadata["explanation"])

    def test_review_without_workflow_task_refuses(self) -> None:
        output = run(
            AgentRequest(
                organization_id="org-1",
                user_id="user-1",
                agent_name=AGENT_NAME,
                objective="review extraction",
                evidence=[evidence("row-1")],
                context={"quality_flags": ["source-conflict"]},
            )
        )
        self.assertTrue(output.refused)

    def test_malformed_quality_flags_are_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "string lists"):
            run(
                AgentRequest(
                    organization_id="org-1",
                    user_id="user-1",
                    agent_name=AGENT_NAME,
                    objective="review extraction",
                    evidence=[evidence("row-1")],
                    context={"quality_flags": "low-confidence"},
                )
            )


if __name__ == "__main__":
    unittest.main()
