package reporting

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/audit"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/libs/reconciliation"
	"github.com/kora-finance/kora/libs/workflow"
)

type ImpactType string

const (
	MoneyRecovered           ImpactType = "MONEY_RECOVERED"
	DuplicatePaymentAvoided  ImpactType = "DUPLICATE_PAYMENT_AVOIDED"
	UnsupportedPaymentCaught ImpactType = "UNSUPPORTED_PAYMENT_CAUGHT"
	LateInvoiceCollected     ImpactType = "LATE_INVOICE_COLLECTED"
	HoursSaved               ImpactType = "HOURS_SAVED"
	MissingDocumentFixed     ImpactType = "MISSING_DOCUMENT_FIXED"
)

type EfficiencyBenchmark struct {
	ID            string            `json:"id"`
	Version       int               `json:"version"`
	ManualMinutes int64             `json:"manual_minutes"`
	ApprovedBy    string            `json:"approved_by"`
	Evidence      evidence.Evidence `json:"evidence"`
}

// Outcome contains links to trusted source records, never a caller-supplied ROI amount.
// The engine derives money and time from ledger postings and measured timestamps.
type Outcome struct {
	Type              ImpactType          `json:"type"`
	SourceEventID     string              `json:"source_event_id"`
	ApprovalTaskID    string              `json:"approval_task_id,omitempty"`
	PostingGroupID    string              `json:"posting_group_id,omitempty"`
	AuditEntryID      string              `json:"audit_entry_id"`
	ProcessingStarted time.Time           `json:"processing_started_at,omitempty"`
	ProcessingEnded   time.Time           `json:"processing_ended_at,omitempty"`
	Benchmark         EfficiencyBenchmark `json:"benchmark,omitempty"`
}

type Input struct {
	OrganizationID string                `json:"organization_id"`
	Events         []eventledger.Event   `json:"events"`
	ApprovalTasks  []workflow.Task       `json:"approval_tasks"`
	PostingGroups  []ledger.Group        `json:"posting_groups"`
	Reconciliation reconciliation.Result `json:"reconciliation"`
	AuditEntries   []audit.Entry         `json:"audit_entries"`
	IncludeROI     bool                  `json:"include_roi"`
	Outcomes       []Outcome             `json:"outcomes"`
}

type CurrencyLedger struct {
	Currency         string `json:"currency"`
	DebitMinor       int64  `json:"debit_minor"`
	CreditMinor      int64  `json:"credit_minor"`
	PostingGroups    int    `json:"posting_groups"`
	ReversalGroups   int    `json:"reversal_groups"`
	LedgerEntryCount int    `json:"ledger_entry_count"`
}

type ExceptionItem struct {
	EventID  string               `json:"event_id"`
	State    reconciliation.State `json:"state"`
	Reason   string               `json:"reason"`
	Evidence evidence.Evidence    `json:"evidence"`
}

type ROIMetric struct {
	Type         ImpactType          `json:"type"`
	Currency     string              `json:"currency,omitempty"`
	Count        int                 `json:"count"`
	AmountMinor  int64               `json:"amount_minor,omitempty"`
	MinutesSaved int64               `json:"minutes_saved,omitempty"`
	SourceEvents []string            `json:"source_event_ids"`
	Evidence     []evidence.Evidence `json:"evidence"`
}

type Report struct {
	ID                   string                 `json:"id"`
	OrganizationID       string                 `json:"organization_id"`
	GeneratedAt          time.Time              `json:"generated_at"`
	Ledger               []CurrencyLedger       `json:"ledger"`
	ApprovalStates       map[workflow.State]int `json:"approval_states"`
	Exceptions           []ExceptionItem        `json:"exceptions"`
	VerifiedAuditEntries int                    `json:"verified_audit_entries"`
	ROI                  []ROIMetric            `json:"roi,omitempty"`
}

