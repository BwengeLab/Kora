package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/services/ledger/internal/httpapi"
)

func main() {
	address := ":" + environment("PORT", "8080")
	log.Printf("ledger listening on %s", address)
	if err := http.ListenAndServe(address, httpapi.New(ledger.NewStore())); err != nil {
		log.Fatal(err)
	}
}

func environment(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
