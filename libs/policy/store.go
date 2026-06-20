package policy

import (
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/kora-finance/kora/libs/auth"
)

type MemoryStore struct {
	mu       sync.RWMutex
	policies map[string][]Policy
	audits   map[string][]AuditEvent
	now      func() time.Time
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		policies: map[string][]Policy{},
		audits:   map[string][]AuditEvent{},
		now:      time.Now,
	}
}

func (s *MemoryStore) Latest(organizationID string, scope Scope) (Policy, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := key(organizationID, scope)
	versions := s.policies[key]
	if len(versions) == 0 {
		return Policy{}, errors.New("policy not found")
	}
	return versions[len(versions)-1], nil
}

func (s *MemoryStore) Save(input Policy, audit AuditEvent) (Policy, error) {
	if err := Validate(input); err != nil {
		return Policy{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now()
	stored := input
	if stored.ID == "" || len(s.policies[key(stored.OrganizationID, stored.Scope)]) == 0 {
		id, err := auth.NewID("pol")
		if err != nil {
			return Policy{}, err
		}
		stored.ID = id
		stored.Version = 1
	} else {
		latest := s.policies[key(stored.OrganizationID, stored.Scope)]
		stored.ID = latest[len(latest)-1].ID
		stored.Version = latest[len(latest)-1].Version + 1
	}
	stored.CreatedAt = now
	s.policies[key(stored.OrganizationID, stored.Scope)] = append(s.policies[key(stored.OrganizationID, stored.Scope)], stored)

	audit.PolicyID = stored.ID
	audit.Version = stored.Version
	audit.OrganizationID = stored.OrganizationID
	if audit.Action == "" {
		audit.Action = "policy.upserted"
	}
	if audit.CreatedAt.IsZero() {
		audit.CreatedAt = now
	}
	s.audits[stored.ID] = append(s.audits[stored.ID], audit)
	return stored, nil
}

func (s *MemoryStore) AuditTrail(organizationID string, policyID string) ([]AuditEvent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	events := append([]AuditEvent(nil), s.audits[policyID]...)
	filtered := events[:0]
	for _, event := range events {
		if event.OrganizationID == organizationID {
			filtered = append(filtered, event)
		}
	}
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].Version < filtered[j].Version
	})
	return filtered, nil
}

func key(organizationID string, scope Scope) string {
	return organizationID + ":" + string(scope)
}
