package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/consent"
	"github.com/kora-finance/kora/services/consent/internal/httpapi"
)

func main() {
	address := ":" + env("PORT", "8080")
	log.Printf("consent listening on %s", address)
	if err := http.ListenAndServe(address, httpapi.New(consent.NewStore())); err != nil {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
