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
	RuntimeRunID   string `json:"runtimeRunId,omitempty"`
	ModelName      string `json:"modelName,omitempty"`
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
		Stats: AgentStatsData{},
		Agents: []AgentCardData{
			newAgent("a-intake", "Data Intake", "intake", "Extracts & cleans documents into structured records"),
			newAgent("a-recon", "Reconciliation", "recon", "Matches money movement to business reality"),
			newAgent("a-cfo", "CFO", "cfo", "Cashflow forecast, margin & anomaly detection"),
			newAgent("a-rel", "External Relationship", "relationship", "Builds the relationship graph & partner risk"),
			newAgent("a-contract", "Contract & Obligation", "contract", "Extracts terms, dates, obligations & renewals"),
			newAgent("a-coll", "Collections", "collections", "Late-payer list, reminder drafts & promise-to-pay"),
			newAgent("a-credit", "Credit Passport", "credit", "Assembles lender-ready credit profiles"),
			newAgent("a-supplier", "Supplier & Margin", "supplier", "Price-creep, overcharge & delivery performance"),
			newAgent("a-sales", "Sales & Growth", "sales", "Best/dead customers, churn & growth signals"),
			newAgent("a-audit", "Audit & Compliance", "audit", "Missing docs, SoD violations & fraud flags"),
		},
		Activity: []AgentActivityEventData{},
	}
}

func newAgent(id, name, icon, role string) AgentCardData {
	return AgentCardData{ID: id, Name: name, Icon: icon, Status: "idle", Role: role, LastRun: "not run", Insight: "Run this agent to generate a live analysis."}
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
