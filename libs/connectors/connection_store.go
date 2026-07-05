package connectors

import (
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/kora-finance/kora/libs/access"
)

type ConnectionStore interface {
	Create(actor access.Actor, connection Connection) (Connection, error)
	Get(actor access.Actor, organizationID, connectionID string) (Connection, error)
	List(actor access.Actor, organizationID string, kind Kind) ([]Connection, error)
}

type MemoryConnectionStore struct {
	mu          sync.RWMutex
	connections map[string]Connection
}

func NewMemoryConnectionStore() *MemoryConnectionStore {
	return &MemoryConnectionStore{connections: map[string]Connection{}}
}

func (s *MemoryConnectionStore) Create(actor access.Actor, connection Connection) (Connection, error) {
	if err := ValidateConnection(actor, connection); err != nil {
		return Connection{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.connections[connection.ID]; exists {
		return Connection{}, errors.New("connector connection already exists")
	}
	for _, existing := range s.connections {
		if existing.OrganizationID == connection.OrganizationID &&
			existing.Kind == connection.Kind &&
			strings.EqualFold(existing.DisplayName, connection.DisplayName) {
			return Connection{}, errors.New("connector display name already exists for this organization and kind")
		}
	}
	created := cloneConnection(connection)
	if created.CreatedAt.IsZero() {
		created.CreatedAt = time.Now().UTC()
	}
	s.connections[created.ID] = cloneConnection(created)
	return cloneConnection(created), nil
}

func (s *MemoryConnectionStore) Get(actor access.Actor, organizationID, connectionID string) (Connection, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: organizationID}, access.PermissionManageIntegrations); err != nil {
		return Connection{}, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	connection, ok := s.connections[connectionID]
	if !ok || connection.OrganizationID != organizationID {
		return Connection{}, errors.New("connector connection not found")
	}
	return cloneConnection(connection), nil
}

func (s *MemoryConnectionStore) List(actor access.Actor, organizationID string, kind Kind) ([]Connection, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: organizationID}, access.PermissionManageIntegrations); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Connection, 0)
	for _, connection := range s.connections {
		if connection.OrganizationID != organizationID {
			continue
		}
		if kind != "" && connection.Kind != kind {
			continue
		}
		out = append(out, cloneConnection(connection))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func cloneConnection(connection Connection) Connection {
	out := connection
	if connection.Config != nil {
		out.Config = cloneMap(connection.Config)
	}
	return out
}
