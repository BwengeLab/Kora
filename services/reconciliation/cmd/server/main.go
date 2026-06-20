package main

import (
	"github.com/kora-finance/kora/services/reconciliation/internal/httpapi"
	"log"
	"net/http"
	"os"
)

func main() {
	addr := ":" + env("PORT", "8080")
	log.Printf("reconciliation listening on %s", addr)
	if err := http.ListenAndServe(addr, httpapi.New()); err != nil {
		log.Fatal(err)
	}
}
func env(k, f string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return f
}
