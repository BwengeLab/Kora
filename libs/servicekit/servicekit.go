package servicekit

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type Health struct {
	Service string `json:"service"`
	Status  string `json:"status"`
	Version string `json:"version"`
}

func ListenAndServe(serviceName string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(Health{
			Service: serviceName,
			Status:  "ok",
			Version: version(),
		})
	})

	addr := ":" + env("PORT", "8080")
	log.Printf("%s listening on %s", serviceName, addr)
	return http.ListenAndServe(addr, mux)
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func version() string {
	return env("KORA_VERSION", "dev")
}

