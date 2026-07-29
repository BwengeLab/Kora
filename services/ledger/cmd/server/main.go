package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/services/ledger/internal/httpapi"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")

	var store ledger.Store
	if databaseURL != "" {
		db, err := sql.Open("pgx", databaseURL)
		if err != nil {
			log.Fatalf("ledger open db: %v", err)
		}
		if err := db.Ping(); err != nil {
			log.Fatalf("ledger db ping: %v", err)
		}
		defer db.Close()
		store = ledger.NewPostgresStore(db)
		log.Println("using postgres store")
	} else {
		store = ledger.NewStore()
		log.Println("using memory store")
	}

	address := ":" + environment("PORT", "8080")
	log.Printf("ledger listening on %s", address)
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
