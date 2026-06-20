import csv
import io
import json
import re
import zipfile
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "testdata" / "synthetic"
LABELS = ROOT / "testdata" / "labels"


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def write_excel(path: Path, sheet_name: str, rows: list[dict[str, str]]) -> None:
    workbook = Workbook()
    fixed_time = datetime(2026, 1, 1)
    workbook.properties.created = fixed_time
    workbook.properties.modified = fixed_time
    sheet = workbook.active
    sheet.title = sheet_name
    sheet.append(list(rows[0].keys()))
    for row in rows:
        sheet.append(list(row.values()))
    workbook_bytes = io.BytesIO()
    workbook.save(workbook_bytes)
    normalized = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(workbook_bytes.getvalue()), "r") as source:
        with zipfile.ZipFile(normalized, "w", compression=zipfile.ZIP_DEFLATED) as target:
            for name in sorted(source.namelist()):
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                data = source.read(name)
                if name == "docProps/core.xml":
                    data = re.sub(
                        rb"(<dcterms:modified[^>]*>)[^<]+(</dcterms:modified>)",
                        rb"\g<1>2026-01-01T00:00:00Z\g<2>",
                        data,
                    )
                target.writestr(info, data)
    path.write_bytes(normalized.getvalue())


def write_invoice_pdf(path: Path) -> None:
    document = canvas.Canvas(str(path), invariant=1)
    lines = [
        "Type: invoice",
        "Invoice Number: INV-PDF-3001",
        "Invoice Date: 2026-01-05",
        "Total Amount: 1750000",
        "Currency: RWF",
        "Supplier: Kigali Office Supplies",
    ]
    y = 780
    for line in lines:
        document.drawString(72, y, line)
        y -= 24
    document.save()


def write_receipt_image(path: Path) -> None:
    image = Image.new("RGB", (900, 500), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    for candidate in (
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "DejaVuSans.ttf",
    ):
        try:
            font = ImageFont.truetype(candidate, 36)
            break
        except OSError:
            continue
    lines = [
        "Type: receipt",
        "Receipt Number: RCP-4001",
        "Receipt Date: 2026-01-06",
        "Total: 45000",
        "Currency: RWF",
        "Supplier: City Fuel Station",
    ]
    y = 40
    for line in lines:
        draw.text((40, y), line, fill="black", font=font)
        y += 60
    image.save(path)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    LABELS.mkdir(parents=True, exist_ok=True)

    bank_rows = [
        {"date": "2026-01-02", "reference": "POL-1001", "amount": "950000", "currency": "RWF", "type": "payment"},
        {"date": "2026-01-03", "reference": "INV-2001", "amount": "-3200000", "currency": "RWF", "type": "payment"},
        {"date": "2026-01-03", "reference": "INV-2001", "amount": "-3200000", "currency": "RWF", "type": "payment"},
        {"date": "2026-01-04", "reference": "", "amount": "2300000", "currency": "RWF", "type": "payment"},
    ]
    invoice_rows = [
        {"invoice_date": "2026-01-01", "invoice_number": "INV-1001", "total_amount": "950000", "currency": "RWF", "supplier": "Kigali Brokers", "type": "invoice"},
        {"invoice_date": "2026-01-02", "invoice_number": "INV-2001", "total_amount": "3200000", "currency": "RWF", "supplier": "Regional Repairs", "type": "bill"},
    ]
    contract_rows = [
        {"date": "2026-01-01", "contract_number": "CON-BROKER-01", "party": "Kigali Brokers", "start_date": "2026-01-01", "end_date": "2026-12-31", "type": "contract"},
    ]

    momo_rows = [
        {"transaction_date": "2026-01-04", "transaction_id": "MOMO-9001", "amount": "125000", "currency": "RWF", "counterparty": "Aline Stores", "type": "payment"},
        {"transaction_date": "2026-01-05", "transaction_id": "MOMO-9002", "amount": "85000", "currency": "RWF", "counterparty": "Eric Services", "type": "payment"},
    ]
    premium_rows = [
        {"payment_date": "2026-01-07", "policy_number": "POL-7001", "premium_amount": "275000", "currency": "RWF", "broker": "Kigali Brokers", "type": "premium"},
    ]
    claim_rows = [
        {"claim_date": "2026-01-08", "claim_number": "CLM-8001", "claim_amount": "1250000", "currency": "RWF", "insured": "Example Logistics", "type": "claim"},
    ]

    write_csv(OUT / "bank_statement_clean.csv", bank_rows[:2])
    write_csv(OUT / "bank_statement_duplicate.csv", bank_rows[:3])
    write_csv(OUT / "bank_statement_messy.csv", bank_rows)
    write_csv(OUT / "invoices.csv", invoice_rows)
    write_csv(OUT / "contracts.csv", contract_rows)
    write_csv(OUT / "momo_statement_clean.csv", momo_rows)
    write_csv(OUT / "premiums.csv", premium_rows)
    write_csv(OUT / "claims.csv", claim_rows)
    write_excel(OUT / "invoices.xlsx", "Invoices", invoice_rows)
    write_invoice_pdf(OUT / "invoice_clean.pdf")
    write_receipt_image(OUT / "receipt_clean.png")

    labels = {
        "fixtures": [
            {
                "file": "bank_statement_clean.csv",
                "expected_quality": ["complete"],
                "expected_matches": [{"left_reference": "POL-1001", "right_reference": "POL-1001"}],
            },
            {
                "file": "bank_statement_duplicate.csv",
                "expected_quality": ["duplicate-risk"],
                "expected_duplicates": ["INV-2001"],
            },
            {
                "file": "bank_statement_messy.csv",
                "expected_quality": ["duplicate-risk", "missing-reference", "needs-review"],
            },
        ]
    }
    (LABELS / "synthetic_reconciliation_labels.json").write_text(json.dumps(labels, indent=2), encoding="utf-8")

    document_ai_labels = {
        "schema_version": "document-extraction.v1",
        "fixtures": [
            {"file": "bank_statement_clean.csv", "record_count": 2, "record_types": ["payment", "payment"], "expected_quality": ["complete"]},
            {"file": "bank_statement_messy.csv", "record_count": 4, "expected_flags": ["duplicate-risk", "incomplete", "low-confidence", "needs-review"]},
            {"file": "momo_statement_clean.csv", "record_count": 2, "record_types": ["payment", "payment"], "expected_quality": ["complete"]},
            {"file": "invoices.xlsx", "record_count": 2, "record_types": ["invoice", "bill"], "expected_sheet": "Invoices"},
            {"file": "invoice_clean.pdf", "record_count": 1, "record_types": ["invoice"], "expected_page": 1},
            {"file": "receipt_clean.png", "record_count": 1, "record_types": ["receipt"], "expected_page": 1},
            {"file": "contracts.csv", "record_count": 1, "record_types": ["contract"]},
            {"file": "premiums.csv", "record_count": 1, "record_types": ["premium"]},
            {"file": "claims.csv", "record_count": 1, "record_types": ["claim"]},
        ],
    }
    (LABELS / "document_ai_golden.json").write_text(json.dumps(document_ai_labels, indent=2), encoding="utf-8")
    print(f"generated synthetic fixtures in {OUT}")


if __name__ == "__main__":
    main()
