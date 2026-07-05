package demo

type PartyActivityData struct {
	Date   string `json:"date"`
	Text   string `json:"text"`
	Amount *Money `json:"amount,omitempty"`
	Dir    string `json:"dir,omitempty"`
}

type PartyData struct {
	ID           string              `json:"id"`
	Name         string              `json:"name"`
	Type         string              `json:"type"`
	MoneyIn      Money               `json:"moneyIn"`
	MoneyOut     Money               `json:"moneyOut"`
	OpenInvoices int                 `json:"openInvoices"`
	Risk         string              `json:"risk"`
	Contracts    int                 `json:"contracts"`
	Contact      string              `json:"contact"`
	Email        string              `json:"email"`
	Phone        string              `json:"phone"`
	Since        string              `json:"since"`
	Activity     []PartyActivityData `json:"activity"`
	Balance      Money               `json:"balance"`
	Terms        string              `json:"terms"`
	CreditLimit  Money               `json:"creditLimit"`
	Overdue      bool                `json:"overdue"`
}

type RenewalData struct {
	ID       string `json:"id"`
	Party    string `json:"party"`
	Contract string `json:"contract"`
	DueText  string `json:"dueText"`
	Value    Money  `json:"value"`
}

type RelationshipsOverviewData struct {
	Parties  []PartyData   `json:"parties"`
	Renewals []RenewalData `json:"renewals"`
}

type ROIItemData struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Value    Money  `json:"value"`
	Icon     string `json:"icon"`
	Detail   string `json:"detail"`
	DeltaPct int    `json:"deltaPct"`
}

type ROISummaryData struct {
	TotalValue       Money         `json:"totalValue"`
	SubscriptionCost Money         `json:"subscriptionCost"`
	ROIMultiple      float64       `json:"roiMultiple"`
	Series           []float64     `json:"series"`
	Labels           []string      `json:"labels"`
	Items            []ROIItemData `json:"items"`
	HoursSaved       int           `json:"hoursSaved"`
}

type CreditPassportPortalData struct {
	Passport      PortalPassport     `json:"passport"`
	SubScores     []PortalSubScore   `json:"subScores"`
	Trends        PortalTrends       `json:"trends"`
	Affordability PortalAffordability `json:"affordability"`
	EvidencePack  []PortalEvidence   `json:"evidencePack"`
	Grant         PortalGrant        `json:"grant"`
}

type PortalPassport struct {
	Tenant   string `json:"tenant"`
	Score    int    `json:"score"`
	Label    string `json:"label"`
	Band     string `json:"band"`
	Updated  string `json:"updated"`
	SharedBy string `json:"sharedBy"`
}

type PortalSubScore struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Value    int    `json:"value"`
	Rating   string `json:"rating"`
	Evidence string `json:"evidence"`
}

type PortalTrends struct {
	Labels   []string  `json:"labels"`
	Revenue  []float64 `json:"revenue"`
	Cashflow []float64 `json:"cashflow"`
}

type PortalAffordability struct {
	MaxFacility     Money    `json:"maxFacility"`
	MonthlyCapacity Money    `json:"monthlyCapacity"`
	TermMonths      int      `json:"termMonths"`
	Assumptions     []string `json:"assumptions"`
}

type PortalEvidence struct {
	ID      string `json:"id"`
	Factor  string `json:"factor"`
	DocName string `json:"docName"`
	Detail  string `json:"detail"`
}

type PortalGrant struct {
	ExpiresInDays  int      `json:"expiresInDays"`
	DataCategories []string `json:"dataCategories"`
	ScopeNote      string   `json:"scopeNote"`
}

