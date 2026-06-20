package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/policy"
	"github.com/kora-finance/kora/services/rules/internal/httpapi"
)

func main() {
	server := httpapi.New(policy.NewMemoryStore())
	addr := ":" + env("PORT", "8080")
	log.Printf("rules listening on %s", addr)
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
