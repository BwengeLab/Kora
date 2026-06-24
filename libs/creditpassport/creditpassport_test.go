package creditpassport

import (
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/consent"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/libs/reconciliation"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestGenerateProducesReproducibleEvidenceBackedPassport(t *testing.T) {
	input := passportInput()
	first, err := Generate(lead("org-1"), input)
	if err != nil {
		t.Fatal(err)
	}
	second, err := Generate(lead("org-1"), input)
	if err != nil {
		t.Fatal(err)
	}
	if first.ID == "" || first.ID != second.ID {
		t.Fatalf("passport must be reproducible: first=%q second=%q", first.ID, second.ID)
	}
	for left, right := 0, len(input.Events)-1; left < right; left, right = left+1, right-1 {
		input.Events[left], input.Events[right] = input.Events[right], input.Events[left]
	}
	reordered, err := Generate(lead("org-1"), input)
	if err != nil || reordered.ID != first.ID {
		t.Fatalf("source ordering changed reproducible passport: id=%q err=%v", reordered.ID, err)
	}
	if first.Cashflow.NetCashflowMinor != 100_000 || first.Cashflow.AverageMonthlyMinor != 50_000 {
		t.Fatalf("cashflow is wrong: %+v", first.Cashflow)
	}
	if first.Receivables.OutstandingMinor != 50_000 || first.Receivables.OverdueMinor != 50_000 {
		t.Fatalf("receivables are wrong: %+v", first.Receivables)
	}
	if first.PaymentDiscipline.MatchedPayments != 1 || first.PaymentDiscipline.LatePayments != 1 {
		t.Fatalf("payment discipline is wrong: %+v", first.PaymentDiscipline)
	}
	if first.Obligations.MonthlyDebtServiceMinor != 10_000 {
		t.Fatalf("obligations are wrong: %+v", first.Obligations)
	}
	if first.Affordability.MaxMonthlyPaymentMinor != 13_500 || first.Affordability.EstimatedPrincipalMinor != 162_000 || len(first.Affordability.Assumptions) < 5 {
		t.Fatalf("affordability is unexplained or wrong: %+v", first.Affordability)
	}
	if len(first.RiskFlags) != 1 || len(first.Evidence) == 0 || first.RiskFlags[0].Evidence.SourceRecordID == "" {
		t.Fatalf("risk/evidence links are missing: %+v", first)
	}
}

func TestGenerateRejectsInvalidLedgerCurrencyAndRiskEvidence(t *testing.T) {
	input := passportInput()
	input.PostingGroups[0].Entries[1].CreditMinor--
	if _, err := Generate(lead("org-1"), input); err == nil {
		t.Fatal("unbalanced ledger must be rejected")
	}
	input = passportInput()
	input.Events[0].Evidence.Currency = "USD"
	if _, err := Generate(lead("org-1"), input); err == nil {
		t.Fatal("unconverted multi-currency data must be rejected")
	}
	input = passportInput()
	input.RiskFlags[0].Evidence.SourceRecordID = "fabricated"
	if _, err := Generate(lead("org-1"), input); err == nil {
		t.Fatal("risk flag with fabricated evidence must be rejected")
	}
}

func TestGenerateAndReadPermissionsAreSeparate(t *testing.T) {
	input := passportInput()
	auditor := access.Actor{UserID: "auditor", OrganizationID: "org-1", Roles: []access.Role{access.RoleAuditorCompliance}}
	if _, err := Generate(auditor, input); err == nil {
		t.Fatal("auditor must not generate a passport")
	}
	passport, err := Generate(lead("org-1"), input)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Read(auditor, passport); err != nil {
		t.Fatalf("auditor should read a generated passport: %v", err)
	}
	if _, err := Read(access.Actor{UserID: "lead", OrganizationID: "org-2", Roles: []access.Role{access.RoleFinanceLead}}, passport); err == nil {
		t.Fatal("cross-tenant passport read must be denied")
	}
}

func TestShareReturnsOnlyConsentedCategories(t *testing.T) {
	passport, err := Generate(lead("org-1"), passportInput())
	if err != nil {
		t.Fatal(err)
	}
	store := consent.NewStore()
	now := time.Now().UTC()
	grant, err := store.Create(owner("org-1"), consent.Grant{
		OrganizationID: "org-1", ExternalUserID: "lender-user", RecipientPartyID: "lender-party",
		AllowedDataCategories: []string{CategoryPassport, CategoryCashflow},
		AllowedPermissions:    []access.Permission{access.PermissionReadCreditPassport},
		PeriodStart:           passport.PeriodStart, PeriodEnd: passport.PeriodEnd,
		ExpiresAt: now.Add(24 * time.Hour), Purpose: "loan review", Evidence: passportProof("consent", 0, ""),
	}, workflow.Task{
		ID: "consent-approval", OrganizationID: "org-1", SuggestedAction: "grant_external_access",
		CreatorUserID: "admin", State: workflow.Approved, RequiredApprovers: 1,
		ApproverUserIDs: []string{"owner"}, Evidence: passportProof("approval", 0, ""),
	})
	if err != nil {
		t.Fatal(err)
	}
	request := consent.AccessRequest{
		GrantID:       grant.ID,
		ExternalActor: access.Actor{UserID: "lender-user", OrganizationID: "org-1", Roles: []access.Role{access.RoleExternalCollaborator}},
		Permission:    access.PermissionReadCreditPassport,
		PeriodStart:   passport.PeriodStart, PeriodEnd: passport.PeriodEnd,
		Resource: passport.ID, OccurredAt: now,
	}
	shared, err := Share(store, request, []string{CategoryCashflow}, passport)
	if err != nil {
		t.Fatal(err)
	}
	if shared.Cashflow == nil || shared.RiskFlags != nil || shared.Affordability != nil {
		t.Fatalf("shared passport leaked unconsented sections: %+v", shared)
	}
	if _, err := Share(store, request, []string{CategoryRiskFlags}, passport); err == nil {
		t.Fatal("unconsented passport category must be denied")
	}
	logs, err := store.Logs(owner("org-1"), "org-1")
	if err != nil || len(logs) != 2 || !logs[0].Allowed || logs[1].Allowed {
		t.Fatalf("passport access decisions were not audited: logs=%+v err=%v", logs, err)
	}
}

func passportInput() Input {
	periodStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	periodEnd := time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC)
	asOf := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	moneyIn := passportEvent("money-in", eventledger.PaymentReceived, 120_000, "2026-01-15", nil)
	moneyOut := passportEvent("money-out", eventledger.PaymentSent, -40_000, "2026-01-20", nil)
	paidInvoice := passportEvent("invoice-paid", eventledger.InvoiceIssued, 20_000, "2026-01-01", map[string]string{"due_date": "2026-01-10"})
	invoicePayment := passportEvent("invoice-payment", eventledger.PaymentReceived, 20_000, "2026-01-12", nil)
	unpaidInvoice := passportEvent("invoice-unpaid", eventledger.InvoiceIssued, 50_000, "2026-01-05", map[string]string{"due_date": "2026-01-31"})
	obligation := passportEvent("obligation", eventledger.ObligationCreated, 100_000, "2026-01-01", map[string]string{"monthly_payment_minor": "10000"})
	accounts := []ledger.Account{
		{ID: "bank", OrganizationID: "org-1", Code: "1000", Name: "Bank", Type: ledger.Asset, Currency: "RWF"},
		{ID: "revenue", OrganizationID: "org-1", Code: "4000", Name: "Revenue", Type: ledger.Revenue, Currency: "RWF"},
	}
	taskProof := passportProof("posting", 100_000, "2026-02-01")
	task := workflow.Task{ID: "task-1", OrganizationID: "org-1", State: workflow.Executed, AmountMinor: 100_000, Currency: "RWF", Evidence: taskProof}
	group := ledger.Group{
		ID: "posting-1", OrganizationID: "org-1", ApprovalTaskID: task.ID,
		CreatedAt: time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
		Entries: []ledger.Entry{
			{ID: "entry-1", OrganizationID: "org-1", AccountID: "bank", DebitMinor: 100_000, Currency: "RWF", PostingGroupID: "posting-1", ApprovalTaskID: task.ID, Evidence: taskProof},
			{ID: "entry-2", OrganizationID: "org-1", AccountID: "revenue", CreditMinor: 100_000, Currency: "RWF", PostingGroupID: "posting-1", ApprovalTaskID: task.ID, Evidence: taskProof},
		},
	}
	return Input{
		OrganizationID: "org-1", PeriodStart: periodStart, PeriodEnd: periodEnd, AsOf: asOf,
		Events:   []eventledger.EventView{moneyIn, moneyOut, paidInvoice, invoicePayment, unpaidInvoice, obligation},
		Accounts: accounts, ApprovalTasks: []workflow.Task{task}, PostingGroups: []ledger.Group{group},
		Reconciliation: reconciliation.Result{Candidates: []reconciliation.Candidate{{
			LeftEventID: paidInvoice.ID, RightEventID: invoicePayment.ID,
			State: reconciliation.Matched, Score: 1, Evidence: paidInvoice.Evidence,
		}}},
		RiskFlags: []RiskFlag{{
			ID: "risk-1", OrganizationID: "org-1", SourceEventID: moneyOut.ID,
			Type: "cash_outflow_concentration", Severity: "MEDIUM", Reason: "large single outflow",
			Evidence: moneyOut.Evidence,
		}},
		Policy: AffordabilityPolicy{
			ID: "affordability-sme", OrganizationID: "org-1", Version: 1, Currency: "RWF",
			MaxDebtServiceBasisPoints: 5000, StressBufferBasisPoints: 1000,
			AnnualInterestBasisPoints: 0, TermMonths: 12,
			Evidence: passportProof("policy", 0, "2026-01-01"),
		},
	}
}

func passportEvent(id string, kind eventledger.EventType, amount int64, occurred string, attributes map[string]string) eventledger.EventView {
	if attributes == nil {
		attributes = map[string]string{}
	}
	event := eventledger.Event{
		ID: id, OrganizationID: "org-1", Type: kind, Status: eventledger.Active,
		Evidence: passportProof(id, amount, occurred), Attributes: attributes,
	}
	return eventledger.EventView{Event: event, EffectiveStatus: eventledger.Active}
}

func passportProof(source string, amount int64, occurred string) evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID: "doc-" + source, SourceRecordID: "record-" + source,
		IngestionBatchID: "batch-1", ExtractionVersionID: "version-1",
		TransactionReference: source, OccurredOn: occurred, AmountMinor: amount,
		Currency: "RWF", Reason: "credit passport test", ConfidenceScore: .99,
		ConfidenceMethod: "fixture",
	}
}

func lead(organizationID string) access.Actor {
	return access.Actor{UserID: "lead", OrganizationID: organizationID, Roles: []access.Role{access.RoleFinanceLead}}
}

func owner(organizationID string) access.Actor {
	return access.Actor{UserID: "owner", OrganizationID: organizationID, Roles: []access.Role{access.RoleOrganizationOwner}}
}
