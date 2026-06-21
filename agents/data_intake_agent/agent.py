from __future__ import annotations

from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import AgentOutput, Confidence, Evidence, refusal_output


AGENT_NAME = "data_intake_agent"


def run(request: AgentRequest) -> AgentOutput:
    if not request.evidence:
        return refusal_output(
            request.organization_id, AGENT_NAME, "extraction review requires evidence"
        )
    quality_flags = _string_list(request.context.get("quality_flags", []))
    missing_fields = _string_list(request.context.get("missing_fields", []))
    classification = str(request.context.get("classification", "")).strip()
    workflow_task_id = str(request.context.get("workflow_task_id", "")).strip()
    needs_review = bool(quality_flags or missing_fields)
    if needs_review and not workflow_task_id:
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "reviewable extraction must be linked to a workflow task",
        )
    action = (
        "request extraction review"
        if needs_review
        else "classify extraction as accepted"
    )
    score = min(item.confidence.score for item in request.evidence)
    if needs_review:
        score = min(score, 0.69)
    output = AgentOutput(
        organization_id=request.organization_id,
        agent_name=AGENT_NAME,
        output_type="review_request" if needs_review else "classification",
        action=action,
        confidence=Confidence(
            score=score,
            tier="review" if needs_review else "auto",
            method="data-quality-rules",
        ),
        evidence=request.evidence,
        requires_human_approval=needs_review,
        workflow_task_id=workflow_task_id,
        metadata={
            "quality_flags": quality_flags,
            "missing_fields": missing_fields,
            "classification": classification,
            "explanation": _explain(quality_flags, missing_fields, classification),
        },
    )
    output.validate()
    return output


def classify_quality(
    evidence: list[Evidence],
    quality_flags: list[str],
    organization_id: str = "unknown",
    workflow_task_id: str = "",
) -> AgentOutput:
    request = AgentRequest(
        organization_id=organization_id,
        user_id="system",
        agent_name=AGENT_NAME,
        objective="review extraction quality",
        evidence=evidence,
        context={
            "quality_flags": quality_flags,
            "workflow_task_id": workflow_task_id,
        },
    )
    return run(request)


def _explain(
    quality_flags: list[str], missing_fields: list[str], classification: str
) -> str:
    reasons: list[str] = []
    if quality_flags:
        reasons.append("quality flags: " + ", ".join(quality_flags))
    if missing_fields:
        reasons.append("missing fields: " + ", ".join(missing_fields))
    if classification:
        reasons.append("proposed classification: " + classification)
    return "; ".join(reasons) if reasons else "all required extraction checks passed"


def _string_list(value: object) -> list[str]:
    if not isinstance(value, (list, tuple)) or not all(isinstance(item, str) for item in value):
        raise ValueError("quality flags and missing fields must be string lists")
    return sorted(set(value))
