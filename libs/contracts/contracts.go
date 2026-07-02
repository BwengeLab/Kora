package contracts

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
)

type Contract struct {
	ID              string            `json:"id"`
	OrganizationID  string            `json:"organization_id"`
	EventID         string            `json:"event_id"`
	ExternalPartyID string            `json:"external_party_id,omitempty"`
	ContractNumber  string            `json:"contract_number"`
	StartDate       string            `json:"start_date"`
	EndDate         string            `json:"end_date"`
	RenewalDate     string            `json:"renewal_date,omitempty"`
	Evidence        evidence.Evidence `json:"evidence"`
	Obligations     []Obligation      `json:"obligations"`
}

type Obligation struct {
	ID              string            `json:"id"`
	OrganizationID  string            `json:"organization_id"`
	EventID         string            `json:"event_id"`
	ContractID      string            `json:"contract_id,omitempty"`
	ExternalPartyID string            `json:"external_party_id,omitempty"`
	DueDate         string            `json:"due_date,omitempty"`
	AmountMinor     int64             `json:"amount_minor"`
	Currency        string            `json:"currency"`
	Description     string            `json:"description"`
	Evidence        evidence.Evidence `json:"evidence"`
}

type RenewalAlert struct {
	ContractID       string            `json:"contract_id"`
	OrganizationID   string            `json:"organization_id"`
	DaysUntilRenewal int               `json:"days_until_renewal"`
	AlertDate        string            `json:"alert_date"`
	Evidence         evidence.Evidence `json:"evidence"`
}

type MismatchFlag struct {
	EventID        string            `json:"event_id"`
	OrganizationID string            `json:"organization_id"`
	Type           string            `json:"type"`
	Reason         string            `json:"reason"`
	Evidence       evidence.Evidence `json:"evidence"`
}

type Input struct {
	OrganizationID   string                  `json:"organization_id"`
	AsOf             time.Time               `json:"as_of"`
	RenewalAlertDays int                     `json:"renewal_alert_days"`
	Events           []eventledger.EventView `json:"events"`
}

type Report struct {
	OrganizationID string         `json:"organization_id"`
	Contracts      []Contract     `json:"contracts"`
	Obligations    []Obligation   `json:"obligations"`
	RenewalAlerts  []RenewalAlert `json:"renewal_alerts"`
	MismatchFlags  []MismatchFlag `json:"mismatch_flags"`
}

func Analyze(actor access.Actor, input Input) (Report, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: input.OrganizationID}, access.PermissionManageContracts); err != nil {
		return Report{}, err
	}
	if input.OrganizationID == "" || input.AsOf.IsZero() || input.RenewalAlertDays < 0 {
		return Report{}, errors.New("organization, as-of date, and renewal alert window are required")
	}
	report := Report{OrganizationID: input.OrganizationID}
	contractByLink := map[string]*Contract{}
	for _, view := range input.Events {
		if view.OrganizationID != input.OrganizationID {
			return Report{}, errors.New("cross-tenant contract event denied")
		}
		if err := eventledger.Validate(view.Event); err != nil {
			return Report{}, err
		}
		if view.EffectiveStatus != eventledger.Active {
			continue
		}
		switch view.Type {
		case eventledger.ContractSigned:
			contract, err := contractFrom(view)
			if err != nil {
				return Report{}, err
			}
			report.Contracts = append(report.Contracts, contract)
			contractByLink[contract.ID] = &report.Contracts[len(report.Contracts)-1]
		case eventledger.ObligationCreated:
			obligation := obligationFrom(view)
			report.Obligations = append(report.Obligations, obligation)
		case eventledger.PaymentSent, eventledger.PaymentReceived:
			if missingContractLink(view) {
				report.MismatchFlags = append(report.MismatchFlags, MismatchFlag{EventID: view.ID, OrganizationID: input.OrganizationID, Type: "PAYMENT_WITHOUT_CONTRACT_OR_PO", Reason: "payment lacks contract_link, obligation_link, purchase_order_id, or document_link", Evidence: view.Evidence})
			}
		}
	}
	for index := range report.Obligations {
		if c := contractByLink[report.Obligations[index].ContractID]; c != nil {
			c.Obligations = append(c.Obligations, report.Obligations[index])
		}
	}
	for _, c := range report.Contracts {
		renewalDate, err := parseOptional(c.RenewalDate)
		if err != nil {
			return Report{}, err
		}
		if renewalDate.IsZero() {
			renewalDate, err = parseOptional(c.EndDate)
			if err != nil {
				return Report{}, err
			}
		}
		if !renewalDate.IsZero() {
			days := int(dateOnly(renewalDate).Sub(dateOnly(input.AsOf)).Hours() / 24)
			if days >= 0 && days <= input.RenewalAlertDays {
				report.RenewalAlerts = append(report.RenewalAlerts, RenewalAlert{ContractID: c.ID, OrganizationID: input.OrganizationID, DaysUntilRenewal: days, AlertDate: renewalDate.Format("2006-01-02"), Evidence: c.Evidence})
			}
		}
	}
	sort.SliceStable(report.Contracts, func(i, j int) bool { return report.Contracts[i].ID < report.Contracts[j].ID })
	sort.SliceStable(report.Obligations, func(i, j int) bool { return report.Obligations[i].ID < report.Obligations[j].ID })
	sort.SliceStable(report.MismatchFlags, func(i, j int) bool { return report.MismatchFlags[i].EventID < report.MismatchFlags[j].EventID })
	return report, nil
}

