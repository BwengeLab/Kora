package identity

import (
	"testing"

	"github.com/kora-finance/kora/libs/access"
)

func TestRegisterLoginRefreshAndAuthorize(t *testing.T) {
	store := NewMemoryStore()
	service := NewService(store, []byte("test-secret"))

	registered, err := service.RegisterOrganization(RegisterInput{
		OrganizationName: "Kora Test",
		OwnerEmail:       "owner@example.com",
		OwnerPassword:    "password123",
	})
	if err != nil {
		t.Fatal(err)
	}
	if registered.OrganizationID == "" || registered.OwnerUserID == "" {
		t.Fatalf("expected ids, got %+v", registered)
	}

	login, err := service.Login("owner@example.com", "password123")
	if err != nil {
		t.Fatal(err)
	}
	if login.AccessToken == "" || login.RefreshToken == "" {
		t.Fatal("expected access and refresh tokens")
	}
	if _, err := service.VerifyAccessToken(login.AccessToken); err != nil {
		t.Fatalf("expected access token to verify: %v", err)
	}

	refreshed, err := service.Refresh(login.RefreshToken)
	if err != nil {
		t.Fatal(err)
	}
	if refreshed.AccessToken == "" || refreshed.RefreshToken == "" {
		t.Fatal("expected refreshed tokens")
	}
	if _, err := service.Refresh(login.RefreshToken); err == nil {
		t.Fatal("expected old refresh token to be revoked")
	}

	err = service.Authorize(AuthorizeInput{
		ActorUserID:            registered.OwnerUserID,
		ActorOrganizationID:    registered.OrganizationID,
		ResourceOrganizationID: registered.OrganizationID,
		Permission:             access.PermissionManageUsers,
	})
	if err != nil {
		t.Fatalf("expected owner to manage users: %v", err)
	}
}

func TestAuthorizeDeniesCrossTenant(t *testing.T) {
	store := NewMemoryStore()
	service := NewService(store, []byte("test-secret"))

	registered, err := service.RegisterOrganization(RegisterInput{
		OrganizationName: "Kora Test",
		OwnerEmail:       "owner@example.com",
		OwnerPassword:    "password123",
	})
	if err != nil {
		t.Fatal(err)
	}

	err = service.Authorize(AuthorizeInput{
		ActorUserID:            registered.OwnerUserID,
		ActorOrganizationID:    registered.OrganizationID,
		ResourceOrganizationID: "other-tenant",
		Permission:             access.PermissionManageUsers,
	})
	if err == nil {
		t.Fatal("expected cross-tenant authorization to fail")
	}
}

func TestLoginRejectsBadPassword(t *testing.T) {
	service := NewService(NewMemoryStore(), []byte("test-secret"))
	_, err := service.RegisterOrganization(RegisterInput{
		OrganizationName: "Kora Test",
		OwnerEmail:       "owner@example.com",
		OwnerPassword:    "password123",
	})
	if err != nil {
		t.Fatal(err)
	}

	if _, err := service.Login("owner@example.com", "wrong-password"); err == nil {
		t.Fatal("expected bad password to fail")
	}
}
