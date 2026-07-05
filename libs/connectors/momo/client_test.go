package momo

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestCreateAPIUserAndAPIKey(t *testing.T) {
	var seenUserHeader string
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/v1_0/apiuser":
			seenUserHeader = request.Header.Get("X-Reference-Id")
			if request.Header.Get("Ocp-Apim-Subscription-Key") != "sub-key" {
				t.Fatalf("missing subscription key")
			}
			writer.WriteHeader(http.StatusCreated)
		case "/v1_0/apiuser/ref-123/apikey":
			writer.Header().Set("Content-Type", "application/json")
			writer.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(writer).Encode(map[string]string{"apiKey": "sandbox-key"})
		default:
			t.Fatalf("unexpected path %s", request.URL.Path)
		}
	}))
	defer server.Close()

	client := newTestClient(t, Config{BaseURL: server.URL, SubscriptionKey: "sub-key"})
	if err := client.CreateAPIUser(context.Background(), "ref-123"); err != nil {
		t.Fatalf("CreateAPIUser() error = %v", err)
	}
	if seenUserHeader != "ref-123" {
		t.Fatalf("CreateAPIUser() header = %s", seenUserHeader)
	}
	apiKey, err := client.CreateAPIKey(context.Background(), "ref-123")
	if err != nil {
		t.Fatalf("CreateAPIKey() error = %v", err)
	}
	if apiKey != "sandbox-key" {
		t.Fatalf("CreateAPIKey() = %s", apiKey)
	}
}

func TestCreateAccessTokenUsesBasicAuth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != tokenPath {
			t.Fatalf("unexpected path %s", request.URL.Path)
		}
		expected := "Basic " + base64.StdEncoding.EncodeToString([]byte("api-user:api-key"))
		if request.Header.Get("Authorization") != expected {
			t.Fatalf("authorization = %s", request.Header.Get("Authorization"))
		}
		writer.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(writer).Encode(AccessToken{AccessToken: "token-1", TokenType: "access_token", ExpiresIn: 3600})
	}))
	defer server.Close()

	client := newTestClient(t, Config{
		BaseURL:         server.URL,
		SubscriptionKey: "sub-key",
		APIUser:         "api-user",
		APIKey:          "api-key",
	})
	token, err := client.CreateAccessToken(context.Background())
	if err != nil {
		t.Fatalf("CreateAccessToken() error = %v", err)
	}
	if token.AccessToken != "token-1" {
		t.Fatalf("CreateAccessToken() = %+v", token)
	}
}

func TestRequestToPayAndStatus(t *testing.T) {
	var callbackHeader string
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case tokenPath:
			writer.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(writer).Encode(AccessToken{AccessToken: "token-1", TokenType: "access_token", ExpiresIn: 3600})
		case requestToPayBasePath:
			if request.Method != http.MethodPost {
				t.Fatalf("method = %s", request.Method)
			}
			if request.Header.Get("X-Target-Environment") != "sandbox" {
				t.Fatalf("target env = %s", request.Header.Get("X-Target-Environment"))
			}
			callbackHeader = request.Header.Get("X-Callback-Url")
			writer.WriteHeader(http.StatusAccepted)
		case requestToPayBasePath + "/req-1":
			if request.Method != http.MethodGet {
				t.Fatalf("method = %s", request.Method)
			}
			writer.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(writer).Encode(RequestToPayStatus{
				ExternalID:   "invoice-1",
				Status:       "SUCCESSFUL",
				Amount:       "1000",
				Currency:     "RWF",
				PayerMessage: "Kora test",
			})
		default:
			t.Fatalf("unexpected path %s", request.URL.Path)
		}
	}))
	defer server.Close()

	client := newTestClient(t, Config{
		BaseURL:         server.URL,
		SubscriptionKey: "sub-key",
		APIUser:         "api-user",
		APIKey:          "api-key",
	})
	err := client.RequestToPay(context.Background(), "req-1", RequestToPay{
		Amount:       "1000",
		Currency:     "RWF",
		ExternalID:   "invoice-1",
		PayerMessage: "Kora test",
		PayeeNote:    "sandbox",
		Payer:        Payer{PartyIDType: "MSISDN", PartyID: "250780000000"},
	}, RequestToPayOptions{CallbackURL: "https://merchant.example.com/momo/callback"})
	if err != nil {
		t.Fatalf("RequestToPay() error = %v", err)
	}
	if callbackHeader != "https://merchant.example.com/momo/callback" {
		t.Fatalf("callback header = %s", callbackHeader)
	}
	status, err := client.GetRequestToPay(context.Background(), "req-1")
	if err != nil {
		t.Fatalf("GetRequestToPay() error = %v", err)
	}
	if status.Status != "SUCCESSFUL" {
		t.Fatalf("GetRequestToPay() = %+v", status)
	}
}

func TestClientRejectsBadConfig(t *testing.T) {
	if _, err := NewClient(Config{}); err == nil || !strings.Contains(err.Error(), "subscription key") {
		t.Fatalf("expected missing subscription key error, got %v", err)
	}
	if _, err := NewClient(Config{SubscriptionKey: "sub-key", BaseURL: ":://bad"}); err == nil {
		t.Fatal("expected invalid base url error")
	}
}

func TestGetAccountBalanceRetriesTransientServerErrors(t *testing.T) {
	var attempts int32
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case tokenPath:
			writer.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(writer).Encode(AccessToken{AccessToken: "token-1", TokenType: "access_token", ExpiresIn: 3600})
		case accountBalancePath:
			current := atomic.AddInt32(&attempts, 1)
			if current < 3 {
				writer.WriteHeader(http.StatusServiceUnavailable)
				_, _ = writer.Write([]byte(`{"message":"Service temporarily unavailable, try again later.","code":"SERVICE_UNAVAILABLE"}`))
				return
			}
			writer.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(writer).Encode(AccountBalance{AvailableBalance: "1000", Currency: "EUR"})
		default:
			t.Fatalf("unexpected path %s", request.URL.Path)
		}
	}))
	defer server.Close()

	client := newTestClient(t, Config{
		BaseURL:         server.URL,
		SubscriptionKey: "sub-key",
		APIUser:         "api-user",
		APIKey:          "api-key",
	})
	balance, err := client.GetAccountBalance(context.Background())
	if err != nil {
		t.Fatalf("GetAccountBalance() error = %v", err)
	}
	if balance.AvailableBalance != "1000" || attempts != 3 {
		t.Fatalf("balance = %+v attempts = %d", balance, attempts)
	}
}

func TestValidateAccountHolder(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case tokenPath:
			writer.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(writer).Encode(AccessToken{AccessToken: "token-1", TokenType: "access_token", ExpiresIn: 3600})
		case accountHolderBasePath + "/msisdn/250780000000/active":
			writer.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(writer).Encode(AccountHolderStatus{Result: true})
		default:
			t.Fatalf("unexpected path %s", request.URL.Path)
		}
	}))
	defer server.Close()

	client := newTestClient(t, Config{
		BaseURL:         server.URL,
		SubscriptionKey: "sub-key",
		APIUser:         "api-user",
		APIKey:          "api-key",
	})
	status, err := client.ValidateAccountHolder(context.Background(), "MSISDN", "250780000000")
	if err != nil {
		t.Fatalf("ValidateAccountHolder() error = %v", err)
	}
	if !status.Result {
		t.Fatalf("ValidateAccountHolder() = %+v", status)
	}
}

func newTestClient(t *testing.T, config Config) *Client {
	t.Helper()
	client, err := NewClient(config)
	if err != nil {
		t.Fatalf("NewClient() error = %v", err)
	}
	return client
}
