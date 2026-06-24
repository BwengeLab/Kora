from __future__ import annotations

import base64
import binascii
import os
from dataclasses import asdict
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field

from agents.document_ai.enterprise_engine import EnterpriseDocumentEngine
from agents.document_ai.extractor import extract_document
from agents.document_ai.jobs import MemoryJobRepository, new_job
from agents.document_ai.preflight import ClamAVCommandScanner, PreflightPolicy
from agents.document_ai.schemas import ExtractionContext
from agents.runtime.auth import Identity, verify_gateway_token


IDENTIFIER = Field(min_length=1, max_length=200)
OCR_LANGUAGE = Field(default="eng", min_length=3, max_length=31, pattern=r"^[a-z]{3}(\+[a-z]{3})*$")
MAX_INLINE_BYTES = 20 * 1024 * 1024


class ExtractDocumentRequest(BaseModel):
    organization_id: str = IDENTIFIER
    source_document_id: str = IDENTIFIER
    ingestion_batch_id: str = IDENTIFIER
    extraction_version_id: str = IDENTIFIER
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(default="", max_length=200)
    content_base64: str = Field(min_length=1, max_length=28_000_000)
    ocr_language: str = OCR_LANGUAGE


class SubmitExtractionJobRequest(BaseModel):
    organization_id: str = IDENTIFIER
    user_id: str = IDENTIFIER
    document_id: str = IDENTIFIER
    ingestion_batch_id: str = IDENTIFIER
    extraction_version_id: str = IDENTIFIER
    idempotency_key: str = IDENTIFIER
    document_fingerprint: str = Field(min_length=64, max_length=64)
    object_key: str = Field(min_length=1, max_length=1024)
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(default="", max_length=200)
    preferred_provider: str = Field(default="", max_length=100)
    external_provider_allowed: bool = False
    ocr_language: str = OCR_LANGUAGE
    max_attempts: int = Field(default=3, ge=1, le=10)


app = FastAPI(title="Kora Document AI", version="1.0.0")
DOCUMENT_AI_TOKEN = os.getenv("KORA_DOCUMENT_AI_TOKEN", "")
JWT_SECRET = os.getenv("KORA_JWT_SECRET", "")
if os.getenv("KORA_ENV") == "production" and (
    DOCUMENT_AI_TOKEN in {"", "development-only-document-token"}
    or JWT_SECRET in {"", "development-only-jwt-secret"}
):
    raise RuntimeError("non-default document AI and JWT secrets are required in production")

if os.getenv("DATABASE_URL"):
    from agents.document_ai.postgres_jobs import PostgresJobRepository

    job_repository: Any = PostgresJobRepository(os.environ["DATABASE_URL"])
else:
    job_repository = MemoryJobRepository()

enterprise_engine = EnterpriseDocumentEngine(
    preflight_policy=PreflightPolicy(
        require_malware_scan=os.getenv("KORA_ENV") == "production"
    ),
    malware_scanner=ClamAVCommandScanner(),
)


def authenticate(
    x_kora_internal_token: str = Header(default=""),
    authorization: str = Header(default=""),
) -> Identity | None:
    if DOCUMENT_AI_TOKEN and x_kora_internal_token != DOCUMENT_AI_TOKEN:
        raise HTTPException(status_code=401, detail="invalid document AI service token")
    if not JWT_SECRET:
        return None
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing gateway bearer token")
    try:
        return verify_gateway_token(authorization.removeprefix("Bearer "), JWT_SECRET)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def enforce_identity(
    identity: Identity | None, organization_id: str, user_id: str = ""
) -> None:
    if identity is None:
        return
    if identity.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="cross-tenant request denied")
    if user_id and identity.user_id != user_id:
        raise HTTPException(status_code=403, detail="request user does not match identity")


def decode_inline_content(content_base64: str) -> bytes:
    try:
        content = base64.b64decode(content_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="content_base64 is invalid") from exc
    if len(content) > MAX_INLINE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="inline document exceeds 20 MiB; use asynchronous object extraction",
        )
    return content


@app.get("/healthz")
def health() -> dict[str, str]:
    return {"service": "document_ai", "status": "ok"}


@app.post("/v1/documents/extract")
def extract(
    request: ExtractDocumentRequest,
    identity: Identity | None = Depends(authenticate),
) -> dict[str, object]:
    enforce_identity(identity, request.organization_id)
    content = decode_inline_content(request.content_base64)

    context = ExtractionContext(
        organization_id=request.organization_id,
        source_document_id=request.source_document_id,
        ingestion_batch_id=request.ingestion_batch_id,
        extraction_version_id=request.extraction_version_id,
        file_name=request.file_name,
        content_type=request.content_type,
    )
    return extract_document(content, context, ocr_language=request.ocr_language).to_dict()


def neutral_content_response(
    request: ExtractDocumentRequest, identity: Identity | None
) -> dict[str, object]:
    enforce_identity(identity, request.organization_id)
    content = decode_inline_content(request.content_base64)
    context = ExtractionContext(
        organization_id=request.organization_id,
        source_document_id=request.source_document_id,
        ingestion_batch_id=request.ingestion_batch_id,
        extraction_version_id=request.extraction_version_id,
        file_name=request.file_name,
        content_type=request.content_type,
    )
    try:
        return enterprise_engine.process(content, context).to_dict()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v2/documents/extract-content")
def extract_content(
    request: ExtractDocumentRequest,
    identity: Identity | None = Depends(authenticate),
) -> dict[str, object]:
    return neutral_content_response(request, identity)


@app.post("/v2/documents/analyze", deprecated=True)
def analyze(
    request: ExtractDocumentRequest,
    identity: Identity | None = Depends(authenticate),
) -> dict[str, object]:
    return neutral_content_response(request, identity)


@app.post("/v2/extraction-jobs", status_code=202)
def submit_job(
    request: SubmitExtractionJobRequest,
    identity: Identity | None = Depends(authenticate),
) -> dict[str, object]:
    enforce_identity(identity, request.organization_id, request.user_id)
    try:
        job = job_repository.submit(
            new_job(
                organization_id=request.organization_id,
                document_id=request.document_id,
                ingestion_batch_id=request.ingestion_batch_id,
                extraction_version_id=request.extraction_version_id,
                idempotency_key=request.idempotency_key,
                document_fingerprint=request.document_fingerprint.lower(),
                object_key=request.object_key,
                file_name=request.file_name,
                content_type=request.content_type,
                preferred_provider=request.preferred_provider,
                external_provider_allowed=request.external_provider_allowed,
                ocr_language=request.ocr_language,
                max_attempts=request.max_attempts,
            )
        )
        return asdict(job)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/v2/extraction-jobs/{job_id}")
def get_job(
    job_id: str,
    organization_id: str = Query(min_length=1, max_length=200),
    identity: Identity | None = Depends(authenticate),
) -> dict[str, object]:
    enforce_identity(identity, organization_id)
    try:
        return asdict(job_repository.get(organization_id, job_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
