package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/connectors"
	"github.com/kora-finance/kora/libs/connectors/momo"
	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/ingestion"
	"github.com/kora-finance/kora/libs/normalization"
	"github.com/kora-finance/kora/libs/servicekit"
)

const maxRequestBytes = 12 << 20

type Server struct {
	service *connectors.Service
	momo    momoGateway
	tracker *momo.Store
	mux     *http.ServeMux
}

type momoGateway interface {
	CreateAccessToken(ctx context.Context) (momo.AccessToken, error)
	GetAccountBalance(ctx context.Context) (momo.AccountBalance, error)
	ValidateAccountHolder(ctx context.Context, partyIDType string, partyID string) (momo.AccountHolderStatus, error)
	RequestToPay(ctx context.Context, referenceID string, payment momo.RequestToPay) error
	GetRequestToPay(ctx context.Context, referenceID string) (momo.RequestToPayStatus, error)
}

func New(service *connectors.Service) *Server {
	return NewWithMoMo(service, loadMoMoFromEnv())
}

func NewWithMoMo(service *connectors.Service, momoClient momoGateway) *Server {
	if service == nil {
		service = connectors.NewService(
			ingestion.NewService(ingestion.NewMemoryStore()),
			normalization.NewService(entities.NewResolver(), eventledger.NewStore()),
		)
	}
	server := &Server{service: service, momo: momoClient, tracker: momo.NewStore(), mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("integrations"))
	server.mux.HandleFunc("/v1/integrations/validate", server.validateConnection)
	server.mux.HandleFunc("/v1/integrations/import", server.importRecords)
	server.mux.HandleFunc("/v1/integrations/momo/validate-auth", server.validateMoMoAuth)
	server.mux.HandleFunc("/v1/integrations/momo/balance", server.momoBalance)
	server.mux.HandleFunc("/v1/integrations/momo/validate-account-holder", server.validateMoMoAccountHolder)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay", server.momoRequestToPay)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay/status", server.momoRequestToPayStatus)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay/import", server.momoImportRequestToPay)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay/callback", server.momoRequestToPayCallback)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay/history", server.momoRequestToPayHistory)
	server.mux.HandleFunc("/v1/integrations/momo/import-transaction", server.momoImportTransaction)
	server.mux.HandleFunc("/v1/integrations/momo/import-transactions", server.momoImportTransactions)
	return server
}

func (s *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	s.mux.ServeHTTP(writer, request)
}

