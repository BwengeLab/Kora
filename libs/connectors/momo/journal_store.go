package momo

import (
	"bufio"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

type JournalStore struct {
	mu    sync.Mutex
	path  string
	file  *os.File
	store *Store
}

type journalEntry struct {
	Type    string        `json:"type"`
	Request *Request      `json:"request,omitempty"`
	Update  *RequestEvent `json:"update,omitempty"`
}

func NewJournalStore(path string) (*JournalStore, error) {
	if path == "" {
		return nil, errors.New("journal path is required")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	file, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0o600)
	if err != nil {
		return nil, err
	}
	js := &JournalStore{path: path, file: file, store: NewStore()}
	if err := js.replay(); err != nil {
		_ = file.Close()
		return nil, err
	}
	if _, err := file.Seek(0, 2); err != nil {
		_ = file.Close()
		return nil, err
	}
	return js, nil
}

func (s *JournalStore) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.file == nil {
		return nil
	}
	err := s.file.Close()
	s.file = nil
	return err
}

func (s *JournalStore) Create(request Request) (Request, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	created, err := s.store.Create(request)
	if err != nil {
		return Request{}, err
	}
	if err := s.append(journalEntry{Type: "create", Request: &created}); err != nil {
		return Request{}, err
	}
	return created, nil
}

func (s *JournalStore) GetByReference(organizationID string, referenceID string) (Request, error) {
	return s.store.GetByReference(organizationID, referenceID)
}

func (s *JournalStore) UpdateFromProvider(organizationID string, referenceID string, update RequestEvent) (Request, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	updated, err := s.store.UpdateFromProvider(organizationID, referenceID, update)
	if err != nil {
		return Request{}, err
	}
	entryUpdate := update
	if history, histErr := s.store.History(organizationID, referenceID); histErr == nil && len(history) > 0 {
		entryUpdate = history[len(history)-1]
	}
	if err := s.append(journalEntry{Type: "update", Update: &entryUpdate}); err != nil {
		return Request{}, err
	}
	return updated, nil
}

func (s *JournalStore) SaveOrUpdateFromCallback(seed Request, update RequestEvent) (Request, error) {
	if _, err := s.GetByReference(seed.OrganizationID, seed.ReferenceID); err == nil {
		return s.UpdateFromProvider(seed.OrganizationID, seed.ReferenceID, update)
	}
	created, err := s.Create(seed)
	if err != nil {
		return Request{}, err
	}
	return s.UpdateFromProvider(created.OrganizationID, created.ReferenceID, update)
}

func (s *JournalStore) History(organizationID string, referenceID string) ([]RequestEvent, error) {
	return s.store.History(organizationID, referenceID)
}

func (s *JournalStore) List(filter ListFilter) []Request {
	return s.store.List(filter)
}

func (s *JournalStore) replay() error {
	if _, err := s.file.Seek(0, 0); err != nil {
		return err
	}
	scanner := bufio.NewScanner(s.file)
	for scanner.Scan() {
		var entry journalEntry
		if err := json.Unmarshal(scanner.Bytes(), &entry); err != nil {
			return err
		}
		switch entry.Type {
		case "create":
			if entry.Request == nil {
				return errors.New("journal create entry missing request")
			}
			if err := s.restoreCreate(*entry.Request); err != nil {
				return err
			}
		case "update":
			if entry.Update == nil {
				return errors.New("journal update entry missing update")
			}
			if err := s.restoreUpdate(*entry.Update); err != nil {
				return err
			}
		default:
			return errors.New("unknown journal entry type")
		}
	}
	return scanner.Err()
}

func (s *JournalStore) restoreCreate(request Request) error {
	s.store.mu.Lock()
	defer s.store.mu.Unlock()
	refKey := key(request.OrganizationID, request.ReferenceID)
	if _, exists := s.store.byRef[refKey]; exists {
		return nil
	}
	s.store.requests[request.ID] = request
	s.store.byRef[refKey] = request.ID
	s.store.eventLog[request.ID] = []RequestEvent{{
		ID:             newID("momo_evt"),
		RequestID:      request.ID,
		OrganizationID: request.OrganizationID,
		ReferenceID:    request.ReferenceID,
		From:           "",
		To:             request.State,
		OccurredAt:     request.RequestedAt,
	}}
	return nil
}

func (s *JournalStore) restoreUpdate(update RequestEvent) error {
	s.store.mu.Lock()
	defer s.store.mu.Unlock()
	request, ok := s.store.requests[update.RequestID]
	if !ok {
		return errors.New("journal update references unknown request")
	}
	request.State = update.To
	if update.FinancialTxnID != "" {
		request.FinancialTxnID = update.FinancialTxnID
	}
	if update.Reason != "" {
		request.Reason = update.Reason
	}
	request.LastProviderAt = update.OccurredAt
	s.store.requests[request.ID] = request
	s.store.eventLog[request.ID] = append(s.store.eventLog[request.ID], update)
	return nil
}

func (s *JournalStore) append(entry journalEntry) error {
	if s.file == nil {
		return errors.New("journal store is closed")
	}
	payload, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	if _, err := s.file.Write(append(payload, '\n')); err != nil {
		return err
	}
	return s.file.Sync()
}
