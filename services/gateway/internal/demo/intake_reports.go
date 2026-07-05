package demo

type ExtractedField struct {
	Label      string  `json:"label"`
	Value      string  `json:"value"`
	Confidence float64 `json:"confidence"`
}

type SuggestedMatch struct {
	Ref    string `json:"ref"`
	Party  string `json:"party"`
	Amount string `json:"amount"`
}

type IntakeDoc struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Kind           string          `json:"kind"`
	Source         string          `json:"source"`
	ReceivedAt     string          `json:"receivedAt"`
	Stage          string          `json:"stage"`
	SizeText       string          `json:"sizeText"`
	Fields         []ExtractedField `json:"fields"`
	SuggestedMatch *SuggestedMatch `json:"suggestedMatch,omitempty"`
}

type ReportDef struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Kind          string `json:"kind"`
	LastGenerated string `json:"lastGenerated"`
	Schedule      string `json:"schedule"`
}

type ReportKPI struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Tone  string `json:"tone,omitempty"`
}

type ReportContent struct {
	KPIs      []ReportKPI `json:"kpis"`
	Columns   []string    `json:"columns"`
	Rows      [][]string  `json:"rows"`
	Narrative string      `json:"narrative"`
}

func IntakeDocsData() []IntakeDoc {
	return []IntakeDoc{
		{
			ID:         "doc-1",
			Name:       "ACME Supplies INV-10356.pdf",
			Kind:       "invoice",
			Source:     "email",
			ReceivedAt: "2025-05-18T09:12:00Z",
			Stage:      "needs-review",
			SizeText:   "320 KB",
			Fields: []ExtractedField{
				{Label: "Supplier", Value: "ACME Supplies Ltd.", Confidence: 0.98},
				{Label: "Amount", Value: "USD 45,600.00", Confidence: 0.96},
				{Label: "Invoice date", Value: "2025-05-10", Confidence: 0.93},
				{Label: "Due date", Value: "2025-05-25", Confidence: 0.90},
				{Label: "Category", Value: "Supplier", Confidence: 0.72},
			},
			SuggestedMatch: &SuggestedMatch{Ref: "ACME-INV-10356", Party: "ACME Supplies Ltd.", Amount: "USD 45,600.00"},
		},
		{
			ID:         "doc-2",
			Name:       "BK statement May wk3.csv",
			Kind:       "statement",
			Source:     "bank-feed",
			ReceivedAt: "2025-05-18T06:00:00Z",
			Stage:      "needs-review",
			SizeText:   "44 KB",
			Fields: []ExtractedField{
				{Label: "Account", Value: "BK · ****4471", Confidence: 0.99},
				{Label: "Lines", Value: "38 transactions", Confidence: 0.99},
				{Label: "Period", Value: "2025-05-12 -> 2025-05-18", Confidence: 0.97},
				{Label: "Unmatched", Value: "6 lines", Confidence: 0.88},
			},
		},
		{
			ID:         "doc-3",
			Name:       "Hospital invoice CLM-00408.pdf",
			Kind:       "invoice",
			Source:     "upload",
			ReceivedAt: "2025-05-17T15:40:00Z",
			Stage:      "matched",
			SizeText:   "610 KB",
			Fields: []ExtractedField{
				{Label: "Provider", Value: "King Faisal Hospital", Confidence: 0.97},
				{Label: "Amount", Value: "USD 8,200.00", Confidence: 0.95},
				{Label: "Claim ref", Value: "CLM-2025-00408", Confidence: 0.94},
				{Label: "Category", Value: "Claim payout", Confidence: 0.91},
			},
			SuggestedMatch: &SuggestedMatch{Ref: "CLM-2025-00408", Party: "King Faisal Hospital", Amount: "USD 8,200.00"},
		},
		{
			ID:         "doc-4",
			Name:       "Travel receipt D.Uwase.jpg",
			Kind:       "receipt",
			Source:     "scan",
			ReceivedAt: "2025-05-17T11:05:00Z",
			Stage:      "posted",
			SizeText:   "1.2 MB",
			Fields: []ExtractedField{
				{Label: "Payee", Value: "Diane Uwase", Confidence: 0.92},
				{Label: "Amount", Value: "USD 180.00", Confidence: 0.90},
				{Label: "Date", Value: "2025-05-13", Confidence: 0.88},
				{Label: "Category", Value: "Travel reimbursement", Confidence: 0.80},
			},
			SuggestedMatch: &SuggestedMatch{Ref: "EXP-TRAV-2205", Party: "Diane Uwase", Amount: "USD 180.00"},
		},
		{
			ID:         "doc-5",
			Name:       "Subscription invoice SUB-Q2.pdf",
			Kind:       "invoice",
			Source:     "email",
			ReceivedAt: "2025-05-18T08:30:00Z",
			Stage:      "extracting",
			SizeText:   "90 KB",
			Fields: []ExtractedField{
				{Label: "Supplier", Value: "Cloud Services Inc", Confidence: 0.60},
				{Label: "Amount", Value: "...", Confidence: 0.0},
			},
		},
		{
			ID:         "doc-6",
			Name:       "Offshore transfer advice.pdf",
			Kind:       "statement",
			Source:     "upload",
			ReceivedAt: "2025-05-12T14:22:00Z",
			Stage:      "needs-review",
			SizeText:   "70 KB",
			Fields: []ExtractedField{
				{Label: "Beneficiary", Value: "OFFSHORE LTD", Confidence: 0.95},
				{Label: "Amount", Value: "USD 15,400.00", Confidence: 0.93},
				{Label: "Reference", Value: "- none -", Confidence: 0.40},
				{Label: "Contract", Value: "Not found", Confidence: 0.20},
			},
		},
	}
}

