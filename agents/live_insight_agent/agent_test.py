import unittest

from agents.live_insight_agent.agent import run
from agents.runtime.runtime import AgentRequest
from agents.runtime.runtime_test import evidence


class LiveInsightAgentTests(unittest.TestCase):
    def test_requires_deterministic_summary_and_preserves_evidence(self) -> None:
        supplied = evidence("row-live")
        output = run(AgentRequest("org", "user", "finance_live", "explain", [supplied], {
            "deterministic_summary": "Cash remained positive.",
        }))
        self.assertEqual(output.metadata["explanation"], "Cash remained positive.")
        self.assertEqual(output.evidence, (supplied,))


if __name__ == "__main__":
    unittest.main()
