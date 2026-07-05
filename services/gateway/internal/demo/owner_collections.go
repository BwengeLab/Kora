package demo

type Trend struct {
	Direction string `json:"direction"`
	ValueText string `json:"valueText"`
	Label     string `json:"label"`
}

type OwnerKPI struct {
	ID                string `json:"id"`
	Label             string `json:"label"`
	Money             Money  `json:"money"`
	Trend             Trend  `json:"trend"`
	PositiveDirection string `json:"positiveDirection"`
	IconTone          string `json:"iconTone"`
}

type AreaSeries struct {
	Name  string    `json:"name"`
	Color string    `json:"color"`
	Data  []float64 `json:"data"`
}

type OwnerCashFlow struct {
	NetPosition Money        `json:"netPosition"`
	Inflow      Money        `json:"inflow"`
	Outflow     Money        `json:"outflow"`
	Net         Money        `json:"net"`
	XLabels     []string     `json:"xLabels"`
	Series      []AreaSeries `json:"series"`
}

type OwnerHomeSummary struct {
	KPIs     []OwnerKPI    `json:"kpis"`
	CashFlow OwnerCashFlow `json:"cashFlow"`
}

type OverdueItem struct {
	ID              string `json:"id"`
	Customer        string `json:"customer"`
	Invoice         string `json:"invoice"`
	Amount          Money  `json:"amount"`
	DaysOverdue     int    `json:"daysOverdue"`
	Risk            string `json:"risk"`
	ReminderDrafted bool   `json:"reminderDrafted"`
	Contact         string `json:"contact"`
	Email           string `json:"email"`
	LastContact     string `json:"lastContact"`
	ReminderCount   int    `json:"reminderCount"`
	ActionStatus    string `json:"actionStatus,omitempty"`
}

func OwnerHomeSummaryData() OwnerHomeSummary {
	return OwnerHomeSummary{
		KPIs: []OwnerKPI{
			{ID: "cash", Label: "Total Cash Position", Money: usd(2457389), Trend: Trend{Direction: "up", ValueText: "12.5%", Label: "vs last week"}, PositiveDirection: "up", IconTone: "brand"},
			{ID: "revenue", Label: "Revenue (MTD)", Money: moneyValue(184212050, "USD"), Trend: Trend{Direction: "up", ValueText: "18.7%", Label: "vs last month"}, PositiveDirection: "up", IconTone: "lavender"},
			{ID: "receivables", Label: "Outstanding Receivables", Money: moneyValue(215489030, "USD"), Trend: Trend{Direction: "up", ValueText: "15.3%", Label: "vs last month"}, PositiveDirection: "down", IconTone: "success"},
			{ID: "payables", Label: "Upcoming Payables", Money: moneyValue(132456040, "USD"), Trend: Trend{Direction: "down", ValueText: "6.2%", Label: "vs last month"}, PositiveDirection: "down", IconTone: "warning"},
		},
		CashFlow: OwnerCashFlow{
			NetPosition: usd(2457389),
			Inflow:      usd(6812430),
			Outflow:     moneyValue(-435504100, "USD"),
			Net:         usd(2457389),
			XLabels:     []string{"May 12", "May 13", "May 14", "May 15", "May 16", "May 17", "May 18"},
			Series: []AreaSeries{
				{Name: "Cash Inflow", Color: "#4361ee", Data: []float64{3.8, 4.4, 5.1, 6.0, 6.6, 6.8, 6.81}},
				{Name: "Cash Outflow", Color: "#9a8ce8", Data: []float64{2.1, 2.6, 3.0, 3.5, 3.9, 4.2, 4.36}},
				{Name: "Net Cash Flow", Color: "#16a37b", Data: []float64{1.7, 1.8, 2.1, 2.5, 2.7, 2.6, 2.45}},
			},
		},
	}
}

func CollectionsData() []OverdueItem {
	return []OverdueItem{
		{ID: "o1", Customer: "PT Imports", Invoice: "INV-10221", Amount: moneyValue(4860000, "USD"), DaysOverdue: 62, Risk: "high", ReminderDrafted: true, Contact: "Patrick Tuyishime", Email: "accounts@ptimports.rw", LastContact: "2025-05-15", ReminderCount: 2},
		{ID: "o2", Customer: "Kigali Corporate Group", Invoice: "INV-10198", Amount: moneyValue(3640000, "USD"), DaysOverdue: 48, Risk: "medium", ReminderDrafted: true, Contact: "Eric Nshuti", Email: "finance@kcg.rw", LastContact: "2025-05-12", ReminderCount: 1},
		{ID: "o3", Customer: "MediCare Network", Invoice: "INV-10240", Amount: moneyValue(2890000, "USD"), DaysOverdue: 35, Risk: "medium", ReminderDrafted: false, Contact: "Dr. Alice Keza", Email: "billing@medicare.rw", LastContact: "2025-04-30", ReminderCount: 0},
		{ID: "o4", Customer: "Vendor 7741", Invoice: "INV-10255", Amount: moneyValue(1920000, "USD"), DaysOverdue: 31, Risk: "high", ReminderDrafted: true, Contact: "AR Desk", Email: "ar@vendor7741.rw", LastContact: "2025-05-16", ReminderCount: 3},
		{ID: "o5", Customer: "Bright Schools Grp", Invoice: "INV-10260", Amount: moneyValue(1580000, "USD"), DaysOverdue: 22, Risk: "low", ReminderDrafted: false, Contact: "Joan Mukandayisenga", Email: "bursar@brightschools.rw", LastContact: "2025-05-10", ReminderCount: 0},
		{ID: "o6", Customer: "Gikondo Industrial", Invoice: "INV-10272", Amount: moneyValue(1240000, "USD"), DaysOverdue: 14, Risk: "low", ReminderDrafted: false, Contact: "Samuel Habiyo", Email: "ap@gikondo.rw", LastContact: "2025-05-08", ReminderCount: 0},
		{ID: "o7", Customer: "Umoja SACCO", Invoice: "INV-10231", Amount: moneyValue(5359000, "USD"), DaysOverdue: 95, Risk: "high", ReminderDrafted: true, Contact: "Grace Uwase", Email: "finance@umoja.rw", LastContact: "2025-05-14", ReminderCount: 4},
	}
}

func moneyValue(amountMinor int64, currency string) Money {
	return Money{AmountMinor: intToString(amountMinor), Currency: currency}
}