func (s *Server) validateConnection(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor      access.Actor          `json:"actor"`
		Connection connectors.Connection `json:"connection"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := connectors.ValidateConnection(body.Actor, body.Connection); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]bool{"valid": true})
}

func (s *Server) importRecords(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor      access.Actor           `json:"actor"`
		Connection connectors.Connection  `json:"connection"`
		Input      connectors.ImportInput `json:"input"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	result, err := s.service.Import(body.Actor, body.Connection, body.Input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	status := http.StatusCreated
	if result.Replayed || result.DuplicateSource {
		status = http.StatusOK
	}
	writeJSON(writer, status, result)
}

func (s *Server) validateMoMoAuth(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.momo == nil {
		writeError(writer, http.StatusServiceUnavailable, "momo integration is not configured")
		return
	}
	var body struct {
		Actor access.Actor `json:"actor"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Actor.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	token, err := s.momo.CreateAccessToken(request.Context())
	if err != nil {
		writeError(writer, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{
		"valid":      token.AccessToken != "",
		"token_type": token.TokenType,
		"expires_in": token.ExpiresIn,
	})
}

func (s *Server) momoBalance(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.momo == nil {
		writeError(writer, http.StatusServiceUnavailable, "momo integration is not configured")
		return
	}
	var body struct {
		Actor access.Actor `json:"actor"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Actor.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	balance, err := s.momo.GetAccountBalance(request.Context())
	if err != nil {
		writeError(writer, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, balance)
}

func (s *Server) validateMoMoAccountHolder(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.momo == nil {
		writeError(writer, http.StatusServiceUnavailable, "momo integration is not configured")
		return
	}
	var body struct {
		Actor       access.Actor `json:"actor"`
		PartyIDType string       `json:"party_id_type"`
		PartyID     string       `json:"party_id"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Actor.OrganizationID}, access.PermissionSendCollections); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	status, err := s.momo.ValidateAccountHolder(request.Context(), body.PartyIDType, body.PartyID)
	if err != nil {
		writeError(writer, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, status)
}

func (s *Server) momoRequestToPay(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.momo == nil {
		writeError(writer, http.StatusServiceUnavailable, "momo integration is not configured")
		return
	}
	var body struct {
		Actor        access.Actor `json:"actor"`
		ReferenceID  string       `json:"reference_id"`
		Amount       string       `json:"amount"`
		Currency     string       `json:"currency"`
		ExternalID   string       `json:"external_id"`
		PayerMSISDN  string       `json:"payer_msisdn"`
		PayerMessage string       `json:"payer_message"`
		PayeeNote    string       `json:"payee_note"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Actor.OrganizationID}, access.PermissionSendCollections); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	if strings.TrimSpace(body.ReferenceID) == "" || strings.TrimSpace(body.Amount) == "" || strings.TrimSpace(body.Currency) == "" || strings.TrimSpace(body.ExternalID) == "" || strings.TrimSpace(body.PayerMSISDN) == "" {
		writeError(writer, http.StatusBadRequest, "reference_id, amount, currency, external_id, and payer_msisdn are required")
		return
	}
	err := s.momo.RequestToPay(request.Context(), body.ReferenceID, momo.RequestToPay{
		Amount:       body.Amount,
		Currency:     body.Currency,
		ExternalID:   body.ExternalID,
		PayerMessage: body.PayerMessage,
		PayeeNote:    body.PayeeNote,
		Payer: momo.Payer{
			PartyIDType: "MSISDN",
			PartyID:     body.PayerMSISDN,
		},
	})
	if err != nil {
		writeError(writer, http.StatusBadGateway, err.Error())
		return
	}
	if _, err := s.tracker.Create(momo.Request{
		OrganizationID:  body.Actor.OrganizationID,
		ReferenceID:     body.ReferenceID,
		ExternalID:      body.ExternalID,
		Amount:          body.Amount,
		Currency:        body.Currency,
		PayerMSISDN:     body.PayerMSISDN,
		PayerName:       body.PayerMSISDN,
		PayerMessage:    body.PayerMessage,
		PayeeNote:       body.PayeeNote,
		RequestedAt:     time.Now().UTC(),
		State:           momo.RequestPending,
		CollectionClass: "request_to_pay",
	}); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusAccepted, map[string]string{
		"reference_id": body.ReferenceID,
		"status":       "PENDING",
	})
}

func (s *Server) momoRequestToPayStatus(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.momo == nil {
		writeError(writer, http.StatusServiceUnavailable, "momo integration is not configured")
		return
	}
	var body struct {
		Actor       access.Actor `json:"actor"`
		ReferenceID string       `json:"reference_id"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Actor.OrganizationID}, access.PermissionReadEvents); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	if strings.TrimSpace(body.ReferenceID) == "" {
		writeError(writer, http.StatusBadRequest, "reference_id is required")
		return
	}
	status, err := s.momo.GetRequestToPay(request.Context(), body.ReferenceID)
	if err != nil {
		writeError(writer, http.StatusBadGateway, err.Error())
		return
	}
	if _, err := s.tracker.UpdateFromProvider(body.Actor.OrganizationID, body.ReferenceID, momo.RequestEvent{
		To:             asRequestState(status.Status),
		FinancialTxnID: status.FinancialTxn,
		Reason:         status.Reason,
		OccurredAt:     time.Now().UTC(),
	}); err != nil {
		writeError(writer, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, status)
}

func (s *Server) momoImportRequestToPay(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.momo == nil {
		writeError(writer, http.StatusServiceUnavailable, "momo integration is not configured")
		return
	}
	var body struct {
		Actor       access.Actor          `json:"actor"`
		Connection  connectors.Connection `json:"connection"`
		ReferenceID string                `json:"reference_id"`
		Input       struct {
			OrganizationID string `json:"organization_id"`
			ConnectionID   string `json:"connection_id"`
			SourceName     string `json:"source_name"`
			WindowStart    string `json:"window_start"`
			WindowEnd      string `json:"window_end"`
			SyncCursor     string `json:"sync_cursor"`
			IdempotencyKey string `json:"idempotency_key"`
		} `json:"input"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Connection.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	tracked, err := s.tracker.GetByReference(body.Actor.OrganizationID, body.ReferenceID)
	if err != nil {
		writeError(writer, http.StatusNotFound, "tracked momo request not found; request-to-pay must be initiated through Kora before import")
		return
	}
	status, err := s.momo.GetRequestToPay(request.Context(), body.ReferenceID)
	if err != nil {
		writeError(writer, http.StatusBadGateway, err.Error())
		return
	}
	if _, err := s.tracker.UpdateFromProvider(body.Actor.OrganizationID, body.ReferenceID, momo.RequestEvent{
		To:             asRequestState(status.Status),
		FinancialTxnID: status.FinancialTxn,
		Reason:         status.Reason,
		OccurredAt:     time.Now().UTC(),
	}); err != nil {
		writeError(writer, http.StatusNotFound, err.Error())
		return
	}
	if strings.ToUpper(strings.TrimSpace(status.Status)) != "SUCCESSFUL" {
		writeJSON(writer, http.StatusConflict, map[string]any{
			"imported":     false,
			"reference_id": body.ReferenceID,
			"status":       status.Status,
		})
		return
	}
	record, err := momo.MapTransactionToRecord(momo.TransactionPayload{
		ReferenceID:        body.ReferenceID,
		FinancialTxnID:     status.FinancialTxn,
		ExternalID:         firstNonEmpty(status.ExternalID, tracked.ExternalID),
		Status:             status.Status,
		Reason:             status.Reason,
		Amount:             tracked.Amount,
		Currency:           firstNonEmpty(status.Currency, tracked.Currency),
		PayerMSISDN:        tracked.PayerMSISDN,
		PayerName:          firstNonEmpty(status.Payer.PartyID, tracked.PayerName, tracked.PayerMSISDN),
		PayerMessage:       firstNonEmpty(status.PayerMessage, tracked.PayerMessage),
		PayeeNote:          firstNonEmpty(status.PayeeNote, tracked.PayeeNote),
		OccurredOn:         tracked.RequestedAt.Format(time.RFC3339),
		CollectionCategory: tracked.CollectionClass,
	})
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	input := connectors.ImportInput{
		OrganizationID: body.Input.OrganizationID,
		ConnectionID:   body.Input.ConnectionID,
		Kind:           connectors.MoMo,
		SourceName:     firstNonEmpty(body.Input.SourceName, "momo-request-to-pay"),
		WindowStart:    body.Input.WindowStart,
		WindowEnd:      firstNonEmpty(body.Input.WindowEnd, tracked.RequestedAt.Format(time.RFC3339)),
		SyncCursor:     firstNonEmpty(body.Input.SyncCursor, body.ReferenceID),
		IdempotencyKey: body.Input.IdempotencyKey,
		Records:        []connectors.Record{record},
	}
	result, err := s.service.Import(body.Actor, body.Connection, input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusCreated, map[string]any{
		"imported":      true,
		"reference_id":  body.ReferenceID,
		"status":        status.Status,
		"import_result": result,
	})
}

func (s *Server) momoRequestToPayCallback(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		OrganizationID     string         `json:"organization_id"`
		ReferenceID        string         `json:"reference_id"`
		FinancialTxnID     string         `json:"financial_transaction_id"`
		Status             string         `json:"status"`
		Reason             string         `json:"reason"`
		Amount             string         `json:"amount"`
		Currency           string         `json:"currency"`
		ExternalID         string         `json:"external_id"`
		PayerMSISDN        string         `json:"payer_msisdn"`
		PayerName          string         `json:"payer_name"`
		PayerMessage       string         `json:"payer_message"`
		PayeeNote          string         `json:"payee_note"`
		OccurredOn         string         `json:"occurred_on"`
		CollectionCategory string         `json:"collection_category"`
		Raw                map[string]any `json:"raw"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if strings.TrimSpace(body.OrganizationID) == "" || strings.TrimSpace(body.ReferenceID) == "" {
		writeError(writer, http.StatusBadRequest, "organization_id and reference_id are required")
		return
	}
	updated, err := s.tracker.SaveOrUpdateFromCallback(momo.Request{
		OrganizationID:  body.OrganizationID,
		ReferenceID:     body.ReferenceID,
		ExternalID:      body.ExternalID,
		Amount:          body.Amount,
		Currency:        body.Currency,
		PayerMSISDN:     body.PayerMSISDN,
		PayerName:       body.PayerName,
		PayerMessage:    body.PayerMessage,
		PayeeNote:       body.PayeeNote,
		State:           momo.RequestReceived,
		CollectionClass: firstNonEmpty(body.CollectionCategory, "callback"),
	}, momo.RequestEvent{
		To:                 asRequestState(body.Status),
		FinancialTxnID:     body.FinancialTxnID,
		Reason:             body.Reason,
		OccurredAt:         time.Now().UTC(),
		RawProviderPayload: body.Raw,
	})
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusAccepted, map[string]string{
		"reference_id": body.ReferenceID,
		"status":       string(updated.State),
	})
}

func (s *Server) momoRequestToPayHistory(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor       access.Actor `json:"actor"`
		ReferenceID string       `json:"reference_id"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Actor.OrganizationID}, access.PermissionReadEvents); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	requestView, err := s.tracker.GetByReference(body.Actor.OrganizationID, body.ReferenceID)
	if err != nil {
		writeError(writer, http.StatusNotFound, err.Error())
		return
	}
	history, err := s.tracker.History(body.Actor.OrganizationID, body.ReferenceID)
	if err != nil {
		writeError(writer, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{
		"request": requestView,
		"history": history,
	})
}

func (s *Server) momoImportTransaction(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor      access.Actor          `json:"actor"`
		Connection connectors.Connection `json:"connection"`
		Input      struct {
			OrganizationID string `json:"organization_id"`
			ConnectionID   string `json:"connection_id"`
			SourceName     string `json:"source_name"`
			WindowStart    string `json:"window_start"`
			WindowEnd      string `json:"window_end"`
			SyncCursor     string `json:"sync_cursor"`
			IdempotencyKey string `json:"idempotency_key"`
		} `json:"input"`
		Transaction momo.TransactionPayload `json:"transaction"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Connection.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	result, err := s.importMoMoTransactions(body.Actor, body.Connection, momoImportInput{
		OrganizationID: body.Input.OrganizationID,
		ConnectionID:   body.Input.ConnectionID,
		SourceName:     body.Input.SourceName,
		WindowStart:    body.Input.WindowStart,
		WindowEnd:      body.Input.WindowEnd,
		SyncCursor:     body.Input.SyncCursor,
		IdempotencyKey: body.Input.IdempotencyKey,
		Transactions:   []momo.TransactionPayload{body.Transaction},
	})
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusCreated, map[string]any{
		"imported":      true,
		"reference_id":  body.Transaction.ReferenceID,
		"import_result": result,
	})
}

func (s *Server) momoImportTransactions(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor      access.Actor          `json:"actor"`
		Connection connectors.Connection `json:"connection"`
		Input      struct {
			OrganizationID string `json:"organization_id"`
			ConnectionID   string `json:"connection_id"`
			SourceName     string `json:"source_name"`
			WindowStart    string `json:"window_start"`
			WindowEnd      string `json:"window_end"`
			SyncCursor     string `json:"sync_cursor"`
			IdempotencyKey string `json:"idempotency_key"`
		} `json:"input"`
		Transactions []momo.TransactionPayload `json:"transactions"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Connection.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	result, err := s.importMoMoTransactions(body.Actor, body.Connection, momoImportInput{
		OrganizationID: body.Input.OrganizationID,
		ConnectionID:   body.Input.ConnectionID,
		SourceName:     body.Input.SourceName,
		WindowStart:    body.Input.WindowStart,
		WindowEnd:      body.Input.WindowEnd,
		SyncCursor:     body.Input.SyncCursor,
		IdempotencyKey: body.Input.IdempotencyKey,
		Transactions:   body.Transactions,
	})
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusCreated, result)
}

