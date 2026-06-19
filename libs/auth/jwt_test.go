package auth

import (
	"testing"
	"time"
)

func TestSignAndVerifyJWT(t *testing.T) {
	secret := []byte("test-secret")
	token, err := SignJWT(Claims{
		Subject:        "user-1",
		OrganizationID: "org-1",
		Roles:          []string{"CFO"},
		ExpiresAt:      time.Now().Add(time.Hour).Unix(),
		IssuedAt:       time.Now().Unix(),
	}, secret)
	if err != nil {
		t.Fatal(err)
	}

	claims, err := VerifyJWT(token, secret, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if claims.Subject != "user-1" || claims.OrganizationID != "org-1" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestVerifyRejectsTamperedJWT(t *testing.T) {
	secret := []byte("test-secret")
	token, err := SignJWT(Claims{
		Subject:   "user-1",
		ExpiresAt: time.Now().Add(time.Hour).Unix(),
		IssuedAt:  time.Now().Unix(),
	}, secret)
	if err != nil {
		t.Fatal(err)
	}

	_, err = VerifyJWT(token+"x", secret, time.Now())
	if err == nil {
		t.Fatal("expected tampered jwt to fail")
	}
}
