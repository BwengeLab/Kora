package demo

type InsightData struct {
	ID           string    `json:"id"`
	IconKey      string    `json:"iconKey"`
	Title        string    `json:"title"`
	Subtitle     string    `json:"subtitle"`
	PrimaryValue string    `json:"primaryValue"`
	Delta        Trend     `json:"delta"`
	SparkColor   string    `json:"sparkColor"`
	Spark        []float64 `json:"spark"`
}

type CashForecastData struct {
	Current   Money      `json:"current"`
	Projected Money      `json:"projected"`
	Labels    []string   `json:"labels"`
	Actual    []*float64 `json:"actual"`
	Forecast  []*float64 `json:"forecast"`
}

type CloseTaskData struct {
	ID      string `json:"id"`
	Label   string `json:"label"`
	Area    string `json:"area"`
	Owner   string `json:"owner"`
	Done    bool   `json:"done"`
	Blocked bool   `json:"blocked,omitempty"`
	Note    string `json:"note,omitempty"`
}

type EvidenceGapData struct {
	ID        string `json:"id"`
	Reference string `json:"reference"`
	Party     string `json:"party"`
	Amount    string `json:"amount"`
	Age       string `json:"age"`
	Requested bool   `json:"requested,omitempty"`
}

type ControlCheckData struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	OK     bool   `json:"ok"`
	Detail string `json:"detail"`
}

type FinanceLeadDashboardData struct {
	CashForecast CashForecastData `json:"cashForecast"`
	CloseTasks   []CloseTaskData  `json:"closeTasks"`
	Insights     []InsightData    `json:"insights"`
}