func Generate(actor access.Actor, input Input) (Report, error) {
	if strings.TrimSpace(input.OrganizationID) == "" {
		return Report{}, errors.New("organization id is required")
	}
	resource := access.Resource{OrganizationID: input.OrganizationID}
	if err := access.Authorize(actor, resource, access.PermissionReadReports); err != nil {
		return Report{}, err
	}
	if input.IncludeROI {
		if err := access.Authorize(actor, resource, access.PermissionReadROI); err != nil {
			return Report{}, err
		}
	} else if len(input.Outcomes) != 0 {
		return Report{}, errors.New("ROI outcomes require include_roi")
	}

	index, err := validateAndIndex(input)
	if err != nil {
		return Report{}, err
	}
	report := Report{
		ID:                   reportID(input, index),
		OrganizationID:       input.OrganizationID,
		GeneratedAt:          time.Now().UTC(),
		ApprovalStates:       map[workflow.State]int{},
		VerifiedAuditEntries: len(index.audits),
	}
	report.Ledger = summarizeLedger(input.PostingGroups)
	for _, task := range input.ApprovalTasks {
		report.ApprovalStates[task.State]++
	}
	for _, item := range input.Reconciliation.Exceptions {
		report.Exceptions = append(report.Exceptions, ExceptionItem{
			EventID: item.EventID, State: item.State, Reason: item.Reason, Evidence: item.Evidence,
		})
	}
	sort.Slice(report.Exceptions, func(i, j int) bool { return report.Exceptions[i].EventID < report.Exceptions[j].EventID })
	if input.IncludeROI {
		report.ROI, err = deriveROI(input, index)
		if err != nil {
			return Report{}, err
		}
	}
	return report, nil
}

type indexes struct {
	events     map[string]eventledger.Event
	tasks      map[string]workflow.Task
	groups     map[string]ledger.Group
	audits     map[string]audit.Entry
	candidates map[string]reconciliation.Candidate
}

func validateAndIndex(input Input) (indexes, error) {
	idx := indexes{
		events: map[string]eventledger.Event{}, tasks: map[string]workflow.Task{},
		groups: map[string]ledger.Group{}, audits: map[string]audit.Entry{},
		candidates: map[string]reconciliation.Candidate{},
	}
	for _, event := range input.Events {
		if event.OrganizationID != input.OrganizationID {
			return idx, errors.New("cross-tenant report event denied")
		}
		if err := evidence.ValidateProvenance(event.Evidence); err != nil {
			return idx, fmt.Errorf("event %s: %w", event.ID, err)
		}
		if event.ID == "" || idx.events[event.ID].ID != "" {
			return idx, errors.New("report events require unique IDs")
		}
		idx.events[event.ID] = event
	}
	for _, task := range input.ApprovalTasks {
		if task.OrganizationID != input.OrganizationID {
			return idx, errors.New("cross-tenant approval task denied")
		}
		if err := evidence.ValidateProvenance(task.Evidence); err != nil {
			return idx, fmt.Errorf("approval task %s: %w", task.ID, err)
		}
		if task.ID == "" || idx.tasks[task.ID].ID != "" {
			return idx, errors.New("approval tasks require unique IDs")
		}
		idx.tasks[task.ID] = task
	}
	for _, group := range input.PostingGroups {
		if err := validateGroup(input.OrganizationID, group, idx.tasks); err != nil {
			return idx, err
		}
		if group.ID == "" || idx.groups[group.ID].ID != "" {
			return idx, errors.New("posting groups require unique IDs")
		}
		idx.groups[group.ID] = group
	}
	for _, entry := range input.AuditEntries {
		if entry.TenantID != input.OrganizationID {
			return idx, errors.New("cross-tenant audit entry denied")
		}
		if entry.ID == "" || !audit.Verify(entry) || idx.audits[entry.ID].ID != "" {
			return idx, errors.New("report requires unique, integrity-verified audit entries")
		}
		idx.audits[entry.ID] = entry
	}
	for _, candidate := range input.Reconciliation.Candidates {
		left := idx.events[candidate.LeftEventID]
		if left.ID == "" {
			return idx, fmt.Errorf("candidate references unknown event %s", candidate.LeftEventID)
		}
		if candidate.RightEventID != "" && idx.events[candidate.RightEventID].ID == "" {
			return idx, fmt.Errorf("candidate references unknown event %s", candidate.RightEventID)
		}
		if err := evidence.ValidateProvenance(candidate.Evidence); err != nil {
			return idx, fmt.Errorf("candidate %s: %w", candidate.LeftEventID, err)
		}
		if !sameSource(left.Evidence, candidate.Evidence) {
			return idx, fmt.Errorf("candidate %s has mismatched evidence", candidate.LeftEventID)
		}
		idx.candidates[candidate.LeftEventID] = candidate
	}
	for _, exception := range input.Reconciliation.Exceptions {
		event := idx.events[exception.EventID]
		if event.ID == "" {
			return idx, fmt.Errorf("exception references unknown event %s", exception.EventID)
		}
		if err := evidence.ValidateProvenance(exception.Evidence); err != nil {
			return idx, fmt.Errorf("exception %s: %w", exception.EventID, err)
		}
		if !sameSource(event.Evidence, exception.Evidence) {
			return idx, fmt.Errorf("exception %s has mismatched evidence", exception.EventID)
		}
	}
	return idx, nil
}

