from __future__ import annotations

from collections.abc import Mapping, Sequence

from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import AgentOutput, Confidence, refusal_output


AGENT_NAME = "audit_compliance_agent"


def run(request: AgentRequest) -> AgentOutput:
    flags = _flags(request.context.get("risk_flags"))
    relevant = [
        flag
        for flag in flags
        if flag.get("type") in {"MISSING_APPROVAL", "UNSUPPORTED_PAYMENT", "DUPLICATE_VENDOR"}
    ]
    if not request.evidence or not relevant:
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "audit analysis requires seeded control or compliance risk flags",
        )
    confidence = min(item.confidence.score for item in request.evidence)
    output = AgentOutput(
        organization_id=request.organization_id,
        agent_name=AGENT_NAME,
        output_type="review_request",
        action="request compliance review",
        confidence=Confidence(score=confidence, tier="review", method="deterministic-control-risk-flags"),
        evidence=request.evidence,
        requires_human_approval=True,
        metadata={
            "risk_count": len(relevant),
            "risk_types": sorted({str(flag["type"]) for flag in relevant}),
            "recommended_review": "verify approval trail, supporting evidence, and vendor master data before close",
            "guardrail": "review_request_only",
        },
    )
    output.validate()
    return output


def _flags(value: object) -> list[Mapping[str, object]]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        return []
    return [item for item in value if isinstance(item, Mapping) and isinstance(item.get("type"), str)]
