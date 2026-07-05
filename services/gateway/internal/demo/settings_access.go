package demo

type OrgUserData struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Role       string `json:"role"`
	Department string `json:"department"`
	Scope      string `json:"scope"`
	Status     string `json:"status"`
	LastActive string `json:"lastActive"`
}

type ApprovalRuleData struct {
	ID              string   `json:"id"`
	Label           string   `json:"label"`
	Scope           string   `json:"scope"`
	Category        string   `json:"category"`
	MinAmount       float64  `json:"minAmount"`
	MaxAmount       *float64 `json:"maxAmount"`
	Approvers       []string `json:"approvers"`
	RequireEvidence bool     `json:"requireEvidence"`
}

type OrgProfileData struct {
	LegalName       string `json:"legalName"`
	TradingName     string `json:"tradingName"`
	TaxID           string `json:"taxId"`
	RegistrationNo  string `json:"registrationNo"`
	Country         string `json:"country"`
	BaseCurrency    string `json:"baseCurrency"`
	FiscalYearStart string `json:"fiscalYearStart"`
	Timezone        string `json:"timezone"`
	VatRate         string `json:"vatRate"`
}

type PolicyControlsData struct {
	SegregationOfDuties      bool `json:"segregationOfDuties"`
	RequireEvidenceToPost    bool `json:"requireEvidenceToPost"`
	LockPeriodsAfterClose    bool `json:"lockPeriodsAfterClose"`
	FlagRoundNumberTransfers bool `json:"flagRoundNumberTransfers"`
}

type BillingSummaryData struct {
	Plan          string `json:"plan"`
	PriceMonthly  string `json:"priceMonthly"`
	Renews        string `json:"renews"`
	SeatsUsed     int    `json:"seatsUsed"`
	SeatsIncluded int    `json:"seatsIncluded"`
	Tenants       int    `json:"tenants"`
	APICalls      string `json:"apiCalls"`
}

type BillingInvoiceData struct {
	Number string `json:"number"`
	Date   string `json:"date"`
	Amount string `json:"amount"`
	Status string `json:"status"`
}

type RetentionData struct {
	TransactionRecords string `json:"transactionRecords"`
	DocumentsEvidence  string `json:"documentsEvidence"`
	AuditLog           string `json:"auditLog"`
	DataResidency      string `json:"dataResidency"`
}

type DataControlsData struct {
	EncryptAtRest          bool `json:"encryptAtRest"`
	ExportEntireDataset    bool `json:"exportEntireDataset"`
	RightToErasureWorkflow bool `json:"rightToErasureWorkflow"`
}

type SettingsOverviewData struct {
	OrgProfile     OrgProfileData       `json:"orgProfile"`
	PolicyControls PolicyControlsData   `json:"policyControls"`
	Billing        BillingSummaryData   `json:"billing"`
	Invoices       []BillingInvoiceData `json:"invoices"`
	Retention      RetentionData        `json:"retention"`
	DataControls   DataControlsData     `json:"dataControls"`
}

func ptrFloat(v float64) *float64 { return &v }

func OrgUsersDemoData() []OrgUserData {
	return []OrgUserData{
		{ID: "u-1", Name: "Aline Mukamana", Email: "owner@acme.local", Role: "Organization Owner", Department: "All", Scope: "all", Status: "active", LastActive: "now"},
		{ID: "u-2", Name: "Eric Habimana", Email: "cfo@acme.local", Role: "Finance Lead", Department: "Finance & Admin", Scope: "all", Status: "active", LastActive: "5m ago"},
		{ID: "u-3", Name: "Diane Uwase", Email: "accountant@acme.local", Role: "Finance Operator", Department: "Finance & Admin", Scope: "ent-rw", Status: "active", LastActive: "12m ago"},
		{ID: "u-4", Name: "Patrick Niyonsenga", Email: "auditor@acme.local", Role: "Auditor", Department: "All", Scope: "all", Status: "active", LastActive: "1h ago"},
		{ID: "u-5", Name: "Sarah Ingabire", Email: "admin@acme.local", Role: "Org Admin", Department: "Operations", Scope: "all", Status: "active", LastActive: "2h ago"},
		{ID: "u-6", Name: "Grace Ishimwe", Email: "claims@acme.local", Role: "Claims Officer", Department: "Claims", Scope: "ent-rw", Status: "active", LastActive: "30m ago"},
		{ID: "u-7", Name: "Joseph Otieno", Email: "ar.ke@acme.local", Role: "Finance Operator", Department: "Finance & Admin", Scope: "ent-ke", Status: "active", LastActive: "3h ago"},
		{ID: "u-8", Name: "Brenda Achieng", Email: "lead.ke@acme.local", Role: "Finance Lead", Department: "Finance & Admin", Scope: "ent-ke", Status: "active", LastActive: "1d ago"},
		{ID: "u-9", Name: "Moses Mugisha", Email: "ap.ug@acme.local", Role: "Finance Operator", Department: "Operations", Scope: "ent-ug", Status: "active", LastActive: "4h ago"},
		{ID: "u-10", Name: "Claire Mutoni", Email: "claims2@acme.local", Role: "Claims Officer", Department: "Claims", Scope: "ent-rw", Status: "invited", LastActive: "-"},
		{ID: "u-11", Name: "David Mugabo", Email: "sales@acme.local", Role: "Finance Operator", Department: "Sales & Distribution", Scope: "ent-rw", Status: "suspended", LastActive: "21d ago"},
	}
}

