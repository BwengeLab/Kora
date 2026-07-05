package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/services/gateway/internal/httpapi"
)

func main() {
	secret := []byte(os.Getenv("KORA_JWT_SECRET"))
	if len(secret) == 0 {
		secret = []byte("dev-secret-change-me")
	}
	server, err := httpapi.New(secret)
	if err != nil {
		log.Fatal(err)
	}
	addr := ":" + env("PORT", "8080")
	log.Printf("gateway listening on %s", addr)
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
