package corrections

import (
	"errors"
	"time"

	"github.com/kora-finance/kora/libs/evidence"
)

type Type string

const (
	EventCreated     Type = "EVENT_CREATED"
	EventReversed    Type = "EVENT_REVERSED"
	EventAdjusted    Type = "EVENT_ADJUSTED"
	MatchApproved    Type = "MATCH_APPROVED"
	MatchRejected    Type = "MATCH_REJECTED"
	PostingCreated   Type = "POSTING_CREATED"
	PostingReversed  Type = "POSTING_REVERSED"
	DocumentReplaced Type = "DOCUMENT_REPLACED"
	EvidenceAdded    Type = "EVIDENCE_ADDED"
)

var validTypes = map[Type]bool{
	EventCreated:     true,
	EventReversed:    true,
	EventAdjusted:    true,
	MatchApproved:    true,
	MatchRejected:    true,
	PostingCreated:   true,
	PostingReversed:  true,
	DocumentReplaced: true,
	EvidenceAdded:    true,
}

type Event struct {
	ID                 string            `json:"id"`
	OrganizationID     string            `json:"organization_id"`
	Type               Type              `json:"type"`
	OriginalEventID    string            `json:"original_event_id,omitempty"`
	ReplacementEventID string            `json:"replacement_event_id,omitempty"`
	Evidence           evidence.Evidence `json:"evidence"`
	Reason             string            `json:"reason"`
	CreatedAt          time.Time         `json:"created_at"`
}

func Validate(event Event) error {
	if event.ID == "" {
		return errors.New("correction id is required")
	}
	if event.Type == "" {
		return errors.New("correction type is required")
	}
	if !validTypes[event.Type] {
		return errors.New("unsupported correction type")
	}
	if event.OrganizationID == "" {
		return errors.New("correction organization is required")
	}
	if event.Type != EventCreated && event.OriginalEventID == "" {
		return errors.New("original event id is required")
	}
	if event.Type == EventAdjusted && event.ReplacementEventID == "" {
		return errors.New("adjustment replacement event id is required")
	}
	if event.Reason == "" {
		return errors.New("correction reason is required")
	}
	if err := evidence.ValidateProvenance(event.Evidence); err != nil {
		return err
	}
	return nil
}
