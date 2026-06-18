package evidence

import "errors"

type Evidence struct {
	SourceDocumentID     string
	SourceRecordID       string
	TransactionReference string
	OccurredOn           string
	Reason               string
	SuggestedAction      string
	ConfidenceScore      float64
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

