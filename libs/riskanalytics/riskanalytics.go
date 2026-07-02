package riskanalytics

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
	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/financeanalytics"
	"github.com/kora-finance/kora/libs/workflow"
)

type Severity string

const (
	Low      Severity = "LOW"
	Medium   Severity = "MEDIUM"
	High     Severity = "HIGH"
	Critical Severity = "CRITICAL"
)

type RiskFlag struct {
	ID             string            `json:"id"`
	OrganizationID string            `json:"organization_id"`
	Type           string            `json:"type"`
	Severity       Severity          `json:"severity"`
	SourceID       string            `json:"source_id"`
	Reason         string            `json:"reason"`
	Evidence       evidence.Evidence `json:"evidence"`
	CreatedAt      time.Time         `json:"created_at"`
}

type Input struct {
	OrganizationID                    string                   `json:"organization_id"`
	AsOf                              time.Time                `json:"as_of"`
	SupplierPriceIncreaseThresholdBps int                      `json:"supplier_price_increase_threshold_bps"`
	MarginDropThresholdBps            int                      `json:"margin_drop_threshold_bps"`
	Events                            []eventledger.EventView  `json:"events"`
	Entities                          []entities.Entity        `json:"entities"`
	ApprovalTasks                     []workflow.Task          `json:"approval_tasks"`
	CurrentReport                     financeanalytics.Report  `json:"current_report"`
	PriorReport                       *financeanalytics.Report `json:"prior_report,omitempty"`
}

func Detect(actor access.Actor, input Input) ([]RiskFlag, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: input.OrganizationID}, access.PermissionReadReports); err != nil {
		return nil, err
	}
	if input.OrganizationID == "" || input.AsOf.IsZero() || input.SupplierPriceIncreaseThresholdBps <= 0 || input.MarginDropThresholdBps <= 0 {
		return nil, errors.New("organization, as-of date, and positive anomaly thresholds are required")
	}
	var flags []RiskFlag
	events := map[string]eventledger.EventView{}
	approvedSources := map[string]bool{}
	for _, task := range input.ApprovalTasks {
		if task.OrganizationID != input.OrganizationID {
			return nil, errors.New("cross-tenant approval task denied")
		}
		if task.State == workflow.Approved || task.State == workflow.Executed {
			approvedSources[task.Evidence.SourceRecordID] = true
		}
	}
	for _, view := range input.Events {
		if view.OrganizationID != input.OrganizationID {
			return nil, errors.New("cross-tenant risk event denied")
		}
		if err := eventledger.Validate(view.Event); err != nil {
			return nil, err
		}
		events[view.ID] = view
		if view.EffectiveStatus != eventledger.Active {
			continue
		}
		if view.Type == eventledger.PaymentSent && !approvedSources[view.Evidence.SourceRecordID] {
			flags = append(flags, flag(input.OrganizationID, "MISSING_APPROVAL", High, view.ID, "payment does not have a linked approved or executed task", view.Evidence))
		}
		if view.Type == eventledger.PaymentSent && unsupportedPayment(view) {
			flags = append(flags, flag(input.OrganizationID, "UNSUPPORTED_PAYMENT", High, view.ID, "payment lacks document, contract, obligation, purchase order, or receipt link", view.Evidence))
		}
	}
	flags = append(flags, duplicateVendorFlags(input.OrganizationID, input.Entities)...)
	flags = append(flags, supplierPriceHikeFlags(input.OrganizationID, input.Events, input.SupplierPriceIncreaseThresholdBps)...)
	if input.PriorReport != nil {
		flags = append(flags, marginDropFlag(input.OrganizationID, input.CurrentReport, *input.PriorReport, input.MarginDropThresholdBps)...)
	}
	sort.SliceStable(flags, func(i, j int) bool {
		if flags[i].Severity == flags[j].Severity {
			return flags[i].ID < flags[j].ID
		}
		return severityRank(flags[i].Severity) > severityRank(flags[j].Severity)
	})
	return flags, nil
}

