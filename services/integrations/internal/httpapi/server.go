package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
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

var uuidV4Pattern = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

type Server struct {
	service     *connectors.Service
	connections connectors.ConnectionStore
	momo        momoGateway
	tracker     momo.RequestTracker
	mux         *http.ServeMux
}

type MoMoSyncOptions struct {
	Actor        access.Actor
	Connection   connectors.Connection
	Input        MoMoSyncInput
	ReferenceIDs []string
	AutoImport   bool
}

type MoMoSyncInput struct {
	OrganizationID string
	ConnectionID   string
	SourceName     string
	WindowStart    string
	WindowEnd      string
	SyncCursor     string
	IdempotencyKey string
}

type MoMoSyncItem struct {
	ReferenceID  string                   `json:"reference_id"`
	Status       string                   `json:"status"`
	Imported     bool                     `json:"imported"`
	ImportResult *connectors.ImportResult `json:"import_result,omitempty"`
	Error        string                   `json:"error,omitempty"`
}

type momoGateway interface {
	CreateAccessToken(ctx context.Context) (momo.AccessToken, error)
	GetAccountBalance(ctx context.Context) (momo.AccountBalance, error)
	ValidateAccountHolder(ctx context.Context, partyIDType string, partyID string) (momo.AccountHolderStatus, error)
	RequestToPay(ctx context.Context, referenceID string, payment momo.RequestToPay, opts momo.RequestToPayOptions) error
	GetRequestToPay(ctx context.Context, referenceID string) (momo.RequestToPayStatus, error)
}

func New(service *connectors.Service) *Server {
	return NewWithDependencies(service, connectors.NewMemoryConnectionStore(), loadMoMoFromEnv(), loadMoMoTrackerFromEnv())
}

func NewWithMoMo(service *connectors.Service, momoClient momoGateway) *Server {
	return NewWithDependencies(service, connectors.NewMemoryConnectionStore(), momoClient, momo.NewStore())
}

func NewWithDependencies(service *connectors.Service, connectionStore connectors.ConnectionStore, momoClient momoGateway, tracker momo.RequestTracker) *Server {
	if service == nil {
		service = connectors.NewService(
			ingestion.NewService(ingestion.NewMemoryStore()),
			normalization.NewService(entities.NewResolver(), eventledger.NewStore()),
		)
	}
	if connectionStore == nil {
		connectionStore = connectors.NewMemoryConnectionStore()
	}
	if tracker == nil {
		tracker = momo.NewStore()
	}
	server := &Server{service: service, connections: connectionStore, momo: momoClient, tracker: tracker, mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("integrations"))
	server.mux.HandleFunc("/v1/integrations/validate", server.validateConnection)
	server.mux.HandleFunc("/v1/integrations/connections", server.connectionsCollection)
	server.mux.HandleFunc("/v1/integrations/connections/query", server.queryConnections)
	server.mux.HandleFunc("/v1/integrations/import", server.importRecords)
	server.mux.HandleFunc("/v1/integrations/momo/validate-auth", server.validateMoMoAuth)
	server.mux.HandleFunc("/v1/integrations/momo/balance", server.momoBalance)
	server.mux.HandleFunc("/v1/integrations/momo/validate-account-holder", server.validateMoMoAccountHolder)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay", server.momoRequestToPay)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay/status", server.momoRequestToPayStatus)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay/sync-statuses", server.momoSyncRequestStatuses)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay/import", server.momoImportRequestToPay)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay/callback", server.momoRequestToPayCallback)
	server.mux.HandleFunc("/v1/integrations/momo/request-to-pay/callback/provider", server.momoProviderRequestToPayCallback)
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

func (s *Server) connectionsCollection(writer http.ResponseWriter, request *http.Request) {
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
	connection, err := s.connections.Create(body.Actor, body.Connection)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusCreated, connection)
}

