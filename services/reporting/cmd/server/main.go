package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/services/reporting/internal/httpapi"
)

func main() {
	address := ":" + env("PORT", "8080")
	log.Printf("reporting listening on %s", address)
	if err := http.ListenAndServe(address, httpapi.New()); err != nil {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
