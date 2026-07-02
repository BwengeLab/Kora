package relationships

import (
	"testing"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
)

func TestBuildCreatesEvidenceBackedRelationshipGraph(t *testing.T) {
	graph, err := Build(financeLead(), Input{
		OrganizationID: "org_1",
		Entities: []entities.Entity{
			{ID: "party_1", OrganizationID: "org_1", Type: entities.ExternalParty, DisplayName: "Customer A", Attributes: map[string]string{"role": "CUSTOMER"}},
			{ID: "contract_1", OrganizationID: "org_1", Type: entities.Contract, DisplayName: "Contract 1"},
		},
		Events: []eventledger.EventView{{
			Event:           eventledger.Event{ID: "evt_1", OrganizationID: "org_1", Type: eventledger.PaymentReceived, Status: eventledger.Active, ExternalPartyID: "party_1", RelatedEntityIDs: map[string]string{"contract": "contract_1"}, Evidence: proof("evt_1")},
			EffectiveStatus: eventledger.Active,
		}},
	})
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	if len(graph.Nodes) != 3 || len(graph.Edges) != 2 {
		t.Fatalf("graph = %+v", graph)
	}
}

func TestBuildRequiresPermissionAndTenantIntegrity(t *testing.T) {
	input := Input{OrganizationID: "org_1", Entities: []entities.Entity{{ID: "party_1", OrganizationID: "org_1", Type: entities.ExternalParty, DisplayName: "Customer A"}}}
	if _, err := Build(access.Actor{UserID: "u", OrganizationID: "org_1", Roles: []access.Role{access.RoleFinanceOperator}}, input); err == nil {
		t.Fatal("Build() allowed role without relationship permission")
	}
	input.Entities[0].OrganizationID = "org_2"
	if _, err := Build(financeLead(), input); err == nil {
		t.Fatal("Build() allowed cross-tenant entity")
	}
}

func financeLead() access.Actor {
	return access.Actor{UserID: "u_finance", OrganizationID: "org_1", Roles: []access.Role{access.RoleFinanceLead}}
}

func proof(sourceRecord string) evidence.Evidence {
	return evidence.Evidence{SourceDocumentID: "doc_1", SourceRecordID: sourceRecord, IngestionBatchID: "batch_1", ExtractionVersionID: "extract_1", TransactionReference: sourceRecord, OccurredOn: "2026-01-01", AmountMinor: 1, Currency: "RWF", Reason: "fixture", ConfidenceScore: 0.95}
}
