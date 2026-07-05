package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/connectors"
	"github.com/kora-finance/kora/services/integrations/internal/httpapi"
)

func main() {
	address := ":" + env("PORT", "8080")
	server := httpapi.New(nil)
	startMoMoAutoSync(server)
	log.Printf("integrations listening on %s", address)
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

func startMoMoAutoSync(server *httpapi.Server) {
	intervalSeconds, err := strconv.Atoi(strings.TrimSpace(os.Getenv("MOMO_SYNC_INTERVAL_SECONDS")))
	if err != nil || intervalSeconds <= 0 {
		return
	}
	organizationID := strings.TrimSpace(os.Getenv("MOMO_SYNC_ORGANIZATION_ID"))
	connectionID := strings.TrimSpace(os.Getenv("MOMO_SYNC_CONNECTION_ID"))
	displayName := strings.TrimSpace(os.Getenv("MOMO_SYNC_CONNECTION_DISPLAY_NAME"))
	secretRef := strings.TrimSpace(os.Getenv("MOMO_SYNC_CONNECTION_SECRET_REF"))
	userID := strings.TrimSpace(os.Getenv("MOMO_SYNC_ACTOR_USER_ID"))
	if organizationID == "" || connectionID == "" || displayName == "" || secretRef == "" || userID == "" {
		log.Printf("momo auto sync disabled: missing required MOMO_SYNC_* configuration")
		return
	}
	connection := connectors.Connection{
		ID:             connectionID,
		OrganizationID: organizationID,
		Kind:           connectors.MoMo,
		DisplayName:    displayName,
		SecretRef:      secretRef,
		Active:         true,
		Config: map[string]string{
			"environment": env("MOMO_TARGET_ENVIRONMENT", "sandbox"),
		},
	}
	actor := access.Actor{
		UserID:         userID,
		OrganizationID: organizationID,
		Roles:          []access.Role{access.RoleOrgAdmin},
	}
	input := httpapi.MoMoSyncInput{
		OrganizationID: organizationID,
		ConnectionID:   connectionID,
		SourceName:     env("MOMO_SYNC_SOURCE_NAME", "momo-auto-sync"),
		WindowStart:    env("MOMO_SYNC_WINDOW_START", ""),
		WindowEnd:      env("MOMO_SYNC_WINDOW_END", ""),
		SyncCursor:     env("MOMO_SYNC_CURSOR", ""),
		IdempotencyKey: env("MOMO_SYNC_IDEMPOTENCY_PREFIX", "momo-auto-sync"),
	}
	interval := time.Duration(intervalSeconds) * time.Second
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		run := func() {
			ctx, cancel := context.WithTimeout(context.Background(), interval)
			defer cancel()
			results, err := server.SyncMoMoRequestStatuses(ctx, httpapi.MoMoSyncOptions{
				Actor:      actor,
				Connection: connection,
				Input:      input,
				AutoImport: true,
			})
			if err != nil {
				log.Printf("momo auto sync failed: %v", err)
				return
			}
			if len(results) > 0 {
				log.Printf("momo auto sync processed %d tracked requests", len(results))
			}
		}
		run()
		for range ticker.C {
			run()
		}
	}()
}
