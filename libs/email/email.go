package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Config struct {
	APIKey   string
	FromAddr string
	FromName string
}

type Sender struct {
	cfg    Config
	client *http.Client
}

func NewSender(cfg Config) *Sender {
	if cfg.FromName == "" {
		cfg.FromName = "Kora Finance"
	}
	if cfg.FromAddr == "" {
		cfg.FromAddr = cfg.APIKey
	}
	return &Sender{
		cfg:    cfg,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

type mailerSendPayload struct {
	From    mailerSendFrom    `json:"from"`
	To      []mailerSendTo    `json:"to"`
	Subject string            `json:"subject"`
	HTML    string            `json:"html"`
	Text    string            `json:"text,omitempty"`
}

type mailerSendFrom struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type mailerSendTo struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

func (s *Sender) Send(to, subject, bodyHTML string) error {
	payload := mailerSendPayload{
		From: mailerSendFrom{
			Email: s.cfg.FromAddr,
			Name:  s.cfg.FromName,
		},
		To: []mailerSendTo{
			{Email: to},
		},
		Subject: subject,
		HTML:    bodyHTML,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	req, err := http.NewRequest("POST", "https://api.mailersend.com/v1/email", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.cfg.APIKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("api call: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode > 299 {
		var errResp bytes.Buffer
		errResp.ReadFrom(resp.Body)
		return fmt.Errorf("mailersend api %d: %s", resp.StatusCode, strings.TrimSpace(errResp.String()))
	}
	return nil
}
