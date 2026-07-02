package financeanalytics

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
	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/libs/reconciliation"
	"github.com/kora-finance/kora/libs/workflow"
)

type ExpenseClass string

const (
	CostOfGoodsSold  ExpenseClass = "COST_OF_GOODS_SOLD"
	OperatingExpense ExpenseClass = "OPERATING_EXPENSE"
)

type Input struct {
	OrganizationID         string                  `json:"organization_id"`
	Currency               string                  `json:"currency"`
	PeriodStart            time.Time               `json:"period_start"`
	PeriodEnd              time.Time               `json:"period_end"`
	AsOf                   time.Time               `json:"as_of"`
	AgingBucketsDays       []int                   `json:"aging_buckets_days"`
	Accounts               []ledger.Account        `json:"accounts"`
	ExpenseClassifications map[string]ExpenseClass `json:"expense_classifications"`
	ApprovalTasks          []workflow.Task         `json:"approval_tasks"`
	PostingGroups          []ledger.Group          `json:"posting_groups"`
	Events                 []eventledger.EventView `json:"events"`
	Reconciliation         reconciliation.Result   `json:"reconciliation"`
}

type Cashflow struct {
	MoneyInMinor     int64               `json:"money_in_minor"`
	MoneyOutMinor    int64               `json:"money_out_minor"`
	NetCashflowMinor int64               `json:"net_cashflow_minor"`
	Evidence         []evidence.Evidence `json:"evidence"`
}

type ProfitAndLoss struct {
	RevenueMinor           int64               `json:"revenue_minor"`
	CostOfGoodsSoldMinor   int64               `json:"cost_of_goods_sold_minor"`
	OperatingExpenseMinor  int64               `json:"operating_expense_minor"`
	GrossProfitMinor       int64               `json:"gross_profit_minor"`
	NetProfitMinor         int64               `json:"net_profit_minor"`
	GrossMarginBasisPoints int                 `json:"gross_margin_basis_points"`
	NetMarginBasisPoints   int                 `json:"net_margin_basis_points"`
	Evidence               []evidence.Evidence `json:"evidence"`
}

type AgingBucket struct {
	Label        string              `json:"label"`
	MinimumDays  int                 `json:"minimum_days"`
	MaximumDays  int                 `json:"maximum_days"`
	AmountMinor  int64               `json:"amount_minor"`
	InvoiceCount int                 `json:"invoice_count"`
	Evidence     []evidence.Evidence `json:"evidence"`
}

type ReceivablesAging struct {
	CurrentMinor        int64               `json:"current_minor"`
	CurrentInvoiceCount int                 `json:"current_invoice_count"`
	OverdueMinor        int64               `json:"overdue_minor"`
	OverdueInvoiceCount int                 `json:"overdue_invoice_count"`
	MissingDueDateMinor int64               `json:"missing_due_date_minor"`
	MissingDueDateCount int                 `json:"missing_due_date_count"`
	Buckets             []AgingBucket       `json:"buckets"`
	Evidence            []evidence.Evidence `json:"evidence"`
}

type Report struct {
	ID             string           `json:"id"`
	OrganizationID string           `json:"organization_id"`
	Currency       string           `json:"currency"`
	PeriodStart    time.Time        `json:"period_start"`
	PeriodEnd      time.Time        `json:"period_end"`
	AsOf           time.Time        `json:"as_of"`
	Cashflow       Cashflow         `json:"cashflow"`
	ProfitAndLoss  ProfitAndLoss    `json:"profit_and_loss"`
	Aging          ReceivablesAging `json:"receivables_aging"`
}

func Generate(actor access.Actor, input Input) (Report, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: input.OrganizationID}, access.PermissionReadReports); err != nil {
		return Report{}, err
	}
	state, err := validate(input)
	if err != nil {
		return Report{}, err
	}
	report := Report{
		ID: reportID(input), OrganizationID: input.OrganizationID, Currency: input.Currency,
		PeriodStart: input.PeriodStart.UTC(), PeriodEnd: input.PeriodEnd.UTC(), AsOf: input.AsOf.UTC(),
	}
	report.Cashflow = cashflow(input, state)
	report.ProfitAndLoss = profitAndLoss(input, state)
	report.Aging = aging(input, state)
	return report, nil
}

