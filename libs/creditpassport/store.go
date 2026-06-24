package creditpassport

import (
	"errors"
	"sync"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/consent"
)

type Store struct {
	mu        sync.RWMutex
	passports map[string]Passport
}

func NewStore() *Store {
	return &Store{passports: map[string]Passport{}}
}

func (s *Store) Generate(actor access.Actor, input Input) (Passport, bool, error) {
	passport, err := Generate(actor, input)
	if err != nil {
		return Passport{}, false, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if existing, ok := s.passports[passport.ID]; ok {
		return existing, false, nil
	}
	s.passports[passport.ID] = passport
	return passport, true, nil
}

func (s *Store) Read(actor access.Actor, organizationID, passportID string) (Passport, error) {
	s.mu.RLock()
	passport, ok := s.passports[passportID]
	s.mu.RUnlock()
	if !ok || passport.OrganizationID != organizationID {
		return Passport{}, errors.New("credit passport not found")
	}
	return Read(actor, passport)
}

func (s *Store) Share(consents *consent.Store, request consent.AccessRequest, categories []string, passportID string) (SharedPassport, error) {
	s.mu.RLock()
	passport, ok := s.passports[passportID]
	s.mu.RUnlock()
	if !ok {
		return SharedPassport{}, errors.New("credit passport not found")
	}
	return Share(consents, request, categories, passport)
}