func duplicateVendorFlags(organizationID string, values []entities.Entity) []RiskFlag {
	byName := map[string][]entities.Entity{}
	for _, entity := range values {
		if entity.OrganizationID != organizationID || entity.Type != entities.ExternalParty {
			continue
		}
		role := strings.ToUpper(strings.TrimSpace(entity.Attributes["role"]))
		if role != "SUPPLIER" && role != "VENDOR" {
			continue
		}
		key := normalize(entity.DisplayName)
		if key != "" {
			byName[key] = append(byName[key], entity)
		}
	}
	var flags []RiskFlag
	for _, group := range byName {
		if len(group) < 2 {
			continue
		}
		proof := evidence.Evidence{SourceDocumentID: "entity-resolution", SourceRecordID: group[0].ID, IngestionBatchID: "entity-resolution", ExtractionVersionID: "entity-resolution", Reason: "duplicate supplier entity evidence", ConfidenceScore: 0.80}
		flags = append(flags, flag(organizationID, "DUPLICATE_VENDOR", Medium, group[0].ID, fmt.Sprintf("%d supplier records share the same normalized display name", len(group)), proof))
	}
	return flags
}

func supplierPriceHikeFlags(organizationID string, views []eventledger.EventView, thresholdBps int) []RiskFlag {
	byKey := map[string][]eventledger.EventView{}
	for _, view := range views {
		if view.OrganizationID != organizationID || view.EffectiveStatus != eventledger.Active || view.Type != eventledger.BillReceived {
			continue
		}
		key := strings.Join([]string{view.ExternalPartyID, normalize(view.Attributes["item_key"])}, "\x00")
		if strings.TrimSpace(view.ExternalPartyID) == "" || strings.TrimSpace(view.Attributes["item_key"]) == "" {
			continue
		}
		byKey[key] = append(byKey[key], view)
	}
	var flags []RiskFlag
	for _, group := range byKey {
		sort.SliceStable(group, func(i, j int) bool { return group[i].Evidence.OccurredOn < group[j].Evidence.OccurredOn })
		for i := 1; i < len(group); i++ {
			prev := abs(group[i-1].Evidence.AmountMinor)
			curr := abs(group[i].Evidence.AmountMinor)
			if prev == 0 || curr <= prev {
				continue
			}
			increaseBps := int((curr - prev) * 10_000 / prev)
			if increaseBps >= thresholdBps {
				flags = append(flags, flag(organizationID, "SUPPLIER_PRICE_HIKE", High, group[i].ID, fmt.Sprintf("supplier item price increased by %d basis points", increaseBps), group[i].Evidence))
			}
		}
	}
	return flags
}

func marginDropFlag(organizationID string, current, prior financeanalytics.Report, thresholdBps int) []RiskFlag {
	if current.OrganizationID != organizationID || prior.OrganizationID != organizationID {
		return nil
	}
	drop := prior.ProfitAndLoss.GrossMarginBasisPoints - current.ProfitAndLoss.GrossMarginBasisPoints
	if drop < thresholdBps {
		return nil
	}
	proof := firstEvidence(current.ProfitAndLoss.Evidence)
	if proof.SourceDocumentID == "" {
		return nil
	}
	return []RiskFlag{flag(organizationID, "MARGIN_DROP", High, current.ID, fmt.Sprintf("gross margin dropped by %d basis points versus prior report", drop), proof)}
}

func unsupportedPayment(view eventledger.EventView) bool {
	for _, key := range []string{"document_link", "contract_link", "obligation_link", "purchase_order_id", "receipt_link"} {
		if strings.TrimSpace(view.Attributes[key]) != "" {
			return false
		}
	}
	return true
}

func flag(org, kind string, severity Severity, sourceID, reason string, proof evidence.Evidence) RiskFlag {
	return RiskFlag{ID: stableID(org, kind, sourceID, proof.SourceDocumentID, proof.SourceRecordID), OrganizationID: org, Type: kind, Severity: severity, SourceID: sourceID, Reason: reason, Evidence: proof, CreatedAt: time.Now().UTC()}
}

func firstEvidence(values []evidence.Evidence) evidence.Evidence {
	if len(values) == 0 {
		return evidence.Evidence{}
	}
	values = append([]evidence.Evidence(nil), values...)
	sort.Slice(values, func(i, j int) bool { return values[i].SourceRecordID < values[j].SourceRecordID })
	return values[0]
}

func stableID(values ...string) string {
	payload, err := json.Marshal(values)
	if err != nil {
		panic(err)
	}
	sum := sha256.Sum256(payload)
	return "risk_" + hex.EncodeToString(sum[:10])
}

func normalize(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(value)), ""))
}

func abs(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}

func severityRank(value Severity) int {
	switch value {
	case Critical:
		return 4
	case High:
		return 3
	case Medium:
		return 2
	default:
		return 1
	}
}
