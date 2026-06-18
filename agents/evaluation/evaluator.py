from dataclasses import dataclass

from agents.shared.schemas import AgentOutput


@dataclass(frozen=True)
class EvaluationResult:
    agent_name: str
    evidence_grounded: bool
    hallucination_detected: bool
    refused_when_evidence_missing: bool
    confidence_error: float


def evaluate_output(output: AgentOutput, expected_action: str, expected_confidence: float) -> EvaluationResult:
    output.validate()
    hallucination = expected_action not in output.action
    return EvaluationResult(
        agent_name=output.agent_name,
        evidence_grounded=bool(output.evidence),
        hallucination_detected=hallucination,
        refused_when_evidence_missing=False,
        confidence_error=abs(output.confidence.score - expected_confidence),
    )