func ApprovalRulesDemoData() []ApprovalRuleData {
	return []ApprovalRuleData{
		{ID: "r-routine", Label: "Routine spend", Scope: "all", Category: "all", MinAmount: 0, MaxAmount: ptrFloat(10000), Approvers: []string{"Finance Lead"}, RequireEvidence: true},
		{ID: "r-standard", Label: "Standard spend", Scope: "all", Category: "all", MinAmount: 10000, MaxAmount: ptrFloat(100000), Approvers: []string{"Finance Lead"}, RequireEvidence: true},
		{ID: "r-major", Label: "Major spend", Scope: "all", Category: "all", MinAmount: 100000, MaxAmount: nil, Approvers: []string{"Finance Lead", "Organization Owner"}, RequireEvidence: true},
		{ID: "r-claims", Label: "Large claims", Scope: "all", Category: "claim", MinAmount: 50000, MaxAmount: nil, Approvers: []string{"Finance Lead", "Organization Owner"}, RequireEvidence: true},
		{ID: "r-capex", Label: "Capital expenditure", Scope: "all", Category: "capex", MinAmount: 150000, MaxAmount: nil, Approvers: []string{"Finance Lead", "Organization Owner", "Board"}, RequireEvidence: true},
	}
}

func SettingsOverviewDemoData() SettingsOverviewData {
	return SettingsOverviewData{
		OrgProfile: OrgProfileData{
			LegalName:       "Acme Insurance Ltd.",
			TradingName:     "Acme Insurance",
			TaxID:           "RW-104872211",
			RegistrationNo:  "RDB-2019-44821",
			Country:         "Rwanda",
			BaseCurrency:    "USD",
			FiscalYearStart: "January",
			Timezone:        "Africa/Kigali (CAT)",
			VatRate:         "18%",
		},
		PolicyControls: PolicyControlsData{
			SegregationOfDuties:      true,
			RequireEvidenceToPost:    true,
			LockPeriodsAfterClose:    true,
			FlagRoundNumberTransfers: false,
		},
		Billing: BillingSummaryData{
			Plan:          "Growth",
			PriceMonthly:  "$499",
			Renews:        "Jan 1, 2026",
			SeatsUsed:     9,
			SeatsIncluded: 15,
			Tenants:       1,
			APICalls:      "84k",
		},
		Invoices: []BillingInvoiceData{
			{Number: "INV-2025-05", Date: "May 1, 2025", Amount: "$499.00", Status: "Paid"},
			{Number: "INV-2025-04", Date: "Apr 1, 2025", Amount: "$499.00", Status: "Paid"},
			{Number: "INV-2025-03", Date: "Mar 1, 2025", Amount: "$499.00", Status: "Paid"},
		},
		Retention: RetentionData{
			TransactionRecords: "7 years",
			DocumentsEvidence:  "7 years",
			AuditLog:           "Indefinite",
			DataResidency:      "Africa (Kigali)",
		},
		DataControls: DataControlsData{
			EncryptAtRest:          true,
			ExportEntireDataset:    false,
			RightToErasureWorkflow: true,
		},
	}
}
