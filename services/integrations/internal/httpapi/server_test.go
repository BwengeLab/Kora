package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kora-finance/kora/libs/connectors/momo"
)

func TestHealth(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	recorder := httptest.NewRecorder()

	New(nil).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
}

func TestValidateRejectsRawCredentials(t *testing.T) {
	body := `{
		"actor":{"user_id":"u_admin","organization_id":"org_1","roles":["ORG_ADMIN"]},
		"connection":{
			"id":"conn_1","organization_id":"org_1","kind":"MOMO",
			"display_name":"MoMo","secret_ref":"secret://org/momo","active":true,
			"config":{"api_token":"raw"}
		}
	}`
	request := httptest.NewRequest(http.MethodPost, "/v1/integrations/validate", strings.NewReader(body))
	recorder := httptest.NewRecorder()

	New(nil).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
}

func TestMoMoValidateAuth(t *testing.T) {
	server := NewWithMoMo(nil, stubMoMoClient{
		createAccessToken: func(ctx context.Context) (momo.AccessToken, error) {
			return momo.AccessToken{AccessToken: "token-1", TokenType: "access_token", ExpiresIn: 3600}, nil
		},
	})
	body := `{"actor":{"UserID":"u_admin","OrganizationID":"org_1","Roles":["ORG_ADMIN"]}}`
	request := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/validate-auth", strings.NewReader(body))
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal error = %v", err)
	}
	if response["valid"] != true {
		t.Fatalf("response = %+v", response)
	}
}

func TestMoMoRequestToPayRequiresCollectionsPermission(t *testing.T) {
	server := NewWithMoMo(nil, stubMoMoClient{})
	body := `{
		"actor":{"UserID":"u_admin","OrganizationID":"org_1","Roles":["ORG_ADMIN"]},
		"reference_id":"req-1",
		"amount":"1000",
		"currency":"RWF",
		"external_id":"invoice-1",
		"payer_msisdn":"250780000000"
	}`
	request := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay", strings.NewReader(body))
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
}

