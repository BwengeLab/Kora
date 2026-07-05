package demo

type LedgerKPIData struct {
	ID                string `json:"id"`
	Label             string `json:"label"`
	Money             *Money `json:"money,omitempty"`
	ValueText         string `json:"valueText,omitempty"`
	Delta             Trend  `json:"delta"`
	PositiveDirection string `json:"positiveDirection"`
}

type LedgerForecastData struct {
	Current   Money     `json:"current"`
	Projected Money     `json:"projected"`
	Labels    []string  `json:"labels"`
	Inflow    []float64 `json:"inflow"`
	Outflow   []float64 `json:"outflow"`
	Forecast  []float64 `json:"forecast"`
}

type LedgerPnlLineData struct {
	Label    string `json:"label"`
	Amount   Money  `json:"amount"`
	Prior    Money  `json:"prior"`
	Emphasis string `json:"emphasis,omitempty"`
	Negative bool   `json:"negative,omitempty"`
}

type SegmentMarginData struct {
	Segment   string `json:"segment"`
	MarginPct int    `json:"marginPct"`
	TrendPts  int    `json:"trendPts"`
}

type LedgerCashflowView struct {
	KPIs            []LedgerKPIData      `json:"kpis"`
	Forecast        LedgerForecastData   `json:"forecast"`
	Pnl             []LedgerPnlLineData  `json:"pnl"`
	MarginBySegment []SegmentMarginData  `json:"marginBySegment"`
	OpeningBalance  Money                `json:"openingBalance"`
	Movements       []FinanceTransaction `json:"movements"`
}

type AuditControlHealthData struct {
	Score     int                   `json:"score"`
	TrendPts  int                   `json:"trendPts"`
	Subscores []ControlSubscoreData `json:"subscores"`
}

type AuditRiskStatsData struct {
	RiskFlags     int `json:"riskFlags"`
	SodViolations int `json:"sodViolations"`
	Suspicious    int `json:"suspicious"`
	MissingDocs   int `json:"missingDocs"`
}

type SodViolationData struct {
	ID       string `json:"id"`
	User     string `json:"user"`
	Role     string `json:"role"`
	Conflict string `json:"conflict"`
	Severity string `json:"severity"`
	Detail   string `json:"detail"`
}

type AuditInvestigationsView struct {
	ControlHealth AuditControlHealthData `json:"controlHealth"`
	RiskStats     AuditRiskStatsData     `json:"riskStats"`
	AuditLog      []AuditEvent           `json:"auditLog"`
	SodViolations []SodViolationData     `json:"sodViolations"`
	MissingDocs   []MissingDocData       `json:"missingDocs"`
}

func LedgerCashflowStaticData() LedgerCashflowView {
	return LedgerCashflowView{
		KPIs: []LedgerKPIData{
			{ID: "cash", Label: "Cash position", Money: moneyPtr(245738900, "USD"), Delta: Trend{Direction: "up", ValueText: "12.5%", Label: "vs last week"}, PositiveDirection: "up"},
			{ID: "netflow", Label: "Net cash flow (MTD)", Money: moneyPtr(45832000, "USD"), Delta: Trend{Direction: "up", ValueText: "9.1%", Label: "MoM"}, PositiveDirection: "up"},
			{ID: "margin", Label: "Gross margin", ValueText: "24.6%", Delta: Trend{Direction: "down", ValueText: "2.4pp", Label: "MoM"}, PositiveDirection: "up"},
			{ID: "workingCapital", Label: "Working capital", Money: moneyPtr(83033000, "USD"), Delta: Trend{Direction: "up", ValueText: "4.0%", Label: "MoM"}, PositiveDirection: "up"},
		},
		Forecast: LedgerForecastData{
			Current:   moneyValue(245738900, "USD"),
			Projected: moneyValue(321000000, "USD"),
			Labels:    []string{"Wk1", "Wk2", "Wk3", "Wk4", "Wk5", "Wk6"},
			Inflow:    []float64{3.8, 4.4, 5.1, 6.0, 6.6, 6.81},
			Outflow:   []float64{2.1, 2.6, 3.0, 3.5, 3.9, 4.36},
			Forecast:  []float64{0, 0, 0, 2.46, 2.74, 3.21},
		},
		Pnl: []LedgerPnlLineData{
			{Label: "Revenue", Amount: moneyValue(184212000, "USD"), Prior: moneyValue(155200000, "USD")},
			{Label: "Cost of sales", Amount: moneyValue(-138856000, "USD"), Prior: moneyValue(-114000000, "USD"), Negative: true},
			{Label: "Gross profit", Amount: moneyValue(45356000, "USD"), Prior: moneyValue(41200000, "USD"), Emphasis: "subtotal"},
			{Label: "Operating expenses", Amount: moneyValue(-28124000, "USD"), Prior: moneyValue(-26200000, "USD"), Negative: true},
			{Label: "Net profit", Amount: moneyValue(17232000, "USD"), Prior: moneyValue(15000000, "USD"), Emphasis: "total"},
		},
		MarginBySegment: []SegmentMarginData{
			{Segment: "Insurance - Motor", MarginPct: 31, TrendPts: 1},
			{Segment: "Insurance - Health", MarginPct: 26, TrendPts: -1},
			{Segment: "Insurance - Property", MarginPct: 22, TrendPts: -2},
			{Segment: "Commissions & fees", MarginPct: 41, TrendPts: 1},
		},
		OpeningBalance: moneyValue(198000000, "USD"),
	}
}

func AuditInvestigationsDemoData() AuditInvestigationsView {
	return AuditInvestigationsView{
		ControlHealth: AuditControlHealthData{
			Score:    92,
			TrendPts: 3,
			Subscores: []ControlSubscoreData{
				{Label: "Approvals & SoD", Value: 95},
				{Label: "Evidence coverage", Value: 88},
				{Label: "Reconciliation integrity", Value: 96},
				{Label: "Access controls", Value: 90},
			},
		},
		RiskStats: AuditRiskStatsData{
			RiskFlags:     11,
			SodViolations: 2,
			Suspicious:    4,
			MissingDocs:   4,
		},
		AuditLog: WorkflowSnapshotData().AuditLog,
		SodViolations: []SodViolationData{
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

func moneyPtr(amountMinor int64, currency string) *Money {
	value := moneyValue(amountMinor, currency)
	return &value
}
