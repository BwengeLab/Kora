package financeanalytics

import (
	"slices"
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/libs/reconciliation"
	"github.com/kora-finance/kora/libs/workflow"
)

func TestGenerateCalculatesCashflowProfitAndAging(t *testing.T) {
	input := analyticsFixture()
	report, err := Generate(financeLead(), input)
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	if report.Cashflow.MoneyInMinor != 100_000 || report.Cashflow.MoneyOutMinor != 50_000 || report.Cashflow.NetCashflowMinor != 50_000 {
		t.Fatalf("cashflow = %+v", report.Cashflow)
	}
	if report.ProfitAndLoss.RevenueMinor != 100_000 ||
		report.ProfitAndLoss.CostOfGoodsSoldMinor != 40_000 ||
		report.ProfitAndLoss.OperatingExpenseMinor != 10_000 ||
		report.ProfitAndLoss.GrossProfitMinor != 60_000 ||
		report.ProfitAndLoss.NetProfitMinor != 50_000 ||
		report.ProfitAndLoss.GrossMarginBasisPoints != 6000 ||
		report.ProfitAndLoss.NetMarginBasisPoints != 5000 {
		t.Fatalf("p&l = %+v", report.ProfitAndLoss)
	}
	if report.Aging.CurrentMinor != 0 || report.Aging.OverdueMinor != 30_000 || report.Aging.OverdueInvoiceCount != 1 {
		t.Fatalf("aging = %+v", report.Aging)
	}
	if report.Aging.Buckets[1].AmountMinor != 30_000 || report.Aging.Buckets[1].InvoiceCount != 1 {
		t.Fatalf("overdue bucket = %+v", report.Aging.Buckets)
	}
}

func TestGenerateIsStableForReorderedInputs(t *testing.T) {
	input := analyticsFixture()
	report, err := Generate(financeLead(), input)
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	reordered := input
	slices.Reverse(reordered.Accounts)
	slices.Reverse(reordered.ApprovalTasks)
	slices.Reverse(reordered.PostingGroups)
	slices.Reverse(reordered.Events)
	slices.Reverse(reordered.Reconciliation.Candidates)
	reorderedReport, err := Generate(financeLead(), reordered)
	if err != nil {
		t.Fatalf("Generate(reordered) error = %v", err)
	}
	if report.ID != reorderedReport.ID {
		t.Fatalf("report ID changed after reorder: %s != %s", report.ID, reorderedReport.ID)
	}
}

func TestGenerateRejectsCrossTenantOrFabricatedData(t *testing.T) {
	input := analyticsFixture()
	input.Accounts[0].OrganizationID = "org_other"
	if _, err := Generate(financeLead(), input); err == nil {
		t.Fatal("Generate() accepted cross-tenant account")
	}

	input = analyticsFixture()
	input.Reconciliation.Candidates[0].Evidence.SourceRecordID = "fabricated"
	if _, err := Generate(financeLead(), input); err == nil {
		t.Fatal("Generate() accepted fabricated reconciliation evidence")
	}

	input = analyticsFixture()
	input.PostingGroups[0].Entries[0].CreditMinor = 1
	if _, err := Generate(financeLead(), input); err == nil {
		t.Fatal("Generate() accepted unbalanced posting group")
	}
}