type validated struct {
	accounts map[string]ledger.Account
	tasks    map[string]workflow.Task
	events   map[string]eventledger.EventView
	matched  map[string]bool
}

func validate(input Input) (validated, error) {
	state := validated{accounts: map[string]ledger.Account{}, tasks: map[string]workflow.Task{}, events: map[string]eventledger.EventView{}, matched: map[string]bool{}}
	if input.OrganizationID == "" || input.Currency == "" || input.PeriodStart.IsZero() || input.PeriodEnd.Before(input.PeriodStart) || input.AsOf.Before(input.PeriodEnd) {
		return state, errors.New("organization, currency, and valid report dates are required")
	}
	if err := validateBuckets(input.AgingBucketsDays); err != nil {
		return state, err
	}
	for _, account := range input.Accounts {
		if account.ID == "" || account.OrganizationID != input.OrganizationID || account.Currency != input.Currency || state.accounts[account.ID].ID != "" {
			return state, errors.New("invalid, duplicate, cross-tenant, or mixed-currency account")
		}
		state.accounts[account.ID] = account
	}
	for accountID, class := range input.ExpenseClassifications {
		account := state.accounts[accountID]
		if account.ID == "" || account.Type != ledger.Expense || (class != CostOfGoodsSold && class != OperatingExpense) {
			return state, fmt.Errorf("invalid expense classification for account %s", accountID)
		}
	}
	for _, task := range input.ApprovalTasks {
		if task.ID == "" || task.OrganizationID != input.OrganizationID || task.Currency != input.Currency || state.tasks[task.ID].ID != "" {
			return state, errors.New("invalid, duplicate, cross-tenant, or mixed-currency approval")
		}
		if err := evidence.ValidateProvenance(task.Evidence); err != nil {
			return state, err
		}
		state.tasks[task.ID] = task
	}
	groupIDs := map[string]bool{}
	for _, group := range input.PostingGroups {
		if group.ID == "" || groupIDs[group.ID] {
			return state, errors.New("posting groups require unique IDs")
		}
		if err := validateGroup(input, group, state); err != nil {
			return state, err
		}
		groupIDs[group.ID] = true
	}
	for _, view := range input.Events {
		if view.ID == "" || view.OrganizationID != input.OrganizationID || state.events[view.ID].ID != "" {
			return state, errors.New("invalid, duplicate, or cross-tenant finance event")
		}
		if err := eventledger.Validate(view.Event); err != nil {
			return state, err
		}
		if !containsStatus(view.EffectiveStatus) {
			return state, errors.New("finance event effective status is invalid")
		}
		if isFinancial(view.Type) && view.Evidence.Currency != input.Currency {
			return state, errors.New("finance analytics requires one currency or verified exchange rates")
		}
		if isFinancial(view.Type) {
			if _, err := time.Parse("2006-01-02", view.Evidence.OccurredOn); err != nil {
				return state, fmt.Errorf("financial event %s has invalid date", view.ID)
			}
		}
		state.events[view.ID] = view
	}
	for _, candidate := range input.Reconciliation.Candidates {
		left := state.events[candidate.LeftEventID]
		if left.ID == "" || (candidate.RightEventID != "" && state.events[candidate.RightEventID].ID == "") {
			return state, errors.New("reconciliation references unknown finance event")
		}
		if err := evidence.ValidateProvenance(candidate.Evidence); err != nil || !sameSource(left.Evidence, candidate.Evidence) {
			return state, errors.New("reconciliation evidence is invalid or mismatched")
		}
		if candidate.State == reconciliation.Matched {
			state.matched[candidate.LeftEventID] = true
			state.matched[candidate.RightEventID] = true
		}
	}
	return state, nil
}

func validateBuckets(values []int) error {
	if len(values) == 0 || values[0] != 0 {
		return errors.New("aging buckets must begin at zero")
	}
	for index, value := range values {
		if value < 0 || (index > 0 && value <= values[index-1]) {
			return errors.New("aging buckets must be strictly increasing non-negative days")
		}
	}
	return nil
}

