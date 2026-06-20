package eventledger

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/kora-finance/kora/libs/corrections"
	"github.com/kora-finance/kora/libs/evidence"
)

type EventType string

const (
	TransactionObserved EventType = "TRANSACTION_OBSERVED"
	PaymentReceived     EventType = "PAYMENT_RECEIVED"
	PaymentSent         EventType = "PAYMENT_SENT"
	InvoiceIssued       EventType = "INVOICE_ISSUED"
	BillReceived        EventType = "BILL_RECEIVED"
	ReceiptRecorded     EventType = "RECEIPT_RECORDED"
	ContractSigned      EventType = "CONTRACT_SIGNED"
	ObligationCreated   EventType = "OBLIGATION_CREATED"
	DocumentMissing     EventType = "DOCUMENT_MISSING"
	ApprovalRequired    EventType = "APPROVAL_REQUIRED"
)

type Status string

const (
	Active     Status = "ACTIVE"
	Reversed   Status = "REVERSED"
	Adjusted   Status = "ADJUSTED"
	Superseded Status = "SUPERSEDED"
)

var validEventTypes = map[EventType]bool{
	TransactionObserved: true,
	PaymentReceived:     true,
	PaymentSent:         true,
	InvoiceIssued:       true,
	BillReceived:        true,
	ReceiptRecorded:     true,
	ContractSigned:      true,
	ObligationCreated:   true,
	DocumentMissing:     true,
	ApprovalRequired:    true,
}

type Event struct {
	ID               string            `json:"id"`
	OrganizationID   string            `json:"organization_id"`
	Type             EventType         `json:"type"`
	Status           Status            `json:"status"`
	ExternalPartyID  string            `json:"external_party_id,omitempty"`
	AccountID        string            `json:"account_id,omitempty"`
	SourceEntityID   string            `json:"source_entity_id,omitempty"`
	RelatedEntityIDs map[string]string `json:"related_entity_ids"`
	Evidence         evidence.Evidence `json:"evidence"`
	Attributes       map[string]string `json:"attributes"`
	CreatedAt        time.Time         `json:"created_at"`
}

type EventView struct {
	Event
	EffectiveStatus Status              `json:"effective_status"`
	Corrections     []corrections.Event `json:"corrections"`
}

type AppendResult struct {
	Event   Event `json:"event"`
	Created bool  `json:"created"`
}

type Store struct {
	mu                  sync.RWMutex
	eventsByID          map[string]Event
	eventOrderByTenant  map[string][]string
	eventByProvenance   map[string]string
	correctionsByID     map[string]corrections.Event
	correctionsByTarget map[string][]string
}

func NewStore() *Store {
	return &Store{
		eventsByID:          map[string]Event{},
		eventOrderByTenant:  map[string][]string{},
		eventByProvenance:   map[string]string{},
		correctionsByID:     map[string]corrections.Event{},
		correctionsByTarget: map[string][]string{},
	}
}

func (s *Store) Append(event Event) (AppendResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.appendLocked(event)
}

