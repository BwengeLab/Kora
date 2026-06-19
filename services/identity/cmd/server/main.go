package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/identity"
	"github.com/kora-finance/kora/services/identity/internal/httpapi"
)

func main() {
	secret := []byte(os.Getenv("KORA_JWT_SECRET"))
	if len(secret) == 0 {
		secret = []byte("dev-secret-change-me")
	}
	server := httpapi.New(identity.NewService(identity.NewMemoryStore(), secret))
	addr := ":" + env("PORT", "8080")
	log.Printf("identity listening on %s", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
