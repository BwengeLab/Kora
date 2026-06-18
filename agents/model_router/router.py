from dataclasses import dataclass


@dataclass(frozen=True)
class ModelRequest:
    objective: str
    contains_sensitive_financial_data: bool
    estimated_complexity: str


def route_model(request: ModelRequest) -> str:
    if request.contains_sensitive_financial_data:
        return "local-or-redacted-model"
    if request.estimated_complexity == "high":
        return "capable-external-model"
    return "low-cost-model"

