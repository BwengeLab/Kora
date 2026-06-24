package creditpassport

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/consent"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/libs/reconciliation"
	"github.com/kora-finance/kora/libs/workflow"
)

const (
	CategoryPassport          = "credit_passport"
	CategoryCashflow          = "cashflow"
	CategoryPaymentDiscipline = "payment_discipline"
	CategoryReceivables       = "receivables"
	CategoryObligations       = "obligations"
	CategoryRiskFlags         = "risk_flags"
	CategoryLedgerSummary     = "ledger_summary"
)

type RiskFlag struct {
	ID             string            `json:"id"`
	OrganizationID string            `json:"organization_id"`
	SourceEventID  string            `json:"source_event_id"`
	Type           string            `json:"type"`
	Severity       string            `json:"severity"`
	Reason         string            `json:"reason"`
	Evidence       evidence.Evidence `json:"evidence"`
}

type AffordabilityPolicy struct {
	ID                        string            `json:"id"`
	OrganizationID            string            `json:"organization_id"`
	Version                   int               `json:"version"`
	Currency                  string            `json:"currency"`
	MaxDebtServiceBasisPoints int               `json:"max_debt_service_basis_points"`
	StressBufferBasisPoints   int               `json:"stress_buffer_basis_points"`
	AnnualInterestBasisPoints int               `json:"annual_interest_basis_points"`
	TermMonths                int               `json:"term_months"`
	Evidence                  evidence.Evidence `json:"evidence"`
}

type Input struct {
	OrganizationID string                  `json:"organization_id"`
	PeriodStart    time.Time               `json:"period_start"`
	PeriodEnd      time.Time               `json:"period_end"`
	AsOf           time.Time               `json:"as_of"`
	Events         []eventledger.EventView `json:"events"`
	Accounts       []ledger.Account        `json:"accounts"`
	ApprovalTasks  []workflow.Task         `json:"approval_tasks"`
	PostingGroups  []ledger.Group          `json:"posting_groups"`
	Reconciliation reconciliation.Result   `json:"reconciliation"`
	RiskFlags      []RiskFlag              `json:"risk_flags"`
	Policy         AffordabilityPolicy     `json:"policy"`
}

type CashflowSummary struct {
	Currency            string              `json:"currency"`
	MoneyInMinor        int64               `json:"money_in_minor"`
	MoneyOutMinor       int64               `json:"money_out_minor"`
	NetCashflowMinor    int64               `json:"net_cashflow_minor"`
	AverageMonthlyMinor int64               `json:"average_monthly_minor"`
	MonthsObserved      int                 `json:"months_observed"`
	Evidence            []evidence.Evidence `json:"evidence"`
}

type PaymentDiscipline struct {
	MatchedPayments   int                 `json:"matched_payments"`
	OnTimePayments    int                 `json:"on_time_payments"`
	LatePayments      int                 `json:"late_payments"`
	SuggestedMatches  int                 `json:"suggested_matches"`
	DuplicatePayments int                 `json:"duplicate_payments"`
	Evidence          []evidence.Evidence `json:"evidence"`
}

type ReceivableSummary struct {
	Currency                string              `json:"currency"`
	OutstandingMinor        int64               `json:"outstanding_minor"`
	OverdueMinor            int64               `json:"overdue_minor"`
	OutstandingInvoiceCount int                 `json:"outstanding_invoice_count"`
	OverdueInvoiceCount     int                 `json:"overdue_invoice_count"`
	UndatedInvoiceCount     int                 `json:"undated_invoice_count"`
	Evidence                []evidence.Evidence `json:"evidence"`
}

type ObligationSummary struct {
	Currency                string              `json:"currency"`
	TotalMinor              int64               `json:"total_minor"`
	MonthlyDebtServiceMinor int64               `json:"monthly_debt_service_minor"`
	ActiveObligationCount   int                 `json:"active_obligation_count"`
	Evidence                []evidence.Evidence `json:"evidence"`
}

type LedgerBalance struct {
	AccountID    string              `json:"account_id"`
	AccountCode  string              `json:"account_code"`
	AccountName  string              `json:"account_name"`
	AccountType  ledger.AccountType  `json:"account_type"`
	Currency     string              `json:"currency"`
	BalanceMinor int64               `json:"balance_minor"`
	Evidence     []evidence.Evidence `json:"evidence"`
}

