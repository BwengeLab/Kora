package momo

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"slices"
	"sync"
	"time"
)

type RequestState string

const (
	RequestPending    RequestState = "PENDING"
	RequestSuccessful RequestState = "SUCCESSFUL"
	RequestFailed     RequestState = "FAILED"
	RequestUnknown    RequestState = "UNKNOWN"
	RequestReceived   RequestState = "RECEIVED"
)

type Request struct {
	ID              string       `json:"id"`
	OrganizationID  string       `json:"organization_id"`
	ReferenceID     string       `json:"reference_id"`
	ExternalID      string       `json:"external_id"`
	Amount          string       `json:"amount"`
	Currency        string       `json:"currency"`
	PayerMSISDN     string       `json:"payer_msisdn"`
	PayerName       string       `json:"payer_name"`
	PayerMessage    string       `json:"payer_message"`
	PayeeNote       string       `json:"payee_note"`
	State           RequestState `json:"state"`
	FinancialTxnID  string       `json:"financial_transaction_id"`
	Reason          string       `json:"reason"`
	RequestedAt     time.Time    `json:"requested_at"`
	LastProviderAt  time.Time    `json:"last_provider_at"`
	CollectionClass string       `json:"collection_class"`
}

type RequestEvent struct {
	ID                 string         `json:"id"`
	RequestID          string         `json:"request_id"`
	OrganizationID     string         `json:"organization_id"`
	ReferenceID        string         `json:"reference_id"`
	From               RequestState   `json:"from"`
	To                 RequestState   `json:"to"`
	FinancialTxnID     string         `json:"financial_transaction_id"`
	Reason             string         `json:"reason"`
	OccurredAt         time.Time      `json:"occurred_at"`
	RawProviderPayload map[string]any `json:"raw_provider_payload,omitempty"`
}

type Store struct {
	mu       sync.RWMutex
	requests map[string]Request
	byRef    map[string]string
	eventLog map[string][]RequestEvent
}

func NewStore() *Store {
	return &Store{
		requests: map[string]Request{},
		byRef:    map[string]string{},
		eventLog: map[string][]RequestEvent{},
	}
}

func (s *Store) Create(request Request) (Request, error) {
	if request.OrganizationID == "" || request.ReferenceID == "" {
		return Request{}, errors.New("organization and reference are required")
	}
	if request.State != RequestReceived && (request.Amount == "" || request.Currency == "") {
		return Request{}, errors.New("amount and currency are required")
	}
	if request.State == "" {
		request.State = RequestPending
	}
	if request.RequestedAt.IsZero() {
		request.RequestedAt = time.Now().UTC()
	}
	request.ID = newID("momo_req")
	request = cloneRequest(request)

	s.mu.Lock()
	defer s.mu.Unlock()
	refKey := key(request.OrganizationID, request.ReferenceID)
	if _, exists := s.byRef[refKey]; exists {
		return Request{}, errors.New("momo request reference already exists")
	}
	s.requests[request.ID] = request
	s.byRef[refKey] = request.ID
	s.eventLog[request.ID] = []RequestEvent{{
		ID:             newID("momo_evt"),
		RequestID:      request.ID,
		OrganizationID: request.OrganizationID,
		ReferenceID:    request.ReferenceID,
		From:           "",
		To:             request.State,
		OccurredAt:     request.RequestedAt,
	}}
	return cloneRequest(request), nil
}

func (s *Store) GetByReference(organizationID string, referenceID string) (Request, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	requestID, ok := s.byRef[key(organizationID, referenceID)]
	if !ok {
		return Request{}, errors.New("momo request not found")
	}
	request, ok := s.requests[requestID]
	if !ok {
		return Request{}, errors.New("momo request not found")
	}
	return cloneRequest(request), nil
}

func (s *Store) UpdateFromProvider(organizationID string, referenceID string, update RequestEvent) (Request, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	requestID, ok := s.byRef[key(organizationID, referenceID)]
	if !ok {
		return Request{}, errors.New("momo request not found")
	}
	request := s.requests[requestID]
	update.ID = newID("momo_evt")
	update.RequestID = request.ID
	update.OrganizationID = organizationID
	update.ReferenceID = referenceID
	update.From = request.State
	if update.To == "" {
		update.To = request.State
	}
	if update.OccurredAt.IsZero() {
		update.OccurredAt = time.Now().UTC()
	}
	if update.FinancialTxnID != "" {
		request.FinancialTxnID = update.FinancialTxnID
	}
	if update.Reason != "" {
		request.Reason = update.Reason
	}
	request.State = update.To
	request.LastProviderAt = update.OccurredAt
	s.requests[requestID] = request
	s.eventLog[requestID] = append(s.eventLog[requestID], update)
	return cloneRequest(request), nil
}

func (s *Store) SaveOrUpdateFromCallback(seed Request, update RequestEvent) (Request, error) {
	if seed.OrganizationID == "" || seed.ReferenceID == "" {
		return Request{}, errors.New("organization and reference are required")
	}
	if _, err := s.GetByReference(seed.OrganizationID, seed.ReferenceID); err == nil {
		return s.UpdateFromProvider(seed.OrganizationID, seed.ReferenceID, update)
	}
	if seed.State == "" {
		seed.State = RequestReceived
	}
	created, err := s.Create(seed)
	if err != nil {
		return Request{}, err
	}
	return s.UpdateFromProvider(created.OrganizationID, created.ReferenceID, update)
}

func (s *Store) History(organizationID string, referenceID string) ([]RequestEvent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	requestID, ok := s.byRef[key(organizationID, referenceID)]
	if !ok {
		return nil, errors.New("momo request not found")
	}
	stream := s.eventLog[requestID]
	return slices.Clone(stream), nil
}

func cloneRequest(request Request) Request {
	return request
}

func key(organizationID string, referenceID string) string {
	return organizationID + ":" + referenceID
}

func newID(prefix string) string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return prefix + "_" + hex.EncodeToString(b[:])
}
