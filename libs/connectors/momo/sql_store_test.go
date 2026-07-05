package momo

import (
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func expectSQLStoreSchema(mock sqlmock.Sqlmock) {
	mock.ExpectExec(regexp.QuoteMeta("CREATE TABLE IF NOT EXISTS momo_requests")).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectExec(regexp.QuoteMeta("CREATE UNIQUE INDEX IF NOT EXISTS idx_momo_requests_org_reference")).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectExec(regexp.QuoteMeta("CREATE INDEX IF NOT EXISTS idx_momo_requests_org_requested")).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectExec(regexp.QuoteMeta("CREATE TABLE IF NOT EXISTS momo_request_events")).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectExec(regexp.QuoteMeta("CREATE INDEX IF NOT EXISTS idx_momo_request_events_request_occurred")).
		WillReturnResult(sqlmock.NewResult(0, 0))
}

func TestSQLStoreCreateAndUpdate(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	defer db.Close()
	expectSQLStoreSchema(mock)
	store, err := NewSQLStoreFromDB(db)
	if err != nil {
		t.Fatalf("NewSQLStoreFromDB() error = %v", err)
	}
	requestedAt := time.Date(2026, 7, 2, 10, 0, 0, 0, time.UTC)
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO momo_requests(")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO momo_request_events(")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	created, err := store.Create(Request{
		OrganizationID: "org_1",
		ConnectionID:   "conn_momo",
		ReferenceID:    "ref-1",
		Amount:         "1000",
		Currency:       "RWF",
		State:          RequestPending,
		RequestedAt:    requestedAt,
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if created.ReferenceID != "ref-1" {
		t.Fatalf("created = %+v", created)
	}

	row := sqlmock.NewRows([]string{
		"id", "organization_id", "connection_id", "reference_id", "external_id", "amount", "currency",
		"payer_msisdn", "payer_name", "payer_message", "payee_note", "request_state",
		"financial_transaction_id", "reason", "requested_at", "last_provider_at", "collection_class",
	}).AddRow(created.ID, "org_1", "conn_momo", "ref-1", "", "1000", "RWF", "", "", "", "", "PENDING", "", "", requestedAt, nil, "")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, organization_id, connection_id, reference_id, external_id, amount, currency,")).
		WillReturnRows(row)
	latest := sqlmock.NewRows([]string{
		"id", "request_id", "organization_id", "reference_id", "from_state", "to_state",
		"financial_transaction_id", "reason", "raw_provider_payload", "occurred_at",
	}).AddRow("evt-1", created.ID, "org_1", "ref-1", "", "PENDING", "", "", []byte("{}"), requestedAt)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, request_id, organization_id, reference_id, from_state, to_state,")).
		WillReturnRows(latest)
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO momo_request_events(")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	row2 := sqlmock.NewRows([]string{
		"id", "organization_id", "connection_id", "reference_id", "external_id", "amount", "currency",
		"payer_msisdn", "payer_name", "payer_message", "payee_note", "request_state",
		"financial_transaction_id", "reason", "requested_at", "last_provider_at", "collection_class",
	}).AddRow(created.ID, "org_1", "conn_momo", "ref-1", "", "1000", "RWF", "", "", "", "", "PENDING", "", "", requestedAt, nil, "")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, organization_id, connection_id, reference_id, external_id, amount, currency,")).
		WillReturnRows(row2)
	latest2 := sqlmock.NewRows([]string{
		"id", "request_id", "organization_id", "reference_id", "from_state", "to_state",
		"financial_transaction_id", "reason", "raw_provider_payload", "occurred_at",
	}).AddRow("evt-2", created.ID, "org_1", "ref-1", "PENDING", "SUCCESSFUL", "fin-1", "ok", []byte("{}"), requestedAt.Add(time.Minute))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, request_id, organization_id, reference_id, from_state, to_state,")).
		WillReturnRows(latest2)
	updated, err := store.UpdateFromProvider("org_1", "ref-1", RequestEvent{To: RequestSuccessful, FinancialTxnID: "fin-1", Reason: "ok", OccurredAt: requestedAt.Add(time.Minute)})
	if err != nil {
		t.Fatalf("UpdateFromProvider() error = %v", err)
	}
	if updated.State != RequestSuccessful || updated.FinancialTxnID != "fin-1" {
		t.Fatalf("updated = %+v", updated)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
