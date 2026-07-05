package demo

type PlatformTenantMetricData struct {
	ActiveTenants string `json:"activeTenants"`
	TotalSeats    string `json:"totalSeats"`
	MRR           string `json:"mrr"`
	AtRisk        string `json:"atRisk"`
}

type PlatformTenantRowData struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Plan   string `json:"plan"`
	Users  int    `json:"users"`
	MRR    string `json:"mrr"`
	Health string `json:"health"`
	Since  string `json:"since"`
}

type PlatformPlanMetricData struct {
	MRR                 string `json:"mrr"`
	ARR                 string `json:"arr"`
	NetRevenueRetention string `json:"netRevenueRetention"`
	Churn               string `json:"churn"`
}

type PlatformPlanRowData struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Price    string `json:"price"`
	Tenants  int    `json:"tenants"`
	Features string `json:"features"`
}

type PlatformFeatureFlagData struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Desc string `json:"desc"`
	On   bool   `json:"on"`
}

type PlatformHealthMetricData struct {
	OverallUptime string `json:"overallUptime"`
	OpenIncidents string `json:"openIncidents"`
	AvgLatency    string `json:"avgLatency"`
	ErrorRate     string `json:"errorRate"`
}

type PlatformServiceStatusData struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Status  string `json:"status"`
	Uptime  string `json:"uptime"`
	Latency string `json:"latency"`
}

type PlatformActiveIncidentData struct {
	Title   string `json:"title"`
	Detail  string `json:"detail"`
	Subtext string `json:"subtext"`
	Badge   string `json:"badge"`
}

type PlatformUsageMetricData struct {
	APICalls    string `json:"apiCalls"`
	AITokens    string `json:"aiTokens"`
	InfraCost   string `json:"infraCost"`
	GrossMargin string `json:"grossMargin"`
}

type PlatformCostSliceData struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
}

type PlatformUsageTenantData struct {
	Tenant string `json:"tenant"`
	Share  string `json:"share"`
}

type PlatformUserData struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Last  string `json:"last"`
}

type PlatformSupportGrantData struct {
	ID     string `json:"id"`
	Tenant string `json:"tenant"`
	Status string `json:"status"`
	Detail string `json:"detail"`
	Tone   string `json:"tone"`
}

type PlatformAuditEventData struct {
	ID     string `json:"id"`
	Actor  string `json:"actor"`
	Action string `json:"action"`
	Target string `json:"target"`
	At     string `json:"at"`
	Icon   string `json:"icon"`
	Tone   string `json:"tone"`
}

type PlatformConsoleData struct {
	TenantMetrics  PlatformTenantMetricData    `json:"tenantMetrics"`
	Tenants        []PlatformTenantRowData     `json:"tenants"`
	PlanMetrics    PlatformPlanMetricData      `json:"planMetrics"`
	Plans          []PlatformPlanRowData       `json:"plans"`
	FeatureFlags   []PlatformFeatureFlagData   `json:"featureFlags"`
	HealthMetrics  PlatformHealthMetricData    `json:"healthMetrics"`
	Services       []PlatformServiceStatusData `json:"services"`
	ActiveIncident PlatformActiveIncidentData  `json:"activeIncident"`
	UsageMetrics   PlatformUsageMetricData     `json:"usageMetrics"`
	CostByService  []PlatformCostSliceData     `json:"costByService"`
	UsageTenants   []PlatformUsageTenantData   `json:"usageTenants"`
	PlatformUsers  []PlatformUserData          `json:"platformUsers"`
	SupportGrants  []PlatformSupportGrantData  `json:"supportGrants"`
	AuditEvents    []PlatformAuditEventData    `json:"auditEvents"`
}

