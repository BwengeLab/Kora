package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/identity"
)

func TestRegisterLoginRefreshAndAuthorizeHTTP(t *testing.T) {
	server := New(identity.NewService(identity.NewMemoryStore(), []byte("test-secret")))

	registerBody := bytes.NewBufferString(`{"organization_name":"Kora Test","owner_email":"owner@example.com","owner_password":"password123"}`)
	registerReq := httptest.NewRequest(http.MethodPost, "/v1/organizations/register", registerBody)
	registerRes := httptest.NewRecorder()
	server.ServeHTTP(registerRes, registerReq)
	if registerRes.Code != http.StatusCreated {
		t.Fatalf("expected register 201, got %d %s", registerRes.Code, registerRes.Body.String())
	}
	var registered struct {
		OrganizationID string
		OwnerUserID    string
	}
	if err := json.Unmarshal(registerRes.Body.Bytes(), &registered); err != nil {
		t.Fatal(err)
	}

	loginReq := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewBufferString(`{"email":"owner@example.com","password":"password123"}`))
	loginRes := httptest.NewRecorder()
	server.ServeHTTP(loginRes, loginReq)
	if loginRes.Code != http.StatusOK {
		t.Fatalf("expected login 200, got %d %s", loginRes.Code, loginRes.Body.String())
	}
	var login struct {
		AccessToken  string
		RefreshToken string
	}
	if err := json.Unmarshal(loginRes.Body.Bytes(), &login); err != nil {
		t.Fatal(err)
	}
	if login.AccessToken == "" || login.RefreshToken == "" {
		t.Fatal("expected tokens")
	}

	authBody, _ := json.Marshal(map[string]string{
		"actor_user_id":            registered.OwnerUserID,
		"actor_organization_id":    registered.OrganizationID,
		"resource_organization_id": registered.OrganizationID,
		"permission":               string(access.PermissionManageUsers),
	})
	authReq := httptest.NewRequest(http.MethodPost, "/v1/auth/authorize", bytes.NewReader(authBody))
	authRes := httptest.NewRecorder()
	server.ServeHTTP(authRes, authReq)
	if authRes.Code != http.StatusOK {
		t.Fatalf("expected authorize 200, got %d %s", authRes.Code, authRes.Body.String())
	}

	refreshBody, _ := json.Marshal(map[string]string{"refresh_token": login.RefreshToken})
	refreshReq := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", bytes.NewReader(refreshBody))
	refreshRes := httptest.NewRecorder()
	server.ServeHTTP(refreshRes, refreshReq)
	if refreshRes.Code != http.StatusOK {
		t.Fatalf("expected refresh 200, got %d %s", refreshRes.Code, refreshRes.Body.String())
	}
}