func validateGroup(input Input, group ledger.Group, state validated) error {
	task := state.tasks[group.ApprovalTaskID]
	if group.OrganizationID != input.OrganizationID || task.ID == "" || (task.State != workflow.Approved && task.State != workflow.Executed && task.State != workflow.Reversed) || len(group.Entries) < 2 || group.CreatedAt.IsZero() {
		return errors.New("posting group lacks approved task, entries, tenant, or date")
	}
	var debit, credit int64
	for _, entry := range group.Entries {
		account := state.accounts[entry.AccountID]
		if entry.OrganizationID != input.OrganizationID || entry.PostingGroupID != group.ID || entry.ApprovalTaskID != task.ID || account.ID == "" || entry.Currency != input.Currency || account.Currency != entry.Currency {
			return errors.New("posting entry has inconsistent account, task, currency, or tenant")
		}
		if err := evidence.ValidateProvenance(entry.Evidence); err != nil {
			return err
		}
		debit += entry.DebitMinor
		credit += entry.CreditMinor
	}
	if debit != credit || debit != task.AmountMinor {
		return errors.New("posting group is not balanced to approved amount")
	}
	return nil
}

func cashflow(input Input, state validated) Cashflow {
	result := Cashflow{}
	for _, view := range state.events {
		if view.EffectiveStatus != eventledger.Active || !inDateRange(view.Evidence.OccurredOn, input.PeriodStart, input.PeriodEnd) {
			continue
		}
		switch view.Type {
		case eventledger.PaymentReceived:
			result.MoneyInMinor += absolute(view.Evidence.AmountMinor)
			result.Evidence = append(result.Evidence, view.Evidence)
		case eventledger.PaymentSent:
			result.MoneyOutMinor += absolute(view.Evidence.AmountMinor)
			result.Evidence = append(result.Evidence, view.Evidence)
		}
	}
	result.NetCashflowMinor = result.MoneyInMinor - result.MoneyOutMinor
	sortEvidence(result.Evidence)
	return result
}

func profitAndLoss(input Input, state validated) ProfitAndLoss {
	result := ProfitAndLoss{}
	for _, group := range input.PostingGroups {
		if group.CreatedAt.Before(input.PeriodStart) || group.CreatedAt.After(endOfDay(input.PeriodEnd)) {
			continue
		}
		for _, entry := range group.Entries {
			account := state.accounts[entry.AccountID]
			switch account.Type {
			case ledger.Revenue:
				result.RevenueMinor += entry.CreditMinor - entry.DebitMinor
			case ledger.Expense:
				amount := entry.DebitMinor - entry.CreditMinor
				if input.ExpenseClassifications[account.ID] == CostOfGoodsSold {
					result.CostOfGoodsSoldMinor += amount
				} else {
					result.OperatingExpenseMinor += amount
				}
			}
			if account.Type == ledger.Revenue || account.Type == ledger.Expense {
				result.Evidence = append(result.Evidence, entry.Evidence)
			}
		}
	}
	result.GrossProfitMinor = result.RevenueMinor - result.CostOfGoodsSoldMinor
	result.NetProfitMinor = result.GrossProfitMinor - result.OperatingExpenseMinor
	if result.RevenueMinor > 0 {
		result.GrossMarginBasisPoints = int(result.GrossProfitMinor * 10_000 / result.RevenueMinor)
		result.NetMarginBasisPoints = int(result.NetProfitMinor * 10_000 / result.RevenueMinor)
	}
	sortEvidence(result.Evidence)
	return result
}

func aging(input Input, state validated) ReceivablesAging {
	result := ReceivablesAging{Buckets: makeBuckets(input.AgingBucketsDays)}
	for _, view := range state.events {
		if view.Type != eventledger.InvoiceIssued || view.EffectiveStatus != eventledger.Active || state.matched[view.ID] || !inDateRange(view.Evidence.OccurredOn, input.PeriodStart, input.AsOf) {
			continue
		}
		amount := absolute(view.Evidence.AmountMinor)
		result.Evidence = append(result.Evidence, view.Evidence)
		due, err := time.Parse("2006-01-02", view.Attributes["due_date"])
		if err != nil {
			result.MissingDueDateMinor += amount
			result.MissingDueDateCount++
			continue
		}
		daysOverdue := int(dateOnly(input.AsOf).Sub(due).Hours() / 24)
		if daysOverdue <= 0 {
			result.CurrentMinor += amount
			result.CurrentInvoiceCount++
			continue
		}
		result.OverdueMinor += amount
		result.OverdueInvoiceCount++
		for index := range result.Buckets {
			bucket := &result.Buckets[index]
			if daysOverdue >= bucket.MinimumDays && (bucket.MaximumDays < 0 || daysOverdue <= bucket.MaximumDays) {
				bucket.AmountMinor += amount
				bucket.InvoiceCount++
				bucket.Evidence = append(bucket.Evidence, view.Evidence)
				break
			}
		}
	}
	for index := range result.Buckets {
		sortEvidence(result.Buckets[index].Evidence)
	}
	sortEvidence(result.Evidence)
	return result
}