func (s *Server) queryConnections(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor          access.Actor    `json:"actor"`
		OrganizationID string          `json:"organization_id"`
		Kind           connectors.Kind `json:"kind"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	items, err := s.connections.List(body.Actor, body.OrganizationID, body.Kind)
	if err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"connections": items})
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
		ConnectionID string       `json:"connection_id"`
		CallbackURL  string       `json:"callback_url"`
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
	if !isUUIDv4(body.ReferenceID) {
		writeError(writer, http.StatusBadRequest, "reference_id must be a UUID v4 for MTN MoMo request-to-pay")
		return
	}
	callbackURL := firstNonEmpty(body.CallbackURL, buildMoMoProviderCallbackURL(body.Actor.OrganizationID, resolveMoMoConnectionID(body.Actor.OrganizationID, body.ConnectionID), body.ReferenceID))
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
	}, momo.RequestToPayOptions{CallbackURL: callbackURL})
	if err != nil {
		writeError(writer, http.StatusBadGateway, err.Error())
		return
	}
	if _, err := s.tracker.Create(momo.Request{
		OrganizationID:  body.Actor.OrganizationID,
		ConnectionID:    resolveMoMoConnectionID(body.Actor.OrganizationID, body.ConnectionID),
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

func (s *Server) momoSyncRequestStatuses(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.momo == nil {
		writeError(writer, http.StatusServiceUnavailable, "momo integration is not configured")
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
		ReferenceIDs []string `json:"reference_ids"`
		AutoImport   bool     `json:"auto_import"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: body.Actor.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	connection, err := s.resolveConnection(body.Actor, body.Connection, body.Input.OrganizationID, body.Input.ConnectionID, connectors.MoMo)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	results, err := s.SyncMoMoRequestStatuses(request.Context(), MoMoSyncOptions{
		Actor:      body.Actor,
		Connection: connection,
		Input: MoMoSyncInput{
			OrganizationID: body.Input.OrganizationID,
			ConnectionID:   body.Input.ConnectionID,
			SourceName:     body.Input.SourceName,
			WindowStart:    body.Input.WindowStart,
			WindowEnd:      body.Input.WindowEnd,
			SyncCursor:     body.Input.SyncCursor,
			IdempotencyKey: body.Input.IdempotencyKey,
		},
		ReferenceIDs: body.ReferenceIDs,
		AutoImport:   body.AutoImport,
	})
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"results": results})
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
	connection, err := s.resolveConnection(body.Actor, body.Connection, body.Input.OrganizationID, body.Input.ConnectionID, connectors.MoMo)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: connection.OrganizationID}, access.PermissionManageIntegrations); err != nil {
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
	result, err := s.service.Import(body.Actor, connection, input)
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
		ConnectionID       string         `json:"connection_id"`
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
		ConnectionID:    resolveMoMoConnectionID(body.OrganizationID, body.ConnectionID),
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

func (s *Server) momoProviderRequestToPayCallback(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost && request.Method != http.MethodPut {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if err := validateMoMoCallbackToken(request); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	request.Body = http.MaxBytesReader(writer, request.Body, maxRequestBytes)
	payload, rawMap, err := decodeProviderCallbackBody(request.Body)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	organizationID := strings.TrimSpace(request.URL.Query().Get("organization_id"))
	connectionID := resolveMoMoConnectionID(organizationID, request.URL.Query().Get("connection_id"))
	referenceID := strings.TrimSpace(request.URL.Query().Get("reference_id"))
	if organizationID == "" || referenceID == "" {
		writeError(writer, http.StatusBadRequest, "organization_id and reference_id query parameters are required")
		return
	}
	updated, err := s.tracker.SaveOrUpdateFromCallback(momo.Request{
		OrganizationID:  organizationID,
		ConnectionID:    connectionID,
		ReferenceID:     referenceID,
		ExternalID:      payload.ExternalID,
		Amount:          payload.Amount,
		Currency:        payload.Currency,
		PayerMSISDN:     payload.Payer.PartyID,
		PayerName:       payload.Payer.PartyID,
		PayerMessage:    payload.PayerMessage,
		PayeeNote:       payload.PayeeNote,
		State:           momo.RequestReceived,
		CollectionClass: "provider_callback",
	}, momo.RequestEvent{
		To:                 asRequestState(payload.Status),
		FinancialTxnID:     payload.FinancialTxn,
		Reason:             payload.Reason,
		OccurredAt:         time.Now().UTC(),
		RawProviderPayload: rawMap,
	})
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	response := map[string]any{
		"reference_id": referenceID,
		"status":       string(updated.State),
	}
	if callbackAutoImportEnabled() && strings.EqualFold(payload.Status, "SUCCESSFUL") {
		connection := callbackImportConnection(organizationID, connectionID)
		actor := callbackImportActor(organizationID)
		record, err := momo.MapTransactionToRecord(momo.TransactionPayload{
			ReferenceID:        referenceID,
			FinancialTxnID:     payload.FinancialTxn,
			ExternalID:         payload.ExternalID,
			Status:             payload.Status,
			Reason:             payload.Reason,
			Amount:             payload.Amount,
			Currency:           payload.Currency,
			PayerMSISDN:        payload.Payer.PartyID,
			PayerName:          payload.Payer.PartyID,
			PayerMessage:       payload.PayerMessage,
			PayeeNote:          payload.PayeeNote,
			OccurredOn:         time.Now().UTC().Format(time.RFC3339),
			CollectionCategory: "provider_callback",
		})
		if err == nil {
			importResult, importErr := s.service.Import(actor, connection, connectors.ImportInput{
				OrganizationID: organizationID,
				ConnectionID:   connectionID,
				Kind:           connectors.MoMo,
				SourceName:     "momo-provider-callback",
				WindowEnd:      time.Now().UTC().Format(time.RFC3339),
				SyncCursor:     firstNonEmpty(payload.FinancialTxn, referenceID),
				IdempotencyKey: "momo-callback:" + firstNonEmpty(payload.FinancialTxn, referenceID),
				Records:        []connectors.Record{record},
			})
			if importErr == nil {
				response["imported"] = true
				response["import_result"] = importResult
			} else {
				response["imported"] = false
				response["import_error"] = importErr.Error()
			}
		} else {
			response["imported"] = false
			response["import_error"] = err.Error()
		}
	}
	writeJSON(writer, http.StatusAccepted, response)
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
	connection, err := s.resolveConnection(body.Actor, body.Connection, body.Input.OrganizationID, body.Input.ConnectionID, connectors.MoMo)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: connection.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	result, err := s.importMoMoTransactions(body.Actor, connection, momoImportInput{
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
	connection, err := s.resolveConnection(body.Actor, body.Connection, body.Input.OrganizationID, body.Input.ConnectionID, connectors.MoMo)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	if err := access.Authorize(body.Actor, access.Resource{OrganizationID: connection.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	result, err := s.importMoMoTransactions(body.Actor, connection, momoImportInput{
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

func loadMoMoTrackerFromEnv() momo.RequestTracker {
	if databaseURL := strings.TrimSpace(firstNonEmpty(os.Getenv("MOMO_TRACKER_DATABASE_URL"), os.Getenv("DATABASE_URL"))); databaseURL != "" {
		store, err := momo.NewSQLStore(databaseURL)
		if err != nil {
			panic("momo sql tracker initialization failed: " + err.Error())
		}
		return store
	}
	path := strings.TrimSpace(os.Getenv("MOMO_REQUEST_JOURNAL_PATH"))
	if path == "" {
		return momo.NewStore()
	}
	store, err := momo.NewJournalStore(path)
	if err != nil {
		return momo.NewStore()
	}
	return store
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func decodeProviderCallbackBody(reader io.Reader) (momo.RequestToPayStatus, map[string]any, error) {
	rawBytes, err := io.ReadAll(reader)
	if err != nil {
		return momo.RequestToPayStatus{}, nil, err
	}
	var payload momo.RequestToPayStatus
	if err := json.Unmarshal(rawBytes, &payload); err != nil {
		return momo.RequestToPayStatus{}, nil, err
	}
	raw := map[string]any{}
	if len(strings.TrimSpace(string(rawBytes))) > 0 {
		if err := json.Unmarshal(rawBytes, &raw); err != nil {
			return momo.RequestToPayStatus{}, nil, err
		}
	}
	return payload, raw, nil
}

func (s *Server) resolveConnection(actor access.Actor, supplied connectors.Connection, organizationID, connectionID string, kind connectors.Kind) (connectors.Connection, error) {
	if supplied.ID != "" {
		if kind != "" && supplied.Kind != kind {
			return connectors.Connection{}, errors.New("connector kind does not match the requested integration")
		}
		if organizationID != "" && supplied.OrganizationID != organizationID {
			return connectors.Connection{}, errors.New("supplied connector connection does not belong to the requested organization")
		}
		if connectionID != "" && supplied.ID != connectionID {
			return connectors.Connection{}, errors.New("supplied connector connection does not match the requested connection_id")
		}
		if err := connectors.ValidateConnection(actor, supplied); err != nil {
			return connectors.Connection{}, err
		}
		return supplied, nil
	}
	if strings.TrimSpace(organizationID) == "" || strings.TrimSpace(connectionID) == "" {
		return connectors.Connection{}, errors.New("connection_id and organization_id are required when a stored connector connection is used")
	}
	connection, err := s.connections.Get(actor, organizationID, connectionID)
	if err != nil {
		return connectors.Connection{}, err
	}
	if kind != "" && connection.Kind != kind {
		return connectors.Connection{}, errors.New("stored connector kind does not match the requested integration")
	}
	return connection, nil
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

func syncIdempotencyKey(base string, referenceID string, index int) string {
	base = firstNonEmpty(base, "momo-status-sync")
	return base + ":" + referenceID + ":" + strconv.Itoa(index)
}

func resolveMoMoConnectionID(organizationID string, explicit string) string {
	if strings.TrimSpace(explicit) != "" {
		return strings.TrimSpace(explicit)
	}
	if configured := strings.TrimSpace(os.Getenv("MOMO_DEFAULT_CONNECTION_ID")); configured != "" {
		return configured
	}
	return "conn:" + organizationID
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

func (s *Server) SyncMoMoRequestStatuses(ctx context.Context, opts MoMoSyncOptions) ([]MoMoSyncItem, error) {
	if s.momo == nil {
		return nil, errors.New("momo integration is not configured")
	}
	if err := access.Authorize(opts.Actor, access.Resource{OrganizationID: opts.Actor.OrganizationID}, access.PermissionManageIntegrations); err != nil {
		return nil, err
	}
	references := opts.ReferenceIDs
	if len(references) == 0 {
		tracked := s.tracker.List(momo.ListFilter{
			OrganizationID: opts.Actor.OrganizationID,
			States:         []momo.RequestState{momo.RequestPending, momo.RequestReceived, momo.RequestUnknown},
		})
		references = make([]string, 0, len(tracked))
		for _, request := range tracked {
			references = append(references, request.ReferenceID)
		}
	}
	results := make([]MoMoSyncItem, 0, len(references))
	for index, referenceID := range references {
		item := MoMoSyncItem{ReferenceID: referenceID}
		tracked, err := s.tracker.GetByReference(opts.Actor.OrganizationID, referenceID)
		if err != nil {
			item.Error = err.Error()
			results = append(results, item)
			continue
		}
		status, err := s.momo.GetRequestToPay(ctx, referenceID)
		if err != nil {
			item.Error = err.Error()
			results = append(results, item)
			continue
		}
		item.Status = status.Status
		_, _ = s.tracker.UpdateFromProvider(opts.Actor.OrganizationID, referenceID, momo.RequestEvent{
			To:             asRequestState(status.Status),
			FinancialTxnID: status.FinancialTxn,
			Reason:         status.Reason,
			OccurredAt:     time.Now().UTC(),
		})
		if opts.AutoImport && strings.EqualFold(status.Status, "SUCCESSFUL") {
			record, err := momo.MapTransactionToRecord(momo.TransactionPayload{
				ReferenceID:        referenceID,
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
				item.Error = err.Error()
				results = append(results, item)
				continue
			}
			importResult, err := s.service.Import(opts.Actor, opts.Connection, connectors.ImportInput{
				OrganizationID: opts.Input.OrganizationID,
				ConnectionID:   opts.Input.ConnectionID,
				Kind:           connectors.MoMo,
				SourceName:     firstNonEmpty(opts.Input.SourceName, "momo-status-sync"),
				WindowStart:    opts.Input.WindowStart,
				WindowEnd:      firstNonEmpty(opts.Input.WindowEnd, tracked.RequestedAt.Format(time.RFC3339)),
				SyncCursor:     firstNonEmpty(opts.Input.SyncCursor, status.FinancialTxn, referenceID),
				IdempotencyKey: syncIdempotencyKey(opts.Input.IdempotencyKey, referenceID, index),
				Records:        []connectors.Record{record},
			})
			if err != nil {
				item.Error = err.Error()
				results = append(results, item)
				continue
			}
			item.Imported = true
			item.ImportResult = &importResult
		}
		results = append(results, item)
	}
	return results, nil
}

func isUUIDv4(value string) bool {
	return uuidV4Pattern.MatchString(strings.TrimSpace(value))
}

func buildMoMoProviderCallbackURL(organizationID, connectionID, referenceID string) string {
	baseURL := strings.TrimSpace(os.Getenv("MOMO_CALLBACK_BASE_URL"))
	if baseURL == "" {
		return ""
	}
	values := url.Values{}
	values.Set("organization_id", organizationID)
	values.Set("connection_id", connectionID)
	values.Set("reference_id", referenceID)
	if token := strings.TrimSpace(os.Getenv("MOMO_CALLBACK_TOKEN")); token != "" {
		values.Set("token", token)
	}
	return strings.TrimRight(baseURL, "/") + "/v1/integrations/momo/request-to-pay/callback/provider?" + values.Encode()
}

func validateMoMoCallbackToken(request *http.Request) error {
	expected := strings.TrimSpace(os.Getenv("MOMO_CALLBACK_TOKEN"))
	if expected == "" {
		return nil
	}
	if strings.TrimSpace(request.URL.Query().Get("token")) != expected {
		return errors.New("invalid momo callback token")
	}
	return nil
}

func callbackAutoImportEnabled() bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv("MOMO_CALLBACK_AUTO_IMPORT")))
	return value == "" || (value != "false" && value != "0" && value != "no")
}

func callbackImportActor(organizationID string) access.Actor {
	return access.Actor{
		UserID:         firstNonEmpty(os.Getenv("MOMO_CALLBACK_ACTOR_USER_ID"), os.Getenv("MOMO_SYNC_ACTOR_USER_ID"), "u_admin"),
		OrganizationID: organizationID,
		Roles:          []access.Role{access.RoleOrgAdmin},
	}
}

func callbackImportConnection(organizationID, connectionID string) connectors.Connection {
	return connectors.Connection{
		ID:             connectionID,
		OrganizationID: organizationID,
		Kind:           connectors.MoMo,
		DisplayName:    firstNonEmpty(os.Getenv("MOMO_SYNC_CONNECTION_DISPLAY_NAME"), "MTN MoMo"),
		SecretRef:      firstNonEmpty(os.Getenv("MOMO_SYNC_CONNECTION_SECRET_REF"), "secret://"+organizationID+"/momo"),
		Active:         true,
		Config: map[string]string{
			"environment": firstNonEmpty(os.Getenv("MOMO_TARGET_ENVIRONMENT"), "sandbox"),
		},
	}
}
