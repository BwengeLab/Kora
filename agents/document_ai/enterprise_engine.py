from __future__ import annotations

from dataclasses import dataclass

from agents.document_ai.enterprise_schemas import EnterpriseExtractionResult, ValidationIssue
from agents.document_ai.preflight import MalwareScanner, PreflightPolicy, inspect_document
from agents.document_ai.providers import ProviderRegistry
from agents.document_ai.schemas import ExtractionContext, ExtractionResult


ENTERPRISE_SCHEMA_VERSION = "document-intelligence.v2"


@dataclass(frozen=True)
class ExtractionPolicy:
    preferred_provider: str = ""
    external_provider_allowed: bool = False
    ocr_language: str = "eng"


class EnterpriseDocumentEngine:
    def __init__(
        self,
        providers: ProviderRegistry | None = None,
        preflight_policy: PreflightPolicy | None = None,
        malware_scanner: MalwareScanner | None = None,
    ) -> None:
        self.providers = providers or ProviderRegistry()
        self.preflight_policy = preflight_policy or PreflightPolicy()
        self.malware_scanner = malware_scanner

    def process(
        self,
        content: bytes,
        context: ExtractionContext,
        policy: ExtractionPolicy | None = None,
    ) -> EnterpriseExtractionResult:
        context.validate()
        policy = policy or ExtractionPolicy()
        inspection = inspect_document(
            content,
            context.file_name,
            context.content_type,
            self.preflight_policy,
            self.malware_scanner,
        )
        if inspection.disposition != "accepted":
            extraction = ExtractionResult(
                context=context,
                parser="preflight",
                schema_version=ENTERPRISE_SCHEMA_VERSION,
                warnings=inspection.reasons,
                quality_flags=("needs-review",),
            )
            return EnterpriseExtractionResult(
                inspection=inspection,
                extraction=extraction,
                provider_name="none",
                provider_version="preflight-v1",
                requires_human_review=True,
                metadata={"routing": "blocked-before-parser"},
            )
        provider = self.providers.select(
            inspection.detected_type,
            policy.preferred_provider,
            policy.external_provider_allowed,
        )
        raw_content = provider.extract_content(
            content, context, inspection.detected_type, policy.ocr_language
        )
        issues: tuple[ValidationIssue, ...] = ()
        if not raw_content.full_text.strip():
            issues = (
                ValidationIssue(
                    "NO_TEXT_CONTENT", "blocking", "no textual content was extracted"
                ),
            )
        else:
            issue_map = {
                "ocr-confidence-unavailable": (
                    "OCR_CONFIDENCE_UNAVAILABLE",
                    "warning",
                    "OCR provider did not supply token confidence",
                ),
                "low-ocr-confidence": (
                    "LOW_OCR_CONFIDENCE",
                    "warning",
                    "more than ten percent of OCR tokens have low confidence",
                ),
                "incomplete-coordinate-coverage": (
                    "INCOMPLETE_COORDINATE_COVERAGE",
                    "warning",
                    "some OCR tokens do not have source coordinates",
                ),
                "non-printable-content": (
                    "NON_PRINTABLE_CONTENT",
                    "warning",
                    "extracted content contains unexpected control characters",
                ),
            }
            issues = tuple(
                ValidationIssue(code, severity, message)
                for warning in raw_content.warnings
                if warning in issue_map
                for code, severity, message in (issue_map[warning],)
            )
        extraction = ExtractionResult(
            context=context,
            parser="raw-content",
            schema_version=ENTERPRISE_SCHEMA_VERSION,
            warnings=raw_content.warnings,
            quality_flags=("needs-understanding",),
            metadata={
                "page_count": str(len(raw_content.pages)),
                "extraction_method": raw_content.extraction_method,
            },
        )
        result = EnterpriseExtractionResult(
            inspection=inspection,
            extraction=extraction,
            provider_name=provider.name,
            provider_version=provider.version,
            validation_issues=issues,
            raw_content=raw_content,
            requires_human_review=True,
            metadata={
                "schema_version": ENTERPRISE_SCHEMA_VERSION,
                "routing": "policy-provider-selection",
                "semantic_interpretation": "not-performed",
            },
        )
        result.validate()
        return result