type Affordability struct {
	Currency                    string            `json:"currency"`
	AverageMonthlyCashflowMinor int64             `json:"average_monthly_cashflow_minor"`
	ExistingDebtServiceMinor    int64             `json:"existing_debt_service_minor"`
	MaxMonthlyPaymentMinor      int64             `json:"max_monthly_payment_minor"`
	EstimatedPrincipalMinor     int64             `json:"estimated_principal_minor"`
	TermMonths                  int               `json:"term_months"`
	AnnualInterestBasisPoints   int               `json:"annual_interest_basis_points"`
	Assumptions                 []string          `json:"assumptions"`
	PolicyID                    string            `json:"policy_id"`
	PolicyVersion               int               `json:"policy_version"`
	PolicyEvidence              evidence.Evidence `json:"policy_evidence"`
}

type Passport struct {
	ID                string              `json:"id"`
	OrganizationID    string              `json:"organization_id"`
	PeriodStart       time.Time           `json:"period_start"`
	PeriodEnd         time.Time           `json:"period_end"`
	AsOf              time.Time           `json:"as_of"`
	Cashflow          CashflowSummary     `json:"cashflow"`
	PaymentDiscipline PaymentDiscipline   `json:"payment_discipline"`
	Receivables       ReceivableSummary   `json:"receivables"`
	Obligations       ObligationSummary   `json:"obligations"`
	Ledger            []LedgerBalance     `json:"ledger"`
	RiskFlags         []RiskFlag          `json:"risk_flags"`
	Affordability     Affordability       `json:"affordability"`
	Evidence          []evidence.Evidence `json:"evidence"`
}

type SharedPassport struct {
	ID                string             `json:"id"`
	OrganizationID    string             `json:"organization_id"`
	PeriodStart       time.Time          `json:"period_start"`
	PeriodEnd         time.Time          `json:"period_end"`
	AsOf              time.Time          `json:"as_of"`
	Affordability     *Affordability     `json:"affordability,omitempty"`
	Cashflow          *CashflowSummary   `json:"cashflow,omitempty"`
	PaymentDiscipline *PaymentDiscipline `json:"payment_discipline,omitempty"`
	Receivables       *ReceivableSummary `json:"receivables,omitempty"`
	Obligations       *ObligationSummary `json:"obligations,omitempty"`
	Ledger            []LedgerBalance    `json:"ledger,omitempty"`
	RiskFlags         []RiskFlag         `json:"risk_flags,omitempty"`
}

func Generate(actor access.Actor, input Input) (Passport, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: input.OrganizationID}, access.PermissionGenerateCreditPassport); err != nil {
		return Passport{}, err
	}
	state, err := validate(input)
	if err != nil {
		return Passport{}, err
	}
	cashflow := buildCashflow(input, state)
	discipline := buildDiscipline(input, state)
	receivables := buildReceivables(input, state)
	obligations, err := buildObligations(input, state)
	if err != nil {
		return Passport{}, err
	}
	affordability := estimateAffordability(cashflow, obligations, input.Policy)
	passport := Passport{
		ID: passportID(input), OrganizationID: input.OrganizationID,
		PeriodStart: input.PeriodStart.UTC(), PeriodEnd: input.PeriodEnd.UTC(), AsOf: input.AsOf.UTC(),
		Cashflow: cashflow, PaymentDiscipline: discipline, Receivables: receivables,
		Obligations: obligations, Ledger: buildLedger(input, state),
		RiskFlags: append([]RiskFlag(nil), input.RiskFlags...), Affordability: affordability,
	}
	passport.Evidence = collectEvidence(passport)
	sort.Slice(passport.RiskFlags, func(i, j int) bool { return passport.RiskFlags[i].ID < passport.RiskFlags[j].ID })
	return passport, nil
}

func Read(actor access.Actor, passport Passport) (Passport, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: passport.OrganizationID}, access.PermissionReadCreditPassport); err != nil {
		return Passport{}, err
	}
	return passport, nil
}