func analyticsFixture() Input {
	start := date("2026-01-01")
	end := date("2026-01-31")
	asOf := date("2026-02-20")
	return Input{
		OrganizationID:   "org_1",
		Currency:         "RWF",
		PeriodStart:      start,
		PeriodEnd:        end,
		AsOf:             asOf,
		AgingBucketsDays: []int{0, 30, 60},
		Accounts: []ledger.Account{
			{ID: "cash", OrganizationID: "org_1", Code: "1000", Name: "Cash", Type: ledger.Asset, Currency: "RWF"},
			{ID: "revenue", OrganizationID: "org_1", Code: "4000", Name: "Revenue", Type: ledger.Revenue, Currency: "RWF"},
			{ID: "cogs", OrganizationID: "org_1", Code: "5000", Name: "Direct Costs", Type: ledger.Expense, Currency: "RWF"},
			{ID: "opex", OrganizationID: "org_1", Code: "6000", Name: "Operating Expenses", Type: ledger.Expense, Currency: "RWF"},
		},
		ExpenseClassifications: map[string]ExpenseClass{"cogs": CostOfGoodsSold, "opex": OperatingExpense},
		ApprovalTasks: []workflow.Task{
			task("task_revenue", 100_000, workflow.Executed, "rec_revenue"),
			task("task_cogs", 40_000, workflow.Executed, "rec_cogs"),
			task("task_opex", 10_000, workflow.Executed, "rec_opex"),
		},
		PostingGroups: []ledger.Group{
			group("pg_revenue", "task_revenue", start.Add(24*time.Hour), []ledger.Entry{
				entry("cash", 100_000, 0, "task_revenue", "pg_revenue", "rec_revenue"),
				entry("revenue", 0, 100_000, "task_revenue", "pg_revenue", "rec_revenue"),
			}),
			group("pg_cogs", "task_cogs", start.Add(48*time.Hour), []ledger.Entry{
				entry("cogs", 40_000, 0, "task_cogs", "pg_cogs", "rec_cogs"),
				entry("cash", 0, 40_000, "task_cogs", "pg_cogs", "rec_cogs"),
			}),
			group("pg_opex", "task_opex", start.Add(72*time.Hour), []ledger.Entry{
				entry("opex", 10_000, 0, "task_opex", "pg_opex", "rec_opex"),
				entry("cash", 0, 10_000, "task_opex", "pg_opex", "rec_opex"),
			}),
		},
		Events: []eventledger.EventView{
			view("pay_in", eventledger.PaymentReceived, "2026-01-08", 100_000, "rec_pay_in", nil),
			view("pay_out", eventledger.PaymentSent, "2026-01-10", -50_000, "rec_pay_out", nil),
			view("invoice_paid", eventledger.InvoiceIssued, "2026-01-03", 100_000, "rec_invoice_paid", map[string]string{"due_date": "2026-01-20"}),
			view("invoice_overdue", eventledger.InvoiceIssued, "2026-01-04", 30_000, "rec_invoice_overdue", map[string]string{"due_date": "2026-01-15"}),
		},
		Reconciliation: reconciliation.Result{
			Candidates: []reconciliation.Candidate{{
				LeftEventID:  "invoice_paid",
				RightEventID: "pay_in",
				State:        reconciliation.Matched,
				Score:        0.98,
				Evidence:     proof("rec_invoice_paid"),
				Reason:       "deterministic match",
			}},
			PolicyID:      "policy_1",
			PolicyVersion: 1,
		},
	}
}

func financeLead() access.Actor {
	return access.Actor{UserID: "u_finance", OrganizationID: "org_1", Roles: []access.Role{access.RoleFinanceLead}}
}

func date(value string) time.Time {
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		panic(err)
	}
	return parsed
}

func task(id string, amount int64, state workflow.State, sourceRecord string) workflow.Task {
	return workflow.Task{ID: id, OrganizationID: "org_1", SuggestedAction: "post ledger", CreatorUserID: "u_creator", State: state, AmountMinor: amount, Currency: "RWF", Evidence: proof(sourceRecord)}
}

func group(id, taskID string, createdAt time.Time, entries []ledger.Entry) ledger.Group {
	return ledger.Group{ID: id, OrganizationID: "org_1", ApprovalTaskID: taskID, Entries: entries, CreatedBy: "u_finance", CreatedAt: createdAt}
}

func entry(accountID string, debit, credit int64, taskID, groupID, sourceRecord string) ledger.Entry {
	return ledger.Entry{ID: "entry_" + accountID + "_" + groupID, OrganizationID: "org_1", AccountID: accountID, DebitMinor: debit, CreditMinor: credit, Currency: "RWF", PostingGroupID: groupID, ApprovalTaskID: taskID, Evidence: proof(sourceRecord)}
}

func view(id string, eventType eventledger.EventType, occurredOn string, amount int64, sourceRecord string, attrs map[string]string) eventledger.EventView {
	ev := eventledger.Event{ID: id, OrganizationID: "org_1", Type: eventType, Status: eventledger.Active, Evidence: proofWithDate(sourceRecord, occurredOn, amount), Attributes: attrs}
	return eventledger.EventView{Event: ev, EffectiveStatus: eventledger.Active}
}

func proof(sourceRecord string) evidence.Evidence {
	return proofWithDate(sourceRecord, "2026-01-01", 1)
}

func proofWithDate(sourceRecord, occurredOn string, amount int64) evidence.Evidence {
	return evidence.Evidence{
		SourceDocumentID:    "doc_1",
		SourceRecordID:      sourceRecord,
		IngestionBatchID:    "batch_1",
		ExtractionVersionID: "extract_1",
		OccurredOn:          occurredOn,
		AmountMinor:         amount,
		Currency:            "RWF",
		Reason:              "fixture evidence",
		ConfidenceScore:     0.95,
	}
}
