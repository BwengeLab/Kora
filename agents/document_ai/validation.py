from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
import re

from agents.document_ai.enterprise_schemas import (
    FieldLineage,
    InvoiceLineItem,
    ValidationIssue,
)
from agents.document_ai.schemas import ExtractionResult


@dataclass(frozen=True)
class AutoAcceptPolicy:
    minimum_calibrated_confidence: float = 0.995
    require_line_item_balance_when_present: bool = True


def validate_extraction(
    extraction: ExtractionResult,
    lineage: tuple[FieldLineage, ...],
    line_items: tuple[InvoiceLineItem, ...] = (),
) -> tuple[ValidationIssue, ...]:
    issues: list[ValidationIssue] = []
    if not extraction.records:
        issues.append(
            ValidationIssue("NO_RECORDS", "blocking", "no records were extracted")
        )
    for record in extraction.records:
        for field_name in record.missing_fields:
            issues.append(
                ValidationIssue(
                    "REQUIRED_FIELD_MISSING",
                    "blocking",
                    f"required field {field_name} is missing",
                    field_name,
                )
            )
        amount = record.fields.get("amount", "")
        if amount and not _valid_decimal(amount):
            issues.append(
                ValidationIssue("INVALID_AMOUNT", "blocking", "amount is not numeric", "amount")
            )
        currency = record.fields.get("currency", "")
        if currency and not re.fullmatch(r"[A-Z]{3}", currency):
            issues.append(
                ValidationIssue(
                    "INVALID_CURRENCY", "blocking", "currency must be ISO-style code", "currency"
                )
            )
        for field_name in ("date", "due_date", "start_date", "end_date"):
            value = record.fields.get(field_name, "")
            if value and not _valid_iso_date(value):
                issues.append(
                    ValidationIssue(
                        "INVALID_DATE", "error", f"{field_name} is not an ISO date", field_name
                    )
                )
        if record.fields.get("date") and record.fields.get("due_date"):
            if record.fields["due_date"] < record.fields["date"]:
                issues.append(
                    ValidationIssue(
                        "DUE_DATE_BEFORE_DOCUMENT_DATE",
                        "blocking",
                        "due date occurs before document date",
                        "due_date",
                    )
                )
        for field_name, value in record.fields.items():
            if _looks_like_spreadsheet_formula(value):
                issues.append(
                    ValidationIssue(
                        "SPREADSHEET_FORMULA_CONTENT",
                        "warning",
                        "field begins with a spreadsheet formula control character",
                        field_name,
                    )
                )
    if line_items:
        issues.extend(_validate_invoice_line_items(extraction, line_items))
    if lineage and not all(item.calibrated for item in lineage):
        issues.append(
            ValidationIssue(
                "UNCALIBRATED_CONFIDENCE",
                "warning",
                "provider confidence has not been calibrated on Kora-labelled data",
            )
        )
    return tuple(_deduplicate(issues))


def can_auto_accept(
    lineage: tuple[FieldLineage, ...],
    issues: tuple[ValidationIssue, ...],
    policy: AutoAcceptPolicy | None = None,
) -> bool:
    policy = policy or AutoAcceptPolicy()
    if not lineage:
        return False
    if any(issue.severity in {"blocking", "error"} for issue in issues):
        return False
    return all(
        item.calibrated and item.confidence >= policy.minimum_calibrated_confidence
        for item in lineage
    )


def _validate_invoice_line_items(
    extraction: ExtractionResult, line_items: tuple[InvoiceLineItem, ...]
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    invoice_records = [record for record in extraction.records if record.record_type == "invoice"]
    if len(invoice_records) != 1 or invoice_records[0].evidence.amount is None:
        issues.append(
            ValidationIssue(
                "INVOICE_TOTAL_UNAVAILABLE",
                "blocking",
                "line items cannot be validated without one invoice total",
            )
        )
        return issues
    invoice = invoice_records[0]
    invoice_amount = invoice.evidence.amount
    if invoice_amount is None:
        return issues
    total = sum(item.total_minor for item in line_items)
    expected = invoice_amount.minor_units
    currencies = {item.currency for item in line_items}
    if len(currencies) != 1 or invoice_amount.currency not in currencies:
        issues.append(
            ValidationIssue(
                "LINE_ITEM_CURRENCY_MISMATCH",
                "blocking",
                "line-item currencies do not match the invoice currency",
            )
        )
    if total != expected:
        issues.append(
            ValidationIssue(
                "LINE_ITEM_TOTAL_MISMATCH",
                "blocking",
                f"line-item total {total} does not equal invoice total {expected}",
            )
        )
    for item in line_items:
        try:
            quantity = Decimal(item.quantity)
        except InvalidOperation:
            issues.append(
                ValidationIssue(
                    "LINE_ITEM_INVALID_QUANTITY",
                    "blocking",
                    "line-item quantity is not numeric",
                )
            )
            continue
        if quantity <= 0:
            issues.append(
                ValidationIssue(
                    "LINE_ITEM_INVALID_QUANTITY",
                    "blocking",
                    "line-item quantity must be positive",
                )
            )
            continue
        calculated = quantity * item.unit_price_minor + item.tax_minor
        if calculated != calculated.to_integral_value() or item.total_minor != int(calculated):
            issues.append(
                ValidationIssue(
                    "LINE_ITEM_ARITHMETIC_MISMATCH",
                    "error",
                    "line-item total does not equal quantity times unit price plus tax",
                )
            )
    return issues


def _valid_decimal(value: str) -> bool:
    try:
        Decimal(value)
        return True
    except InvalidOperation:
        return False


def _valid_iso_date(value: str) -> bool:
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def _looks_like_spreadsheet_formula(value: str) -> bool:
    stripped = value.lstrip()
    if not stripped:
        return False
    if stripped[0] in {"=", "+", "@"}:
        return True
    if stripped[0] != "-":
        return False
    try:
        Decimal(stripped)
        return False
    except InvalidOperation:
        return True


def _deduplicate(issues: list[ValidationIssue]) -> list[ValidationIssue]:
    seen: set[tuple[str, str, str]] = set()
    output: list[ValidationIssue] = []
    for issue in issues:
        key = (issue.code, issue.field_name, issue.message)
        if key not in seen:
            seen.add(key)
            output.append(issue)
    return output