func Share(store *consent.Store, request consent.AccessRequest, categories []string, passport Passport) (SharedPassport, error) {
	if store == nil || request.ExternalActor.OrganizationID != passport.OrganizationID || request.Resource != passport.ID {
		return SharedPassport{}, errors.New("passport share request does not match resource tenant")
	}
	if request.Permission != access.PermissionReadCreditPassport {
		return SharedPassport{}, errors.New("passport sharing requires credit-passport read permission")
	}
	categories = uniqueCategories(categories)
	if len(categories) == 0 {
		return SharedPassport{}, errors.New("at least one passport data category is required")
	}
	for _, category := range categories {
		if !validCategory(category) {
			return SharedPassport{}, fmt.Errorf("unsupported passport category %q", category)
		}
		categoryRequest := request
		categoryRequest.DataCategory = category
		if _, err := store.AuthorizeAndLog(categoryRequest); err != nil {
			return SharedPassport{}, err
		}
	}
	shared := SharedPassport{
		ID: passport.ID, OrganizationID: passport.OrganizationID,
		PeriodStart: passport.PeriodStart, PeriodEnd: passport.PeriodEnd, AsOf: passport.AsOf,
	}
	for _, category := range categories {
		switch category {
		case CategoryPassport:
			value := passport.Affordability
			shared.Affordability = &value
		case CategoryCashflow:
			value := passport.Cashflow
			shared.Cashflow = &value
		case CategoryPaymentDiscipline:
			value := passport.PaymentDiscipline
			shared.PaymentDiscipline = &value
		case CategoryReceivables:
			value := passport.Receivables
			shared.Receivables = &value
		case CategoryObligations:
			value := passport.Obligations
			shared.Obligations = &value
		case CategoryLedgerSummary:
			shared.Ledger = append([]LedgerBalance(nil), passport.Ledger...)
		case CategoryRiskFlags:
			shared.RiskFlags = append([]RiskFlag(nil), passport.RiskFlags...)
		}
	}
	return shared, nil
}

type validated struct {
	events   map[string]eventledger.EventView
	accounts map[string]ledger.Account
	tasks    map[string]workflow.Task
	groups   map[string]ledger.Group
	matched  map[string]bool
}

