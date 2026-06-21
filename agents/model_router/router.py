from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


SENSITIVE_KEYS = {
    "account_number",
    "bank_account",
    "email",
    "name",
    "phone",
    "source_document_id",
    "tax_id",
}


@dataclass(frozen=True)
class ModelRequest:
    objective: str
    contains_sensitive_financial_data: bool
    estimated_complexity: str
    context: dict[str, Any] = field(default_factory=dict)
    external_models_allowed: bool = False


@dataclass(frozen=True)
class ModelPlan:
    route: str
    sanitized_context: dict[str, Any]
    redacted_fields: tuple[str, ...]
    external: bool


def route_model(request: ModelRequest) -> ModelPlan:
    sanitized, redacted = minimize_context(request.context)
    if request.contains_sensitive_financial_data or not request.external_models_allowed:
        route = "local-or-private-model"
        external = False
    elif request.estimated_complexity == "high":
        route = "capable-external-model"
        external = True
    else:
        route = "low-cost-external-model"
        external = True
    return ModelPlan(
        route=route,
        sanitized_context=sanitized,
        redacted_fields=tuple(sorted(redacted)),
        external=external,
    )


def minimize_context(context: dict[str, Any]) -> tuple[dict[str, Any], set[str]]:
    sanitized: dict[str, Any] = {}
    redacted: set[str] = set()
    for key, value in context.items():
        if key.lower() in SENSITIVE_KEYS:
            redacted.add(key)
            continue
        if isinstance(value, dict):
            nested, nested_redacted = minimize_context(value)
            sanitized[key] = nested
            redacted.update(f"{key}.{item}" for item in nested_redacted)
        else:
            sanitized[key] = value
    return sanitized, redacted
