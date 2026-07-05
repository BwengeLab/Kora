package connectors

import (
	"testing"

	"github.com/kora-finance/kora/libs/access"
)

func TestMemoryConnectionStoreCreateGetList(t *testing.T) {
	store := NewMemoryConnectionStore()
	actor := access.Actor{UserID: "u_admin", OrganizationID: "org_1", Roles: []access.Role{access.RoleOrgAdmin}}
	conn, err := store.Create(actor, Connection{
		ID:             "conn_momo",
		OrganizationID: "org_1",
		Kind:           MoMo,
		DisplayName:    "MTN MoMo",
		SecretRef:      "secret://org_1/momo",
		Active:         true,
		Config:         map[string]string{"environment": "sandbox"},
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if conn.CreatedAt.IsZero() {
		t.Fatal("expected CreatedAt to be set")
	}
	got, err := store.Get(actor, "org_1", "conn_momo")
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if got.DisplayName != "MTN MoMo" {
		t.Fatalf("got = %+v", got)
	}
	list, err := store.List(actor, "org_1", MoMo)
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(list) != 1 || list[0].ID != "conn_momo" {
		t.Fatalf("list = %+v", list)
	}
}

func TestMemoryConnectionStoreRejectsDuplicates(t *testing.T) {
	store := NewMemoryConnectionStore()
	actor := access.Actor{UserID: "u_admin", OrganizationID: "org_1", Roles: []access.Role{access.RoleOrgAdmin}}
	connection := Connection{
		ID:             "conn_momo",
		OrganizationID: "org_1",
		Kind:           MoMo,
		DisplayName:    "MTN MoMo",
		SecretRef:      "secret://org_1/momo",
		Active:         true,
	}
	if _, err := store.Create(actor, connection); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if _, err := store.Create(actor, connection); err == nil {
		t.Fatal("Create() allowed duplicate ID")
	}
	other := connection
	other.ID = "conn_momo_2"
	if _, err := store.Create(actor, other); err == nil {
		t.Fatal("Create() allowed duplicate display name for same org and kind")
	}
}