func validate(input Input) (validated, error) {
	state := validated{events: map[string]eventledger.EventView{}, accounts: map[string]ledger.Account{}, tasks: map[string]workflow.Task{}, groups: map[string]ledger.Group{}, matched: map[string]bool{}}
	if input.OrganizationID == "" || input.PeriodStart.IsZero() || input.PeriodEnd.Before(input.PeriodStart) || input.AsOf.Before(input.PeriodEnd) {
		return state, errors.New("organization and a valid reporting period/as-of date are required")
	}
	if err := validatePolicy(input.Policy, input.OrganizationID); err != nil {
		return state, err
	}
	paymentEvents := 0
	for _, view := range input.Events {
		if view.OrganizationID != input.OrganizationID {
			return state, errors.New("cross-tenant passport event denied")
		}
		if err := eventledger.Validate(view.Event); err != nil {
			return state, err
		}
		if view.ID == "" || state.events[view.ID].ID != "" {
			return state, errors.New("passport events require unique IDs")
		}
		if !slicesContains([]eventledger.Status{eventledger.Active, eventledger.Reversed, eventledger.Adjusted, eventledger.Superseded}, view.EffectiveStatus) {
			return state, errors.New("passport event requires a valid effective status")
		}
		if isFinancial(view.Type) && view.Evidence.Currency != input.Policy.Currency {
			return state, errors.New("credit passport requires one policy currency or verified exchange rates")
		}
		if isFinancial(view.Type) {
			if _, err := time.Parse("2006-01-02", view.Evidence.OccurredOn); err != nil {
				return state, fmt.Errorf("financial event %s has an invalid occurrence date", view.ID)
			}
		}
		if view.EffectiveStatus == eventledger.Active && (view.Type == eventledger.PaymentReceived || view.Type == eventledger.PaymentSent) {
			paymentEvents++
		}
		state.events[view.ID] = view
	}
	if paymentEvents == 0 {
		return state, errors.New("credit passport requires verified cashflow events")
	}
	for _, account := range input.Accounts {
		if account.OrganizationID != input.OrganizationID || account.ID == "" || account.Currency != input.Policy.Currency || state.accounts[account.ID].ID != "" {
			return state, errors.New("invalid or cross-tenant passport account")
		}
		state.accounts[account.ID] = account
	}
	for _, task := range input.ApprovalTasks {
		if task.OrganizationID != input.OrganizationID || task.ID == "" || state.tasks[task.ID].ID != "" {
			return state, errors.New("invalid or cross-tenant passport approval")
		}
		if err := evidence.ValidateProvenance(task.Evidence); err != nil {
			return state, fmt.Errorf("passport approval %s: %w", task.ID, err)
		}
		state.tasks[task.ID] = task
	}
	for _, group := range input.PostingGroups {
		if group.ID == "" || state.groups[group.ID].ID != "" {
			return state, errors.New("passport posting groups require unique IDs")
		}
		if err := validatePosting(input.OrganizationID, group, state); err != nil {
			return state, err
		}
		state.groups[group.ID] = group
	}
	if len(state.groups) == 0 {
		return state, errors.New("credit passport requires a verified ledger posting")
	}
	for _, candidate := range input.Reconciliation.Candidates {
		left := state.events[candidate.LeftEventID]
		if left.ID == "" || (candidate.RightEventID != "" && state.events[candidate.RightEventID].ID == "") {
			return state, errors.New("reconciliation references an unknown passport event")
		}
		if err := evidence.ValidateProvenance(candidate.Evidence); err != nil || !sameSource(left.Evidence, candidate.Evidence) {
			return state, errors.New("reconciliation evidence is invalid or mismatched")
		}
		if candidate.State == reconciliation.Matched {
			state.matched[candidate.LeftEventID] = true
			state.matched[candidate.RightEventID] = true
		}
	}
	riskIDs := map[string]bool{}
	for _, flag := range input.RiskFlags {
		event := state.events[flag.SourceEventID]
		if flag.ID == "" || riskIDs[flag.ID] || flag.OrganizationID != input.OrganizationID || event.ID == "" || flag.Type == "" || flag.Reason == "" || !slicesContains([]string{"LOW", "MEDIUM", "HIGH", "CRITICAL"}, flag.Severity) {
			return state, errors.New("invalid or cross-tenant risk flag")
		}
		if err := evidence.ValidateProvenance(flag.Evidence); err != nil || !sameSource(event.Evidence, flag.Evidence) {
			return state, errors.New("risk flag evidence is invalid or mismatched")
		}
		riskIDs[flag.ID] = true
	}
	return state, nil
}

func validatePolicy(policy AffordabilityPolicy, organizationID string) error {
	if policy.ID == "" || policy.OrganizationID != organizationID || policy.Version < 1 || policy.Currency == "" {
		return errors.New("versioned tenant affordability policy is required")
	}
	if policy.MaxDebtServiceBasisPoints <= 0 || policy.MaxDebtServiceBasisPoints > 10_000 || policy.StressBufferBasisPoints < 0 || policy.StressBufferBasisPoints >= 10_000 || policy.AnnualInterestBasisPoints < 0 || policy.TermMonths < 1 || policy.TermMonths > 360 {
		return errors.New("affordability policy values are invalid")
	}
	return evidence.ValidateProvenance(policy.Evidence)
}

func validatePosting(organizationID string, group ledger.Group, state validated) error {
	task := state.tasks[group.ApprovalTaskID]
	if group.OrganizationID != organizationID || group.ID == "" || task.ID == "" || (task.State != workflow.Approved && task.State != workflow.Executed && task.State != workflow.Reversed) || len(group.Entries) < 2 {
		return errors.New("passport posting lacks a valid approved task")
	}
	var debit, credit int64
	for _, entry := range group.Entries {
		if entry.OrganizationID != organizationID || entry.PostingGroupID != group.ID || entry.ApprovalTaskID != task.ID || state.accounts[entry.AccountID].ID == "" || entry.Currency != state.accounts[entry.AccountID].Currency || entry.Currency != task.Currency {
			return errors.New("passport posting has inconsistent tenant or account links")
		}
		if err := evidence.Validate(entry.Evidence); err != nil {
			return err
		}
		debit += entry.DebitMinor
		credit += entry.CreditMinor
	}
	if debit != credit || debit != task.AmountMinor {
		return errors.New("passport posting does not reconcile to approved amount")
	}
	return nil
}

