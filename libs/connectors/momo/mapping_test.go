package momo

import "testing"

func TestMapTransactionToRecord(t *testing.T) {
	record, err := MapTransactionToRecord(TransactionPayload{
		ReferenceID:        "req-1",
		FinancialTxnID:     "fin-1",
		ExternalID:         "invoice-1",
		Status:             "SUCCESSFUL",
		Amount:             "1000",
		Currency:           "RWF",
		PayerMSISDN:        "250780000000",
		PayerName:          "Alice",
		PayerMessage:       "Invoice payment",
		PayeeNote:          "Kora sandbox",
		OccurredOn:         "2026-07-02T10:00:00Z",
		CollectionCategory: "callback",
	})
	if err != nil {
		t.Fatalf("MapTransactionToRecord() error = %v", err)
	}
	if record.SourceRecordID != "fin-1" || record.Fields["date"] != "2026-07-02" || record.Fields["party_name"] != "Alice" {
		t.Fatalf("record = %+v", record)
	}
}

func TestMapTransactionToRecordRequiresFields(t *testing.T) {
	if _, err := MapTransactionToRecord(TransactionPayload{}); err == nil {
		t.Fatal("expected error for missing fields")
	}
}
