from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Sequence
import copy


class FrozenDict(dict):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        values = dict(*args, **kwargs)
        dict.__init__(self, {key: _freeze(value) for key, value in values.items()})

    def _immutable(self, *args: Any, **kwargs: Any) -> None:
        raise TypeError("mapping is immutable")

    __setitem__ = _immutable
    __delitem__ = _immutable
    clear = _immutable
    pop = _immutable
    popitem = _immutable  # type: ignore[assignment]
    setdefault = _immutable
    update = _immutable

    def __deepcopy__(self, memo: dict[int, Any]) -> "FrozenDict":
        return FrozenDict(copy.deepcopy(dict(self), memo))


def _freeze(value: Any) -> Any:
    if isinstance(value, dict):
        return FrozenDict(value)
    if isinstance(value, list):
        return tuple(_freeze(item) for item in value)
    if isinstance(value, set):
        return frozenset(_freeze(item) for item in value)
    return value


CONFIDENCE_TIERS = {"auto", "suggested", "review", "rejected"}
AGENT_OUTPUT_TYPES = {"classification", "explanation", "refusal", "review_request", "suggestion"}
FORBIDDEN_AGENT_ACTIONS = {
    "approve",
    "disburse",
    "execute",
    "pay",
    "post",
    "reverse",
    "transfer",
}


@dataclass(frozen=True)
class Money:
    currency: str
    minor_units: int
    precision: int = 2

    def validate(self) -> None:
        if not self.currency:
            raise ValueError("money currency is required")
        if not isinstance(self.minor_units, int):
            raise ValueError("money minor_units must be an integer")
        if self.precision < 0 or self.precision > 6:
            raise ValueError("money precision must be between 0 and 6")


@dataclass(frozen=True)
class Confidence:
    score: float
    tier: str
    method: str
    calibration_version: str = "v1"

    def validate(self) -> None:
        if self.score < 0 or self.score > 1:
            raise ValueError("confidence score must be between 0 and 1")
        if self.tier not in CONFIDENCE_TIERS:
            raise ValueError("confidence tier is invalid")
        if not self.method:
            raise ValueError("confidence method is required")
        if not self.calibration_version:
            raise ValueError("confidence calibration version is required")


@dataclass(frozen=True)
class Evidence:
    source_document_id: str
    source_record_id: str
    transaction_reference: str
    occurred_on: str
    amount: Money | None
    confidence: Confidence
    reason: str
    responsible_party_id: str = ""
    suggested_action: str = ""
    ingestion_batch_id: str = ""
    extraction_version_id: str = ""
    source_page: int = 0
    source_row: int = 0
    source_sheet: str = ""

    def validate(self, require_provenance: bool = True) -> None:
        if not self.source_document_id:
            raise ValueError("source_document_id is required")
        if not self.source_record_id:
            raise ValueError("source_record_id is required")
        if not self.reason:
            raise ValueError("reason is required")
        if require_provenance and not self.ingestion_batch_id:
            raise ValueError("ingestion_batch_id is required")
        if require_provenance and not self.extraction_version_id:
            raise ValueError("extraction_version_id is required")
        if self.source_page < 0 or self.source_row < 0:
            raise ValueError("evidence source location cannot be negative")
        if self.amount is not None:
            self.amount.validate()
        self.confidence.validate()


@dataclass(frozen=True)
class AgentOutput:
    organization_id: str
    agent_name: str
    output_type: str
    action: str
    confidence: Confidence
    evidence: Sequence[Evidence]
    requires_human_approval: bool = True
    refused: bool = False
    refusal_reason: str = ""
    workflow_task_id: str = ""
    candidate_id: str = ""
    run_id: str = ""
    schema_version: str = "v1"
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "evidence", tuple(self.evidence))
        object.__setattr__(self, "metadata", FrozenDict(self.metadata))

    def validate(self) -> None:
        if not self.organization_id:
            raise ValueError("organization_id is required")
        if not self.agent_name:
            raise ValueError("agent_name is required")
        if self.output_type not in AGENT_OUTPUT_TYPES:
            raise ValueError("agent output_type is invalid")
        if not self.schema_version:
            raise ValueError("schema_version is required")
        self.confidence.validate()
        if self.refused:
            if self.output_type != "refusal" or self.action != "refuse" or not self.refusal_reason:
                raise ValueError("refused output requires a refusal reason")
            if not self.requires_human_approval:
                raise ValueError("refused output must remain human controlled")
            return
        if not self.action:
            raise ValueError("action is required")
        if self.output_type == "refusal":
            raise ValueError("non-refused output cannot use refusal output_type")
        action_words = set(self.action.lower().replace("_", " ").split())
        if action_words & FORBIDDEN_AGENT_ACTIONS:
            raise ValueError("agents cannot execute financial or approval actions")
        if not self.evidence:
            raise ValueError("agent output must include evidence")
        for item in self.evidence:
            item.validate(require_provenance=True)
        if self.output_type in {"suggestion", "review_request"} and not self.requires_human_approval:
            raise ValueError("agent suggestions and review requests require human review")

    def to_dict(self) -> dict[str, Any]:
        self.validate()
        return asdict(self)


def refusal_output(organization_id: str, agent_name: str, reason: str) -> AgentOutput:
    output = AgentOutput(
        organization_id=organization_id,
        agent_name=agent_name,
        output_type="refusal",
        action="refuse",
        confidence=Confidence(score=0, tier="rejected", method="guardrail"),
        evidence=[],
        refused=True,
        refusal_reason=reason,
        requires_human_approval=True,
    )
    output.validate()
    return output
