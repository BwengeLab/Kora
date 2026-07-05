package demo

type OperatorFocusData struct {
	ExceptionsToClear int   `json:"exceptionsToClear"`
	UnmatchedCount    int   `json:"unmatchedCount"`
	UnmatchedValue    Money `json:"unmatchedValue"`
	DataQualityFlags  int   `json:"dataQualityFlags"`
	AgentSuggestions  int   `json:"agentSuggestions"`
}

type OperatorThroughputData struct {
	ClearedToday int      `json:"clearedToday"`
	ClearedMonth int      `json:"clearedMonth"`
	DailyGoal    int      `json:"dailyGoal"`
	StreakDays   int      `json:"streakDays"`
	WeekLabels   []string `json:"weekLabels"`
	WeekSeries   []int    `json:"weekSeries"`
}

type ResumeItemData struct {
	ReconID    string `json:"reconId"`
	Party      string `json:"party"`
	Amount     Money  `json:"amount"`
	Tier       string `json:"tier"`
	Confidence int    `json:"confidence"`
	Note       string `json:"note"`
}

type OperatorTaskData struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Context      string `json:"context"`
	Status       string `json:"status"`
	DeadlineText string `json:"deadlineText"`
	Urgent       bool   `json:"urgent"`
}

type IntakeBatchData struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Source  string `json:"source"`
	Records int    `json:"records"`
	Status  string `json:"status"`
	Flags   int    `json:"flags"`
	When    string `json:"when"`
}

type OperatorHomeData struct {
	Focus         OperatorFocusData      `json:"focus"`
	Throughput    OperatorThroughputData `json:"throughput"`
	Resume        ResumeItemData         `json:"resume"`
	Tasks         []OperatorTaskData     `json:"tasks"`
	IntakeBatches []IntakeBatchData      `json:"intakeBatches"`
}

type ControlSubscoreData struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

type ControlHealthData struct {
	Score     int                   `json:"score"`
	TrendPts  int                   `json:"trendPts"`
	Subscores []ControlSubscoreData `json:"subscores"`
}

type RiskStatsData struct {
	RiskFlags     int `json:"riskFlags"`
	SODViolations int `json:"sodViolations"`
	Suspicious    int `json:"suspicious"`
	MissingDocs   int `json:"missingDocs"`
}

type SODViolationData struct {
	ID       string `json:"id"`
	User     string `json:"user"`
	Role     string `json:"role"`
	Conflict string `json:"conflict"`
	Severity string `json:"severity"`
	Detail   string `json:"detail"`
}

type MissingDocData struct {
	ID        string `json:"id"`
	Party     string `json:"party"`
	Reference string `json:"reference"`
	Amount    Money  `json:"amount"`
	Missing   string `json:"missing"`
	AgeText   string `json:"ageText"`
}

type AuditorHomeData struct {
	ControlHealth ControlHealthData  `json:"controlHealth"`
	RiskStats     RiskStatsData      `json:"riskStats"`
	SODViolations []SODViolationData `json:"sodViolations"`
	MissingDocs   []MissingDocData   `json:"missingDocs"`
}

type PlatformStatsData struct {
	ActiveTenants         int     `json:"activeTenants"`
	TenantsAddedThisMonth int     `json:"tenantsAddedThisMonth"`
	SuspendedTenants      int     `json:"suspendedTenants"`
	MRR                   Money   `json:"mrr"`
	MRRGrowthPct          int     `json:"mrrGrowthPct"`
	UptimePct             float64 `json:"uptimePct"`
	GrossMarginPct        int     `json:"grossMarginPct"`
}

type TenantGrowthData struct {
	Labels []string `json:"labels"`
	Series []int    `json:"series"`
}

type SystemHealthData struct {
	UptimePct       float64 `json:"uptimePct"`
	ErrorRatePct    float64 `json:"errorRatePct"`
	P95LatencyMs    int     `json:"p95LatencyMs"`
	RequestsPerSec  int     `json:"requestsPerSec"`
	ModelSpendToday Money   `json:"modelSpendToday"`
}

type PlatformTenantData struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Plan             string  `json:"plan"`
	Status           string  `json:"status"`
	MRR              Money   `json:"mrr"`
	HealthScore      int     `json:"healthScore"`
	CostRevenueRatio float64 `json:"costRevenueRatio"`
	Vertical         string  `json:"vertical"`
}

