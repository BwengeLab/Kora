from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Money:
    currency: str
    minor_units: int
    precision: int = 2


@dataclass(frozen=True)
class Confidence:
    score: float
    tier: str
    method: str

    def validate(self) -> None:
        if self.score < 0 or self.score > 1:
            raise ValueError("confidence score must be between 0 and 1")
        if not self.tier:
            raise ValueError("confidence tier is required")
        if not self.method:
            raise ValueError("confidence method is required")


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

    def validate(self) -> None:
        if not self.source_document_id:
            raise ValueError("source_document_id is required")
        if not self.source_record_id:
            raise ValueError("source_record_id is required")
        if not self.reason:
            raise ValueError("reason is required")
        self.confidence.validate()


@dataclass(frozen=True)
class AgentOutput:
    agent_name: str
    action: str
    confidence: Confidence
    evidence: list[Evidence]
    requires_human_approval: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)

    def validate(self) -> None:
        if not self.agent_name:
            raise ValueError("agent_name is required")
        if not self.action:
            raise ValueError("action is required")
        self.confidence.validate()
        if not self.evidence:
            raise ValueError("agent output must include evidence")
        for item in self.evidence:
            item.validate()
        if not self.requires_human_approval and self.action.lower().startswith(("post", "approve", "pay")):
            raise ValueError("agents cannot directly approve or post financial actions")
