package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/ingestion"
	"github.com/kora-finance/kora/services/ingestion/internal/httpapi"
)

func main() {
	addr := ":" + env("PORT", "8080")
	server := httpapi.New(ingestion.NewService(ingestion.NewMemoryStore()))
	log.Printf("ingestion listening on %s", addr)
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
