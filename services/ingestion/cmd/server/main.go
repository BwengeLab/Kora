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
	databaseURL := os.Getenv("DATABASE_URL")

	var store ingestion.Store
	if databaseURL != "" {
		pgStore, err := ingestion.NewPostgresStore(databaseURL)
		if err != nil {
			log.Fatalf("postgres store: %v", err)
		}
		defer pgStore.Close()
		store = pgStore
		log.Println("using postgres store")
	} else {
		store = ingestion.NewMemoryStore()
		log.Println("using memory store")
	}

	server := httpapi.New(ingestion.NewService(store))
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
