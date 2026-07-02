package momo

import "testing"

func TestStoreTracksAppendOnlyHistory(t *testing.T) {
	store := NewStore()
	request, err := store.Create(Request{
		OrganizationID: "org_1",
		ReferenceID:    "ref-1",
		ExternalID:     "invoice-1",
		Amount:         "1000",
		Currency:       "RWF",
		PayerMSISDN:    "250780000000",
		State:          RequestPending,
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	updated, err := store.UpdateFromProvider("org_1", "ref-1", RequestEvent{
		To:             RequestSuccessful,
		FinancialTxnID: "fin-1",
		Reason:         "ok",
	})
	if err != nil {
		t.Fatalf("UpdateFromProvider() error = %v", err)
	}
	if updated.State != RequestSuccessful || updated.FinancialTxnID != "fin-1" {
		t.Fatalf("updated = %+v", updated)
	}
	history, err := store.History("org_1", "ref-1")
	if err != nil {
		t.Fatalf("History() error = %v", err)
	}
	if len(history) != 2 || history[1].From != RequestPending || history[1].To != RequestSuccessful {
		t.Fatalf("history = %+v request = %+v", history, request)
	}
}

func TestStoreCanSeedFromCallback(t *testing.T) {
	store := NewStore()
	request, err := store.SaveOrUpdateFromCallback(Request{
		OrganizationID: "org_1",
		ReferenceID:    "ref-2",
		Amount:         "500",
		Currency:       "RWF",
		State:          RequestReceived,
	}, RequestEvent{
		To:             RequestSuccessful,
		FinancialTxnID: "fin-2",
	})
	if err != nil {
		t.Fatalf("SaveOrUpdateFromCallback() error = %v", err)
	}
	if request.State != RequestSuccessful {
		t.Fatalf("request = %+v", request)
	}
	history, err := store.History("org_1", "ref-2")
	if err != nil || len(history) != 2 {
		t.Fatalf("history = %+v err = %v", history, err)
	}
}
