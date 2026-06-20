package evidence

import "errors"

type Evidence struct {
	SourceDocumentID     string  `json:"source_document_id"`
	SourceRecordID       string  `json:"source_record_id"`
	SourceRecordDBID     string  `json:"source_record_db_id,omitempty"`
	IngestionBatchID     string  `json:"ingestion_batch_id,omitempty"`
	ExtractionVersionID  string  `json:"extraction_version_id,omitempty"`
	TransactionReference string  `json:"transaction_reference,omitempty"`
	OccurredOn           string  `json:"occurred_on,omitempty"`
	AmountMinor          int64   `json:"amount_minor,omitempty"`
	Currency             string  `json:"currency,omitempty"`
	Precision            int     `json:"precision,omitempty"`
	Reason               string  `json:"reason"`
	SuggestedAction      string  `json:"suggested_action,omitempty"`
	ConfidenceScore      float64 `json:"confidence_score"`
	ConfidenceMethod     string  `json:"confidence_method,omitempty"`
	SourcePage           int     `json:"source_page,omitempty"`
	SourceRow            int     `json:"source_row,omitempty"`
	SourceSheet          string  `json:"source_sheet,omitempty"`
}

func ValidateProvenance(e Evidence) error {
	if err := Validate(e); err != nil {
		return err
	}
	if e.IngestionBatchID == "" {
		return errors.New("evidence ingestion batch is required")
	}
	if e.ExtractionVersionID == "" {
		return errors.New("evidence extraction version is required")
	}
	if e.SourcePage < 0 || e.SourceRow < 0 {
		return errors.New("evidence source location cannot be negative")
	}
	return nil
}

func Validate(e Evidence) error {
	if e.SourceDocumentID == "" {
		return errors.New("evidence source document is required")
	}
	if e.SourceRecordID == "" {
		return errors.New("evidence source record is required")
	}
	if e.Reason == "" {
		return errors.New("evidence reason is required")
	}
	if e.ConfidenceScore < 0 || e.ConfidenceScore > 1 {
		return errors.New("evidence confidence must be between 0 and 1")
	}
	return nil
}
