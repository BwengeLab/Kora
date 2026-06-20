ALTER TABLE source_records
    ADD COLUMN IF NOT EXISTS field_confidences JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS warnings TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS source_page INTEGER NOT NULL DEFAULT 0 CHECK (source_page >= 0),
    ADD COLUMN IF NOT EXISTS source_row INTEGER NOT NULL DEFAULT 0 CHECK (source_row >= 0),
    ADD COLUMN IF NOT EXISTS source_sheet TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS source_records_document_location_idx
    ON source_records (document_id, extraction_version_id, source_page, source_row);

INSERT INTO schema_migrations (version)
VALUES ('007_document_ai_extraction')
ON CONFLICT (version) DO NOTHING;
