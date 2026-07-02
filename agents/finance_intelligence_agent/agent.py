from __future__ import annotations

from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import AgentOutput, Confidence, refusal_output


AGENT_NAME = "finance_intelligence_agent"


def run(request: AgentRequest) -> AgentOutput:
    if not request.evidence:
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "finance intelligence requires ledger and event evidence",
        )
    report = request.context.get("finance_report")
    if not isinstance(report, dict):
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "deterministic finance analytics report is required",
        )
    try:
        cashflow = _section(report, "cashflow")
        pnl = _section(report, "profit_and_loss")
        aging = _section(report, "receivables_aging")
        net_cashflow = _integer(cashflow, "net_cashflow_minor")
        revenue = _integer(pnl, "revenue_minor")
        net_profit = _integer(pnl, "net_profit_minor")
        overdue = _integer(aging, "overdue_minor")
    except ValueError as exc:
        return refusal_output(request.organization_id, AGENT_NAME, str(exc))

    confidence = min(item.confidence.score for item in request.evidence)
    output = AgentOutput(
        organization_id=request.organization_id,
        agent_name=AGENT_NAME,
        output_type="explanation",
        action="explain finance analytics",
        confidence=Confidence(
            score=confidence,
            tier="auto" if confidence >= 0.95 else "suggested",
            method="deterministic-finance-analytics-evidence",
        ),
        evidence=request.evidence,
        requires_human_approval=False,
        metadata={
            "summary": (
                f"Net cashflow is {net_cashflow}; revenue is {revenue}; "
                f"net profit is {net_profit}; overdue receivables are {overdue}."
            ),
            "net_cashflow_minor": net_cashflow,
            "revenue_minor": revenue,
            "net_profit_minor": net_profit,
            "overdue_receivables_minor": overdue,
            "guardrail": "explanation_only_not_a_posting_or_approval",
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
