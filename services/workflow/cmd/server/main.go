package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/workflow"
	"github.com/kora-finance/kora/services/workflow/internal/httpapi"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")

	var store workflow.Store
	if databaseURL != "" {
		pgStore, err := workflow.NewPostgresStore(databaseURL)
		if err != nil {
			log.Fatalf("workflow postgres store: %v", err)
		}
		defer pgStore.Close()
		store = pgStore
		log.Println("using postgres store")
	} else {
		store = workflow.NewStore()
		log.Println("using memory store")
	}

	address := ":" + environment("PORT", "8080")
	log.Printf("workflow listening on %s", address)
	if err := http.ListenAndServe(address, httpapi.New(store)); err != nil {
		log.Fatal(err)
	}
}

func environment(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
