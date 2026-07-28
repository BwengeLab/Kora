from __future__ import annotations

from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import AgentOutput, Confidence, refusal_output


def run(request: AgentRequest) -> AgentOutput:
    if not request.evidence:
        return refusal_output(request.organization_id, request.agent_name, "live insight requires evidence")
    summary = str(request.context.get("deterministic_summary", "")).strip()
    if not summary:
        return refusal_output(
            request.organization_id, request.agent_name, "deterministic analysis summary is required"
        )
    confidence = min(item.confidence.score for item in request.evidence)
    output = AgentOutput(
        organization_id=request.organization_id,
        agent_name=request.agent_name,
        output_type="explanation",
        action="explain deterministic analysis",
        confidence=Confidence(
            score=confidence,
            tier="auto" if confidence >= 0.95 else "suggested",
            method="deterministic-analysis-with-model-explanation",
        ),
        evidence=request.evidence,
        requires_human_approval=False,
        metadata={"explanation": summary, "guardrail": "explanation_only"},
    )
    output.validate()
    return output

