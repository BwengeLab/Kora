package connectors

import (
	"testing"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/ingestion"
	"github.com/kora-finance/kora/libs/normalization"
)

func TestValidateConnectionRejectsRawCredentials(t *testing.T) {
	conn := connection()
	conn.Config = map[string]string{"api_token": "plaintext-token"}
	if err := ValidateConnection(orgAdmin(), conn); err == nil {
		t.Fatal("ValidateConnection() allowed raw credential in config")
	}
	conn.Config = map[string]string{"api_token": ""}
	conn.SecretRef = ""
	if err := ValidateConnection(orgAdmin(), conn); err == nil {
		t.Fatal("ValidateConnection() allowed missing secret reference")
	}
}

func TestImportIsReplaySafeAndNormalizesGenericEvents(t *testing.T) {
	service := newService()
	input := importInput("idem-1")
	first, err := service.Import(orgAdmin(), connection(), input)
	if err != nil {
		t.Fatalf("Import() error = %v", err)
	}
	if first.Replayed || first.DuplicateSource || len(first.NormalizedEvents) != 2 {
		t.Fatalf("first import = %+v", first)
	}
	for _, event := range first.NormalizedEvents {
		if !event.Created {
			t.Fatalf("first normalized event not created: %+v", event)
		}
	}

	replay, err := service.Import(orgAdmin(), connection(), input)
	if err != nil {
		t.Fatalf("Import(replay) error = %v", err)
	}
	if !replay.Replayed || replay.Fingerprint != first.Fingerprint {
		t.Fatalf("replay = %+v first = %+v", replay, first)
	}
	for _, event := range replay.NormalizedEvents {
		if event.Created {
			t.Fatalf("replay created duplicate event: %+v", event)
		}
	}
}

func TestImportWithDifferentIdempotencySamePayloadDoesNotDuplicateEvents(t *testing.T) {
	service := newService()
	if _, err := service.Import(orgAdmin(), connection(), importInput("idem-1")); err != nil {
		t.Fatalf("Import() error = %v", err)
	}
	duplicate, err := service.Import(orgAdmin(), connection(), importInput("idem-2"))
	if err != nil {
		t.Fatalf("Import(duplicate) error = %v", err)
	}
	if !duplicate.DuplicateSource {
		t.Fatalf("expected duplicate source result: %+v", duplicate)
	}
	for _, event := range duplicate.NormalizedEvents {
		if event.Created {
			t.Fatalf("duplicate import created event: %+v", event)
		}
	}
}

func TestImportRejectsMismatchedTenantOrConnection(t *testing.T) {
	input := importInput("idem-1")
	input.OrganizationID = "org_2"
	if _, err := newService().Import(orgAdmin(), connection(), input); err == nil {
		t.Fatal("Import() allowed cross-tenant input")
	}
	input = importInput("idem-1")
	input.ConnectionID = "other"
	if _, err := newService().Import(orgAdmin(), connection(), input); err == nil {
		t.Fatal("Import() allowed mismatched connection")
	}
}

func newService() *Service {
	return NewService(
		ingestion.NewService(ingestion.NewMemoryStore()),
		normalization.NewService(entities.NewResolver(), eventledger.NewStore()),
	)
}

func orgAdmin() access.Actor {
	return access.Actor{UserID: "u_admin", OrganizationID: "org_1", Roles: []access.Role{access.RoleOrgAdmin}}
}

func connection() Connection {
	return Connection{ID: "conn_momo", OrganizationID: "org_1", Kind: MoMo, DisplayName: "MTN MoMo", SecretRef: "secret://org_1/momo", Active: true, Config: map[string]string{"environment": "sandbox"}}
}

func importInput(idempotencyKey string) ImportInput {
	return ImportInput{
		OrganizationID: "org_1",
		ConnectionID:   "conn_momo",
		Kind:           MoMo,
		SourceName:     "momo-statement",
		WindowStart:    "2026-01-01",
		WindowEnd:      "2026-01-31",
		SyncCursor:     "cursor-1",
		IdempotencyKey: idempotencyKey,
		Records: []Record{
			{
				SourceRecordID: "txn-1",
				RecordType:     "payment",
				Confidence:     0.99,
				Fields: map[string]string{
					"reference":      "MOMO-1",
					"date":           "2026-01-03",
					"amount":         "10000",
					"currency":       "RWF",
					"party_name":     "Customer A",
					"account_number": "0780000000",
				},
			},
			{
				SourceRecordID: "txn-2",
				RecordType:     "payment",
				Confidence:     0.99,
				Fields: map[string]string{
					"reference":      "MOMO-2",
					"date":           "2026-01-04",
					"amount":         "-5000",
					"currency":       "RWF",
					"party_name":     "Supplier A",
					"account_number": "0780000000",
				},
			},
		},
	}
}
