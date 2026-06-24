from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Protocol

from agents.document_ai.extractor import extract_document
from agents.document_ai.enterprise_schemas import RawDocumentContent
from agents.document_ai.raw_content import extract_raw_content
from agents.document_ai.schemas import ExtractionContext, ExtractionResult


class ExtractionProvider(Protocol):
    @property
    def name(self) -> str: ...

    @property
    def version(self) -> str: ...

    @property
    def calibrated(self) -> bool: ...

    @property
    def external(self) -> bool: ...

    def supports(self, detected_type: str) -> bool: ...

    def extract(
        self, content: bytes, context: ExtractionContext, ocr_language: str
    ) -> ExtractionResult: ...

    def extract_content(
        self,
        content: bytes,
        context: ExtractionContext,
        detected_type: str,
        ocr_language: str,
    ) -> RawDocumentContent: ...


@dataclass(frozen=True)
class DeterministicProvider:
    name: str = "kora-deterministic"
    version: str = "2.0.0"
    calibrated: bool = False
    external: bool = False

    def supports(self, detected_type: str) -> bool:
        return detected_type in {"csv", "xlsx", "pdf", "png", "jpeg", "webp", "tiff"}

    def extract(
        self, content: bytes, context: ExtractionContext, ocr_language: str
    ) -> ExtractionResult:
        return extract_document(content, context, ocr_language=ocr_language)

    def extract_content(
        self,
        content: bytes,
        context: ExtractionContext,
        detected_type: str,
        ocr_language: str,
    ) -> RawDocumentContent:
        return extract_raw_content(content, context.file_name, detected_type, ocr_language)


class CallableProvider:
    def __init__(
        self,
        name: str,
        version: str,
        supported_types: set[str],
        extractor: Callable[[bytes, ExtractionContext, str], ExtractionResult],
        content_extractor: Callable[
            [bytes, ExtractionContext, str, str], RawDocumentContent
        ]
        | None = None,
        calibrated: bool = False,
        external: bool = False,
    ) -> None:
        self.name = name
        self.version = version
        self.supported_types = frozenset(supported_types)
        self.extractor = extractor
        self.content_extractor = content_extractor
        self.calibrated = calibrated
        self.external = external

    def supports(self, detected_type: str) -> bool:
        return detected_type in self.supported_types

    def extract(
        self, content: bytes, context: ExtractionContext, ocr_language: str
    ) -> ExtractionResult:
        return self.extractor(content, context, ocr_language)

    def extract_content(
        self,
        content: bytes,
        context: ExtractionContext,
        detected_type: str,
        ocr_language: str,
    ) -> RawDocumentContent:
        if self.content_extractor is None:
            raise ValueError("provider does not implement neutral content extraction")
        return self.content_extractor(content, context, detected_type, ocr_language)


class ProviderRegistry:
    def __init__(self, providers: list[ExtractionProvider] | None = None) -> None:
        self._providers: dict[str, ExtractionProvider] = {}
        for provider in providers or [DeterministicProvider()]:
            self.register(provider)

    def register(self, provider: ExtractionProvider) -> None:
        if not provider.name or provider.name in self._providers:
            raise ValueError("extraction provider name must be unique")
        self._providers[provider.name] = provider

    def select(
        self,
        detected_type: str,
        preferred_provider: str = "",
        external_allowed: bool = False,
    ) -> ExtractionProvider:
        if preferred_provider:
            provider = self._providers.get(preferred_provider)
            if provider is None or not provider.supports(detected_type):
                raise ValueError("preferred extraction provider is unavailable")
            if getattr(provider, "external", False) and not external_allowed:
                raise ValueError("external extraction provider is not allowed by policy")
            return provider
        for provider in self._providers.values():
            if provider.supports(detected_type) and (
                external_allowed or not getattr(provider, "external", False)
            ):
                return provider
        raise ValueError("no extraction provider supports this document")