type IncidentData struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Severity string `json:"severity"`
	Status   string `json:"status"`
	When     string `json:"when"`
}

type SupportRequestData struct {
	ID        string `json:"id"`
	Tenant    string `json:"tenant"`
	Requester string `json:"requester"`
	Reason    string `json:"reason"`
	Status    string `json:"status"`
	When      string `json:"when"`
}

type PlatformHomeData struct {
	Stats        PlatformStatsData    `json:"stats"`
	TenantGrowth TenantGrowthData     `json:"tenantGrowth"`
	SystemHealth SystemHealthData     `json:"systemHealth"`
	Tenants      []PlatformTenantData `json:"tenants"`
	Incidents    []IncidentData       `json:"incidents"`
	SupportQueue []SupportRequestData `json:"supportQueue"`
}

func OperatorHomeDemoData() OperatorHomeData {
	return OperatorHomeData{
		Focus: OperatorFocusData{
			ExceptionsToClear: 47,
			UnmatchedCount:    23,
			UnmatchedValue:    moneyValue(31254000, "USD"),
			DataQualityFlags:  6,
			AgentSuggestions:  14,
		},
		Throughput: OperatorThroughputData{
			ClearedToday: 18,
			ClearedMonth: 1248,
			DailyGoal:    30,
			StreakDays:   6,
			WeekLabels:   []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"},
			WeekSeries:   []int{22, 26, 19, 31, 28, 8, 18},
		},
		Resume: ResumeItemData{
			ReconID:    "r-4",
			Party:      "PT Imports",
			Amount:     moneyValue(876000, "USD"),
			Tier:       "review",
			Confidence: 58,
			Note:       "$260 over PO - needs your decision",
		},
		Tasks: []OperatorTaskData{
			{ID: "tk-1", Title: "Resolve unmatched HSBC batch", Context: "23 transactions - May 14", Status: "assigned", DeadlineText: "Due today", Urgent: true},
			{ID: "tk-2", Title: "Request invoice from PT Imports", Context: "PO-2025-441 - $260 over", Status: "awaiting_info", DeadlineText: "Waiting 1d", Urgent: false},
			{ID: "tk-3", Title: "Fix column mapping - Airtel CSV", Context: "Data-quality flag - 3 fields", Status: "returned", DeadlineText: "Returned by Kora", Urgent: true},
			{ID: "tk-4", Title: "Cloud Services subscription match", Context: "SUB-Q2 - prepared", Status: "prepared", DeadlineText: "Awaiting Finance Lead", Urgent: false},
			{ID: "tk-5", Title: "Prepare travel reimbursement", Context: "D. Uwase - $180", Status: "assigned", DeadlineText: "Due in 2d", Urgent: false},
		},
		IntakeBatches: []IntakeBatchData{
			{ID: "b-1", Name: "HSBC Statement - May.pdf", Source: "HSBC", Records: 412, Status: "processed", Flags: 0, When: "1h ago"},
			{ID: "b-2", Name: "Airtel Money - May.csv", Source: "Airtel", Records: 88, Status: "needs_review", Flags: 3, When: "2h ago"},
			{ID: "b-3", Name: "EBM invoices - week 20.xlsx", Source: "EBM/RRA", Records: 156, Status: "processing", Flags: 0, When: "12m ago"},
			{ID: "b-4", Name: "MoMo claims - May.csv", Source: "MTN MoMo", Records: 64, Status: "needs_review", Flags: 3, When: "3h ago"},
		},
	}
}

