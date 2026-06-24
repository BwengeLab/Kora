package insurance

import (
	"errors"
	"sort"

	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/reconciliation"
)

type ExceptionItem struct {
	EventID  string            `json:"event_id"`
	State    string            `json:"state"`
	Reason   string            `json:"reason"`
	Evidence evidence.Evidence `json:"evidence"`
}

type ExceptionReport struct {
	OrganizationID     string          `json:"organization_id"`
	MatchedPremiums    []ExceptionItem `json:"matched_premiums"`
	UnmatchedPayments  []ExceptionItem `json:"unmatched_payments"`
	UnsupportedClaims  []ExceptionItem `json:"unsupported_claims"`
	DuplicateItems     []ExceptionItem `json:"duplicate_items"`
	ApprovalTaskIDs    []string        `json:"approval_task_ids"`
	ReconciliationRule string          `json:"reconciliation_rule"`
	PolicyVersion      int             `json:"policy_version"`
}

func BuildExceptionReport(
	organizationID string,
	mappings []Mapping,
	reconciled reconciliation.Result,
) (ExceptionReport, error) {
	if organizationID == "" {
		return ExceptionReport{}, errors.New("organization id is required")
	}
	events := map[string]eventledger.Event{}
	premiumEvents := map[string]bool{}
	unsupportedClaims := map[string]bool{}
	approvalTasks := map[string]bool{}
	for _, mapping := range mappings {
		if mapping.OrganizationID != organizationID {
			return ExceptionReport{}, errors.New("cross-tenant insurance mapping denied")
		}
		for _, event := range mapping.Events {
			events[event.ID] = event
			if mapping.RecordType == Premium {
				premiumEvents[event.ID] = true
			}
			if mapping.RecordType == Claim && contains(mapping.QualityFlags, "unsupported-claim") {
				unsupportedClaims[event.ID] = true
			}
		}
		if taskID := mapping.RelatedIDs["approval_task_id"]; taskID != "" {
			approvalTasks[taskID] = true
		}
	}

	report := ExceptionReport{
		OrganizationID:     organizationID,
		ReconciliationRule: reconciled.PolicyID,
		PolicyVersion:      reconciled.PolicyVersion,
	}
	for _, candidate := range reconciled.Candidates {
		if candidate.State == reconciliation.Matched &&
			(premiumEvents[candidate.LeftEventID] || premiumEvents[candidate.RightEventID]) {
			event := firstEvent(events, candidate.LeftEventID, candidate.RightEventID)
			report.MatchedPremiums = append(report.MatchedPremiums, ExceptionItem{
				EventID:  event.ID,
				State:    string(candidate.State),
				Reason:   candidate.Reason,
				Evidence: event.Evidence,
			})
		}
		if candidate.State == reconciliation.Duplicate {
			event := events[candidate.LeftEventID]
			report.DuplicateItems = append(report.DuplicateItems, ExceptionItem{
				EventID: event.ID, State: string(candidate.State), Reason: candidate.Reason, Evidence: event.Evidence,
			})
		}
	}
	for _, exception := range reconciled.Exceptions {
		event := events[exception.EventID]
		if exception.State == reconciliation.Unmatched &&
			(event.Type == eventledger.PaymentReceived || event.Type == eventledger.PaymentSent) {
			report.UnmatchedPayments = append(report.UnmatchedPayments, ExceptionItem{
				EventID: event.ID, State: string(exception.State), Reason: exception.Reason, Evidence: exception.Evidence,
			})
		}
	}
	for eventID := range unsupportedClaims {
		event := events[eventID]
		report.UnsupportedClaims = append(report.UnsupportedClaims, ExceptionItem{
			EventID:  event.ID,
			State:    "NEEDS_APPROVAL",
			Reason:   "claim has no linked approval task",
			Evidence: event.Evidence,
		})
	}
	for taskID := range approvalTasks {
		report.ApprovalTaskIDs = append(report.ApprovalTaskIDs, taskID)
	}
	sortReport(&report)
	return report, nil
}

func firstEvent(events map[string]eventledger.Event, ids ...string) eventledger.Event {
	for _, id := range ids {
		if event, ok := events[id]; ok {
			return event
		}
	}
	return eventledger.Event{}
}

func contains(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func sortReport(report *ExceptionReport) {
	sort.Slice(report.MatchedPremiums, func(i, j int) bool { return report.MatchedPremiums[i].EventID < report.MatchedPremiums[j].EventID })
	sort.Slice(report.UnmatchedPayments, func(i, j int) bool { return report.UnmatchedPayments[i].EventID < report.UnmatchedPayments[j].EventID })
	sort.Slice(report.UnsupportedClaims, func(i, j int) bool { return report.UnsupportedClaims[i].EventID < report.UnsupportedClaims[j].EventID })
	sort.Slice(report.DuplicateItems, func(i, j int) bool { return report.DuplicateItems[i].EventID < report.DuplicateItems[j].EventID })
	sort.Strings(report.ApprovalTaskIDs)
}
