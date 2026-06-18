import csv
from dataclasses import dataclass
from pathlib import Path

from agents.shared.schemas import Confidence, Evidence, Money


@dataclass(frozen=True)
class ExtractedRecord:
    source_document_id: str
    source_record_id: str
    record_type: str
    fields: dict[str, str]
    evidence: Evidence
    quality_flags: list[str]


def extract_csv(path: str | Path, source_document_id: str) -> list[ExtractedRecord]:
    records: list[ExtractedRecord] = []
    with Path(path).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for index, row in enumerate(reader, start=1):
            amount = _parse_minor_units(row.get("amount", "0"))
            confidence_score = 0.95 if row.get("reference") and row.get("date") else 0.55
            flags = []
            if confidence_score < 0.7:
                flags.append("low-confidence")
            if not row.get("reference"):
                flags.append("missing-reference")
            confidence = Confidence(score=confidence_score, tier=_tier(confidence_score), method="csv-parser")
            evidence = Evidence(
                source_document_id=source_document_id,
                source_record_id=f"row-{index}",
                transaction_reference=row.get("reference", ""),
                occurred_on=row.get("date", ""),
                amount=Money(currency=row.get("currency", "RWF"), minor_units=amount, precision=0),
                confidence=confidence,
                reason="parsed from csv source row",
            )
            records.append(
                ExtractedRecord(
                    source_document_id=source_document_id,
                    source_record_id=f"row-{index}",
                    record_type=row.get("type", "transaction"),
                    fields={key: value for key, value in row.items() if value is not None},
                    evidence=evidence,
                    quality_flags=flags,
                )
            )
    return records


def _parse_minor_units(value: str) -> int:
    normalized = value.replace(",", "").strip()
    if not normalized:
        return 0
    return int(float(normalized))


def _tier(score: float) -> str:
    if score >= 0.95:
        return "auto"
    if score >= 0.70:
        return "suggested"
    return "review"