func RelationshipsOverviewDemoData() RelationshipsOverviewData {
	return RelationshipsOverviewData{
		Parties: []PartyData{
			{ID: "p1", Name: "BK Insurance Brokers", Type: "partner", MoneyIn: usd(212000), MoneyOut: usd(18000), OpenInvoices: 2, Risk: "low", Contracts: 3, Contact: "Jean Bizimana", Email: "finance@bkbrokers.rw", Phone: "+250 788 110 220", Since: "2021", Activity: []PartyActivityData{{Date: "2025-05-07", Text: "Commission settlement", Amount: money(1860000, "USD"), Dir: "out"}, {Date: "2025-05-02", Text: "New business placement", Amount: money(9600000, "USD"), Dir: "in"}, {Date: "2025-04-28", Text: "Quarterly reconciliation signed"}}, Balance: usd(28600), Terms: "Net 30", CreditLimit: usd(100000), Overdue: false},
			{ID: "p2", Name: "ACME Supplies Ltd.", Type: "supplier", MoneyIn: usd(0), MoneyOut: usd(184000), OpenInvoices: 4, Risk: "medium", Contracts: 2, Contact: "Claudine Mukamana", Email: "ar@acmesupplies.rw", Phone: "+250 788 330 441", Since: "2022", Activity: []PartyActivityData{{Date: "2025-05-10", Text: "Invoice INV-10356 received", Amount: money(4560000, "USD"), Dir: "out"}, {Date: "2025-05-17", Text: "Hardware delivery", Amount: money(980000, "USD"), Dir: "out"}, {Date: "2025-05-01", Text: "Price list updated"}}, Balance: moneyValue(-4560000, "USD"), Terms: "Net 15", CreditLimit: usd(60000), Overdue: false},
			{ID: "p3", Name: "Kigali Corporate Group", Type: "customer", MoneyIn: usd(486000), MoneyOut: usd(0), OpenInvoices: 6, Risk: "low", Contracts: 5, Contact: "Eric Nshuti", Email: "finance@kcg.rw", Phone: "+250 788 550 660", Since: "2019", Activity: []PartyActivityData{{Date: "2025-05-02", Text: "Annual fleet premium", Amount: money(18600000, "USD"), Dir: "in"}, {Date: "2025-05-12", Text: "Fleet renewal premium", Amount: money(9600000, "USD"), Dir: "in"}, {Date: "2025-04-30", Text: "Reminder sent - INV-10198"}}, Balance: usd(36400), Terms: "Net 30", CreditLimit: usd(500000), Overdue: true},
			{ID: "p4", Name: "PT Imports", Type: "supplier", MoneyIn: usd(0), MoneyOut: usd(96400), OpenInvoices: 3, Risk: "high", Contracts: 1, Contact: "Patrick Tuyishime", Email: "accounts@ptimports.rw", Phone: "+250 788 770 880", Since: "2023", Activity: []PartyActivityData{{Date: "2025-05-15", Text: "Payment $260 over PO - flagged", Amount: money(876000, "USD"), Dir: "out"}, {Date: "2025-05-18", Text: "Promised settlement by Friday"}, {Date: "2025-05-10", Text: "Overdue invoice INV-10221 chased"}}, Balance: usd(48600), Terms: "Net 30", CreditLimit: usd(60000), Overdue: true},
			{ID: "p5", Name: "MediCare Network", Type: "partner", MoneyIn: usd(58000), MoneyOut: usd(312000), OpenInvoices: 5, Risk: "medium", Contracts: 4, Contact: "Dr. Alice Keza", Email: "billing@medicare.rw", Phone: "+250 788 220 330", Since: "2020", Activity: []PartyActivityData{{Date: "2025-05-08", Text: "Corporate health premium", Amount: money(5800000, "USD"), Dir: "in"}, {Date: "2025-05-09", Text: "Claim settlement to provider", Amount: money(820000, "USD"), Dir: "out"}, {Date: "2025-05-05", Text: "Tariff schedule reviewed"}}, Balance: usd(28900), Terms: "Net 45", CreditLimit: usd(700000), Overdue: true},
			{ID: "p6", Name: "Umoja SACCO", Type: "customer", MoneyIn: usd(124000), MoneyOut: usd(0), OpenInvoices: 1, Risk: "low", Contracts: 2, Contact: "Grace Uwase", Email: "finance@umoja.rw", Phone: "+250 788 990 100", Since: "2021", Activity: []PartyActivityData{{Date: "2025-05-04", Text: "Group health premium", Amount: money(6400000, "USD"), Dir: "in"}, {Date: "2025-05-16", Text: "Installment received", Amount: money(3100000, "USD"), Dir: "in"}, {Date: "2025-04-22", Text: "Member list updated"}}, Balance: moneyValue(5359000, "USD"), Terms: "Net 30", CreditLimit: usd(200000), Overdue: true},
			{ID: "p7", Name: "Gikondo Industrial", Type: "customer", MoneyIn: usd(74000), MoneyOut: usd(0), OpenInvoices: 2, Risk: "low", Contracts: 1, Contact: "Samuel Habiyo", Email: "ap@gikondo.rw", Phone: "+250 788 445 556", Since: "2024", Activity: []PartyActivityData{{Date: "2025-05-18", Text: "Public liability premium", Amount: money(7400000, "USD"), Dir: "in"}, {Date: "2025-05-01", Text: "Cover extended to new site"}}, Balance: usd(12400), Terms: "Net 30", CreditLimit: usd(150000), Overdue: false},
			{ID: "p8", Name: "Cloud Services Inc", Type: "supplier", MoneyIn: usd(0), MoneyOut: usd(26880), OpenInvoices: 1, Risk: "low", Contracts: 1, Contact: "Support Desk", Email: "billing@cloudservices.com", Phone: "+1 415 555 0110", Since: "2022", Activity: []PartyActivityData{{Date: "2025-05-06", Text: "Quarterly subscription", Amount: money(224000, "USD"), Dir: "out"}, {Date: "2025-05-18", Text: "Renewal due in 22 days"}}, Balance: moneyValue(-224000, "USD"), Terms: "Net 15", CreditLimit: usd(30000), Overdue: false},
		},
		Renewals: []RenewalData{
			{ID: "rn1", Party: "Kigali Office Park", Contract: "Office lease", DueText: "in 14 days", Value: usd(149760)},
			{ID: "rn2", Party: "Cloud Services Inc", Contract: "Software subscription", DueText: "in 22 days", Value: usd(8960)},
			{ID: "rn3", Party: "BK Insurance Brokers", Contract: "Brokerage agreement", DueText: "in 30 days", Value: usd(0)},
		},
	}
}

