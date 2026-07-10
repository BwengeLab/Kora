package demo

type AgentCardData struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Icon           string `json:"icon"`
	Status         string `json:"status"`
	Role           string `json:"role"`
	ProcessedToday int    `json:"processedToday"`
	LastRun        string `json:"lastRun"`
	Insight        string `json:"insight"`
	AccuracyPct    int    `json:"accuracyPct"`
}

type AgentStatsData struct {
	AgentsActive        int `json:"agentsActive"`
	ProcessedToday      int `json:"processedToday"`
	SuggestionsAwaiting int `json:"suggestionsAwaiting"`
	AvgAccuracyPct      int `json:"avgAccuracyPct"`
}

type AgentActivityLinkData struct {
	Label string `json:"label"`
	To    string `json:"to"`
}

type AgentActivityEventData struct {
	ID        string                 `json:"id"`
	AgentID   string                 `json:"agentId"`
	AgentName string                 `json:"agentName"`
	At        string                 `json:"at"`
	Action    string                 `json:"action"`
	Detail    string                 `json:"detail"`
	Tone      string                 `json:"tone"`
	Link      *AgentActivityLinkData `json:"link,omitempty"`
}

type AgentFeedbackData struct {
	ID          string `json:"id"`
	AgentID     string `json:"agentId"`
	Rating      string `json:"rating"`
	SubmittedAt string `json:"submittedAt"`
	SubmittedBy string `json:"submittedBy"`
}

type AgentsOverviewData struct {
	Stats     AgentStatsData           `json:"stats"`
	Agents    []AgentCardData          `json:"agents"`
	Activity  []AgentActivityEventData `json:"activity"`
	Feedback  []AgentFeedbackData      `json:"feedback"`
	RunningID string                   `json:"runningId,omitempty"`
}

type EscalationData struct {
	ID        string `json:"id"`
	Customer  string `json:"customer"`
	Invoice   string `json:"invoice"`
	Amount    Money  `json:"amount"`
	Days      int    `json:"days"`
	Requested string `json:"requested"`
	By        string `json:"by"`
	Note      string `json:"note"`
}

type CollectionsManagementData struct {
	Overdue     []OverdueItem     `json:"overdue"`
	Escalations []EscalationData  `json:"escalations"`
	Policy      CollectionsPolicy `json:"policy"`
}

type CollectionsPolicy struct {
	ReminderCadence string `json:"reminderCadence"`
	DSOTarget       string `json:"dsoTarget"`
	AutoEscalateAt  string `json:"autoEscalateAt"`
}

func AgentsOverviewDemoData() AgentsOverviewData {
	return AgentsOverviewData{
		Stats: AgentStatsData{
			AgentsActive: 6, ProcessedToday: 1984, SuggestionsAwaiting: 250, AvgAccuracyPct: 91,
		},
		Agents: []AgentCardData{
			{ID: "a-intake", Name: "Data Intake", Icon: "intake", Status: "running", Role: "Extracts & cleans documents into structured records", ProcessedToday: 412, LastRun: "now", Insight: "3 files flagged for low-confidence fields", AccuracyPct: 96},
			{ID: "a-recon", Name: "Reconciliation", Icon: "recon", Status: "active", Role: "Matches money movement to business reality", ProcessedToday: 1248, LastRun: "2m ago", Insight: "236 suggested matches awaiting review", AccuracyPct: 94},
			{ID: "a-cfo", Name: "CFO", Icon: "cfo", Status: "active", Role: "Cashflow forecast, margin & anomaly detection", ProcessedToday: 64, LastRun: "8m ago", Insight: "Projected $3.21M cash by May 31 (+23%)", AccuracyPct: 91},
			{ID: "a-rel", Name: "External Relationship", Icon: "relationship", Status: "active", Role: "Builds the relationship graph & partner risk", ProcessedToday: 88, LastRun: "18m ago", Insight: "3 contracts expiring within 30 days", AccuracyPct: 92},
			{ID: "a-contract", Name: "Contract & Obligation", Icon: "contract", Status: "idle", Role: "Extracts terms, dates, obligations & renewals", ProcessedToday: 21, LastRun: "1h ago", Insight: "Office lease renewal needs a decision in 14 days", AccuracyPct: 89},
			{ID: "a-coll", Name: "Collections", Icon: "collections", Status: "active", Role: "Late-payer list, reminder drafts & promise-to-pay", ProcessedToday: 47, LastRun: "12m ago", Insight: "$214,890 overdue across 12 invoices", AccuracyPct: 90},
			{ID: "a-credit", Name: "Credit Passport", Icon: "credit", Status: "idle", Role: "Assembles lender-ready credit profiles", ProcessedToday: 4, LastRun: "25m ago", Insight: "Business health score holding at 82 (Good)", AccuracyPct: 93},
			{ID: "a-supplier", Name: "Supplier & Margin", Icon: "supplier", Status: "active", Role: "Price-creep, overcharge & delivery performance", ProcessedToday: 56, LastRun: "20m ago", Insight: "Software & subscriptions up 22% - review", AccuracyPct: 88},
			{ID: "a-sales", Name: "Sales & Growth", Icon: "sales", Status: "idle", Role: "Best/dead customers, churn & growth signals", ProcessedToday: 12, LastRun: "40m ago", Insight: "Awaiting cleaner sales data to activate fully", AccuracyPct: 84},
			{ID: "a-audit", Name: "Audit & Compliance", Icon: "audit", Status: "active", Role: "Missing docs, SoD violations & fraud flags", ProcessedToday: 32, LastRun: "32m ago", Insight: "2 SoD violations & 4 suspicious flags raised", AccuracyPct: 95},
		},
		Activity: []AgentActivityEventData{},
	}
}

func CollectionsManagementDemoData() CollectionsManagementData {
	return CollectionsManagementData{
		Overdue: CollectionsData(),
		Escalations: []EscalationData{
			{ID: "e1", Customer: "Umoja SACCO", Invoice: "INV-10231", Amount: moneyValue(5359000, "USD"), Days: 95, Requested: "write-off", By: "Diane Uwase", Note: "No response after 4 reminders; debtor insolvent per public filing."},
			{ID: "e2", Customer: "PT Imports", Invoice: "INV-10221", Amount: moneyValue(4860000, "USD"), Days: 62, Requested: "payment-plan", By: "Diane Uwase", Note: "Promised settlement by Friday; proposes 3-month plan."},
			{ID: "e3", Customer: "Vendor 7741", Invoice: "INV-10255", Amount: moneyValue(1920000, "USD"), Days: 31, Requested: "legal", By: "Diane Uwase", Note: "Disputed invoice, no PO; recommend formal notice."},
		},
		Policy: CollectionsPolicy{
			ReminderCadence: "Day 7, 14, 30",
			DSOTarget:       "≤ 35 days",
			AutoEscalateAt:  "90 days",
		},
	}
}
