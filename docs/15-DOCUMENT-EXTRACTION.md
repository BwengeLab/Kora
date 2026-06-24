# Kora Neutral Document Extraction

## Responsibility Boundary

The extraction subsystem preserves document content. It does not decide whether a
document is an invoice, claim, contract, bank statement, or valid business record.

The output contains:

- Original file fingerprint and inspection result.
- Pages or spreadsheet sheets.
- Reading-ordered lines.
- Tokens with normalized source coordinates.
- Neutral tables and cells inferred from geometry.
- OCR method, confidence, coordinate coverage, and warnings.
- No ledger postings and no business-event classifications.

Document understanding, business validation, and normalization run after extraction.

## Supported Inputs

- CSV: exact rows and cells.
- XLSX/XLSM: exact sheets, rows, cells, and formulas as source text.
- PDF: native text and coordinates; page OCR fallback for scanned pages.
- PNG, JPEG, WebP, and TIFF: OCR text and coordinates.

The default local OCR engine is Tesseract. Windows OCR is a development fallback when
Tesseract is unavailable. Windows OCR does not provide token confidence and therefore
always emits `ocr-confidence-unavailable`.

## Trust Rules

- Source bytes are immutable and SHA-256 verified before processing.
- File signatures are checked independently from extensions and MIME declarations.
- Oversized, encrypted, malformed, suspicious, or malware-unscanned production files
  are rejected or quarantined before parsing.
- OCR text is evidence, not truth. Low-confidence and unscored content remains visible
  and must be reviewed downstream.
- No spelling correction or document-specific regex is applied to neutral v2 content.
- Original token text and coordinates are retained even when table cells are inferred.

## APIs

`POST /v2/documents/extract-content` accepts documents up to 20 MiB inline. Larger
documents must be written to object storage and submitted through
`POST /v2/extraction-jobs`.

`POST /v2/documents/analyze` remains as a deprecated compatibility alias. It returns
the same neutral output and performs no semantic analysis.

The worker verifies the object fingerprint, renews its processing lease, recovers
expired jobs, retries with exponential delay, and writes append-only job/result events.

## Required Local Runtime

- Python dependencies from `requirements.txt`.
- Tesseract with required language packs.
- ClamAV and current signatures in production.
- PostgreSQL and MinIO for asynchronous processing.

Important environment variables:

- `KORA_ENV=production`
- `KORA_DOCUMENT_AI_TOKEN`
- `KORA_JWT_SECRET`
- `DATABASE_URL`
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- `MINIO_DOCUMENT_BUCKET`
- `KORA_OCR_PREPROCESS=true` only for controlled experiments; it is disabled by default.

## Operational Limits

Local OCR can still confuse visually similar characters, handwriting, damaged scans,
and unusual fonts. Complex tables are inferred from geometry and carry confidence;
they are not silently promoted to finance records. These cases must remain in review
until the separate understanding and validation stages approve them.