func decode(request *http.Request, writer http.ResponseWriter, target any) error {
	request.Body = http.MaxBytesReader(writer, request.Body, maxRequestBytes)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("request body must contain one JSON value")
	}
	return nil
}

func writeJSON(writer http.ResponseWriter, status int, body any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(body)
}

func writeError(writer http.ResponseWriter, status int, message string) {
	writeJSON(writer, status, map[string]string{"error": message})
}

func loadMoMoFromEnv() momoGateway {
	subscriptionKey := strings.TrimSpace(os.Getenv("MOMO_COLLECTION_SUBSCRIPTION_KEY"))
	apiUser := strings.TrimSpace(os.Getenv("MOMO_COLLECTION_API_USER"))
	apiKey := strings.TrimSpace(os.Getenv("MOMO_COLLECTION_API_KEY"))
	if subscriptionKey == "" || apiUser == "" || apiKey == "" {
		return nil
	}
	client, err := momo.NewClient(momo.Config{
		BaseURL:              strings.TrimSpace(os.Getenv("MOMO_BASE_URL")),
		TargetEnvironment:    strings.TrimSpace(os.Getenv("MOMO_TARGET_ENVIRONMENT")),
		SubscriptionKey:      subscriptionKey,
		APIUser:              apiUser,
		APIKey:               apiKey,
		ProviderCallbackHost: strings.TrimSpace(os.Getenv("MOMO_COLLECTION_CALLBACK_HOST")),
	})
	if err != nil {
		return nil
	}
	return client
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func asRequestState(value string) momo.RequestState {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "SUCCESSFUL":
		return momo.RequestSuccessful
	case "FAILED":
		return momo.RequestFailed
	case "PENDING":
		return momo.RequestPending
	case "RECEIVED":
		return momo.RequestReceived
	default:
		return momo.RequestUnknown
	}
}

