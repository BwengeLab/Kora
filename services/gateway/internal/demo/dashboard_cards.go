package demo

type Insight struct {
	ID          string    `json:"id"`
	IconKey     string    `json:"iconKey"`
	Title       string    `json:"title"`
	Subtitle    string    `json:"subtitle"`
	PrimaryValue string   `json:"primaryValue"`
	Delta       Trend     `json:"delta"`
	SparkColor  string    `json:"sparkColor"`
	Spark       []float64 `json:"spark"`
}

type RelationshipRow struct {
	ID        string `json:"id"`
	IconKey   string `json:"iconKey"`
	Label     string `json:"label"`
	Count     int    `json:"count"`
	TrendText string `json:"trendText"`
	TrendTone string `json:"trendTone"`
}

type CreditFactor struct {
	Name   string `json:"name"`
	Rating string `json:"rating"`
}

type CreditPassportSummary struct {
	Score   int            `json:"score"`
	Label   string         `json:"label"`
	Caption string         `json:"caption"`
	Updated string         `json:"updated"`
	Factors []CreditFactor `json:"factors"`
}

type RecentDocument struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Ext  string `json:"ext"`
	Size string `json:"size"`
	When string `json:"when"`
}

type OwnerDashboardData struct {
	Insights      []Insight              `json:"insights"`
	Relationships []RelationshipRow      `json:"relationships"`
	CreditPassport CreditPassportSummary `json:"creditPassport"`
	Documents     []RecentDocument       `json:"documents"`
}

type AdminStats struct {
	ActiveUsers           int `json:"activeUsers"`
	PendingRequests       int `json:"pendingRequests"`
	IntegrationsConnected int `json:"integrationsConnected"`
	IntegrationsTotal     int `json:"integrationsTotal"`
	ActivePolicies        int `json:"activePolicies"`
	CustomRoles           int `json:"customRoles"`
}

type AdminUser struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Email      string   `json:"email"`
	Roles      []string `json:"roles"`
	Status     string   `json:"status"`
	LastActive string   `json:"lastActive"`
	SODConflict bool    `json:"sodConflict,omitempty"`
}

type AccessRequest struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	RequestedRole string `json:"requestedRole"`
	Reason        string `json:"reason"`
	When          string `json:"when"`
}

type AccessAlert struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Detail   string `json:"detail"`
	Severity string `json:"severity"`
}

type PolicyVersion struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Version   string `json:"version"`
	UpdatedBy string `json:"updatedBy"`
	When      string `json:"when"`
}

type BillingSummary struct {
	Plan          string  `json:"plan"`
	Seats         int     `json:"seats"`
	SeatsIncluded int     `json:"seatsIncluded"`
	UsagePct      float64 `json:"usagePct"`
	Renews        string  `json:"renews"`
}

type AdminDashboardData struct {
	Stats          AdminStats       `json:"stats"`
	Users          []AdminUser      `json:"users"`
	AccessRequests []AccessRequest  `json:"accessRequests"`
	AccessAlerts   []AccessAlert    `json:"accessAlerts"`
	Policies       []PolicyVersion  `json:"policies"`
	Billing        BillingSummary   `json:"billing"`
}

func OwnerDashboardCardsData() OwnerDashboardData {
	return OwnerDashboardData{
		Insights: []Insight{
			{ID: "cash-forecast", IconKey: "forecast", Title: "Cash flow forecast", Subtitle: "Projected cash position on May 31, 2025", PrimaryValue: "$3.21M", Delta: Trend{Direction: "up", ValueText: "23%", Label: "vs Apr 30"}, SparkColor: "#16a37b", Spark: []float64{10, 12, 11, 14, 17, 19, 22, 26}},
			{ID: "overdue", IconKey: "overdue", Title: "Overdue invoices", Subtitle: "12 invoices overdue > 30 days", PrimaryValue: "$214,890", Delta: Trend{Direction: "down", ValueText: "8%", Label: "vs last week"}, SparkColor: "#e89914", Spark: []float64{22, 24, 23, 22, 20, 21, 19, 18}},
			{ID: "rising-expense", IconKey: "rising", Title: "Rising expense category", Subtitle: "Software & Subscriptions up 22%", PrimaryValue: "$48,560", Delta: Trend{Direction: "up", ValueText: "22%", Label: "vs last month"}, SparkColor: "#8b5cf6", Spark: []float64{6, 7, 9, 10, 12, 14, 15, 17}},
			{ID: "margin", IconKey: "margin", Title: "Margin pressure", Subtitle: "Gross margin down 2.4%", PrimaryValue: "24.6%", Delta: Trend{Direction: "down", ValueText: "2.4pp", Label: "vs last month"}, SparkColor: "#4361ee", Spark: []float64{29, 28, 27, 27, 26, 25, 25, 24}},
		},
		Relationships: []RelationshipRow{
			{ID: "cust", IconKey: "customers", Label: "Customers", Count: 248, TrendText: "12 this month", TrendTone: "success"},
			{ID: "sup", IconKey: "suppliers", Label: "Suppliers", Count: 186, TrendText: "5 this month", TrendTone: "success"},
			{ID: "part", IconKey: "partners", Label: "Partners", Count: 42, TrendText: "-", TrendTone: "neutral"},
			{ID: "con", IconKey: "contracts", Label: "Contracts", Count: 78, TrendText: "3 expiring soon", TrendTone: "warning"},
			{ID: "ren", IconKey: "renewals", Label: "Renewals", Count: 9, TrendText: "Due in 30 days", TrendTone: "warning"},
		},
		CreditPassport: CreditPassportSummary{
			Score: 82, Label: "Good", Caption: "Business Health Score", Updated: "May 18, 2025",
			Factors: []CreditFactor{
				{Name: "Payment Behavior", Rating: "Good"},
				{Name: "Financial Strength", Rating: "Good"},
				{Name: "Risk Profile", Rating: "Low"},
				{Name: "Credit Readiness", Rating: "Strong"},
			},
		},
		Documents: []RecentDocument{
			{ID: "d1", Name: "Bank Statement - May 2025", Ext: "PDF", Size: "2.4 MB", When: "1h ago"},
			{ID: "d2", Name: "Invoice INV-10356", Ext: "PDF", Size: "320 KB", When: "2h ago"},
			{ID: "d3", Name: "Q2 Forecast.xlsx", Ext: "XLSX", Size: "1.2 MB", When: "3h ago"},
			{ID: "d4", Name: "Supplier Agreement.pdf", Ext: "PDF", Size: "850 KB", When: "5h ago"},
			{ID: "d5", Name: "Audit Report - April 2025", Ext: "PDF", Size: "1.6 MB", When: "1d ago"},
		},
	}
}

