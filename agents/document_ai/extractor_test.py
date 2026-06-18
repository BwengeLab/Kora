import tempfile
import unittest
from pathlib import Path

from agents.document_ai.extractor import extract_csv


class ExtractorTests(unittest.TestCase):
    def test_extract_csv_preserves_source_rows(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "statement.csv"
            path.write_text(
                "date,reference,amount,currency,type\n"
                "2026-01-01,INV-001,1000,RWF,payment\n",
                encoding="utf-8",
            )
            records = extract_csv(path, "doc-1")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].source_record_id, "row-1")
        self.assertEqual(records[0].evidence.transaction_reference, "INV-001")
        records[0].evidence.validate()


if __name__ == "__main__":
    unittest.main()

