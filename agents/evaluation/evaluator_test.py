import unittest

from agents.evaluation.evaluator import (
    EvaluationCase,
    FeedbackStore,
    evaluate_output,
    load_cases,
)
from agents.reconciliation_agent.agent import AGENT_NAME, run
from agents.reconciliation_agent.agent_test import ReconciliationAgentTests
from agents.shared.schemas import refusal_output


class EvaluatorTests(unittest.TestCase):
    def test_labelled_case_passes_grounding_and_calibration(self) -> None:
        case = load_cases("testdata/labels/agent_evaluation_cases.json")[0]
        output = run(ReconciliationAgentTests.request(0.82))
        result = evaluate_output(output, case)
        self.assertTrue(result.passed)
        self.assertFalse(result.hallucination_detected)

    def test_confidence_regression_fails(self) -> None:
        output = run(ReconciliationAgentTests.request(0.82))
        case = EvaluationCase(
            case_id="bad-confidence",
            agent_name=AGENT_NAME,
            expected_action="suggest reconciliation match",
            expected_confidence=0.2,
            expected_evidence_record_ids=("payment", "invoice"),
            confidence_tolerance=0.05,
        )
        self.assertFalse(evaluate_output(output, case).passed)

    def test_missing_evidence_refusal_case_passes(self) -> None:
        case = load_cases("testdata/labels/agent_evaluation_cases.json")[1]
        output = refusal_output(
            "org-1", "reconciliation_agent", "insufficient evidence"
        )
        self.assertTrue(evaluate_output(output, case).passed)

    def test_feedback_is_tenant_scoped_and_append_only(self) -> None:
        store = FeedbackStore()
        record = store.add("org-1", "run-1", "reviewer-1", "correct", "grounded")
        self.assertEqual(store.list_for_run("org-1", "run-1"), [record])
        self.assertEqual(store.list_for_run("org-2", "run-1"), [])
        with self.assertRaises(Exception):
            record.label = "incorrect"


if __name__ == "__main__":
    unittest.main()