func validateGroup(organizationID string, group ledger.Group, tasks map[string]workflow.Task) error {
	if group.OrganizationID != organizationID {
		return errors.New("cross-tenant posting group denied")
	}
	task := tasks[group.ApprovalTaskID]
	if task.ID == "" || (task.State != workflow.Approved && task.State != workflow.Executed && task.State != workflow.Reversed) {
		return fmt.Errorf("posting group %s lacks an approved task", group.ID)
	}
	if len(group.Entries) < 2 {
		return fmt.Errorf("posting group %s requires at least two entries", group.ID)
	}
	var debit, credit int64
	for _, entry := range group.Entries {
		if entry.OrganizationID != organizationID || entry.PostingGroupID != group.ID || entry.ApprovalTaskID != group.ApprovalTaskID {
			return fmt.Errorf("posting group %s has inconsistent entry links", group.ID)
		}
		if err := evidence.Validate(entry.Evidence); err != nil {
			return fmt.Errorf("posting group %s: %w", group.ID, err)
		}
		debit += entry.DebitMinor
		credit += entry.CreditMinor
	}
	if debit != credit || debit != task.AmountMinor {
		return fmt.Errorf("posting group %s does not reconcile to its approved amount", group.ID)
	}
	return nil
}

func summarizeLedger(groups []ledger.Group) []CurrencyLedger {
	byCurrency := map[string]*CurrencyLedger{}
	for _, group := range groups {
		seen := map[string]bool{}
		for _, entry := range group.Entries {
			summary := byCurrency[entry.Currency]
			if summary == nil {
				summary = &CurrencyLedger{Currency: entry.Currency}
				byCurrency[entry.Currency] = summary
			}
			summary.DebitMinor += entry.DebitMinor
			summary.CreditMinor += entry.CreditMinor
			summary.LedgerEntryCount++
			if !seen[entry.Currency] {
				summary.PostingGroups++
				if group.ReversalOfPostingGroup != "" {
					summary.ReversalGroups++
				}
				seen[entry.Currency] = true
			}
		}
	}
	out := make([]CurrencyLedger, 0, len(byCurrency))
	for _, summary := range byCurrency {
		out = append(out, *summary)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Currency < out[j].Currency })
	return out
}

func deriveROI(input Input, idx indexes) ([]ROIMetric, error) {
	metrics := map[string]*ROIMetric{}
	seenEvents := map[string]bool{}
	for _, outcome := range input.Outcomes {
		if seenEvents[outcome.SourceEventID] {
			return nil, fmt.Errorf("source event %s would be double-counted in ROI", outcome.SourceEventID)
		}
		event := idx.events[outcome.SourceEventID]
		if event.ID == "" {
			return nil, fmt.Errorf("ROI outcome references unknown event %s", outcome.SourceEventID)
		}
		auditEntry := idx.audits[outcome.AuditEntryID]
		if auditEntry.ID == "" || auditEntry.Resource != event.ID || auditEntry.Action != auditAction(outcome.Type) {
			return nil, fmt.Errorf("ROI outcome %s lacks its verified audit event", outcome.SourceEventID)
		}
		amount, currency, minutes, err := deriveOutcome(outcome, event, idx)
		if err != nil {
			return nil, err
		}
		key := string(outcome.Type) + "\x00" + currency
		metric := metrics[key]
		if metric == nil {
			metric = &ROIMetric{Type: outcome.Type, Currency: currency}
			metrics[key] = metric
		}
		metric.Count++
		metric.AmountMinor += amount
		metric.MinutesSaved += minutes
		metric.SourceEvents = append(metric.SourceEvents, event.ID)
		metric.Evidence = append(metric.Evidence, event.Evidence)
		seenEvents[event.ID] = true
	}
	out := make([]ROIMetric, 0, len(metrics))
	for _, metric := range metrics {
		sort.Strings(metric.SourceEvents)
		out = append(out, *metric)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Type == out[j].Type {
			return out[i].Currency < out[j].Currency
		}
		return out[i].Type < out[j].Type
	})
	return out, nil
}

