import unittest
from dataclasses import replace
from pathlib import Path

from agents.document_ai.enterprise_engine import EnterpriseDocumentEngine, ExtractionPolicy
from agents.document_ai.raw_content import extract_raw_content
from agents.document_ai.preflight import MalwareScan
from agents.document_ai.providers import CallableProvider, ProviderRegistry
from agents.document_ai.schemas import ExtractionContext


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "testdata" / "synthetic"


class CleanScanner:
    def scan(self, content: bytes, file_name: str) -> MalwareScan:
        return MalwareScan(status="clean")


class EnterpriseEngineTests(unittest.TestCase):
    def test_clean_structured_file_is_extracted_but_not_auto_trusted(self) -> None:
        path = FIXTURES / "bank_statement_clean.csv"
        result = EnterpriseDocumentEngine(malware_scanner=CleanScanner()).process(
            path.read_bytes(), self.context(path)
        )
        self.assertEqual(result.inspection.disposition, "accepted")
        self.assertEqual(result.provider_name, "kora-deterministic")
        assert result.raw_content is not None
        self.assertIn("INV-2001", result.raw_content.full_text)
        self.assertEqual(result.extraction.records, ())
        self.assertTrue(result.requires_human_review)
        self.assertEqual(result.metadata["semantic_interpretation"], "not-performed")

    def test_preflight_quarantine_prevents_parser_execution(self) -> None:
        path = FIXTURES / "invoice_clean.pdf"
        context = replace(self.context(path), file_name="invoice.png", content_type="image/png")
        result = EnterpriseDocumentEngine(malware_scanner=CleanScanner()).process(
            path.read_bytes(), context
        )
        self.assertEqual(result.extraction.parser, "preflight")
        self.assertEqual(result.metadata["routing"], "blocked-before-parser")

    def test_external_provider_requires_explicit_policy(self) -> None:
        path = FIXTURES / "bank_statement_clean.csv"
        local_engine = EnterpriseDocumentEngine(malware_scanner=CleanScanner())

        def fixture_provider(content, context, language):
            return local_engine.providers.select("csv").extract(content, context, language)

        registry = ProviderRegistry()
        registry.register(
            CallableProvider(
                "external-fixture",
                "1",
                {"csv"},
                fixture_provider,
                content_extractor=lambda content, context, detected_type, language: extract_raw_content(
                    content, context.file_name, detected_type, language
                ),
                external=True,
            )
        )
        engine = EnterpriseDocumentEngine(registry, malware_scanner=CleanScanner())
        with self.assertRaisesRegex(ValueError, "not allowed"):
            engine.process(
                path.read_bytes(),
                self.context(path),
                ExtractionPolicy(preferred_provider="external-fixture"),
            )

    @staticmethod
    def context(path: Path) -> ExtractionContext:
        return ExtractionContext(
            organization_id="org-enterprise",
            source_document_id=f"doc-{path.stem}",
            ingestion_batch_id="batch-enterprise",
            extraction_version_id="version-enterprise",
            file_name=path.name,
            content_type={
                ".csv": "text/csv",
                ".pdf": "application/pdf",
            }.get(path.suffix, "application/octet-stream"),
        )


if __name__ == "__main__":
    unittest.main()
