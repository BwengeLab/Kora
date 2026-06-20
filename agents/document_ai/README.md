# Kora Document AI

Deterministic Phase 4 extraction service for CSV, Excel, text PDF, and receipt/image sources.

## Run locally

```powershell
python -m pip install -r requirements.txt
./scripts/kora.ps1 document-ai
```

The service listens on `http://127.0.0.1:8088` by default.

## API

`POST /v1/documents/extract` accepts JSON containing tenant/document provenance, file metadata, and base64 content. The response includes:

- Canonical record type and fields.
- Overall and per-field confidence.
- Missing-field and parser warnings.
- Quality flags such as `complete`, `incomplete`, `low-confidence`, `duplicate-risk`, and `needs-review`.
- Source page, row, and sheet.
- Ingestion batch and extraction version identifiers.
- Evidence suitable for downstream normalization and reconciliation.

OCR is performed with Tesseract in the container. If OCR is unavailable or returns no text, the service emits review flags and no trusted records.
