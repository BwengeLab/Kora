package momo

import (
	"errors"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/connectors"
	"github.com/kora-finance/kora/libs/ingestion"
)

type TransactionPayload struct {
	ReferenceID        string `json:"reference_id"`
	FinancialTxnID     string `json:"financial_transaction_id"`
	ExternalID         string `json:"external_id"`
	Status             string `json:"status"`
	Reason             string `json:"reason"`
	Amount             string `json:"amount"`
	Currency           string `json:"currency"`
	PayerMSISDN        string `json:"payer_msisdn"`
	PayerName          string `json:"payer_name"`
	PayerMessage       string `json:"payer_message"`
	PayeeNote          string `json:"payee_note"`
	OccurredOn         string `json:"occurred_on"`
	CollectionCategory string `json:"collection_category"`
}

func MapTransactionToRecord(payload TransactionPayload) (connectors.Record, error) {
	if strings.TrimSpace(payload.ReferenceID) == "" {
		return connectors.Record{}, errors.New("reference_id is required")
	}
	if strings.TrimSpace(payload.Amount) == "" || strings.TrimSpace(payload.Currency) == "" {
		return connectors.Record{}, errors.New("amount and currency are required")
	}
	date := strings.TrimSpace(payload.OccurredOn)
	if date == "" {
		date = time.Now().UTC().Format("2006-01-02")
	} else if parsed, err := parseDate(date); err == nil {
		date = parsed
	}
	recordID := strings.TrimSpace(payload.FinancialTxnID)
	if recordID == "" {
		recordID = strings.TrimSpace(payload.ReferenceID)
	}
	partyName := firstNonEmpty(payload.PayerName, payload.PayerMSISDN)
	category := firstNonEmpty(payload.CollectionCategory, "request_to_pay")
	return connectors.Record{
		SourceRecordID: recordID,
		RecordType:     "payment",
		Confidence:     0.98,
		Fields: map[string]string{
			"reference":                firstNonEmpty(payload.FinancialTxnID, payload.ReferenceID),
			"date":                     date,
			"amount":                   strings.TrimSpace(payload.Amount),
			"currency":                 strings.TrimSpace(payload.Currency),
			"party_name":               partyName,
			"account_number":           strings.TrimSpace(payload.PayerMSISDN),
			"external_id":              strings.TrimSpace(payload.ExternalID),
			"momo_reference_id":        strings.TrimSpace(payload.ReferenceID),
			"momo_financial_txn_id":    strings.TrimSpace(payload.FinancialTxnID),
			"momo_status":              strings.TrimSpace(payload.Status),
			"momo_reason":              strings.TrimSpace(payload.Reason),
			"momo_payer_message":       strings.TrimSpace(payload.PayerMessage),
			"momo_payee_note":          strings.TrimSpace(payload.PayeeNote),
			"momo_collection_category": category,
		},
		Location: ingestion.SourceLocation{RowNumber: 1},
	}, nil
}

func parseDate(value string) (string, error) {
	formats := []string{
		time.RFC3339,
		"2006-01-02",
		"2006-01-02 15:04:05",
	}
	for _, format := range formats {
		if parsed, err := time.Parse(format, value); err == nil {
			return parsed.UTC().Format("2006-01-02"), nil
		}
	}
	return "", errors.New("unsupported date format")
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
