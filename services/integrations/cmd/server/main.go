package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/services/integrations/internal/httpapi"
)

func main() {
	address := ":" + env("PORT", "8080")
	log.Printf("integrations listening on %s", address)
	if err := http.ListenAndServe(address, httpapi.New(nil)); err != nil {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