func ReportsCatalogData() []ReportDef {
	return []ReportDef{
		{ID: "rep-1", Name: "CEO weekly summary", Kind: "executive", LastGenerated: "2h ago", Schedule: "Weekly · Mon"},
		{ID: "rep-2", Name: "Board pack - May 2025", Kind: "board", LastGenerated: "1d ago", Schedule: "Monthly"},
		{ID: "rep-3", Name: "Exception & control report", Kind: "exception", LastGenerated: "4h ago", Schedule: "Daily"},
		{ID: "rep-4", Name: "Collections & aging", Kind: "collections", LastGenerated: "3h ago", Schedule: "Weekly"},
		{ID: "rep-5", Name: "Supplier & margin review", Kind: "supplier", LastGenerated: "2d ago", Schedule: "Monthly"},
		{ID: "rep-6", Name: "Credit Passport export", Kind: "credit", LastGenerated: "25m ago", Schedule: "On demand"},
		{ID: "rep-7", Name: "Auditor evidence pack", Kind: "audit", LastGenerated: "1d ago", Schedule: "On demand"},
	}
}

func BuildReportContent(kind string) ReportContent {
	switch kind {
	case "collections":
		return ReportContent{
			KPIs: []ReportKPI{
				{Label: "Total overdue", Value: "$214,890", Tone: "text-danger"},
				{Label: "Invoices", Value: "7"},
				{Label: "Avg age", Value: "44d"},
			},
			Columns: []string{"Customer", "Invoice", "Days", "Risk", "Amount"},
			Rows: [][]string{
				{"Umoja SACCO", "INV-10231", "95", "high", "$53,590"},
				{"PT Imports", "INV-10221", "62", "high", "$48,600"},
				{"Kigali Corporate Group", "INV-10198", "48", "medium", "$36,400"},
				{"MediCare Network", "INV-10240", "35", "medium", "$28,900"},
			},
			Narrative: "Two accounts have crossed 60 days. Collections should focus on Umoja SACCO and PT Imports first because both are high-risk and materially overdue.",
		}
	case "supplier":
		return ReportContent{
			KPIs: []ReportKPI{
				{Label: "Suppliers", Value: "3"},
				{Label: "Total spend", Value: "$307,280"},
				{Label: "High risk", Value: "1", Tone: "text-danger"},
			},
			Columns: []string{"Supplier", "Spend", "Open inv.", "Risk"},
			Rows: [][]string{
				{"ACME Supplies Ltd.", "$184,000", "4", "medium"},
				{"PT Imports", "$96,400", "3", "high"},
				{"Cloud Services Inc", "$26,880", "1", "low"},
			},
			Narrative: "PT Imports remains the primary supplier control issue because one payment exceeded the purchase order and still lacks corrected supporting evidence.",
		}
	case "exception":
		return ReportContent{
			KPIs: []ReportKPI{
				{Label: "Open exceptions", Value: "5", Tone: "text-warning"},
				{Label: "Suspicious", Value: "1", Tone: "text-danger"},
				{Label: "Missing docs", Value: "3"},
			},
			Columns: []string{"Reference", "Counterparty", "Amount", "Issue"},
			Rows: [][]string{
				{"ACME-INV-10356", "ACME Supplies", "$45,600", "Duplicate risk"},
				{"PO-2025-441", "PT IMPORTS", "$8,760", "Over PO by $260"},
				{"-", "OFFSHORE LTD", "$15,400", "No contract - suspicious"},
				{"SUB-Q2", "CLOUD SERVICES INC", "$2,240", "Prepared awaiting approval"},
			},
			Narrative: "The offshore transfer remains the highest-priority exception because no contract or purchase evidence exists for the payment.",
		}
	case "board":
		return ReportContent{
			KPIs: []ReportKPI{
				{Label: "Revenue (MTD)", Value: "$4,612,000", Tone: "text-success"},
				{Label: "Outflow (MTD)", Value: "$2,946,000"},
				{Label: "Net", Value: "$1,666,000", Tone: "text-success"},
				{Label: "Kora ROI", Value: "8.0x"},
			},
			Columns: []string{"Metric", "This month", "Trend"},
			Rows: [][]string{
				{"Gross margin", "34%", "+2pts"},
				{"Cash position", "$4.46M", "+6%"},
				{"Overdue receivables", "$214,890", "improving"},
				{"Value created by Kora", "$384,970", "+18%"},
			},
			Narrative: "Cash is healthy, reconciliations are moving through review, and Kora-created value is concentrated in recovered receivables and prevented leakage.",
		}
	case "credit":
		return ReportContent{
			KPIs: []ReportKPI{
				{Label: "Credit score", Value: "742", Tone: "text-success"},
				{Label: "Facility", Value: "$140,000"},
				{Label: "Utilisation", Value: "38%"},
			},
			Columns: []string{"Factor", "Status"},
			Rows: [][]string{
				{"On-time payments", "96% - strong"},
				{"Cash-flow stability", "Stable, positive net"},
				{"Reconciliation coverage", "Strong operator review coverage"},
				{"Document completeness", "Good, with a few pending exceptions"},
			},
			Narrative: "The tenant is lender-ready, but unresolved suspicious payments should be closed before sharing the next credit passport externally.",
		}
	case "audit":
		return ReportContent{
			KPIs: []ReportKPI{
				{Label: "SoD flags", Value: "2", Tone: "text-danger"},
				{Label: "Suspicious", Value: "4", Tone: "text-warning"},
				{Label: "Missing docs", Value: "9"},
			},
			Columns: []string{"Control", "Result"},
			Rows: [][]string{
				{"Segregation of duties", "2 flags (1 high)"},
				{"Evidence completeness", "9 entries missing docs"},
				{"Approval thresholds", "All within policy"},
				{"Period lock", "Enforced"},
			},
			Narrative: "Control posture is solid overall, but segregation-of-duty exceptions and suspicious transfers still require management follow-up.",
		}
	default:
		return ReportContent{
			KPIs: []ReportKPI{
				{Label: "Cash position", Value: "$4.46M", Tone: "text-success"},
				{Label: "Net flow (MTD)", Value: "$1,666,000", Tone: "text-success"},
				{Label: "Approvals waiting", Value: "4"},
			},
			Columns: []string{"Area", "Headline"},
			Rows: [][]string{
				{"Cash", "Healthy - net positive this month"},
				{"Collections", "$214,890 overdue across 7 invoices"},
				{"Risk", "1 suspicious transfer referred"},
				{"Approvals", "4 awaiting sign-off"},
			},
			Narrative: "The business is stable. Most attention should stay on approvals, overdue collections, and one suspicious transfer under review.",
		}
	}
}
