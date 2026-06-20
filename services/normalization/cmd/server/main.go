package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/normalization"
	"github.com/kora-finance/kora/services/normalization/internal/httpapi"
)

func main() {
	service := normalization.NewService(entities.NewResolver(), eventledger.NewStore())
	server := httpapi.New(service)
	address := ":" + env("PORT", "8080")
	log.Printf("normalization listening on %s", address)
	if err := http.ListenAndServe(address, server); err != nil {
		log.Fatal(err)
	}
}

func env(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
