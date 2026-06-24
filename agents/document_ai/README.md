# Kora Document AI

Enterprise document-intelligence pipeline for CSV, Excel, PDF, and image sources.

The v2 path performs signature-based file inspection, bounded parsing, malware-policy
enforcement, provider routing, page/line/token extraction with coordinates, and
replay-safe asynchronous processing. It does not classify document types or map
business fields. Semantic interpretation happens in a separate validator stage.

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

The complete production contract is documented in
`docs/15-DOCUMENT-EXTRACTION.md`.

Large, irregular tables and handwriting require a stronger layout-aware provider.
External providers are tenant-policy gated and disabled by default.