func deriveOutcome(outcome Outcome, event eventledger.Event, idx indexes) (int64, string, int64, error) {
	switch outcome.Type {
	case MoneyRecovered, LateInvoiceCollected:
		task, group, err := executedPosting(outcome, idx)
		if err != nil {
			return 0, "", 0, err
		}
		if !sameSource(event.Evidence, task.Evidence) {
			return 0, "", 0, errors.New("monetary ROI event does not match approval evidence")
		}
		for _, entry := range group.Entries {
			if !sameSource(event.Evidence, entry.Evidence) {
				return 0, "", 0, errors.New("monetary ROI event does not match posting evidence")
			}
		}
		return task.AmountMinor, group.Entries[0].Currency, 0, nil
	case DuplicatePaymentAvoided:
		candidate := idx.candidates[event.ID]
		if candidate.State != reconciliation.Duplicate {
			return 0, "", 0, errors.New("duplicate ROI requires a duplicate reconciliation result")
		}
		return absolute(event.Evidence.AmountMinor), event.Evidence.Currency, 0, nil
	case UnsupportedPaymentCaught:
		candidate := idx.candidates[event.ID]
		if candidate.State != reconciliation.Suspicious && candidate.State != reconciliation.Rejected {
			return 0, "", 0, errors.New("unsupported-payment ROI requires a suspicious or rejected reconciliation result")
		}
		return absolute(event.Evidence.AmountMinor), event.Evidence.Currency, 0, nil
	case MissingDocumentFixed:
		if event.Type != eventledger.DocumentMissing || idx.tasks[outcome.ApprovalTaskID].State != workflow.Executed {
			return 0, "", 0, errors.New("missing-document ROI requires an executed task for a missing-document event")
		}
		return 0, "", 0, nil
	case HoursSaved:
		if idx.tasks[outcome.ApprovalTaskID].State != workflow.Executed {
			return 0, "", 0, errors.New("hours-saved ROI requires an executed task")
		}
		if outcome.Benchmark.ID == "" || outcome.Benchmark.Version < 1 || outcome.Benchmark.ManualMinutes <= 0 || outcome.Benchmark.ApprovedBy == "" {
			return 0, "", 0, errors.New("hours-saved ROI requires a versioned, approved benchmark")
		}
		if err := evidence.ValidateProvenance(outcome.Benchmark.Evidence); err != nil {
			return 0, "", 0, err
		}
		if outcome.ProcessingStarted.IsZero() || !outcome.ProcessingEnded.After(outcome.ProcessingStarted) {
			return 0, "", 0, errors.New("hours-saved ROI requires measured processing timestamps")
		}
		actual := int64(outcome.ProcessingEnded.Sub(outcome.ProcessingStarted).Minutes())
		if actual >= outcome.Benchmark.ManualMinutes {
			return 0, "", 0, errors.New("measured processing did not save time")
		}
		return 0, "", outcome.Benchmark.ManualMinutes - actual, nil
	default:
		return 0, "", 0, fmt.Errorf("unsupported ROI impact type %q", outcome.Type)
	}
}

func executedPosting(outcome Outcome, idx indexes) (workflow.Task, ledger.Group, error) {
	task := idx.tasks[outcome.ApprovalTaskID]
	group := idx.groups[outcome.PostingGroupID]
	if task.ID == "" || task.State != workflow.Executed || group.ID == "" || group.ApprovalTaskID != task.ID || group.ReversalOfPostingGroup != "" {
		return workflow.Task{}, ledger.Group{}, errors.New("monetary ROI requires an executed task and its original posting group")
	}
	return task, group, nil
}

func auditAction(kind ImpactType) string {
	return "roi:" + strings.ToLower(string(kind))
}

func reportID(input Input, idx indexes) string {
	parts := []string{input.OrganizationID, input.Reconciliation.PolicyID, fmt.Sprint(input.Reconciliation.PolicyVersion)}
	for id := range idx.events {
		event := idx.events[id]
		parts = append(parts, "event:"+id+":"+string(event.Status))
	}
	for id := range idx.tasks {
		task := idx.tasks[id]
		parts = append(parts, "task:"+id+":"+string(task.State))
	}
	for id := range idx.groups {
		parts = append(parts, "group:"+id)
	}
	for id := range idx.audits {
		parts = append(parts, "audit:"+id)
	}
	for _, candidate := range input.Reconciliation.Candidates {
		parts = append(parts, "candidate:"+candidate.LeftEventID+":"+candidate.RightEventID+":"+string(candidate.State))
	}
	for _, outcome := range input.Outcomes {
		parts = append(parts, "outcome:"+outcome.SourceEventID+":"+string(outcome.Type))
	}
	sort.Strings(parts)
	digest := sha256.Sum256([]byte(strings.Join(parts, "\x00")))
	return "report_" + hex.EncodeToString(digest[:12])
}

func sameSource(left, right evidence.Evidence) bool {
	return left.SourceDocumentID == right.SourceDocumentID &&
		left.SourceRecordID == right.SourceRecordID &&
		left.ExtractionVersionID == right.ExtractionVersionID
}

func absolute(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}
