package identity

import (
	"errors"
	"sync"
	"time"

	"github.com/kora-finance/kora/libs/access"
)

type Organization struct {
	ID        string
	Name      string
	Status    string
	CreatedAt time.Time
}

type User struct {
	ID             string
	OrganizationID string
	Email          string
	DisplayName    string
	PasswordHash   string
	PasswordSalt   string
	Status         string
	CreatedAt      time.Time
}

type RoleBinding struct {
	ID             string
	OrganizationID string
	UserID         string
	Role           access.Role
	CreatedAt      time.Time
}

type RefreshSession struct {
	TokenHash      string
	OrganizationID string
	UserID         string
	ExpiresAt      time.Time
	Revoked        bool
}

type Store interface {
	CreateOrganization(org Organization) error
	CreateUser(user User) error
	CreateRoleBinding(binding RoleBinding) error
	FindOrganizationByID(organizationID string) (Organization, error)
	FindUserByEmail(email string) (User, error)
	FindUserByID(userID string) (User, error)
	RolesForUser(userID string) ([]access.Role, error)
	SaveRefreshSession(session RefreshSession) error
	FindRefreshSession(tokenHash string) (RefreshSession, error)
	RevokeRefreshSession(tokenHash string) error
}

type MemoryStore struct {
	mu            sync.RWMutex
	organizations map[string]Organization
	users         map[string]User
	usersByEmail  map[string]string
	roleBindings  []RoleBinding
	refreshTokens map[string]RefreshSession
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		organizations: map[string]Organization{},
		users:         map[string]User{},
		usersByEmail:  map[string]string{},
		refreshTokens: map[string]RefreshSession{},
	}
}

func (s *MemoryStore) CreateOrganization(org Organization) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.organizations[org.ID]; exists {
		return errors.New("organization already exists")
	}
	s.organizations[org.ID] = org
	return nil
}

func (s *MemoryStore) CreateUser(user User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.users[user.ID]; exists {
		return errors.New("user already exists")
	}
	if _, exists := s.usersByEmail[user.Email]; exists {
		return errors.New("email already exists")
	}
	s.users[user.ID] = user
	s.usersByEmail[user.Email] = user.ID
	return nil
}

func (s *MemoryStore) CreateRoleBinding(binding RoleBinding) error {
	if !access.IsTenantRole(binding.Role) {
		return errors.New("invalid tenant role")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, existing := range s.roleBindings {
		if existing.OrganizationID == binding.OrganizationID && existing.UserID == binding.UserID && existing.Role == binding.Role {
			return errors.New("role binding already exists")
		}
	}
	s.roleBindings = append(s.roleBindings, binding)
	return nil
}

func (s *MemoryStore) FindOrganizationByID(organizationID string) (Organization, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	org, exists := s.organizations[organizationID]
	if !exists {
		return Organization{}, errors.New("organization not found")
	}
	return org, nil
}

func (s *MemoryStore) FindUserByEmail(email string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	userID, exists := s.usersByEmail[email]
	if !exists {
		return User{}, errors.New("user not found")
	}
	return s.users[userID], nil
}

func (s *MemoryStore) FindUserByID(userID string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	user, exists := s.users[userID]
	if !exists {
		return User{}, errors.New("user not found")
	}
	return user, nil
}

func (s *MemoryStore) RolesForUser(userID string) ([]access.Role, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if _, exists := s.users[userID]; !exists {
		return nil, errors.New("user not found")
	}
	var roles []access.Role
	for _, binding := range s.roleBindings {
		if binding.UserID == userID {
			roles = append(roles, binding.Role)
		}
	}
	return roles, nil
}

func (s *MemoryStore) SaveRefreshSession(session RefreshSession) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshTokens[session.TokenHash] = session
	return nil
}

func (s *MemoryStore) FindRefreshSession(tokenHash string) (RefreshSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, exists := s.refreshTokens[tokenHash]
	if !exists {
		return RefreshSession{}, errors.New("refresh session not found")
	}
	return session, nil
}

func (s *MemoryStore) RevokeRefreshSession(tokenHash string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	session, exists := s.refreshTokens[tokenHash]
	if !exists {
		return errors.New("refresh session not found")
	}
	session.Revoked = true
	s.refreshTokens[tokenHash] = session
	return nil
}
