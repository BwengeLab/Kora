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
	databaseURL := os.Getenv("DATABASE_URL")

	var entityStore entities.Store
	var eventStore eventledger.Store
	if databaseURL != "" {
		pgEntities, err := entities.NewPostgresStore(databaseURL)
		if err != nil {
			log.Fatalf("entities postgres store: %v", err)
		}
		defer pgEntities.Close()
		entityStore = pgEntities

		pgEvents, err := eventledger.NewPostgresStore(databaseURL)
		if err != nil {
			log.Fatalf("eventledger postgres store: %v", err)
		}
		defer pgEvents.Close()
		eventStore = pgEvents
		log.Println("using postgres stores")
	} else {
		entityStore = entities.NewResolver()
		eventStore = eventledger.NewStore()
		log.Println("using memory stores")
	}

	service := normalization.NewService(entityStore, eventStore)
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
