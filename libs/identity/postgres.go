package identity

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(databaseURL string) (*PostgresStore, error) {
	if databaseURL == "" {
		return nil, errors.New("database url is required")
	}
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	store := &PostgresStore{db: db}
	if err := store.ensureSchema(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *PostgresStore) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *PostgresStore) ensureSchema() error {
	statements := []string{
		`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
		`ALTER TABLE role_bindings DROP CONSTRAINT IF EXISTS role_bindings_canonical_role`,
		`ALTER TABLE role_bindings ADD CONSTRAINT role_bindings_canonical_role CHECK (
			role IN (
				'ORGANIZATION_OWNER','FINANCE_LEAD','FINANCE_OPERATOR',
				'AUDITOR_COMPLIANCE','ORG_ADMIN','EXTERNAL_COLLABORATOR',
				'CLAIMS_OFFICER'
			)
		)`,
		`CREATE TABLE IF NOT EXISTS refresh_sessions (
			token_hash TEXT PRIMARY KEY,
			organization_id TEXT NOT NULL REFERENCES organizations(id),
			user_id TEXT NOT NULL REFERENCES users(id),
			expires_at TIMESTAMPTZ NOT NULL,
			revoked BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
	}
	for _, stmt := range statements {
		if _, err := s.db.ExecContext(context.Background(), stmt); err != nil {
			return fmt.Errorf("ensure identity schema: %w", err)
		}
	}
	return nil
}

func (s *PostgresStore) CreateOrganization(org Organization) error {
	_, err := s.db.ExecContext(context.Background(),
		`INSERT INTO organizations (id, name, domain, status, created_at) VALUES ($1, $2, $3, $4, $5)`,
		org.ID, org.Name, org.Domain, org.Status, org.CreatedAt)
	if isPGUniqueViolation(err) {
		return errors.New("organization already exists")
	}
	return err
}

func (s *PostgresStore) CreateUser(user User) error {
	_, err := s.db.ExecContext(context.Background(),
		`INSERT INTO users (id, organization_id, email, display_name, password_hash, password_salt, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		user.ID, user.OrganizationID, user.Email, user.DisplayName,
		user.PasswordHash, user.PasswordSalt, user.Status, user.CreatedAt)
	if isPGUniqueViolation(err) {
		return errors.New("email already exists")
	}
	return err
}

func (s *PostgresStore) UpdateUser(user User) error {
	res, err := s.db.ExecContext(context.Background(),
		`UPDATE users SET email=$1, display_name=$2, password_hash=$3, password_salt=$4, status=$5 WHERE id=$6`,
		user.Email, user.DisplayName, user.PasswordHash, user.PasswordSalt, user.Status, user.ID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("user not found")
	}
	return nil
}

func (s *PostgresStore) CreateRoleBinding(binding RoleBinding) error {
	if !access.IsTenantRole(binding.Role) {
		return errors.New("invalid tenant role")
	}
	_, err := s.db.ExecContext(context.Background(),
		`INSERT INTO role_bindings (id, organization_id, user_id, role, created_at) VALUES ($1, $2, $3, $4, $5)`,
		binding.ID, binding.OrganizationID, binding.UserID, string(binding.Role), binding.CreatedAt)
	if isPGUniqueViolation(err) {
		return errors.New("role binding already exists")
	}
	return err
}

func (s *PostgresStore) FindOrganizationByID(organizationID string) (Organization, error) {
	var org Organization
	var domain sql.NullString
	err := s.db.QueryRowContext(context.Background(),
		`SELECT id, name, COALESCE(domain,''), status, created_at FROM organizations WHERE id=$1`, organizationID).
		Scan(&org.ID, &org.Name, &domain, &org.Status, &org.CreatedAt)
	if err == sql.ErrNoRows {
		return Organization{}, errors.New("organization not found")
	}
	if err != nil {
		return Organization{}, err
	}
	org.Domain = domain.String
	return org, nil
}

func (s *PostgresStore) FindUserByEmail(email string) (User, error) {
	var user User
	err := s.db.QueryRowContext(context.Background(),
		`SELECT id, organization_id, email, display_name, password_hash, password_salt, status, created_at FROM users WHERE email=$1`, email).
		Scan(&user.ID, &user.OrganizationID, &user.Email, &user.DisplayName,
			&user.PasswordHash, &user.PasswordSalt, &user.Status, &user.CreatedAt)
	if err == sql.ErrNoRows {
		return User{}, errors.New("user not found")
	}
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *PostgresStore) FindUserByID(userID string) (User, error) {
	var user User
	err := s.db.QueryRowContext(context.Background(),
		`SELECT id, organization_id, email, display_name, password_hash, password_salt, status, created_at FROM users WHERE id=$1`, userID).
		Scan(&user.ID, &user.OrganizationID, &user.Email, &user.DisplayName,
			&user.PasswordHash, &user.PasswordSalt, &user.Status, &user.CreatedAt)
	if err == sql.ErrNoRows {
		return User{}, errors.New("user not found")
	}
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *PostgresStore) RolesForUser(userID string) ([]access.Role, error) {
	rows, err := s.db.QueryContext(context.Background(),
		`SELECT role FROM role_bindings WHERE user_id=$1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var roles []access.Role
	for rows.Next() {
		var roleStr string
		if err := rows.Scan(&roleStr); err != nil {
			return nil, err
		}
		roles = append(roles, access.Role(roleStr))
	}
	if roles == nil {
		return nil, errors.New("user not found")
	}
	return roles, rows.Err()
}

func (s *PostgresStore) SaveRefreshSession(session RefreshSession) error {
	_, err := s.db.ExecContext(context.Background(),
		`INSERT INTO refresh_sessions (token_hash, organization_id, user_id, expires_at, revoked, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		session.TokenHash, session.OrganizationID, session.UserID,
		session.ExpiresAt, session.Revoked, time.Now())
	return err
}

func (s *PostgresStore) FindRefreshSession(tokenHash string) (RefreshSession, error) {
	var session RefreshSession
	err := s.db.QueryRowContext(context.Background(),
		`SELECT token_hash, organization_id, user_id, expires_at, revoked FROM refresh_sessions WHERE token_hash=$1`, tokenHash).
		Scan(&session.TokenHash, &session.OrganizationID, &session.UserID, &session.ExpiresAt, &session.Revoked)
	if err == sql.ErrNoRows {
		return RefreshSession{}, errors.New("refresh session not found")
	}
	if err != nil {
		return RefreshSession{}, err
	}
	return session, nil
}

func (s *PostgresStore) RevokeRefreshSession(tokenHash string) error {
	res, err := s.db.ExecContext(context.Background(),
		`UPDATE refresh_sessions SET revoked=true WHERE token_hash=$1`, tokenHash)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("refresh session not found")
	}
	return nil
}

func isPGUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "duplicate key") || strings.Contains(msg, "23505")
}
