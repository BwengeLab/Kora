from __future__ import annotations

from agents.runtime.runtime import AgentRequest
from agents.shared.schemas import AgentOutput, Confidence, refusal_output


AGENT_NAME = "credit_passport_agent"


def run(request: AgentRequest) -> AgentOutput:
    if not request.evidence:
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "credit passport explanation requires source evidence",
        )
    passport_id = str(request.context.get("passport_id", "")).strip()
    affordability = request.context.get("affordability")
    if not passport_id or not isinstance(affordability, dict):
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "credit passport ID and deterministic affordability result are required",
        )
    try:
        monthly = _nonnegative_int(affordability, "max_monthly_payment_minor")
        principal = _nonnegative_int(affordability, "estimated_principal_minor")
        term = _positive_int(affordability, "term_months")
        interest_bps = _nonnegative_int(affordability, "annual_interest_basis_points")
        policy_version = _positive_int(affordability, "policy_version")
    except ValueError as exc:
        return refusal_output(request.organization_id, AGENT_NAME, str(exc))
    currency = str(affordability.get("currency", "")).strip()
    policy_id = str(affordability.get("policy_id", "")).strip()
    assumptions = affordability.get("assumptions")
    if (
        not currency
        or not policy_id
        or not isinstance(assumptions, (list, tuple))
        or not assumptions
        or not all(isinstance(item, str) and item.strip() for item in assumptions)
    ):
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "affordability requires currency, policy, and explicit assumptions",
        )
    risk_flags = request.context.get("risk_flags", [])
    if not isinstance(risk_flags, (list, tuple)) or not all(
        isinstance(item, dict)
        and str(item.get("type", "")).strip()
        and str(item.get("severity", "")).strip()
        and str(item.get("reason", "")).strip()
        for item in risk_flags
    ):
        return refusal_output(
            request.organization_id,
            AGENT_NAME,
            "risk flags must retain type, severity, and evidence-backed reason",
        )
    confidence = min(item.confidence.score for item in request.evidence)
    output = AgentOutput(
        organization_id=request.organization_id,
        agent_name=AGENT_NAME,
        output_type="explanation",
        action="explain credit passport affordability",
        confidence=Confidence(
            score=confidence,
            tier="auto" if confidence >= 0.95 else "suggested",
            method="deterministic-passport-evidence",
        ),
        evidence=request.evidence,
        requires_human_approval=False,
        metadata={
            "passport_id": passport_id,
            "summary": (
                f"Estimated principal is {principal} {currency} with a maximum "
                f"monthly payment of {monthly} {currency} over {term} months."
            ),
            "annual_interest_basis_points": interest_bps,
            "policy_id": policy_id,
            "policy_version": policy_version,
            "assumptions": list(assumptions),
            "risk_flags": list(risk_flags),
            "guardrail": "explanation_only_not_a_credit_decision",
        },
    )
    output.validate()
    return output


def _nonnegative_int(values: dict[object, object], key: str) -> int:
    value = values.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"affordability {key} must be a non-negative integer")
    return value


def _positive_int(values: dict[object, object], key: str) -> int:
    value = _nonnegative_int(values, key)
    if value == 0:
        raise ValueError(f"affordability {key} must be positive")
    return value
