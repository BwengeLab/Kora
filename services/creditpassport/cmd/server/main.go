package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/consent"
	"github.com/kora-finance/kora/libs/creditpassport"
	"github.com/kora-finance/kora/services/creditpassport/internal/httpapi"
)

func main() {
	address := ":" + env("PORT", "8080")
	server := httpapi.New(creditpassport.NewStore(), consent.NewStore())
	log.Printf("credit passport listening on %s", address)
	if err := http.ListenAndServe(address, server); err != nil {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