func AdminDashboardCardsData() AdminDashboardData {
	return AdminDashboardData{
		Stats: AdminStats{ActiveUsers: 24, PendingRequests: 3, IntegrationsConnected: 6, IntegrationsTotal: 8, ActivePolicies: 12, CustomRoles: 4},
		Users: []AdminUser{
			{ID: "u-1", Name: "Aline Mukamana", Email: "owner@acme.local", Roles: []string{"Organization Owner"}, Status: "active", LastActive: "2m ago"},
			{ID: "u-2", Name: "Eric Habimana", Email: "cfo@acme.local", Roles: []string{"Finance Lead"}, Status: "active", LastActive: "8m ago"},
			{ID: "u-3", Name: "Diane Uwase", Email: "accountant@acme.local", Roles: []string{"Finance Operator"}, Status: "active", LastActive: "1m ago"},
			{ID: "u-4", Name: "Patrick Niyonsenga", Email: "auditor@acme.local", Roles: []string{"Auditor"}, Status: "active", LastActive: "1h ago"},
			{ID: "u-5", Name: "James Okello", Email: "claims@acme.local", Roles: []string{"Claims Officer"}, Status: "active", LastActive: "20m ago", SODConflict: true},
			{ID: "u-6", Name: "Grace Mutoni", Email: "grace@acme.local", Roles: []string{"Finance Operator"}, Status: "invited", LastActive: "Invited 1d ago"},
		},
		AccessRequests: []AccessRequest{
			{ID: "ar-1", Name: "BK Lender Officer", RequestedRole: "External Collaborator · Credit Passport", Reason: "Loan assessment", When: "2h ago"},
			{ID: "ar-2", Name: "Grace Mutoni", RequestedRole: "Reconciliation: resolve", Reason: "Onboarding", When: "1d ago"},
			{ID: "ar-3", Name: "External Auditor (PwC)", RequestedRole: "Audit pack · 30-day scope", Reason: "Annual audit", When: "2d ago"},
		},
		AccessAlerts: []AccessAlert{
			{ID: "aa-1", Title: "SoD conflict on Claims Officer", Detail: "Role allows create-party AND approve-payment. Split the bundle.", Severity: "high"},
			{ID: "aa-2", Title: "2 users without 2FA", Detail: "Enforce two-factor for finance roles.", Severity: "medium"},
			{ID: "aa-3", Title: "Stale invite", Detail: "Grace Mutoni invited 1d ago - not yet accepted.", Severity: "medium"},
		},
		Policies: []PolicyVersion{
			{ID: "p-1", Name: "Approval limits", Version: "v4", UpdatedBy: "Sarah Ingabire", When: "2h ago"},
			{ID: "p-2", Name: "Auto-match threshold", Version: "v2", UpdatedBy: "Eric Habimana", When: "3d ago"},
			{ID: "p-3", Name: "Duplicate window", Version: "v1", UpdatedBy: "Sarah Ingabire", When: "2w ago"},
			{ID: "p-4", Name: "Evidence requirements", Version: "v3", UpdatedBy: "Sarah Ingabire", When: "1mo ago"},
		},
		Billing: BillingSummary{Plan: "Enterprise", Seats: 24, SeatsIncluded: 30, UsagePct: 0.74, Renews: "Jun 1, 2025"},
	}
}
