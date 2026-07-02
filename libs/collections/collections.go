package collections

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
)

type CaseState string

const (
	Open      CaseState = "OPEN"
	InReview  CaseState = "IN_REVIEW"
	Reminder  CaseState = "REMINDER_DRAFTED"
	Sent      CaseState = "REMINDER_SENT"
	Escalated CaseState = "ESCALATED"
	Closed    CaseState = "CLOSED"
)

type Input struct {
	OrganizationID    string                  `json:"organization_id"`
	AsOf              time.Time               `json:"as_of"`
	ReminderAfterDays int                     `json:"reminder_after_days"`
	EscalateAfterDays int                     `json:"escalate_after_days"`
	Events            []eventledger.EventView `json:"events"`
	MatchedEventIDs   []string                `json:"matched_event_ids"`
}

type Case struct {
	ID              string            `json:"id"`
	OrganizationID  string            `json:"organization_id"`
	InvoiceEventID  string            `json:"invoice_event_id"`
	ExternalPartyID string            `json:"external_party_id,omitempty"`
	AmountMinor     int64             `json:"amount_minor"`
	Currency        string            `json:"currency"`
	DueDate         string            `json:"due_date"`
	DaysOverdue     int               `json:"days_overdue"`
	State           CaseState         `json:"state"`
	SuggestedTone   string            `json:"suggested_tone"`
	DraftMessage    string            `json:"draft_message"`
	Evidence        evidence.Evidence `json:"evidence"`
	CreatedAt       time.Time         `json:"created_at"`
}

type SendReceipt struct {
	CaseID          string            `json:"case_id"`
	OrganizationID  string            `json:"organization_id"`
	SentByUserID    string            `json:"sent_by_user_id"`
	SentAt          time.Time         `json:"sent_at"`
	Evidence        evidence.Evidence `json:"evidence"`
	DeliveryChannel string            `json:"delivery_channel"`
	Message         string            `json:"message"`
}

func BuildCases(actor access.Actor, input Input) ([]Case, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: input.OrganizationID}, access.PermissionReadReports); err != nil {
		return nil, err
	}
	if input.OrganizationID == "" || input.AsOf.IsZero() || input.ReminderAfterDays < 0 || input.EscalateAfterDays < input.ReminderAfterDays {
		return nil, errors.New("organization, as-of date, and valid collection thresholds are required")
	}
	matched := map[string]bool{}
	for _, id := range input.MatchedEventIDs {
		matched[id] = true
	}
	var cases []Case
	for _, view := range input.Events {
		if view.OrganizationID != input.OrganizationID {
			return nil, errors.New("cross-tenant collection event denied")
		}
		if view.Type != eventledger.InvoiceIssued || view.EffectiveStatus != eventledger.Active || matched[view.ID] {
			continue
		}
		if err := eventledger.Validate(view.Event); err != nil {
			return nil, err
		}
		due, err := time.Parse("2006-01-02", strings.TrimSpace(view.Attributes["due_date"]))
		if err != nil {
			continue
		}
		daysOverdue := int(dateOnly(input.AsOf).Sub(due).Hours() / 24)
		if daysOverdue < input.ReminderAfterDays {
			continue
		}
		state := Reminder
		tone := "polite"
		if daysOverdue >= input.EscalateAfterDays {
			state = Escalated
			tone = "firm"
		}
		cases = append(cases, Case{
			ID:              stableID(input.OrganizationID, view.ID, view.Attributes["due_date"], input.AsOf.Format("2006-01-02")),
			OrganizationID:  input.OrganizationID,
			InvoiceEventID:  view.ID,
			ExternalPartyID: view.ExternalPartyID,
			AmountMinor:     abs(view.Evidence.AmountMinor),
			Currency:        view.Evidence.Currency,
			DueDate:         due.Format("2006-01-02"),
			DaysOverdue:     daysOverdue,
			State:           state,
			SuggestedTone:   tone,
			DraftMessage:    draft(view, daysOverdue, tone),
			Evidence:        view.Evidence,
			CreatedAt:       time.Now().UTC(),
		})
	}
	sort.SliceStable(cases, func(i, j int) bool {
		if cases[i].DaysOverdue == cases[j].DaysOverdue {
			return cases[i].InvoiceEventID < cases[j].InvoiceEventID
		}
		return cases[i].DaysOverdue > cases[j].DaysOverdue
	})
	return cases, nil
}

func SendReminder(actor access.Actor, human bool, c Case, proof evidence.Evidence, channel string) (SendReceipt, error) {
	if !human {
		return SendReceipt{}, errors.New("agents cannot send collection reminders")
	}
	if err := access.Authorize(actor, access.Resource{OrganizationID: c.OrganizationID}, access.PermissionSendCollections); err != nil {
		return SendReceipt{}, err
	}
	if c.ID == "" || c.DraftMessage == "" || c.State == Closed {
		return SendReceipt{}, errors.New("open collection case with draft message is required")
	}
	if err := evidence.ValidateProvenance(proof); err != nil {
		return SendReceipt{}, err
	}
	if strings.TrimSpace(channel) == "" {
		return SendReceipt{}, errors.New("delivery channel is required")
	}
	return SendReceipt{CaseID: c.ID, OrganizationID: c.OrganizationID, SentByUserID: actor.UserID, SentAt: time.Now().UTC(), Evidence: proof, DeliveryChannel: strings.TrimSpace(channel), Message: c.DraftMessage}, nil
}

func draft(view eventledger.EventView, daysOverdue int, tone string) string {
	party := strings.TrimSpace(view.Attributes["party_name"])
	if party == "" {
		party = "Customer"
	}
	return fmt.Sprintf("Hello %s, our records show invoice %s is %d days overdue. Please review the attached evidence and confirm the expected payment date.", party, view.Evidence.TransactionReference, daysOverdue)
}

func stableID(values ...string) string {
	payload, err := json.Marshal(values)
	if err != nil {
		panic(err)
	}
	sum := sha256.Sum256(payload)
	return "collection_" + hex.EncodeToString(sum[:10])
}

func dateOnly(value time.Time) time.Time {
	y, m, d := value.UTC().Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func abs(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}
