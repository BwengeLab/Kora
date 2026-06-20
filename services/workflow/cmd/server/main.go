package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/workflow"
	"github.com/kora-finance/kora/services/workflow/internal/httpapi"
)

func main() {
	address := ":" + environment("PORT", "8080")
	log.Printf("workflow listening on %s", address)
	if err := http.ListenAndServe(address, httpapi.New(workflow.NewStore())); err != nil {
		log.Fatal(err)
	}
}

func environment(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
