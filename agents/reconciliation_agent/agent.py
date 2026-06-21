from __future__ import annotations

from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import AgentOutput, Confidence, Evidence, refusal_output


AGENT_NAME = "reconciliation_agent"
DEFAULT_SUGGESTED_THRESHOLD = 0.70
DEFAULT_AUTO_THRESHOLD = 0.95


def run(request: AgentRequest) -> AgentOutput:
    if not request.evidence:
        return refusal_output(
            request.organization_id, AGENT_NAME, "match review requires evidence"
        )
    candidate_id = str(request.context.get("candidate_id", "")).strip()
    workflow_task_id = str(request.context.get("workflow_task_id", "")).strip()
    score = float(request.context.get("candidate_score", 0))
    suggested_threshold = float(
        request.context.get("suggested_threshold", DEFAULT_SUGGESTED_THRESHOLD)
    )
    auto_threshold = float(
        request.context.get("auto_threshold", DEFAULT_AUTO_THRESHOLD)
    )
    if not candidate_id or not workflow_task_id:
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "match suggestion requires candidate and workflow task links",
        )
    if not suggested_threshold <= score < auto_threshold:
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "agent reviews only ambiguous candidates below the auto-match threshold",
        )
    factors = request.context.get("factors", {})
    explanation = _explain_factors(factors)
    output = AgentOutput(
        organization_id=request.organization_id,
        agent_name=AGENT_NAME,
        output_type="suggestion",
        action="suggest reconciliation match",
        confidence=Confidence(
            score=score,
            tier="suggested",
            method="deterministic-score-plus-evidence-review",
        ),
        evidence=request.evidence,
        requires_human_approval=True,
        workflow_task_id=workflow_task_id,
        candidate_id=candidate_id,
        metadata={
            "explanation": explanation,
            "factors": factors,
            "guardrail": "suggestion_only",
        },
    )
    output.validate()
    return output


def suggest_match(
    evidence: list[Evidence],
    explanation: str,
    organization_id: str = "unknown",
    candidate_id: str = "candidate-unknown",
    workflow_task_id: str = "task-unknown",
    score: float = 0.82,
) -> AgentOutput:
    return run(
        AgentRequest(
            organization_id=organization_id,
            user_id="system",
            agent_name=AGENT_NAME,
            objective="review ambiguous reconciliation candidate",
            evidence=evidence,
            context={
                "candidate_id": candidate_id,
                "workflow_task_id": workflow_task_id,
                "candidate_score": score,
                "factors": {"provided_explanation": explanation},
            },
        )
    )


def _explain_factors(factors: object) -> str:
    if not isinstance(factors, dict) or not factors:
        return "candidate is inside the configured human-review confidence band"
    numeric = []
    text = []
    for name, value in factors.items():
        try:
            numeric.append((str(name), float(value)))
        except (TypeError, ValueError):
            text.append(f"{name}={value}")
    strongest = sorted(
        numeric,
        key=lambda item: (-item[1], item[0]),
    )
    details = [f"{name}={value:.2f}" for name, value in strongest] + sorted(text)
    return "; ".join(details)
