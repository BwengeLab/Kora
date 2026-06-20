from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from agents.shared.schemas import Evidence


@dataclass(frozen=True)
class ExtractionContext:
    organization_id: str
    source_document_id: str
    ingestion_batch_id: str
    extraction_version_id: str
    file_name: str
    content_type: str = ""

    def validate(self) -> None:
        required = {
            "organization_id": self.organization_id,
            "source_document_id": self.source_document_id,
            "ingestion_batch_id": self.ingestion_batch_id,
            "extraction_version_id": self.extraction_version_id,
            "file_name": self.file_name,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise ValueError(f"missing extraction context: {', '.join(missing)}")


@dataclass(frozen=True)
class SourceLocation:
    page_number: int = 0
    row_number: int = 0
    sheet_name: str = ""


@dataclass(frozen=True)
class ExtractedField:
    value: str
    confidence: float
    method: str
    warnings: tuple[str, ...] = ()

    def validate(self) -> None:
        if self.confidence < 0 or self.confidence > 1:
            raise ValueError("field confidence must be between 0 and 1")
        if not self.method:
            raise ValueError("field extraction method is required")


@dataclass(frozen=True)
class ExtractedRecord:
    organization_id: str
    source_document_id: str
    ingestion_batch_id: str
    extraction_version_id: str
    source_record_id: str
    record_type: str
    fields: dict[str, str]
    field_confidences: dict[str, float]
    source_location: SourceLocation
    evidence: Evidence
    confidence: float
    warnings: tuple[str, ...] = ()
    missing_fields: tuple[str, ...] = ()
    quality_flags: tuple[str, ...] = ()

    def validate(self) -> None:
        required = {
            "organization_id": self.organization_id,
            "source_document_id": self.source_document_id,
            "ingestion_batch_id": self.ingestion_batch_id,
            "extraction_version_id": self.extraction_version_id,
            "source_record_id": self.source_record_id,
            "record_type": self.record_type,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise ValueError(f"missing extracted record fields: {', '.join(missing)}")
        if self.confidence < 0 or self.confidence > 1:
            raise ValueError("record confidence must be between 0 and 1")
        for name, score in self.field_confidences.items():
            if score < 0 or score > 1:
                raise ValueError(f"field confidence for {name} must be between 0 and 1")
        self.evidence.validate()

    def to_ingestion_record(self) -> dict[str, Any]:
        return {
            "source_record_id": self.source_record_id,
            "record_type": self.record_type,
            "fields": dict(self.fields),
            "field_confidences": dict(self.field_confidences),
            "confidence": self.confidence,
            "warnings": list(self.warnings),
            "missing_fields": list(self.missing_fields),
            "quality_flags": list(self.quality_flags),
            "source_location": asdict(self.source_location),
            "evidence": asdict(self.evidence),
        }


@dataclass(frozen=True)
class ExtractionResult:
    context: ExtractionContext
    parser: str
    schema_version: str
    records: tuple[ExtractedRecord, ...] = ()
    warnings: tuple[str, ...] = ()
    quality_flags: tuple[str, ...] = ()
    metadata: dict[str, str] = field(default_factory=dict)

    def validate(self) -> None:
        self.context.validate()
        if not self.parser:
            raise ValueError("parser is required")
        if not self.schema_version:
            raise ValueError("schema version is required")
        for record in self.records:
            record.validate()

    def to_dict(self) -> dict[str, Any]:
        self.validate()
        return {
            "organization_id": self.context.organization_id,
            "source_document_id": self.context.source_document_id,
            "ingestion_batch_id": self.context.ingestion_batch_id,
            "extraction_version_id": self.context.extraction_version_id,
            "file_name": self.context.file_name,
            "content_type": self.context.content_type,
            "parser": self.parser,
            "schema_version": self.schema_version,
            "warnings": list(self.warnings),
            "quality_flags": list(self.quality_flags),
            "metadata": dict(self.metadata),
            "records": [record.to_ingestion_record() for record in self.records],
        }
