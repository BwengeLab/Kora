package momo

import (
	"path/filepath"
	"testing"
)

func TestJournalStorePersistsAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "momo-requests.jsonl")
	store, err := NewJournalStore(path)
	if err != nil {
		t.Fatalf("NewJournalStore() error = %v", err)
	}
	created, err := store.Create(Request{
		OrganizationID: "org_1",
		ReferenceID:    "ref-1",
		Amount:         "1000",
		Currency:       "RWF",
		State:          RequestPending,
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if _, err := store.UpdateFromProvider("org_1", "ref-1", RequestEvent{
		To:             RequestSuccessful,
		FinancialTxnID: "fin-1",
	}); err != nil {
		t.Fatalf("UpdateFromProvider() error = %v", err)
	}
	_ = store.Close()

	reopened, err := NewJournalStore(path)
	if err != nil {
		t.Fatalf("reopen error = %v", err)
	}
	defer reopened.Close()
	request, err := reopened.GetByReference("org_1", "ref-1")
	if err != nil {
		t.Fatalf("GetByReference() error = %v", err)
	}
	if request.ID != created.ID || request.State != RequestSuccessful || request.FinancialTxnID != "fin-1" {
		t.Fatalf("request = %+v created = %+v", request, created)
	}
	history, err := reopened.History("org_1", "ref-1")
	if err != nil {
		t.Fatalf("History() error = %v", err)
	}
	if len(history) != 2 {
		t.Fatalf("history = %+v", history)
	}
}
