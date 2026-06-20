import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from agents.document_ai.extractor import extract_csv, extract_document
from agents.document_ai.schemas import ExtractionContext


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "testdata" / "synthetic"
LABELS = ROOT / "testdata" / "labels" / "document_ai_golden.json"

CONTENT_TYPES = {
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pdf": "application/pdf",
    ".png": "image/png",
}

RECEIPT_OCR_TEXT = """Type: receipt
Receipt Number: RCP-4001
Receipt Date: 2026-01-06
Total: 45000
Currency: RWF
Supplier: City Fuel Station
"""


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
        self.assertEqual(records[0].source_location.row_number, 2)
        self.assertEqual(records[0].evidence.transaction_reference, "INV-001")
        self.assertGreater(records[0].field_confidences["reference"], 0.9)
        records[0].validate()

    def test_golden_document_fixtures(self) -> None:
        labels = json.loads(LABELS.read_text(encoding="utf-8"))
        for fixture in labels["fixtures"]:
            with self.subTest(file=fixture["file"]):
                path = FIXTURES / fixture["file"]
                result = extract_document(
                    path.read_bytes(),
                    self._context(path),
                    ocr_backend=self._fixture_ocr if path.suffix == ".png" else None,
                )
                self.assertEqual(result.schema_version, labels["schema_version"])
                self.assertEqual(len(result.records), fixture["record_count"])
                if "record_types" in fixture:
                    self.assertEqual([record.record_type for record in result.records], fixture["record_types"])
                if "expected_quality" in fixture:
                    self.assertEqual(list(result.quality_flags), fixture["expected_quality"])
                if "expected_flags" in fixture:
                    for flag in fixture["expected_flags"]:
                        self.assertIn(flag, result.quality_flags)
                if "expected_sheet" in fixture:
                    self.assertEqual(result.records[0].source_location.sheet_name, fixture["expected_sheet"])
                if "expected_page" in fixture:
                    self.assertEqual(result.records[0].source_location.page_number, fixture["expected_page"])
                for record in result.records:
                    self.assertEqual(record.organization_id, "org-golden")
                    self.assertEqual(record.ingestion_batch_id, "batch-golden")
                    self.assertEqual(record.extraction_version_id, "xver-golden")
                    record.validate()

    def test_messy_fixture_has_lower_confidence_and_review_flags(self) -> None:
        clean_path = FIXTURES / "bank_statement_clean.csv"
        messy_path = FIXTURES / "bank_statement_messy.csv"
        clean = extract_document(clean_path.read_bytes(), self._context(clean_path))
        messy = extract_document(messy_path.read_bytes(), self._context(messy_path))

        clean_minimum = min(record.confidence for record in clean.records)
        messy_minimum = min(record.confidence for record in messy.records)
        self.assertLess(messy_minimum, clean_minimum)
        self.assertIn("needs-review", messy.quality_flags)
        self.assertIn("duplicate-risk", messy.quality_flags)
        for record in messy.records:
            self.assertEqual(record.confidence, record.evidence.confidence.score)

    def test_invalid_or_unsupported_input_is_reviewed_not_trusted(self) -> None:
        context = ExtractionContext(
            organization_id="org-1",
            source_document_id="doc-1",
            ingestion_batch_id="batch-1",
            extraction_version_id="xver-1",
            file_name="malware.exe",
            content_type="application/octet-stream",
        )
        result = extract_document(b"not a document", context)
        self.assertEqual(result.records, ())
        self.assertIn("needs-review", result.quality_flags)
        self.assertIn("unsupported", result.warnings[0])

    def test_image_ocr_failure_becomes_review_flag(self) -> None:
        path = FIXTURES / "receipt_clean.png"

        def unavailable(_: object, __: str) -> str:
            raise RuntimeError("OCR engine is not installed")

        result = extract_document(path.read_bytes(), self._context(path), ocr_backend=unavailable)
        self.assertEqual(result.records, ())
        self.assertIn("needs-review", result.quality_flags)
        self.assertIn("OCR unavailable", result.warnings[0])

    @staticmethod
    def _fixture_ocr(image: object, language: str) -> str:
        if not isinstance(image, Image.Image):
            raise TypeError("expected Pillow image")
        if language != "eng":
            raise ValueError("unexpected OCR language")
        return RECEIPT_OCR_TEXT

    @staticmethod
    def _context(path: Path) -> ExtractionContext:
        return ExtractionContext(
            organization_id="org-golden",
            source_document_id=f"doc-{path.stem}",
            ingestion_batch_id="batch-golden",
            extraction_version_id="xver-golden",
            file_name=path.name,
            content_type=CONTENT_TYPES.get(path.suffix, "application/octet-stream"),
        )


if __name__ == "__main__":
    unittest.main()
