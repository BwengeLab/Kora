package authmw

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/auth"
)

func TestMiddlewareAcceptsValidBearerToken(t *testing.T) {
	secret := []byte("test-secret")
	issuedAt := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	token, err := auth.SignJWT(auth.Claims{
		Subject:        "user-1",
		OrganizationID: "org-1",
		Plane:          "TENANT",
		Roles:          []string{"FINANCE_LEAD"},
		Permissions:    []string{"financial:approve"},
		IssuedAt:       issuedAt.Unix(),
		ExpiresAt:      issuedAt.Add(time.Hour).Unix(),
	}, secret)
	if err != nil {
		t.Fatal(err)
	}
	previousNow := now
	now = func() time.Time { return issuedAt.Add(time.Minute) }
	defer func() { now = previousNow }()

	var sawClaims bool
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := ClaimsFromContext(r.Context())
		sawClaims = ok && claims.Subject == "user-1" && claims.OrganizationID == "org-1"
		w.WriteHeader(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()

	Middleware(secret, next).ServeHTTP(res, req)
	if res.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", res.Code)
	}
	if !sawClaims {
		t.Fatal("expected claims in request context")
	}
}

func TestMiddlewareRejectsMissingBearerToken(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next should not be called")
	})
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)

	Middleware([]byte("test-secret"), next).ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", res.Code)
	}
}
