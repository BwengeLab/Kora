from __future__ import annotations

import base64
import binascii

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from agents.document_ai.extractor import extract_document
from agents.document_ai.schemas import ExtractionContext


class ExtractDocumentRequest(BaseModel):
    organization_id: str = Field(min_length=1)
    source_document_id: str = Field(min_length=1)
    ingestion_batch_id: str = Field(min_length=1)
    extraction_version_id: str = Field(min_length=1)
    file_name: str = Field(min_length=1)
    content_type: str = ""
    content_base64: str = Field(min_length=1, max_length=28_000_000)
    ocr_language: str = "eng"


app = FastAPI(title="Kora Document AI", version="1.0.0")


@app.get("/healthz")
def health() -> dict[str, str]:
    return {"service": "document_ai", "status": "ok"}


@app.post("/v1/documents/extract")
def extract(request: ExtractDocumentRequest) -> dict[str, object]:
    try:
        content = base64.b64decode(request.content_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="content_base64 is invalid") from exc

    context = ExtractionContext(
        organization_id=request.organization_id,
        source_document_id=request.source_document_id,
        ingestion_batch_id=request.ingestion_batch_id,
        extraction_version_id=request.extraction_version_id,
        file_name=request.file_name,
        content_type=request.content_type,
    )
    return extract_document(content, context, ocr_language=request.ocr_language).to_dict()