func ROISummaryDemoData() ROISummaryData {
	return ROISummaryData{
		TotalValue: usd(384970),
		SubscriptionCost: usd(48000),
		ROIMultiple: 8.0,
		Series: []float64{42, 58, 71, 96, 128, 161},
		Labels: []string{"Dec", "Jan", "Feb", "Mar", "Apr", "May"},
		HoursSaved: 128,
		Items: []ROIItemData{
			{ID: "r1", Label: "Money recovered", Value: usd(86400), Icon: "recovered", Detail: "Unpaid invoices collected via agent reminders", DeltaPct: 22},
			{ID: "r2", Label: "Duplicate payments avoided", Value: usd(45600), Icon: "duplicates", Detail: "Caught by the reconciliation engine", DeltaPct: 12},
			{ID: "r3", Label: "Unsupported spend caught", Value: usd(12480), Icon: "unsupported", Detail: "Missing-document & approval flags", DeltaPct: 8},
			{ID: "r4", Label: "Leakage prevented (claims)", Value: usd(86400), Icon: "leakage", Detail: "Fraud scoring + SIU referrals", DeltaPct: 31},
			{ID: "r5", Label: "Credit access improved", Value: usd(140000), Icon: "credit", Detail: "Lender-ready Credit Passport facility", DeltaPct: 0},
			{ID: "r6", Label: "Finance hours saved", Value: usd(0), Icon: "hours", Detail: "128 hours this month", DeltaPct: 18},
		},
	}
}

func CreditPassportPortalDemoData() CreditPassportPortalData {
	return CreditPassportPortalData{
		Passport: PortalPassport{Tenant: "Acme Insurance Ltd.", Score: 82, Label: "Good", Band: "A-", Updated: "May 18, 2025", SharedBy: "Eric Habimana - Finance Lead"},
		SubScores: []PortalSubScore{
			{ID: "s1", Label: "Payment behavior", Value: 88, Rating: "Good", Evidence: "94% on-time over 12 months - avg 3-day delay"},
			{ID: "s2", Label: "Financial strength", Value: 84, Rating: "Good", Evidence: "Revenue +18% YoY - positive net cash 11/12 months"},
			{ID: "s3", Label: "Risk profile", Value: 79, Rating: "Fair", Evidence: "Moderate customer concentration - low dispute rate"},
			{ID: "s4", Label: "Credit readiness", Value: 86, Rating: "Strong", Evidence: "Audited books - full evidence trail - 0 unresolved flags"},
		},
		Trends: PortalTrends{Labels: []string{"Dec", "Jan", "Feb", "Mar", "Apr", "May"}, Revenue: []float64{1.42, 1.51, 1.58, 1.66, 1.74, 1.84}, Cashflow: []float64{0.34, 0.41, 0.38, 0.52, 0.49, 0.58}},
		Affordability: PortalAffordability{
			MaxFacility: usd(680000), MonthlyCapacity: usd(58000), TermMonths: 24,
			Assumptions: []string{
				"Based on 12-month average net operating cash flow",
				"Debt-service coverage ratio held at 1.4x",
				"Existing obligations of $1.32M payables deducted",
				"Seasonal dip (Dec-Jan) factored at 0.8x",
			},
		},
		EvidencePack: []PortalEvidence{
			{ID: "ev-1", Factor: "Revenue", DocName: "Audited P&L 2024.pdf", Detail: "Independently verified"},
			{ID: "ev-2", Factor: "Cash flow", DocName: "Bank statements (12 mo).pdf", Detail: "HSBC - BK - reconciled"},
			{ID: "ev-3", Factor: "Payment behavior", DocName: "Payables ledger.xlsx", Detail: "94% on-time"},
			{ID: "ev-4", Factor: "Obligations", DocName: "Debt schedule.pdf", Detail: "Current as of May 18"},
		},
		Grant: PortalGrant{
			ExpiresInDays: 23,
			DataCategories: []string{"Credit score & sub-scores", "Revenue & cash-flow trends", "Affordability estimate", "Evidence pack"},
			ScopeNote: "Read-only - consent-scoped - revocable at any time by Acme Insurance.",
		},
	}
}