func (s *Store) appendLocked(event Event) (AppendResult, error) {
	if event.ID == "" {
		event.ID = newID("evt")
	}
	if event.Status == "" {
		event.Status = Active
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	if err := Validate(event); err != nil {
		return AppendResult{}, err
	}
	if _, exists := s.eventsByID[event.ID]; exists {
		return AppendResult{}, errors.New("business event id already exists")
	}
	provenance := provenanceKey(event)
	if existingID, exists := s.eventByProvenance[provenance]; exists {
		return AppendResult{Event: cloneEvent(s.eventsByID[existingID]), Created: false}, nil
	}

	event = cloneEvent(event)
	s.eventsByID[event.ID] = event
	s.eventByProvenance[provenance] = event.ID
	s.eventOrderByTenant[event.OrganizationID] = append(s.eventOrderByTenant[event.OrganizationID], event.ID)
	return AppendResult{Event: cloneEvent(event), Created: true}, nil
}

func (s *Store) AppendCorrection(correction corrections.Event) (corrections.Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if correction.ID == "" {
		correction.ID = newID("cor")
	}
	if correction.CreatedAt.IsZero() {
		correction.CreatedAt = time.Now().UTC()
	}
	if err := corrections.Validate(correction); err != nil {
		return corrections.Event{}, err
	}
	if _, exists := s.correctionsByID[correction.ID]; exists {
		return corrections.Event{}, errors.New("correction event id already exists")
	}
	if correction.Type != corrections.EventCreated {
		original, ok := s.eventsByID[correction.OriginalEventID]
		if !ok || original.OrganizationID != correction.OrganizationID {
			return corrections.Event{}, errors.New("original business event not found")
		}
	}
	if correction.Type == corrections.EventAdjusted {
		replacement, ok := s.eventsByID[correction.ReplacementEventID]
		if !ok || replacement.OrganizationID != correction.OrganizationID {
			return corrections.Event{}, errors.New("replacement business event not found")
		}
	}
	if correction.Type == corrections.EventReversed {
		status := s.effectiveStatusLocked(correction.OrganizationID, correction.OriginalEventID)
		if status == Reversed {
			return corrections.Event{}, errors.New("business event is already reversed")
		}
	}

	s.correctionsByID[correction.ID] = correction
	if correction.OriginalEventID != "" {
		s.correctionsByTarget[correction.OriginalEventID] = append(s.correctionsByTarget[correction.OriginalEventID], correction.ID)
	}
	return correction, nil
}

func (s *Store) Reverse(organizationID string, eventID string, proof evidence.Evidence, reason string) (corrections.Event, error) {
	return s.AppendCorrection(corrections.Event{
		OrganizationID:  organizationID,
		Type:            corrections.EventReversed,
		OriginalEventID: eventID,
		Evidence:        proof,
		Reason:          reason,
	})
}

func (s *Store) Get(organizationID string, eventID string) (EventView, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	event, ok := s.eventsByID[eventID]
	if !ok || event.OrganizationID != organizationID {
		return EventView{}, errors.New("business event not found")
	}
	return s.viewLocked(event), nil
}

func (s *Store) List(organizationID string) []EventView {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ids := append([]string(nil), s.eventOrderByTenant[organizationID]...)
	views := make([]EventView, 0, len(ids))
	for _, id := range ids {
		views = append(views, s.viewLocked(s.eventsByID[id]))
	}
	sort.SliceStable(views, func(i, j int) bool { return views[i].CreatedAt.Before(views[j].CreatedAt) })
	return views
}

func (s *Store) viewLocked(event Event) EventView {
	correctionIDs := s.correctionsByTarget[event.ID]
	stream := make([]corrections.Event, 0, len(correctionIDs))
	for _, correctionID := range correctionIDs {
		stream = append(stream, s.correctionsByID[correctionID])
	}
	return EventView{
		Event:           cloneEvent(event),
		EffectiveStatus: effectiveStatus(stream),
		Corrections:     append([]corrections.Event(nil), stream...),
	}
}

func (s *Store) effectiveStatusLocked(organizationID string, eventID string) Status {
	event, ok := s.eventsByID[eventID]
	if !ok || event.OrganizationID != organizationID {
		return ""
	}
	return s.viewLocked(event).EffectiveStatus
}

func effectiveStatus(stream []corrections.Event) Status {
	status := Active
	for _, correction := range stream {
		switch correction.Type {
		case corrections.EventReversed:
			status = Reversed
		case corrections.EventAdjusted:
			status = Adjusted
		case corrections.DocumentReplaced:
			status = Superseded
		}
	}
	return status
}

func Validate(event Event) error {
	if event.ID == "" {
		return errors.New("business event id is required")
	}
	if event.OrganizationID == "" {
		return errors.New("business event organization is required")
	}
	if !validEventTypes[event.Type] {
		return fmt.Errorf("unsupported business event type %q", event.Type)
	}
	if event.Status != Active {
		return errors.New("new business events must be active; effective corrections are derived from correction events")
	}
	if err := evidence.ValidateProvenance(event.Evidence); err != nil {
		return err
	}
	return nil
}

func provenanceKey(event Event) string {
	return fmt.Sprintf("%s:%s:%s:%s", event.OrganizationID, event.Evidence.SourceDocumentID, event.Evidence.ExtractionVersionID, event.Evidence.SourceRecordID)
}

func cloneEvent(event Event) Event {
	event.Attributes = cloneMap(event.Attributes)
	event.RelatedEntityIDs = cloneMap(event.RelatedEntityIDs)
	return event
}

func cloneMap(input map[string]string) map[string]string {
	output := map[string]string{}
	for key, value := range input {
		output[key] = value
	}
	return output
}

func newID(prefix string) string {
	var value [8]byte
	if _, err := rand.Read(value[:]); err != nil {
		panic(err)
	}
	return prefix + "_" + hex.EncodeToString(value[:])
}