func makeBuckets(boundaries []int) []AgingBucket {
	out := make([]AgingBucket, len(boundaries))
	for index, minimum := range boundaries {
		maximum := -1
		label := fmt.Sprintf("%d+", minimum)
		if index+1 < len(boundaries) {
			maximum = boundaries[index+1] - 1
			label = fmt.Sprintf("%d-%d", minimum, maximum)
		}
		out[index] = AgingBucket{Label: label, MinimumDays: minimum, MaximumDays: maximum}
	}
	return out
}

func reportID(input Input) string {
	canonical := input
	canonical.Accounts = append([]ledger.Account(nil), input.Accounts...)
	canonical.ApprovalTasks = append([]workflow.Task(nil), input.ApprovalTasks...)
	canonical.PostingGroups = append([]ledger.Group(nil), input.PostingGroups...)
	canonical.Events = append([]eventledger.EventView(nil), input.Events...)
	canonical.Reconciliation.Candidates = append([]reconciliation.Candidate(nil), input.Reconciliation.Candidates...)
	sort.Slice(canonical.Accounts, func(i, j int) bool { return canonical.Accounts[i].ID < canonical.Accounts[j].ID })
	sort.Slice(canonical.ApprovalTasks, func(i, j int) bool { return canonical.ApprovalTasks[i].ID < canonical.ApprovalTasks[j].ID })
	sort.Slice(canonical.PostingGroups, func(i, j int) bool { return canonical.PostingGroups[i].ID < canonical.PostingGroups[j].ID })
	sort.Slice(canonical.Events, func(i, j int) bool { return canonical.Events[i].ID < canonical.Events[j].ID })
	sort.Slice(canonical.Reconciliation.Candidates, func(i, j int) bool {
		return canonical.Reconciliation.Candidates[i].LeftEventID < canonical.Reconciliation.Candidates[j].LeftEventID
	})
	payload, err := json.Marshal(canonical)
	if err != nil {
		panic("validated finance analytics input is not serializable")
	}
	digest := sha256.Sum256(payload)
	return "finance_" + hex.EncodeToString(digest[:12])
}

func inDateRange(value string, start, end time.Time) bool {
	parsed, err := time.Parse("2006-01-02", value)
	return err == nil && !parsed.Before(dateOnly(start)) && !parsed.After(dateOnly(end))
}

func dateOnly(value time.Time) time.Time {
	year, month, day := value.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

func endOfDay(value time.Time) time.Time { return dateOnly(value).Add(24*time.Hour - time.Nanosecond) }

func isFinancial(kind eventledger.EventType) bool {
	switch kind {
	case eventledger.PaymentReceived, eventledger.PaymentSent, eventledger.InvoiceIssued, eventledger.BillReceived, eventledger.ObligationCreated:
		return true
	default:
		return false
	}
}

func containsStatus(status eventledger.Status) bool {
	return status == eventledger.Active || status == eventledger.Reversed || status == eventledger.Adjusted || status == eventledger.Superseded
}

func sameSource(left, right evidence.Evidence) bool {
	return left.SourceDocumentID == right.SourceDocumentID && left.SourceRecordID == right.SourceRecordID && left.ExtractionVersionID == right.ExtractionVersionID
}

func sortEvidence(values []evidence.Evidence) {
	sort.Slice(values, func(i, j int) bool {
		left := strings.Join([]string{values[i].SourceDocumentID, values[i].ExtractionVersionID, values[i].SourceRecordID}, "\x00")
		right := strings.Join([]string{values[j].SourceDocumentID, values[j].ExtractionVersionID, values[j].SourceRecordID}, "\x00")
		return left < right
	})
}

func absolute(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}
