from __future__ import annotations

from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import AgentOutput, Confidence, refusal_output


AGENT_NAME = "collections_agent"


def run(request: AgentRequest) -> AgentOutput:
    if not request.evidence:
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "collections drafts require invoice evidence",
        )
    case = request.context.get("collection_case")
    if not isinstance(case, dict):
        return refusal_output(request.organization_id, AGENT_NAME, "collection case is required")
    try:
        case_id = _text(case, "id")
        due_date = _text(case, "due_date")
        days_overdue = _positive_int(case, "days_overdue")
        amount_minor = _positive_int(case, "amount_minor")
        currency = _text(case, "currency")
    except ValueError as exc:
        return refusal_output(request.organization_id, AGENT_NAME, str(exc))

    confidence = min(item.confidence.score for item in request.evidence)
    output = AgentOutput(
        organization_id=request.organization_id,
        agent_name=AGENT_NAME,
        output_type="suggestion",
        action="draft collections reminder",
        confidence=Confidence(
            score=confidence,
            tier="suggested",
            method="deterministic-collections-case-evidence",
        ),
        evidence=request.evidence,
        requires_human_approval=True,
        metadata={
            "case_id": case_id,
            "draft_message": (
                f"Hello, invoice {case_id} for {amount_minor} {currency} was due on "
                f"{due_date} and is {days_overdue} days overdue. Please confirm the "
                "expected payment date or share proof of payment."
            ),
            "guardrail": "draft_only_human_must_send",
        },
    )
    output.validate()
    return output


def _text(values: dict[object, object], key: str) -> str:
    value = values.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"collection case {key} is required")
    return value.strip()


def _positive_int(values: dict[object, object], key: str) -> int:
    value = values.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"collection case {key} must be positive")
    return value