type ContractData struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Counterparty string `json:"counterparty"`
	Type         string `json:"type"`
	Status       string `json:"status"`
	Value        Money  `json:"value"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	AutoRenew    bool   `json:"autoRenew"`
	Owner        string `json:"owner"`
	Reference    string `json:"reference"`
	Terms        string `json:"terms"`
	EvidenceName string `json:"evidenceName"`
}

type ContractsOverviewData struct {
	Items []ContractData `json:"items"`
}

type ControlPostureData struct {
	ControlHealth int    `json:"controlHealth"`
	ControlTrend  int    `json:"controlTrend"`
	RiskScore     string `json:"riskScore"`
	OpenRisks     int    `json:"openRisks"`
}

type BusinessRiskData struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Category       string `json:"category"`
	Severity       string `json:"severity"`
	Detail         string `json:"detail"`
	Recommendation string `json:"recommendation"`
	Owner          string `json:"owner"`
	Impact         string `json:"impact"`
	Likelihood     string `json:"likelihood"`
	EvidenceName   string `json:"evidenceName"`
	Trend          string `json:"trend"`
	Status         string `json:"status,omitempty"`
}

type ComplianceItemData struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	OK    bool   `json:"ok"`
	Note  string `json:"note"`
}

type OwnerRiskDashboardData struct {
	ControlPosture ControlPostureData   `json:"controlPosture"`
	Risks          []BusinessRiskData   `json:"risks"`
	Compliance     []ComplianceItemData `json:"compliance"`
}

type ControlsCloseData struct {
	Tasks         []CloseTaskData    `json:"tasks"`
	EvidenceGaps  []EvidenceGapData  `json:"evidenceGaps"`
	ControlChecks []ControlCheckData `json:"controlChecks"`
}

func floatPtr(v float64) *float64 { return &v }

func FinanceLeadDashboardDemoData() FinanceLeadDashboardData {
	return FinanceLeadDashboardData{
		CashForecast: CashForecastData{
			Current:   moneyValue(245738900, "USD"),
			Projected: moneyValue(321000000, "USD"),
			Labels:    []string{"Apr 21", "Apr 28", "May 5", "May 12", "May 19", "May 26", "May 31"},
			Actual:    []*float64{floatPtr(1.9), floatPtr(2.1), floatPtr(2.25), floatPtr(2.46), nil, nil, nil},
			Forecast:  []*float64{nil, nil, nil, floatPtr(2.46), floatPtr(2.74), floatPtr(2.98), floatPtr(3.21)},
		},
		CloseTasks: ControlsCloseDemoData().Tasks,
		Insights: []InsightData{
			{ID: "cash-forecast", IconKey: "forecast", Title: "Cash flow forecast", Subtitle: "Projected cash position on May 31, 2025", PrimaryValue: "$3.21M", Delta: Trend{Direction: "up", ValueText: "23%", Label: "vs Apr 30"}, SparkColor: "#16a37b", Spark: []float64{10, 12, 11, 14, 17, 19, 22, 26}},
			{ID: "overdue", IconKey: "overdue", Title: "Overdue invoices", Subtitle: "12 invoices overdue > 30 days", PrimaryValue: "$214,890", Delta: Trend{Direction: "down", ValueText: "8%", Label: "vs last week"}, SparkColor: "#e89914", Spark: []float64{22, 24, 23, 22, 20, 21, 19, 18}},
			{ID: "rising-expense", IconKey: "rising", Title: "Rising expense category", Subtitle: "Software & Subscriptions up 22%", PrimaryValue: "$48,560", Delta: Trend{Direction: "up", ValueText: "22%", Label: "vs last month"}, SparkColor: "#8b5cf6", Spark: []float64{6, 7, 9, 10, 12, 14, 15, 17}},
			{ID: "margin", IconKey: "margin", Title: "Margin pressure", Subtitle: "Gross margin down 2.4%", PrimaryValue: "24.6%", Delta: Trend{Direction: "down", ValueText: "2.4pp", Label: "vs last month"}, SparkColor: "#4361ee", Spark: []float64{29, 28, 27, 27, 26, 25, 25, 24}},
		},
	}
}

func ContractsOverviewDemoData() ContractsOverviewData {
	return ContractsOverviewData{Items: []ContractData{
		{ID: "ct-1", Title: "Office lease - Kigali Office Park", Counterparty: "Kigali Office Park Ltd.", Type: "lease", Status: "renewal-due", Value: moneyValue(14976000, "USD"), StartDate: "2024-06-01", EndDate: "2025-06-05", AutoRenew: false, Owner: "Eric Habimana", Reference: "OL-2025-05", Terms: "12-month lease, rent unchanged from prior term, 90-day notice to terminate.", EvidenceName: "Office Lease 2025.pdf"},
		{ID: "ct-2", Title: "Reinsurance treaty - Swiss Re", Counterparty: "Swiss Re", Type: "reinsurance", Status: "active", Value: moneyValue(82000000, "USD"), StartDate: "2025-01-01", EndDate: "2025-12-31", AutoRenew: true, Owner: "Aline Mukamana", Reference: "RI-TREATY-2025", Terms: "Quota-share 40% on motor and health books; quarterly cession statements.", EvidenceName: "Reinsurance treaty 2025.pdf"},
		{ID: "ct-3", Title: "Core systems SaaS", Counterparty: "Cloud Services Inc", Type: "service", Status: "active", Value: moneyValue(2688000, "USD"), StartDate: "2024-09-01", EndDate: "2025-08-31", AutoRenew: true, Owner: "Eric Habimana", Reference: "SUB-CORE-2024", Terms: "Annual subscription, 5,000 policy seats, 99.9% SLA.", EvidenceName: "SaaS agreement.pdf"},
		{ID: "ct-4", Title: "Broker agreement - BK Insurance", Counterparty: "BK Insurance Brokers", Type: "partner", Status: "active", Value: moneyValue(22320000, "USD"), StartDate: "2025-01-01", EndDate: "2026-12-31", AutoRenew: false, Owner: "Aline Mukamana", Reference: "BRK-2025-01", Terms: "15% commission on new business; quarterly reconciliation of placements.", EvidenceName: "Broker agreement.pdf"},
		{ID: "ct-5", Title: "Group health scheme - MediCare", Counterparty: "MediCare Network", Type: "policy", Status: "active", Value: moneyValue(69600000, "USD"), StartDate: "2025-02-01", EndDate: "2026-01-31", AutoRenew: false, Owner: "Eric Habimana", Reference: "POL-HLT-2210", Terms: "Corporate health cover for 320 lives; monthly premium installments.", EvidenceName: "Policy POL-HLT-2210.pdf"},
		{ID: "ct-6", Title: "Equipment finance - Bank of Kigali", Counterparty: "Bank of Kigali", Type: "vendor", Status: "active", Value: moneyValue(26880000, "USD"), StartDate: "2024-03-01", EndDate: "2027-02-28", AutoRenew: false, Owner: "Aline Mukamana", Reference: "LN-2024-0099", Terms: "36-month equipment finance at 14% APR; monthly installments.", EvidenceName: "Loan schedule.pdf"},
		{ID: "ct-7", Title: "Cleaning & facilities", Counterparty: "CleanCo Rwanda", Type: "service", Status: "expiring", Value: moneyValue(1440000, "USD"), StartDate: "2024-07-01", EndDate: "2025-05-31", AutoRenew: false, Owner: "Eric Habimana", Reference: "SVC-FAC-2024", Terms: "Monthly facilities service; expires end of month.", EvidenceName: "Facilities contract.pdf"},
		{ID: "ct-8", Title: "BI & analytics platform", Counterparty: "DataViz Co", Type: "service", Status: "draft", Value: moneyValue(2232000, "USD"), StartDate: "2025-06-01", EndDate: "2026-05-31", AutoRenew: true, Owner: "Eric Habimana", Reference: "DV-2025-DRAFT", Terms: "Pending signature - reporting & analytics subscription.", EvidenceName: "DataViz draft.pdf"},
	}}
}

func OwnerRiskDashboardDemoData() OwnerRiskDashboardData {
	return OwnerRiskDashboardData{
		ControlPosture: ControlPostureData{ControlHealth: 92, ControlTrend: 3, RiskScore: "Low-Moderate", OpenRisks: 5},
		Risks: []BusinessRiskData{
			{ID: "br-1", Title: "Gross margin pressure", Category: "Financial", Severity: "high", Detail: "Property line margin down 2.4pp; software & subscription costs up 22%.", Recommendation: "Review supplier pricing and re-price the property book.", Owner: "Eric Habimana (Finance Lead)", Impact: "~ $120K annual margin", Likelihood: "High", EvidenceName: "Margin analysis - May.xlsx", Trend: "up"},
			{ID: "br-2", Title: "Customer concentration", Category: "Revenue", Severity: "medium", Detail: "Top 3 corporate clients are 38% of premiums.", Recommendation: "Diversify the corporate pipeline next quarter.", Owner: "Aline Mukamana (Owner)", Impact: "38% of premium income", Likelihood: "Medium", EvidenceName: "Revenue concentration.pdf", Trend: "flat"},
			{ID: "br-3", Title: "High-value claim exposure", Category: "Claims", Severity: "high", Detail: "Warehouse fire claim of $184K awaiting dual approval.", Recommendation: "Confirm reinsurance recovery before settlement.", Owner: "Claims & Finance Lead", Impact: "$184,000 gross", Likelihood: "High", EvidenceName: "Claim CLM-2025-00501.pdf", Trend: "up"},
			{ID: "br-4", Title: "Suspicious activity", Category: "Fraud", Severity: "medium", Detail: "4 transactions flagged; 1 motor claim referred to SIU.", Recommendation: "Track SIU outcomes; review the affected policy.", Owner: "Patrick Niyonsenga (Auditor)", Impact: "$15,400 at risk", Likelihood: "Medium", EvidenceName: "SIU referral pack.pdf", Trend: "down"},
			{ID: "br-5", Title: "Overdue receivables", Category: "Liquidity", Severity: "medium", Detail: "$214,890 overdue > 30 days across 12 invoices.", Recommendation: "Escalate collections on the oldest 5 accounts.", Owner: "Eric Habimana (Finance Lead)", Impact: "$214,890 tied up", Likelihood: "Medium", EvidenceName: "Aging report - May.xlsx", Trend: "down"},
		},
		Compliance: []ComplianceItemData{
			{ID: "c-1", Label: "Segregation of duties enforced", OK: true, Note: "Preparer != approver on all financial actions"},
			{ID: "c-2", Label: "Dual approval over threshold", OK: true, Note: "Two approvers required above $100K"},
			{ID: "c-3", Label: "Immutable audit trail", OK: true, Note: "Every approval, posting & access logged"},
			{ID: "c-4", Label: "Evidence coverage", OK: false, Note: "9 entries missing supporting documents"},
			{ID: "c-5", Label: "Data residency (Rwanda)", OK: true, Note: "Financial data kept in-region"},
		},
	}
}

func ControlsCloseDemoData() ControlsCloseData {
	return ControlsCloseData{
		Tasks: []CloseTaskData{
			{ID: "ct-1", Label: "Reconcile all bank & MoMo accounts", Area: "Bank", Owner: "Diane Uwase", Done: true},
			{ID: "ct-2", Label: "Match premium receipts to policies", Area: "Revenue", Owner: "Diane Uwase", Done: true},
			{ID: "ct-3", Label: "Post payroll journal (May)", Area: "Payroll", Owner: "Eric Habimana", Done: true},
			{ID: "ct-4", Label: "Accrue outstanding supplier invoices", Area: "Accruals", Owner: "Diane Uwase", Done: false, Note: "3 invoices pending evidence"},
			{ID: "ct-5", Label: "Reconcile claims paid vs reserves", Area: "Claims", Owner: "Grace Ishimwe", Done: false},
			{ID: "ct-6", Label: "Compute & post VAT / PAYE", Area: "Tax", Owner: "Eric Habimana", Done: false, Blocked: true, Note: "Blocked: awaiting RRA confirmation"},
			{ID: "ct-7", Label: "Clear suspense & unreconciled items", Area: "Bank", Owner: "Diane Uwase", Done: false, Note: "1 suspicious transfer to resolve"},
			{ID: "ct-8", Label: "Reconcile reinsurance cessions", Area: "Revenue", Owner: "Eric Habimana", Done: true},
			{ID: "ct-9", Label: "Review intercompany balances", Area: "Accruals", Owner: "Eric Habimana", Done: true},
			{ID: "ct-10", Label: "Prepare management P&L", Area: "Reporting", Owner: "Eric Habimana", Done: false},
			{ID: "ct-11", Label: "Lock the period", Area: "Reporting", Owner: "Eric Habimana", Done: false, Blocked: true, Note: "Locks once all tasks complete"},
		},
		EvidenceGaps: []EvidenceGapData{
			{ID: "eg-1", Reference: "SUB-Q2-2025", Party: "Cloud Services Inc", Amount: "$2,240", Age: "12d"},
			{ID: "eg-2", Reference: "TH-INV-2241", Party: "TechHub Rwanda", Amount: "$9,800", Age: "1d"},
			{ID: "eg-3", Reference: "COMM-2025-05", Party: "Agent network", Amount: "$14,200", Age: "0d"},
		},
		ControlChecks: []ControlCheckData{
			{ID: "cc-1", Label: "Segregation of duties", OK: true, Detail: "Preparer != approver on every posting this period"},
			{ID: "cc-2", Label: "Dual approval over $100K", OK: true, Detail: "2 items routed for dual approval, both signed"},
			{ID: "cc-3", Label: "Evidence on every posting", OK: false, Detail: "3 postings missing supporting documents"},
			{ID: "cc-4", Label: "Approvals within policy limit", OK: true, Detail: "No limit breaches"},
			{ID: "cc-5", Label: "Bank recs complete", OK: false, Detail: "1 account has unreconciled items"},
		},
	}
}
