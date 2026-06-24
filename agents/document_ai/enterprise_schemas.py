from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from agents.document_ai.schemas import ExtractionResult


@dataclass(frozen=True)
class BoundingBox:
    page_number: int
    x0: float
    y0: float
    x1: float
    y1: float
    unit: str = "normalized"

    def validate(self) -> None:
        if self.page_number < 1:
            raise ValueError("bounding box page_number must be positive")
        if self.unit != "normalized":
            raise ValueError("bounding box unit must be normalized")
        if not 0 <= self.x0 < self.x1 <= 1 or not 0 <= self.y0 < self.y1 <= 1:
            raise ValueError("bounding box coordinates must be ordered between 0 and 1")


@dataclass(frozen=True)
class FieldLineage:
    field_name: str
    raw_text: str
    normalized_value: str
    confidence: float
    extraction_method: str
    model_name: str
    model_version: str
    source_record_id: str
    bounding_box: BoundingBox | None = None
    calibrated: bool = False
    validation_codes: tuple[str, ...] = ()

    def validate(self) -> None:
        if not self.field_name or not self.extraction_method or not self.model_name:
            raise ValueError("field lineage identity is required")
        if not self.model_version or not self.source_record_id:
            raise ValueError("field lineage model version and source record are required")
        if not 0 <= self.confidence <= 1:
            raise ValueError("field lineage confidence must be between 0 and 1")
        if self.bounding_box:
            self.bounding_box.validate()


@dataclass(frozen=True)
class InvoiceLineItem:
    description: str
    quantity: str
    unit_price_minor: int
    tax_minor: int
    total_minor: int
    currency: str
    source_record_id: str
    bounding_box: BoundingBox | None = None


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    severity: str
    message: str
    field_name: str = ""

    def validate(self) -> None:
        if self.severity not in {"info", "warning", "error", "blocking"}:
            raise ValueError("validation severity is invalid")
        if not self.code or not self.message:
            raise ValueError("validation issue code and message are required")


@dataclass(frozen=True)
class FileInspection:
    disposition: str
    detected_type: str
    sha256: str
    size_bytes: int
    page_count: int = 0
    warnings: tuple[str, ...] = ()
    reasons: tuple[str, ...] = ()
    malware_status: str = "unknown"

    def validate(self) -> None:
        if self.disposition not in {"accepted", "quarantined", "rejected"}:
            raise ValueError("file inspection disposition is invalid")
        if not self.detected_type or len(self.sha256) != 64:
            raise ValueError("file inspection type and sha256 are required")
        if self.size_bytes < 0 or self.page_count < 0:
            raise ValueError("file inspection sizes cannot be negative")


@dataclass(frozen=True)
class ContentToken:
    text: str
    confidence: float
    bounding_box: BoundingBox | None = None

    def validate(self) -> None:
        if not self.text:
            raise ValueError("content token text is required")
        if not 0 <= self.confidence <= 1:
            raise ValueError("content token confidence must be between 0 and 1")
        if self.bounding_box:
            self.bounding_box.validate()


@dataclass(frozen=True)
class ContentLine:
    text: str
    reading_order: int
    tokens: tuple[ContentToken, ...] = ()
    bounding_box: BoundingBox | None = None

    def validate(self) -> None:
        if not self.text or self.reading_order < 0:
            raise ValueError("content line text and reading order are required")
        if self.bounding_box:
            self.bounding_box.validate()
        for token in self.tokens:
            token.validate()


@dataclass(frozen=True)
class ContentCell:
    text: str
    row_index: int
    column_index: int
    tokens: tuple[ContentToken, ...] = ()
    bounding_box: BoundingBox | None = None

    def validate(self) -> None:
        if self.row_index < 0 or self.column_index < 0:
            raise ValueError("content cell indexes cannot be negative")
        if self.bounding_box:
            self.bounding_box.validate()
        for token in self.tokens:
            token.validate()


