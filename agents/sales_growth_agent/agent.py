from __future__ import annotations

from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import AgentOutput, Confidence, refusal_output


AGENT_NAME = "sales_growth_agent"


def run(request: AgentRequest) -> AgentOutput:
    report = request.context.get("finance_report")
    if not request.evidence or not isinstance(report, dict):
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "sales growth analysis requires a deterministic finance report and evidence",
        )
    try:
        pnl = _section(report, "profit_and_loss")
        aging = _section(report, "receivables_aging")
        revenue = _integer(pnl, "revenue_minor")
        gross_margin_bps = _integer(pnl, "gross_margin_basis_points")
        overdue = _integer(aging, "overdue_minor")
    except ValueError as exc:
        return refusal_output(request.organization_id, AGENT_NAME, str(exc))
    confidence = min(item.confidence.score for item in request.evidence)
    output = AgentOutput(
        organization_id=request.organization_id,
        agent_name=AGENT_NAME,
        output_type="explanation",
        action="explain sales growth signal",
        confidence=Confidence(score=confidence, tier="suggested", method="deterministic-finance-report"),
        evidence=request.evidence,
        requires_human_approval=False,
        metadata={
            "summary": (
                f"Revenue is {revenue}; gross margin is {gross_margin_bps} bps; "
                f"overdue receivables are {overdue}."
            ),
            "growth_watch": "prioritize growth only where collection pressure and margin risk remain acceptable",
            "guardrail": "analysis_only_not_sales_instruction",
        },
    )
    output.validate()
    return output


def _section(values: dict[object, object], key: str) -> dict[object, object]:
    value = values.get(key)
    if not isinstance(value, dict):
        raise ValueError(f"finance report {key} section is required")
    return value


def _integer(values: dict[object, object], key: str) -> int:
    value = values.get(key)
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"finance report {key} must be an integer")
    return value