func contractFrom(view eventledger.EventView) (Contract, error) {
	number := first(view.Attributes["contract_number"], view.Evidence.TransactionReference)
	start := strings.TrimSpace(view.Attributes["start_date"])
	end := strings.TrimSpace(view.Attributes["end_date"])
	if number == "" || start == "" || end == "" {
		return Contract{}, errors.New("contract events require number, start date, and end date")
	}
	if _, err := parseRequired(start); err != nil {
		return Contract{}, err
	}
	if _, err := parseRequired(end); err != nil {
		return Contract{}, err
	}
	return Contract{ID: stableID(view.OrganizationID, number), OrganizationID: view.OrganizationID, EventID: view.ID, ExternalPartyID: view.ExternalPartyID, ContractNumber: number, StartDate: start, EndDate: end, RenewalDate: strings.TrimSpace(view.Attributes["renewal_date"]), Evidence: view.Evidence}, nil
}

func obligationFrom(view eventledger.EventView) Obligation {
	return Obligation{ID: stableID(view.OrganizationID, view.ID), OrganizationID: view.OrganizationID, EventID: view.ID, ContractID: strings.TrimSpace(view.Attributes["contract_link"]), ExternalPartyID: view.ExternalPartyID, DueDate: strings.TrimSpace(view.Attributes["due_date"]), AmountMinor: abs(view.Evidence.AmountMinor), Currency: view.Evidence.Currency, Description: strings.TrimSpace(view.Attributes["description"]), Evidence: view.Evidence}
}

func missingContractLink(view eventledger.EventView) bool {
	for _, key := range []string{"contract_link", "obligation_link", "purchase_order_id", "document_link"} {
		if strings.TrimSpace(view.Attributes[key]) != "" {
			return false
		}
	}
	return true
}

func first(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func parseRequired(value string) (time.Time, error) { return time.Parse("2006-01-02", value) }

func parseOptional(value string) (time.Time, error) {
	if strings.TrimSpace(value) == "" {
		return time.Time{}, nil
	}
	return parseRequired(strings.TrimSpace(value))
}

func dateOnly(value time.Time) time.Time {
	y, m, d := value.UTC().Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func stableID(values ...string) string {
	payload, err := json.Marshal(values)
	if err != nil {
		panic(err)
	}
	sum := sha256.Sum256(payload)
	return "contract_" + hex.EncodeToString(sum[:10])
}

func abs(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}