func buildCashflow(input Input, state validated) CashflowSummary {
	result := CashflowSummary{Currency: input.Policy.Currency, MonthsObserved: calendarMonths(input.PeriodStart, input.PeriodEnd)}
	for _, view := range state.events {
		if view.EffectiveStatus != eventledger.Active || !within(view.Evidence.OccurredOn, input.PeriodStart, input.PeriodEnd) {
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
	result.AverageMonthlyMinor = result.NetCashflowMinor / int64(result.MonthsObserved)
	sortEvidence(result.Evidence)
	return result
}

func buildDiscipline(input Input, state validated) PaymentDiscipline {
	result := PaymentDiscipline{}
	for _, candidate := range input.Reconciliation.Candidates {
		switch candidate.State {
		case reconciliation.Matched:
			result.MatchedPayments++
			invoice, payment := invoiceAndPayment(state.events[candidate.LeftEventID], state.events[candidate.RightEventID])
			if invoice.ID != "" && payment.ID != "" {
				due, dueErr := time.Parse("2006-01-02", invoice.Attributes["due_date"])
				paid, paidErr := time.Parse("2006-01-02", payment.Evidence.OccurredOn)
				if dueErr == nil && paidErr == nil && paid.After(due) {
					result.LatePayments++
				} else if dueErr == nil && paidErr == nil {
					result.OnTimePayments++
				}
			}
		case reconciliation.Suggested:
			result.SuggestedMatches++
		case reconciliation.Duplicate:
			result.DuplicatePayments++
		}
		result.Evidence = append(result.Evidence, candidate.Evidence)
	}
	sortEvidence(result.Evidence)
	return result
}

func buildReceivables(input Input, state validated) ReceivableSummary {
	result := ReceivableSummary{Currency: input.Policy.Currency}
	for _, view := range state.events {
		if view.Type != eventledger.InvoiceIssued || view.EffectiveStatus != eventledger.Active || state.matched[view.ID] || !within(view.Evidence.OccurredOn, input.PeriodStart, input.AsOf) {
			continue
		}
		amount := absolute(view.Evidence.AmountMinor)
		result.OutstandingMinor += amount
		result.OutstandingInvoiceCount++
		due, dueErr := time.Parse("2006-01-02", view.Attributes["due_date"])
		if dueErr == nil && due.Before(input.AsOf) {
			result.OverdueMinor += amount
			result.OverdueInvoiceCount++
		} else if dueErr != nil {
			result.UndatedInvoiceCount++
		}
		result.Evidence = append(result.Evidence, view.Evidence)
	}
	sortEvidence(result.Evidence)
	return result
}

func buildObligations(input Input, state validated) (ObligationSummary, error) {
	result := ObligationSummary{Currency: input.Policy.Currency}
	for _, view := range state.events {
		if view.Type != eventledger.ObligationCreated || view.EffectiveStatus != eventledger.Active || !within(view.Evidence.OccurredOn, input.PeriodStart, input.AsOf) {
			continue
		}
		result.TotalMinor += absolute(view.Evidence.AmountMinor)
		result.ActiveObligationCount++
		if value := strings.TrimSpace(view.Attributes["monthly_payment_minor"]); value != "" {
			monthly, err := strconv.ParseInt(value, 10, 64)
			if err != nil || monthly < 0 || monthly > absolute(view.Evidence.AmountMinor) {
				return ObligationSummary{}, fmt.Errorf("obligation %s has invalid monthly payment", view.ID)
			}
			result.MonthlyDebtServiceMinor += monthly
		}
		result.Evidence = append(result.Evidence, view.Evidence)
	}
	sortEvidence(result.Evidence)
	return result, nil
}

func buildLedger(input Input, state validated) []LedgerBalance {
	balances := map[string]int64{}
	proofs := map[string][]evidence.Evidence{}
	for _, group := range input.PostingGroups {
		if group.CreatedAt.After(input.AsOf) {
			continue
		}
		for _, entry := range group.Entries {
			balances[entry.AccountID] += entry.DebitMinor - entry.CreditMinor
			proofs[entry.AccountID] = append(proofs[entry.AccountID], entry.Evidence)
		}
	}
	out := make([]LedgerBalance, 0, len(state.accounts))
	for id, account := range state.accounts {
		sortEvidence(proofs[id])
		out = append(out, LedgerBalance{
			AccountID: id, AccountCode: account.Code, AccountName: account.Name,
			AccountType: account.Type, Currency: account.Currency, BalanceMinor: balances[id],
			Evidence: proofs[id],
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].AccountCode < out[j].AccountCode })
	return out
}

func estimateAffordability(cashflow CashflowSummary, obligations ObligationSummary, policy AffordabilityPolicy) Affordability {
	base := cashflow.AverageMonthlyMinor
	if base < 0 {
		base = 0
	}
	capacity := base*int64(policy.MaxDebtServiceBasisPoints)/10_000 - obligations.MonthlyDebtServiceMinor
	if capacity < 0 {
		capacity = 0
	}
	capacity = capacity * int64(10_000-policy.StressBufferBasisPoints) / 10_000
	principal := amortizedPrincipal(capacity, policy.AnnualInterestBasisPoints, policy.TermMonths)
	return Affordability{
		Currency: policy.Currency, AverageMonthlyCashflowMinor: cashflow.AverageMonthlyMinor,
		ExistingDebtServiceMinor: obligations.MonthlyDebtServiceMinor,
		MaxMonthlyPaymentMinor:   capacity, EstimatedPrincipalMinor: principal,
		TermMonths: policy.TermMonths, AnnualInterestBasisPoints: policy.AnnualInterestBasisPoints,
		PolicyID: policy.ID, PolicyVersion: policy.Version,
		PolicyEvidence: policy.Evidence,
		Assumptions: []string{
			fmt.Sprintf("average monthly net cashflow uses %d observed calendar months", cashflow.MonthsObserved),
			fmt.Sprintf("maximum debt service is %d basis points of average monthly net cashflow", policy.MaxDebtServiceBasisPoints),
			fmt.Sprintf("existing monthly obligations of %d minor units are deducted", obligations.MonthlyDebtServiceMinor),
			fmt.Sprintf("a %d basis-point stress buffer is applied", policy.StressBufferBasisPoints),
			fmt.Sprintf("principal uses %d months at %d annual interest basis points", policy.TermMonths, policy.AnnualInterestBasisPoints),
			"estimate is decision support, not an approval or lending decision",
		},
	}
}

func amortizedPrincipal(monthlyPayment int64, annualBPS, months int) int64 {
	if monthlyPayment <= 0 {
		return 0
	}
	monthlyRate := float64(annualBPS) / 10_000 / 12
	if monthlyRate == 0 {
		return monthlyPayment * int64(months)
	}
	value := float64(monthlyPayment) * (1 - math.Pow(1+monthlyRate, float64(-months))) / monthlyRate
	return int64(math.Floor(value))
}

func passportID(input Input) string {
	canonical := input
	canonical.Events = append([]eventledger.EventView(nil), input.Events...)
	canonical.Accounts = append([]ledger.Account(nil), input.Accounts...)
	canonical.ApprovalTasks = append([]workflow.Task(nil), input.ApprovalTasks...)
	canonical.PostingGroups = append([]ledger.Group(nil), input.PostingGroups...)
	canonical.RiskFlags = append([]RiskFlag(nil), input.RiskFlags...)
	canonical.Reconciliation.Candidates = append([]reconciliation.Candidate(nil), input.Reconciliation.Candidates...)
	sort.Slice(canonical.Events, func(i, j int) bool { return canonical.Events[i].ID < canonical.Events[j].ID })
	sort.Slice(canonical.Accounts, func(i, j int) bool { return canonical.Accounts[i].ID < canonical.Accounts[j].ID })
	sort.Slice(canonical.ApprovalTasks, func(i, j int) bool { return canonical.ApprovalTasks[i].ID < canonical.ApprovalTasks[j].ID })
	sort.Slice(canonical.PostingGroups, func(i, j int) bool { return canonical.PostingGroups[i].ID < canonical.PostingGroups[j].ID })
	sort.Slice(canonical.RiskFlags, func(i, j int) bool { return canonical.RiskFlags[i].ID < canonical.RiskFlags[j].ID })
	sort.Slice(canonical.Reconciliation.Candidates, func(i, j int) bool {
		return canonical.Reconciliation.Candidates[i].LeftEventID < canonical.Reconciliation.Candidates[j].LeftEventID
	})
	payload, err := json.Marshal(canonical)
	if err != nil {
		panic("validated credit passport input is not serializable")
	}
	digest := sha256.Sum256(payload)
	return "passport_" + hex.EncodeToString(digest[:12])
}

func collectEvidence(passport Passport) []evidence.Evidence {
	seen := map[string]bool{}
	out := []evidence.Evidence{}
	groups := [][]evidence.Evidence{{passport.Affordability.PolicyEvidence}, passport.Cashflow.Evidence, passport.PaymentDiscipline.Evidence, passport.Receivables.Evidence, passport.Obligations.Evidence}
	for _, balance := range passport.Ledger {
		groups = append(groups, balance.Evidence)
	}
	for _, flag := range passport.RiskFlags {
		groups = append(groups, []evidence.Evidence{flag.Evidence})
	}
	for _, group := range groups {
		for _, item := range group {
			key := item.SourceDocumentID + "\x00" + item.ExtractionVersionID + "\x00" + item.SourceRecordID
			if !seen[key] {
				seen[key] = true
				out = append(out, item)
			}
		}
	}
	sortEvidence(out)
	return out
}

func invoiceAndPayment(left, right eventledger.EventView) (eventledger.EventView, eventledger.EventView) {
	if left.Type == eventledger.InvoiceIssued && right.Type == eventledger.PaymentReceived {
		return left, right
	}
	if right.Type == eventledger.InvoiceIssued && left.Type == eventledger.PaymentReceived {
		return right, left
	}
	return eventledger.EventView{}, eventledger.EventView{}
}

func isFinancial(kind eventledger.EventType) bool {
	return slicesContains([]eventledger.EventType{eventledger.PaymentReceived, eventledger.PaymentSent, eventledger.InvoiceIssued, eventledger.BillReceived, eventledger.ObligationCreated}, kind)
}

func within(date string, start, end time.Time) bool {
	value, err := time.Parse("2006-01-02", date)
	if err != nil {
		return false
	}
	return !value.Before(dateOnly(start)) && !value.After(dateOnly(end))
}

func dateOnly(value time.Time) time.Time {
	year, month, day := value.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

func calendarMonths(start, end time.Time) int {
	start, end = dateOnly(start), dateOnly(end)
	months := (end.Year()-start.Year())*12 + int(end.Month()-start.Month()) + 1
	if months < 1 {
		return 1
	}
	return months
}

func sameSource(left, right evidence.Evidence) bool {
	return left.SourceDocumentID == right.SourceDocumentID && left.SourceRecordID == right.SourceRecordID && left.ExtractionVersionID == right.ExtractionVersionID
}

func sortEvidence(values []evidence.Evidence) {
	sort.Slice(values, func(i, j int) bool {
		if values[i].SourceDocumentID == values[j].SourceDocumentID {
			return values[i].SourceRecordID < values[j].SourceRecordID
		}
		return values[i].SourceDocumentID < values[j].SourceDocumentID
	})
}

func uniqueCategories(values []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, value := range values {
		value = strings.ToLower(strings.TrimSpace(value))
		if value != "" && !seen[value] {
			seen[value] = true
			out = append(out, value)
		}
	}
	sort.Strings(out)
	return out
}

func validCategory(value string) bool {
	return slicesContains([]string{CategoryPassport, CategoryCashflow, CategoryPaymentDiscipline, CategoryReceivables, CategoryObligations, CategoryRiskFlags, CategoryLedgerSummary}, value)
}

func slicesContains[T comparable](values []T, expected T) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func absolute(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}