func PlatformConsoleDemoData() PlatformConsoleData {
	return PlatformConsoleData{
		TenantMetrics: PlatformTenantMetricData{
			ActiveTenants: "48",
			TotalSeats:    "612",
			MRR:           "$38.4k",
			AtRisk:        "2",
		},
		Tenants: []PlatformTenantRowData{
			{ID: "tenant-acme", Name: "Acme Insurance", Plan: "Growth", Users: 9, MRR: "$499", Health: "success", Since: "2024"},
			{ID: "tenant-umoja", Name: "Umoja SACCO", Plan: "Scale", Users: 24, MRR: "$1,299", Health: "success", Since: "2023"},
			{ID: "tenant-bright", Name: "Bright Microfinance", Plan: "Growth", Users: 12, MRR: "$499", Health: "warning", Since: "2024"},
			{ID: "tenant-kigali", Name: "Kigali Logistics", Plan: "Starter", Users: 4, MRR: "$149", Health: "success", Since: "2025"},
			{ID: "tenant-medicare", Name: "MediCare Network", Plan: "Scale", Users: 31, MRR: "$1,299", Health: "success", Since: "2023"},
			{ID: "tenant-pesaplus", Name: "PesaPlus Ltd", Plan: "Starter", Users: 3, MRR: "$149", Health: "danger", Since: "2025"},
		},
		PlanMetrics: PlatformPlanMetricData{
			MRR:                 "$38.4k",
			ARR:                 "$461k",
			NetRevenueRetention: "118%",
			Churn:               "1.2%",
		},
		Plans: []PlatformPlanRowData{
			{ID: "plan-starter", Name: "Starter", Price: "$149", Tenants: 14, Features: "Core ledger · 5 seats"},
			{ID: "plan-growth", Name: "Growth", Price: "$499", Tenants: 22, Features: "AI agents · 15 seats · integrations"},
			{ID: "plan-scale", Name: "Scale", Price: "$1,299", Tenants: 12, Features: "Multi-entity · unlimited seats · SSO"},
		},
		FeatureFlags: []PlatformFeatureFlagData{
			{ID: "flag-ai-copilot", Name: "AI Copilot", Desc: "Grounded assistant across all tenants", On: true},
			{ID: "flag-claims-pack", Name: "Insurance Claims pack", Desc: "Claims Officer role + workspace", On: true},
			{ID: "flag-credit-passport", Name: "Credit Passport sharing", Desc: "External lender portals", On: true},
			{ID: "flag-momo-reconcile", Name: "Mobile money auto-reconcile", Desc: "MoMo / Airtel matching agent", On: true},
			{ID: "flag-multi-entity", Name: "Multi-entity consolidation", Desc: "Group reporting (Scale only)", On: false},
			{ID: "flag-forecasting", Name: "Experimental forecasting", Desc: "ML cash-flow projections (beta)", On: false},
		},
		HealthMetrics: PlatformHealthMetricData{
			OverallUptime: "99.96%",
			OpenIncidents: "1",
			AvgLatency:    "78ms",
			ErrorRate:     "0.04%",
		},
		Services: []PlatformServiceStatusData{
			{ID: "svc-gateway", Name: "API Gateway", Status: "success", Uptime: "99.99%", Latency: "42ms"},
			{ID: "svc-core", Name: "gRPC Core (Go)", Status: "success", Uptime: "99.98%", Latency: "18ms"},
			{ID: "svc-agents", Name: "AI Agents (Python)", Status: "warning", Uptime: "99.81%", Latency: "210ms"},
			{ID: "svc-recon", Name: "Reconciliation engine", Status: "success", Uptime: "99.97%", Latency: "64ms"},
			{ID: "svc-ocr", Name: "Document OCR", Status: "success", Uptime: "99.95%", Latency: "320ms"},
			{ID: "svc-postgres", Name: "Postgres (primary)", Status: "success", Uptime: "100%", Latency: "3ms"},
		},
		ActiveIncident: PlatformActiveIncidentData{
			Title:   "Degraded performance · AI Agents",
			Detail:  "AI Agents elevated latency - investigating",
			Subtext: "Started 14:20 CAT · queue backlog draining · next update 15:00",
			Badge:   "Monitoring",
		},
		UsageMetrics: PlatformUsageMetricData{
			APICalls:    "4.2M",
			AITokens:    "182M",
			InfraCost:   "$6,840",
			GrossMargin: "82%",
		},
		CostByService: []PlatformCostSliceData{
			{Name: "AI inference", Value: 58},
			{Name: "Compute", Value: 22},
			{Name: "Storage", Value: 11},
			{Name: "Egress", Value: 9},
		},
		UsageTenants: []PlatformUsageTenantData{
			{Tenant: "MediCare Network", Share: "31%"},
			{Tenant: "Umoja SACCO", Share: "24%"},
			{Tenant: "Acme Insurance", Share: "14%"},
			{Tenant: "Bright Microfinance", Share: "9%"},
		},
		PlatformUsers: []PlatformUserData{
			{ID: "platform-jean", Name: "Jean-Paul Kagame", Email: "super@kora.local", Role: "Platform Owner", Last: "now"},
			{ID: "platform-sandrine", Name: "Sandrine Uwera", Email: "ops@kora.local", Role: "Platform Ops", Last: "2h ago"},
			{ID: "platform-david", Name: "David Mutoni", Email: "support@kora.local", Role: "Support Engineer", Last: "1d ago"},
			{ID: "platform-reta", Name: "Reta Bot", Email: "ci@kora.local", Role: "Service account", Last: "5m ago"},
		},
		SupportGrants: []PlatformSupportGrantData{
			{ID: "grant-bright", Tenant: "Bright Microfinance", Status: "Active", Detail: "38m left", Tone: "success"},
			{ID: "grant-pesaplus", Tenant: "PesaPlus Ltd", Status: "Expired", Detail: "ended 2d ago", Tone: "warning"},
			{ID: "grant-kigali", Tenant: "Kigali Logistics", Status: "Revoked", Detail: "by tenant", Tone: "danger"},
		},
		AuditEvents: []PlatformAuditEventData{
			{ID: "audit-1", Actor: "Sandrine Uwera", Action: "Enabled feature flag", Target: "Insurance Claims · Umoja SACCO", At: "14:42", Icon: "check", Tone: "success"},
			{ID: "audit-2", Actor: "David Mutoni", Action: "Requested support access", Target: "Bright Microfinance", At: "14:05", Icon: "activity", Tone: "info"},
			{ID: "audit-3", Actor: "super@kora.local", Action: "Onboarded tenant", Target: "Kigali Logistics", At: "11:20", Icon: "plus", Tone: "brand"},
			{ID: "audit-4", Actor: "Tenant Owner", Action: "Revoked support access", Target: "Kigali Logistics", At: "10:58", Icon: "ban", Tone: "danger"},
			{ID: "audit-5", Actor: "System", Action: "Scaled AI Agents pool", Target: "latency mitigation", At: "14:20", Icon: "arrow-up-right", Tone: "warning"},
		},
	}
}