func AuditorHomeDemoData() AuditorHomeData {
	return AuditorHomeData{
		ControlHealth: ControlHealthData{
			Score:    92,
			TrendPts: 3,
			Subscores: []ControlSubscoreData{
				{Label: "Approvals & SoD", Value: 95},
				{Label: "Evidence coverage", Value: 88},
				{Label: "Reconciliation integrity", Value: 96},
				{Label: "Access controls", Value: 90},
			},
		},
		RiskStats: RiskStatsData{
			RiskFlags:     11,
			SODViolations: 2,
			Suspicious:    4,
			MissingDocs:   9,
		},
		SODViolations: []SODViolationData{
			{ID: "sod-1", User: "Eric Habimana", Role: "Finance Lead", Conflict: "Prepared & attempted self-approve", Severity: "high", Detail: "Cloud Services match SUB-Q2 - blocked by SoD"},
			{ID: "sod-2", User: "James Okello", Role: "Custom: Claims Officer", Conflict: "Create party + approve payment", Severity: "medium", Detail: "Permission bundle allows both - review role"},
		},
		MissingDocs: []MissingDocData{
			{ID: "md-1", Party: "Vendor 7741", Reference: "BK - May 14", Amount: moneyValue(392000, "USD"), Missing: "No invoice or PO", AgeText: "1d"},
			{ID: "md-2", Party: "PT Imports", Reference: "PO-2025-441", Amount: moneyValue(876000, "USD"), Missing: "Corrected invoice", AgeText: "6h"},
			{ID: "md-3", Party: "OFFSHORE LTD", Reference: "BK - May 12", Amount: moneyValue(1540000, "USD"), Missing: "Contract on file", AgeText: "3d"},
			{ID: "md-4", Party: "Diane Uwase", Reference: "TRAVEL-MAY", Amount: moneyValue(18000, "USD"), Missing: "Receipt image", AgeText: "1d"},
		},
	}
}

func PlatformHomeDemoData() PlatformHomeData {
	return PlatformHomeData{
		Stats: PlatformStatsData{
			ActiveTenants:         142,
			TenantsAddedThisMonth: 12,
			SuspendedTenants:      3,
			MRR:                   moneyValue(4820000, "USD"),
			MRRGrowthPct:          18,
			UptimePct:             99.98,
			GrossMarginPct:        72,
		},
		TenantGrowth: TenantGrowthData{
			Labels: []string{"Dec", "Jan", "Feb", "Mar", "Apr", "May"},
			Series: []int{86, 98, 109, 121, 130, 142},
		},
		SystemHealth: SystemHealthData{
			UptimePct:       99.98,
			ErrorRatePct:    0.04,
			P95LatencyMs:    142,
			RequestsPerSec:  1840,
			ModelSpendToday: moneyValue(31240, "USD"),
		},
		Tenants: []PlatformTenantData{
			{ID: "tn-1", Name: "Acme Insurance", Plan: "Enterprise", Status: "active", MRR: moneyValue(420000, "USD"), HealthScore: 96, CostRevenueRatio: 0.28, Vertical: "Insurance"},
			{ID: "tn-2", Name: "Umoja SACCO", Plan: "Growth", Status: "active", MRR: moneyValue(180000, "USD"), HealthScore: 91, CostRevenueRatio: 0.34, Vertical: "SACCO/MFI"},
			{ID: "tn-3", Name: "Kigali Logistics", Plan: "Growth", Status: "active", MRR: moneyValue(150000, "USD"), HealthScore: 88, CostRevenueRatio: 0.41, Vertical: "Logistics"},
			{ID: "tn-4", Name: "Bright Schools Grp", Plan: "Starter", Status: "trial", MRR: moneyValue(0, "USD"), HealthScore: 72, CostRevenueRatio: 0, Vertical: "Education"},
			{ID: "tn-5", Name: "MediCare Clinics", Plan: "Enterprise", Status: "active", MRR: moneyValue(360000, "USD"), HealthScore: 94, CostRevenueRatio: 0.31, Vertical: "Healthcare"},
			{ID: "tn-6", Name: "Old Trade Co.", Plan: "Growth", Status: "suspended", MRR: moneyValue(0, "USD"), HealthScore: 38, CostRevenueRatio: 0.92, Vertical: "Distribution"},
		},
		Incidents: []IncidentData{
			{ID: "inc-1", Title: "QuickBooks connector elevated errors", Severity: "minor", Status: "monitoring", When: "2h ago"},
			{ID: "inc-2", Title: "Doc-AI latency spike (p95 up)", Severity: "major", Status: "open", When: "40m ago"},
		},
		SupportQueue: []SupportRequestData{
			{ID: "sr-1", Tenant: "Umoja SACCO", Requester: "support@kora", Reason: "Import mapping help", Status: "requested", When: "15m ago"},
			{ID: "sr-2", Tenant: "MediCare Clinics", Requester: "support@kora", Reason: "Reconciliation question", Status: "active", When: "expires 38m"},
		},
	}
}