func TestMoMoRequestToPayAndStatus(t *testing.T) {
	var requested momo.RequestToPay
	var referenceID string
	server := NewWithMoMo(nil, stubMoMoClient{
		requestToPay: func(ctx context.Context, ref string, payment momo.RequestToPay) error {
			referenceID = ref
			requested = payment
			return nil
		},
		getRequestToPay: func(ctx context.Context, ref string) (momo.RequestToPayStatus, error) {
			return momo.RequestToPayStatus{ExternalID: "invoice-1", Status: "SUCCESSFUL", Amount: "1000", Currency: "RWF"}, nil
		},
	})
	request := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay", strings.NewReader(`{
		"actor":{"UserID":"u_fin","OrganizationID":"org_1","Roles":["FINANCE_LEAD"]},
		"reference_id":"req-1",
		"amount":"1000",
		"currency":"RWF",
		"external_id":"invoice-1",
		"payer_msisdn":"250780000000",
		"payer_message":"Invoice payment",
		"payee_note":"Kora sandbox"
	}`))
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusAccepted {
		t.Fatalf("request-to-pay status = %d body = %s", recorder.Code, recorder.Body.String())
	}
	if referenceID != "req-1" || requested.Payer.PartyID != "250780000000" {
		t.Fatalf("reference = %s payment = %+v", referenceID, requested)
	}

	statusRequest := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay/status", strings.NewReader(`{
		"actor":{"UserID":"u_fin","OrganizationID":"org_1","Roles":["FINANCE_LEAD"]},
		"reference_id":"req-1"
	}`))
	statusRecorder := httptest.NewRecorder()

	server.ServeHTTP(statusRecorder, statusRequest)

	if statusRecorder.Code != http.StatusOK {
		t.Fatalf("status lookup = %d body = %s", statusRecorder.Code, statusRecorder.Body.String())
	}
}

type stubMoMoClient struct {
	createAccessToken     func(ctx context.Context) (momo.AccessToken, error)
	getAccountBalance     func(ctx context.Context) (momo.AccountBalance, error)
	validateAccountHolder func(ctx context.Context, partyIDType string, partyID string) (momo.AccountHolderStatus, error)
	requestToPay          func(ctx context.Context, referenceID string, payment momo.RequestToPay) error
	getRequestToPay       func(ctx context.Context, referenceID string) (momo.RequestToPayStatus, error)
}

func (s stubMoMoClient) CreateAccessToken(ctx context.Context) (momo.AccessToken, error) {
	if s.createAccessToken != nil {
		return s.createAccessToken(ctx)
	}
	return momo.AccessToken{}, nil
}

func (s stubMoMoClient) GetAccountBalance(ctx context.Context) (momo.AccountBalance, error) {
	if s.getAccountBalance != nil {
		return s.getAccountBalance(ctx)
	}
	return momo.AccountBalance{}, nil
}

func (s stubMoMoClient) ValidateAccountHolder(ctx context.Context, partyIDType string, partyID string) (momo.AccountHolderStatus, error) {
	if s.validateAccountHolder != nil {
		return s.validateAccountHolder(ctx, partyIDType, partyID)
	}
	return momo.AccountHolderStatus{}, nil
}

func (s stubMoMoClient) RequestToPay(ctx context.Context, referenceID string, payment momo.RequestToPay) error {
	if s.requestToPay != nil {
		return s.requestToPay(ctx, referenceID, payment)
	}
	return nil
}

func (s stubMoMoClient) GetRequestToPay(ctx context.Context, referenceID string) (momo.RequestToPayStatus, error) {
	if s.getRequestToPay != nil {
		return s.getRequestToPay(ctx, referenceID)
	}
	return momo.RequestToPayStatus{}, nil
}

func TestMoMoValidateAccountHolder(t *testing.T) {
	server := NewWithMoMo(nil, stubMoMoClient{
		validateAccountHolder: func(ctx context.Context, partyIDType string, partyID string) (momo.AccountHolderStatus, error) {
			if partyIDType != "MSISDN" || partyID != "250780000000" {
				t.Fatalf("unexpected account holder lookup %s %s", partyIDType, partyID)
			}
			return momo.AccountHolderStatus{Result: true}, nil
		},
	})
	request := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/validate-account-holder", strings.NewReader(`{
		"actor":{"UserID":"u_fin","OrganizationID":"org_1","Roles":["FINANCE_LEAD"]},
		"party_id_type":"MSISDN",
		"party_id":"250780000000"
	}`))
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body.String())
	}
}

func TestMoMoImportSuccessfulRequestToPay(t *testing.T) {
	server := NewWithMoMo(nil, stubMoMoClient{
		requestToPay: func(ctx context.Context, ref string, payment momo.RequestToPay) error {
			return nil
		},
		getRequestToPay: func(ctx context.Context, ref string) (momo.RequestToPayStatus, error) {
			return momo.RequestToPayStatus{
				ExternalID:   "invoice-1",
				Status:       "SUCCESSFUL",
				Amount:       "1000",
				Currency:     "RWF",
				FinancialTxn: "fin-1",
				PayerMessage: "Invoice payment",
				PayeeNote:    "Kora sandbox",
			}, nil
		},
	})
	request := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay", strings.NewReader(`{
		"actor":{"UserID":"u_fin","OrganizationID":"org_1","Roles":["FINANCE_LEAD"]},
		"reference_id":"req-1",
		"amount":"1000",
		"currency":"RWF",
		"external_id":"invoice-1",
		"payer_msisdn":"250780000000",
		"payer_message":"Invoice payment",
		"payee_note":"Kora sandbox"
	}`))
	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusAccepted {
		t.Fatalf("request-to-pay status = %d body = %s", recorder.Code, recorder.Body.String())
	}

	importRequest := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay/import", strings.NewReader(`{
		"actor":{"UserID":"u_admin","OrganizationID":"org_1","Roles":["ORG_ADMIN"]},
		"connection":{"id":"conn_momo","organization_id":"org_1","kind":"MOMO","display_name":"MTN MoMo","secret_ref":"secret://org_1/momo","active":true,"config":{"environment":"sandbox"}},
		"reference_id":"req-1",
		"input":{
			"organization_id":"org_1",
			"connection_id":"conn_momo",
			"source_name":"momo-request-to-pay",
			"window_start":"2026-07-02T00:00:00Z",
			"window_end":"2026-07-02T01:00:00Z",
			"sync_cursor":"req-1",
			"idempotency_key":"idem-momo-1"
		}
	}`))
	importRecorder := httptest.NewRecorder()
	server.ServeHTTP(importRecorder, importRequest)

	if importRecorder.Code != http.StatusCreated {
		t.Fatalf("import status = %d body = %s", importRecorder.Code, importRecorder.Body.String())
	}
	if !strings.Contains(importRecorder.Body.String(), "PAYMENT_RECEIVED") && !strings.Contains(importRecorder.Body.String(), "normalized_events") {
		t.Fatalf("unexpected import response %s", importRecorder.Body.String())
	}
}

func TestMoMoImportRejectsUnsuccessfulStatus(t *testing.T) {
	server := NewWithMoMo(nil, stubMoMoClient{
		requestToPay: func(ctx context.Context, ref string, payment momo.RequestToPay) error { return nil },
		getRequestToPay: func(ctx context.Context, ref string) (momo.RequestToPayStatus, error) {
			return momo.RequestToPayStatus{Status: "PENDING"}, nil
		},
	})
	request := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay", strings.NewReader(`{
		"actor":{"UserID":"u_fin","OrganizationID":"org_1","Roles":["FINANCE_LEAD"]},
		"reference_id":"req-2",
		"amount":"1000",
		"currency":"RWF",
		"external_id":"invoice-2",
		"payer_msisdn":"250780000000"
	}`))
	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusAccepted {
		t.Fatalf("request-to-pay status = %d body = %s", recorder.Code, recorder.Body.String())
	}

	importRequest := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay/import", strings.NewReader(`{
		"actor":{"UserID":"u_admin","OrganizationID":"org_1","Roles":["ORG_ADMIN"]},
		"connection":{"id":"conn_momo","organization_id":"org_1","kind":"MOMO","display_name":"MTN MoMo","secret_ref":"secret://org_1/momo","active":true,"config":{"environment":"sandbox"}},
		"reference_id":"req-2",
		"input":{
			"organization_id":"org_1",
			"connection_id":"conn_momo",
			"source_name":"momo-request-to-pay",
			"window_start":"2026-07-02T00:00:00Z",
			"window_end":"2026-07-02T01:00:00Z",
			"sync_cursor":"req-2",
			"idempotency_key":"idem-momo-2"
		}
	}`))
	importRecorder := httptest.NewRecorder()
	server.ServeHTTP(importRecorder, importRequest)

	if importRecorder.Code != http.StatusConflict {
		t.Fatalf("expected conflict, got %d body = %s", importRecorder.Code, importRecorder.Body.String())
	}
}

func TestMoMoCallbackAndTransactionImport(t *testing.T) {
	server := NewWithMoMo(nil, stubMoMoClient{})
	callback := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay/callback", strings.NewReader(`{
		"organization_id":"org_1",
		"reference_id":"req-3",
		"financial_transaction_id":"fin-3",
		"status":"SUCCESSFUL",
		"reason":"OK",
		"raw":{"provider":"mtn"}
	}`))
	callbackRecorder := httptest.NewRecorder()
	server.ServeHTTP(callbackRecorder, callback)
	if callbackRecorder.Code != http.StatusAccepted {
		t.Fatalf("callback status = %d body = %s", callbackRecorder.Code, callbackRecorder.Body.String())
	}

	importRequest := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/import-transaction", strings.NewReader(`{
		"actor":{"UserID":"u_admin","OrganizationID":"org_1","Roles":["ORG_ADMIN"]},
		"connection":{"id":"conn_momo","organization_id":"org_1","kind":"MOMO","display_name":"MTN MoMo","secret_ref":"secret://org_1/momo","active":true,"config":{"environment":"sandbox"}},
		"input":{
			"organization_id":"org_1",
			"connection_id":"conn_momo",
			"source_name":"momo-callback",
			"window_start":"2026-07-02T00:00:00Z",
			"window_end":"2026-07-02T01:00:00Z",
			"sync_cursor":"fin-3",
			"idempotency_key":"idem-momo-3"
		},
		"transaction":{
			"reference_id":"req-3",
			"financial_transaction_id":"fin-3",
			"external_id":"invoice-3",
			"status":"SUCCESSFUL",
			"reason":"OK",
			"amount":"2000",
			"currency":"RWF",
			"payer_msisdn":"250780000001",
			"payer_name":"Bob",
			"payer_message":"Invoice 3",
			"payee_note":"Kora",
			"occurred_on":"2026-07-02T11:00:00Z",
			"collection_category":"callback"
		}
	}`))
	importRecorder := httptest.NewRecorder()
	server.ServeHTTP(importRecorder, importRequest)
	if importRecorder.Code != http.StatusCreated {
		t.Fatalf("transaction import status = %d body = %s", importRecorder.Code, importRecorder.Body.String())
	}
}

func TestMoMoHistoryShowsAppendOnlyLifecycle(t *testing.T) {
	server := NewWithMoMo(nil, stubMoMoClient{
		requestToPay: func(ctx context.Context, ref string, payment momo.RequestToPay) error { return nil },
		getRequestToPay: func(ctx context.Context, ref string) (momo.RequestToPayStatus, error) {
			return momo.RequestToPayStatus{Status: "SUCCESSFUL", FinancialTxn: "fin-9"}, nil
		},
	})
	create := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay", strings.NewReader(`{
		"actor":{"UserID":"u_fin","OrganizationID":"org_1","Roles":["FINANCE_LEAD"]},
		"reference_id":"req-9",
		"amount":"1000",
		"currency":"RWF",
		"external_id":"invoice-9",
		"payer_msisdn":"250780000009"
	}`))
	createResp := httptest.NewRecorder()
	server.ServeHTTP(createResp, create)
	if createResp.Code != http.StatusAccepted {
		t.Fatalf("create status=%d body=%s", createResp.Code, createResp.Body.String())
	}

	status := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay/status", strings.NewReader(`{
		"actor":{"UserID":"u_fin","OrganizationID":"org_1","Roles":["FINANCE_LEAD"]},
		"reference_id":"req-9"
	}`))
	statusResp := httptest.NewRecorder()
	server.ServeHTTP(statusResp, status)
	if statusResp.Code != http.StatusOK {
		t.Fatalf("status status=%d body=%s", statusResp.Code, statusResp.Body.String())
	}

	history := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/request-to-pay/history", strings.NewReader(`{
		"actor":{"UserID":"u_fin","OrganizationID":"org_1","Roles":["FINANCE_LEAD"]},
		"reference_id":"req-9"
	}`))
	historyResp := httptest.NewRecorder()
	server.ServeHTTP(historyResp, history)
	if historyResp.Code != http.StatusOK {
		t.Fatalf("history status=%d body=%s", historyResp.Code, historyResp.Body.String())
	}
	if !strings.Contains(historyResp.Body.String(), "\"history\"") || !strings.Contains(historyResp.Body.String(), "SUCCESSFUL") {
		t.Fatalf("history body=%s", historyResp.Body.String())
	}
}

func TestMoMoBulkImportTransactions(t *testing.T) {
	server := NewWithMoMo(nil, stubMoMoClient{})
	request := httptest.NewRequest(http.MethodPost, "/v1/integrations/momo/import-transactions", strings.NewReader(`{
		"actor":{"UserID":"u_admin","OrganizationID":"org_1","Roles":["ORG_ADMIN"]},
		"connection":{"id":"conn_momo","organization_id":"org_1","kind":"MOMO","display_name":"MTN MoMo","secret_ref":"secret://org_1/momo","active":true,"config":{"environment":"sandbox"}},
		"input":{
			"organization_id":"org_1",
			"connection_id":"conn_momo",
			"source_name":"momo-sync",
			"window_start":"2026-07-02T00:00:00Z",
			"window_end":"2026-07-02T23:59:59Z",
			"sync_cursor":"fin-21",
			"idempotency_key":"idem-momo-bulk-1"
		},
		"transactions":[
			{
				"reference_id":"req-20",
				"financial_transaction_id":"fin-20",
				"external_id":"invoice-20",
				"status":"SUCCESSFUL",
				"reason":"OK",
				"amount":"2000",
				"currency":"RWF",
				"payer_msisdn":"250780000020",
				"payer_name":"Aline",
				"occurred_on":"2026-07-02T10:00:00Z",
				"collection_category":"sync"
			},
			{
				"reference_id":"req-21",
				"financial_transaction_id":"fin-21",
				"external_id":"invoice-21",
				"status":"SUCCESSFUL",
				"reason":"OK",
				"amount":"3000",
				"currency":"RWF",
				"payer_msisdn":"250780000021",
				"payer_name":"Eric",
				"occurred_on":"2026-07-02T11:00:00Z",
				"collection_category":"sync"
			}
		]
	}`))
	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("bulk import status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "normalized_events") {
		t.Fatalf("unexpected body=%s", recorder.Body.String())
	}
}
