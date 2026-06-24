import io
import unittest
import zipfile
from pathlib import Path

from agents.document_ai.preflight import (
    MalwareScan,
    PreflightPolicy,
    inspect_document,
)


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "testdata" / "synthetic"


class CleanScanner:
    def scan(self, content: bytes, file_name: str) -> MalwareScan:
        return MalwareScan(status="clean")


class InfectedScanner:
    def scan(self, content: bytes, file_name: str) -> MalwareScan:
        return MalwareScan(status="infected", detail="fixture signature")


class PreflightTests(unittest.TestCase):
    def test_valid_pdf_is_identified_by_signature(self) -> None:
        content = (FIXTURES / "invoice_clean.pdf").read_bytes()
        result = inspect_document(
            content, "invoice.pdf", "application/pdf", scanner=CleanScanner()
        )
        self.assertEqual(result.disposition, "accepted")
        self.assertEqual(result.detected_type, "pdf")
        self.assertEqual(result.page_count, 1)

    def test_spoofed_extension_is_quarantined(self) -> None:
        content = (FIXTURES / "invoice_clean.pdf").read_bytes()
        result = inspect_document(
            content, "invoice.png", "image/png", scanner=CleanScanner()
        )
        self.assertEqual(result.disposition, "quarantined")
        self.assertIn("extension-signature-mismatch", result.reasons)

    def test_malware_and_limits_are_rejected(self) -> None:
        infected = inspect_document(
            b"date,reference\n", "data.csv", "text/csv", scanner=InfectedScanner()
        )
        self.assertEqual(infected.disposition, "rejected")
        limited = inspect_document(
            b"date,reference\n",
            "data.csv",
            "text/csv",
            policy=PreflightPolicy(max_file_bytes=4),
            scanner=CleanScanner(),
        )
        self.assertEqual(limited.disposition, "rejected")

    def test_malware_scan_can_be_mandatory(self) -> None:
        result = inspect_document(
            b"date,reference\n",
            "data.csv",
            "text/csv",
            policy=PreflightPolicy(require_malware_scan=True),
        )
        self.assertEqual(result.disposition, "quarantined")
        self.assertIn("malware-scan-required", result.reasons)

    def test_office_zip_bomb_ratio_is_rejected(self) -> None:
        content = io.BytesIO()
        with zipfile.ZipFile(content, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("[Content_Types].xml", "x")
            archive.writestr("xl/workbook.xml", "0" * 100_000)
        result = inspect_document(
            content.getvalue(),
            "book.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            policy=PreflightPolicy(max_office_compression_ratio=2),
            scanner=CleanScanner(),
        )
        self.assertEqual(result.disposition, "rejected")
        self.assertIn("office-compression-ratio-limit-exceeded", result.reasons)


if __name__ == "__main__":
    unittest.main()