@dataclass(frozen=True)
class ContentTable:
    page_number: int
    reading_order: int
    row_count: int
    column_count: int
    cells: tuple[ContentCell, ...]
    confidence: float
    bounding_box: BoundingBox | None = None

    def validate(self) -> None:
        if self.page_number < 1 or self.reading_order < 0:
            raise ValueError("content table identity is invalid")
        if self.row_count < 1 or self.column_count < 1:
            raise ValueError("content table dimensions must be positive")
        if not 0 <= self.confidence <= 1:
            raise ValueError("content table confidence must be between 0 and 1")
        if self.bounding_box:
            self.bounding_box.validate()
        for cell in self.cells:
            cell.validate()


@dataclass(frozen=True)
class ExtractionQuality:
    token_count: int
    positioned_token_count: int
    scored_token_count: int
    low_confidence_token_count: int
    mean_confidence: float | None
    coordinate_coverage: float
    printable_character_ratio: float

    def validate(self) -> None:
        counts = (
            self.token_count,
            self.positioned_token_count,
            self.scored_token_count,
            self.low_confidence_token_count,
        )
        if any(value < 0 for value in counts):
            raise ValueError("extraction quality counts cannot be negative")
        for value in (self.coordinate_coverage, self.printable_character_ratio):
            if not 0 <= value <= 1:
                raise ValueError("extraction quality ratios must be between 0 and 1")
        if self.mean_confidence is not None and not 0 <= self.mean_confidence <= 1:
            raise ValueError("mean confidence must be between 0 and 1")


@dataclass(frozen=True)
class ContentPage:
    page_number: int
    width: int
    height: int
    lines: tuple[ContentLine, ...] = ()
    tables: tuple[ContentTable, ...] = ()

    def validate(self) -> None:
        if self.page_number < 1 or self.width < 0 or self.height < 0:
            raise ValueError("content page dimensions are invalid")
        for line in self.lines:
            line.validate()
        for table in self.tables:
            table.validate()


@dataclass(frozen=True)
class RawDocumentContent:
    full_text: str
    pages: tuple[ContentPage, ...]
    extraction_method: str
    language: str = ""
    warnings: tuple[str, ...] = ()
    quality: ExtractionQuality | None = None

    def validate(self) -> None:
        if not self.extraction_method:
            raise ValueError("raw content extraction method is required")
        if not self.pages:
            raise ValueError("raw content must include at least one page or sheet")
        for page in self.pages:
            page.validate()
        if self.quality:
            self.quality.validate()


@dataclass(frozen=True)
class EnterpriseExtractionResult:
    inspection: FileInspection
    extraction: ExtractionResult
    provider_name: str
    provider_version: str
    field_lineage: tuple[FieldLineage, ...] = ()
    validation_issues: tuple[ValidationIssue, ...] = ()
    raw_content: RawDocumentContent | None = None
    requires_human_review: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)

    def validate(self) -> None:
        self.inspection.validate()
        self.extraction.validate()
        if not self.provider_name or not self.provider_version:
            raise ValueError("extraction provider identity is required")
        for item in self.field_lineage:
            item.validate()
        for issue in self.validation_issues:
            issue.validate()
        if self.raw_content:
            self.raw_content.validate()
        if self.inspection.disposition != "accepted" and not self.requires_human_review:
            raise ValueError("quarantined or rejected documents require review")

    def to_dict(self) -> dict[str, Any]:
        self.validate()
        return {
            "inspection": asdict(self.inspection),
            "extraction": self.extraction.to_dict(),
            "provider_name": self.provider_name,
            "provider_version": self.provider_version,
            "field_lineage": [asdict(item) for item in self.field_lineage],
            "validation_issues": [asdict(item) for item in self.validation_issues],
            "raw_content": asdict(self.raw_content) if self.raw_content else None,
            "requires_human_review": self.requires_human_review,
            "metadata": dict(self.metadata),
        }
