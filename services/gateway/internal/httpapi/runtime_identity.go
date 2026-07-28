package httpapi

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/kora-finance/kora/libs/auth"
)

// ensureRuntimeIdentity mirrors only the identity already authenticated by the
// gateway. The runtime database still enforces that a user belongs to the same
// tenant as every persisted agent run.
func (s *Server) ensureRuntimeIdentity(ctx context.Context, claims auth.Claims) error {
	if s.runtimeDatabaseURL == "" {
		return errors.New("DATABASE_URL is required for persisted agent runs")
	}
	if claims.OrganizationID == "" || claims.Subject == "" {
		return errors.New("tenant identity is incomplete")
	}
	user, err := s.identityStore.FindUserByID(claims.Subject)
	if err != nil {
		return fmt.Errorf("gateway user lookup: %w", err)
	}
	if user.OrganizationID != claims.OrganizationID {
		return errors.New("gateway user belongs to another organization")
	}
	org, err := s.organizationByID(claims.OrganizationID)
	if err != nil {
		return fmt.Errorf("gateway organization lookup: %w", err)
	}

	connection, err := pgx.Connect(ctx, s.runtimeDatabaseURL)
	if err != nil {
		return fmt.Errorf("runtime database connection: %w", err)
	}
	defer connection.Close(ctx)
	tx, err := connection.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `
		INSERT INTO organizations(id, name, status) VALUES($1, $2, $3)
		ON CONFLICT (id) DO NOTHING`, org.ID, org.Name, org.Status); err != nil {
		return fmt.Errorf("project runtime organization: %w", err)
	}
	result, err := tx.Exec(ctx, `
		INSERT INTO users(id, organization_id, email, display_name, status)
		VALUES($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE
		SET email = EXCLUDED.email, display_name = EXCLUDED.display_name, status = EXCLUDED.status
		WHERE users.organization_id = EXCLUDED.organization_id`,
		user.ID, user.OrganizationID, user.Email, user.DisplayName, user.Status,
	)
	if err != nil {
		return fmt.Errorf("project runtime user: %w", err)
	}
	if result.RowsAffected() != 1 {
		return errors.New("runtime user belongs to another organization")
	}
	return tx.Commit(ctx)
}
