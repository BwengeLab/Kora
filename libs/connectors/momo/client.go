package momo

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultBaseURL        = "https://sandbox.momodeveloper.mtn.com"
	defaultTargetEnv      = "sandbox"
	defaultCallbackHost   = "example.com"
	defaultHTTPTimeout    = 20 * time.Second
	defaultRetryAttempts  = 3
	tokenPath             = "/collection/token/"
	apiUserPath           = "/v1_0/apiuser"
	accountBalancePath    = "/collection/v1_0/account/balance"
	accountHolderBasePath = "/collection/v1_0/accountholder"
	requestToPayBasePath  = "/collection/v1_0/requesttopay"
)

type Config struct {
	BaseURL              string
	TargetEnvironment    string
	SubscriptionKey      string
	APIUser              string
	APIKey               string
	ProviderCallbackHost string
	HTTPClient           *http.Client
}

type Client struct {
	baseURL           string
	targetEnvironment string
	subscriptionKey   string
	apiUser           string
	apiKey            string
	callbackHost      string
	httpClient        *http.Client
}

type requestError struct {
	StatusCode int
	Message    string
}

func (e *requestError) Error() string {
	return fmt.Sprintf("momo request failed: %d: %s", e.StatusCode, e.Message)
}

type AccessToken struct {
	TokenType   string `json:"token_type"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

type AccountBalance struct {
	AvailableBalance string `json:"availableBalance"`
	Currency         string `json:"currency"`
}

type AccountHolderStatus struct {
	Result bool `json:"result"`
}

type RequestToPay struct {
	Amount       string `json:"amount"`
	Currency     string `json:"currency"`
	ExternalID   string `json:"externalId"`
	PayerMessage string `json:"payerMessage"`
	PayeeNote    string `json:"payeeNote"`
	Payer        Payer  `json:"payer"`
}

type Payer struct {
	PartyIDType string `json:"partyIdType"`
	PartyID     string `json:"partyId"`
}

type RequestToPayStatus struct {
	Amount       string `json:"amount"`
	Currency     string `json:"currency"`
	FinancialTxn string `json:"financialTransactionId"`
	ExternalID   string `json:"externalId"`
	Status       string `json:"status"`
	PayerMessage string `json:"payerMessage"`
	PayeeNote    string `json:"payeeNote"`
	Reason       string `json:"reason"`
	Payer        Payer  `json:"payer"`
}

func NewClient(config Config) (*Client, error) {
	if strings.TrimSpace(config.SubscriptionKey) == "" {
		return nil, errors.New("momo subscription key is required")
	}
	baseURL := strings.TrimSpace(config.BaseURL)
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	if _, err := url.ParseRequestURI(baseURL); err != nil {
		return nil, fmt.Errorf("invalid momo base url: %w", err)
	}
	targetEnv := strings.TrimSpace(config.TargetEnvironment)
	if targetEnv == "" {
		targetEnv = defaultTargetEnv
	}
	callbackHost := strings.TrimSpace(config.ProviderCallbackHost)
	if callbackHost == "" {
		callbackHost = defaultCallbackHost
	}
	client := config.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: defaultHTTPTimeout}
	}
	return &Client{
		baseURL:           strings.TrimRight(baseURL, "/"),
		targetEnvironment: targetEnv,
		subscriptionKey:   strings.TrimSpace(config.SubscriptionKey),
		apiUser:           strings.TrimSpace(config.APIUser),
		apiKey:            strings.TrimSpace(config.APIKey),
		callbackHost:      callbackHost,
		httpClient:        client,
	}, nil
}

func (c *Client) CreateAPIUser(ctx context.Context, referenceID string) error {
	if strings.TrimSpace(referenceID) == "" {
		return errors.New("reference id is required")
	}
	body := map[string]string{"providerCallbackHost": c.callbackHost}
	req, err := c.newJSONRequest(ctx, http.MethodPost, apiUserPath, body)
	if err != nil {
		return err
	}
	req.Header.Set("X-Reference-Id", referenceID)
	req.Header.Set("Cache-Control", "no-cache")
	return c.doNoContent(req, http.StatusCreated)
}

func (c *Client) CreateAPIKey(ctx context.Context, referenceID string) (string, error) {
	if strings.TrimSpace(referenceID) == "" {
		return "", errors.New("reference id is required")
	}
	req, err := c.newJSONRequest(ctx, http.MethodPost, apiUserPath+"/"+referenceID+"/apikey", map[string]string{})
	if err != nil {
		return "", err
	}
	var response struct {
		APIKey string `json:"apiKey"`
	}
	if err := c.doJSON(req, http.StatusCreated, &response); err != nil {
		return "", err
	}
	if response.APIKey == "" {
		return "", errors.New("momo response did not include apiKey")
	}
	return response.APIKey, nil
}

func (c *Client) CreateAccessToken(ctx context.Context) (AccessToken, error) {
	if strings.TrimSpace(c.apiUser) == "" || strings.TrimSpace(c.apiKey) == "" {
		return AccessToken{}, errors.New("api user and api key are required")
	}
	req, err := c.newJSONRequest(ctx, http.MethodPost, tokenPath, nil)
	if err != nil {
		return AccessToken{}, err
	}
	req.Header.Set("Authorization", "Basic "+basicToken(c.apiUser, c.apiKey))
	var response AccessToken
	if err := c.doJSON(req, http.StatusOK, &response); err != nil {
		return AccessToken{}, err
	}
	if response.AccessToken == "" {
		return AccessToken{}, errors.New("momo response did not include access_token")
	}
	return response, nil
}

func (c *Client) GetAccountBalance(ctx context.Context) (AccountBalance, error) {
	token, err := c.CreateAccessToken(ctx)
	if err != nil {
		return AccountBalance{}, err
	}
	req, err := c.newJSONRequest(ctx, http.MethodGet, accountBalancePath, nil)
	if err != nil {
		return AccountBalance{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("X-Target-Environment", c.targetEnvironment)
	var response AccountBalance
	if err := c.doJSON(req, http.StatusOK, &response); err != nil {
		return AccountBalance{}, err
	}
	return response, nil
}

func (c *Client) ValidateAccountHolder(ctx context.Context, partyIDType string, partyID string) (AccountHolderStatus, error) {
	token, err := c.CreateAccessToken(ctx)
	if err != nil {
		return AccountHolderStatus{}, err
	}
	partyIDType = strings.ToLower(strings.TrimSpace(partyIDType))
	partyID = strings.TrimSpace(partyID)
	if partyIDType == "" || partyID == "" {
		return AccountHolderStatus{}, errors.New("party id type and party id are required")
	}
	req, err := c.newJSONRequest(ctx, http.MethodGet, accountHolderBasePath+"/"+partyIDType+"/"+partyID+"/active", nil)
	if err != nil {
		return AccountHolderStatus{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("X-Target-Environment", c.targetEnvironment)
	var response AccountHolderStatus
	if err := c.doJSON(req, http.StatusOK, &response); err != nil {
		return AccountHolderStatus{}, err
	}
	return response, nil
}

func (c *Client) RequestToPay(ctx context.Context, referenceID string, payment RequestToPay) error {
	if strings.TrimSpace(referenceID) == "" {
		return errors.New("reference id is required")
	}
	token, err := c.CreateAccessToken(ctx)
	if err != nil {
		return err
	}
	req, err := c.newJSONRequest(ctx, http.MethodPost, requestToPayBasePath, payment)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("X-Reference-Id", referenceID)
	req.Header.Set("X-Target-Environment", c.targetEnvironment)
	return c.doNoContent(req, http.StatusAccepted)
}

func (c *Client) GetRequestToPay(ctx context.Context, referenceID string) (RequestToPayStatus, error) {
	if strings.TrimSpace(referenceID) == "" {
		return RequestToPayStatus{}, errors.New("reference id is required")
	}
	token, err := c.CreateAccessToken(ctx)
	if err != nil {
		return RequestToPayStatus{}, err
	}
	req, err := c.newJSONRequest(ctx, http.MethodGet, requestToPayBasePath+"/"+referenceID, nil)
	if err != nil {
		return RequestToPayStatus{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("X-Target-Environment", c.targetEnvironment)
	var response RequestToPayStatus
	if err := c.doJSON(req, http.StatusOK, &response); err != nil {
		return RequestToPayStatus{}, err
	}
	return response, nil
}

func (c *Client) newJSONRequest(ctx context.Context, method, path string, body any) (*http.Request, error) {
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(payload)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Ocp-Apim-Subscription-Key", c.subscriptionKey)
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}

func (c *Client) doNoContent(req *http.Request, expected int) error {
	return c.withRetry(req.Context(), req, func(next *http.Request) error {
		response, err := c.httpClient.Do(next)
		if err != nil {
			return err
		}
		defer response.Body.Close()
		if response.StatusCode != expected {
			return decodeError(response)
		}
		return nil
	})
}

func (c *Client) doJSON(req *http.Request, expected int, target any) error {
	return c.withRetry(req.Context(), req, func(next *http.Request) error {
		response, err := c.httpClient.Do(next)
		if err != nil {
			return err
		}
		defer response.Body.Close()
		if response.StatusCode != expected {
			return decodeError(response)
		}
		return json.NewDecoder(response.Body).Decode(target)
	})
}

func decodeError(response *http.Response) error {
	payload, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
	message := strings.TrimSpace(string(payload))
	if message == "" {
		message = http.StatusText(response.StatusCode)
	}
	return &requestError{StatusCode: response.StatusCode, Message: message}
}

func basicToken(user, key string) string {
	return base64.StdEncoding.EncodeToString([]byte(user + ":" + key))
}

func (c *Client) withRetry(ctx context.Context, template *http.Request, fn func(*http.Request) error) error {
	var lastErr error
	for attempt := 0; attempt < defaultRetryAttempts; attempt++ {
		req := template.Clone(ctx)
		if template.GetBody != nil {
			body, err := template.GetBody()
			if err != nil {
				return err
			}
			req.Body = body
		}
		lastErr = fn(req)
		if !shouldRetry(lastErr) || attempt == defaultRetryAttempts-1 {
			return lastErr
		}
		delay := time.Duration(attempt+1) * 250 * time.Millisecond
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
	return lastErr
}

func shouldRetry(err error) bool {
	var reqErr *requestError
	if !errors.As(err, &reqErr) {
		return false
	}
	switch reqErr.StatusCode {
	case http.StatusTooManyRequests, http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}
