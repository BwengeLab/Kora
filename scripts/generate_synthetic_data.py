import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "testdata" / "synthetic"
LABELS = ROOT / "testdata" / "labels"


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


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
        {"date": "2026-01-01", "reference": "POL-1001", "amount": "950000", "currency": "RWF", "type": "invoice"},
        {"date": "2026-01-02", "reference": "INV-2001", "amount": "3200000", "currency": "RWF", "type": "bill"},
    ]
    contract_rows = [
        {"date": "2026-01-01", "reference": "CON-BROKER-01", "amount": "0", "currency": "RWF", "type": "contract"},
    ]

    write_csv(OUT / "bank_statement_clean.csv", bank_rows[:2])
    write_csv(OUT / "bank_statement_duplicate.csv", bank_rows[:3])
    write_csv(OUT / "bank_statement_messy.csv", bank_rows)
    write_csv(OUT / "invoices.csv", invoice_rows)
    write_csv(OUT / "contracts.csv", contract_rows)

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
    print(f"generated synthetic fixtures in {OUT}")


if __name__ == "__main__":
    main()

