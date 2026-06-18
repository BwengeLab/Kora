package corrections

import "errors"

type Type string

const (
	EventCreated    Type = "EVENT_CREATED"
	EventReversed   Type = "EVENT_REVERSED"
	EventAdjusted   Type = "EVENT_ADJUSTED"
	MatchApproved   Type = "MATCH_APPROVED"
	MatchRejected   Type = "MATCH_REJECTED"
	PostingCreated  Type = "POSTING_CREATED"
	PostingReversed Type = "POSTING_REVERSED"
	DocumentReplaced Type = "DOCUMENT_REPLACED"
	EvidenceAdded   Type = "EVIDENCE_ADDED"
)

type Event struct {
	ID                 string
	Type               Type
	OriginalEventID    string
	ReplacementEventID string
	Reason             string
}

func Validate(event Event) error {
	if event.ID == "" {
		return errors.New("correction id is required")
	}
	if event.Type == "" {
		return errors.New("correction type is required")
	}
	if event.Type != EventCreated && event.OriginalEventID == "" {
		return errors.New("original event id is required")
	}
	if event.Reason == "" {
		return errors.New("correction reason is required")
	}
	return nil
}