type momoImportInput struct {
	OrganizationID string
	ConnectionID   string
	SourceName     string
	WindowStart    string
	WindowEnd      string
	SyncCursor     string
	IdempotencyKey string
	Transactions   []momo.TransactionPayload
}

func (s *Server) importMoMoTransactions(actor access.Actor, connection connectors.Connection, input momoImportInput) (connectors.ImportResult, error) {
	if len(input.Transactions) == 0 {
		return connectors.ImportResult{}, errors.New("at least one momo transaction is required")
	}
	records := make([]connectors.Record, 0, len(input.Transactions))
	windowEnd := strings.TrimSpace(input.WindowEnd)
	syncCursor := strings.TrimSpace(input.SyncCursor)
	for _, transaction := range input.Transactions {
		record, err := momo.MapTransactionToRecord(transaction)
		if err != nil {
			return connectors.ImportResult{}, err
		}
		records = append(records, record)
		windowEnd = firstNonEmpty(windowEnd, transaction.OccurredOn)
		syncCursor = firstNonEmpty(syncCursor, transaction.FinancialTxnID, transaction.ReferenceID)
		if strings.TrimSpace(transaction.ReferenceID) != "" {
			_, _ = s.tracker.SaveOrUpdateFromCallback(momo.Request{
				OrganizationID:  actor.OrganizationID,
				ReferenceID:     transaction.ReferenceID,
				ExternalID:      transaction.ExternalID,
				Amount:          transaction.Amount,
				Currency:        transaction.Currency,
				PayerMSISDN:     transaction.PayerMSISDN,
				PayerName:       transaction.PayerName,
				PayerMessage:    transaction.PayerMessage,
				PayeeNote:       transaction.PayeeNote,
				State:           asRequestState(transaction.Status),
				CollectionClass: firstNonEmpty(transaction.CollectionCategory, "sync"),
			}, momo.RequestEvent{
				To:             asRequestState(transaction.Status),
				FinancialTxnID: transaction.FinancialTxnID,
				Reason:         transaction.Reason,
				OccurredAt:     time.Now().UTC(),
			})
		}
	}
	return s.service.Import(actor, connection, connectors.ImportInput{
		OrganizationID: input.OrganizationID,
		ConnectionID:   input.ConnectionID,
		Kind:           connectors.MoMo,
		SourceName:     firstNonEmpty(input.SourceName, "momo-transaction-sync"),
		WindowStart:    input.WindowStart,
		WindowEnd:      windowEnd,
		SyncCursor:     syncCursor,
		IdempotencyKey: input.IdempotencyKey,
		Records:        records,
	})
}
