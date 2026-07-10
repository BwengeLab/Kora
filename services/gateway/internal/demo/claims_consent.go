package demo

type ClaimWorkspaceData struct {
	Claims []ClaimRecord `json:"claims"`
	Stats  ClaimStats    `json:"stats"`
}

type ClaimRecord struct {
	ID                  string        `json:"id"`
	Claimant            string        `json:"claimant"`
	PolicyNumber        string        `json:"policyNumber"`
	Type                string        `json:"type"`
	Stage               string        `json:"stage"`
	IncidentDate        string        `json:"incidentDate"`
	ReportedDate        string        `json:"reportedDate"`
	Description         string        `json:"description"`
	ClaimedAmount       Money         `json:"claimedAmount"`
	Deductible          Money         `json:"deductible"`
	AISummary           string        `json:"aiSummary"`
	TriageSeverity      string        `json:"triageSeverity"`
	TriageFastTrack     bool          `json:"triageFastTrack"`
	FraudScore          int           `json:"fraudScore"`
	FraudFlags          []string      `json:"fraudFlags"`
	SuggestedReserve    Money         `json:"suggestedReserve"`
	SuggestedSettlement Money         `json:"suggestedSettlement"`
	Reserve             Money         `json:"reserve"`
	Evidence            []EvidenceDoc `json:"evidence"`
	AssignedTo          string        `json:"assignedTo"`
	SLAText             string        `json:"slaText"`
	PaymentReconciled   *bool         `json:"paymentReconciled,omitempty"`
	CoverageOK          bool          `json:"coverageOk"`
}

type ClaimStageCounts struct {
	FNOL       int `json:"fnol"`
	Triage     int `json:"triage"`
	Adjusting  int `json:"adjusting"`
	Approval   int `json:"approval"`
	Settlement int `json:"settlement"`
	Closed     int `json:"closed"`
}

type ClaimStats struct {
	OpenClaims       int              `json:"openClaims"`
	TotalReserves    Money            `json:"totalReserves"`
	AvgCycleDays     float64          `json:"avgCycleDays"`
	FraudFlagged     int              `json:"fraudFlagged"`
	LeakagePrevented Money            `json:"leakagePrevented"`
	Pipeline         ClaimStageCounts `json:"pipeline"`
}

type ConsentGrantData struct {
	ID              string   `json:"id"`
	Grantee         string   `json:"grantee"`
	GranteeType     string   `json:"granteeType"`
	RecipientUserID string   `json:"recipientUserId,omitempty"`
	Purpose         string   `json:"purpose"`
	Scopes          []string `json:"scopes"`
	Status          string   `json:"status"`
	Basis           string   `json:"basis"`
	GrantedBy       string   `json:"grantedBy"`
	GrantedAt       string   `json:"grantedAt"`
	ExpiresAt       string   `json:"expiresAt"`
	LastAccessed    string   `json:"lastAccessed,omitempty"`
}

func ClaimsWorkspaceDemoData() ClaimWorkspaceData {
	reconciledFalse := false
	reconciledTrue := true

	return ClaimWorkspaceData{
		Claims: []ClaimRecord{
			{
				ID: "CLM-2025-00412", Claimant: "Jean-Paul Niyonzima", PolicyNumber: "MOT-88231", Type: "motor", Stage: "triage",
				IncidentDate: "2025-05-12", ReportedDate: "2025-05-13", Description: "Rear-end collision at Kimironko roundabout; bumper and tail-light damage.",
				ClaimedAmount: usd(2400), Deductible: usd(200),
				AISummary:      "Single-vehicle rear-end collision. Police report and 4 photos attached. Damage consistent with a low-speed impact; repair quote from approved garage included.",
				TriageSeverity: "low", TriageFastTrack: true, FraudScore: 12, FraudFlags: []string{},
				SuggestedReserve: usd(2200), SuggestedSettlement: usd(2200), Reserve: usd(2200),
				Evidence: []EvidenceDoc{
					{ID: "cev-1", Name: "Police report PR-5521.pdf", Kind: "statement", SizeText: "420 KB"},
					{ID: "cev-2", Name: "Repair quote - Kigali Auto.pdf", Kind: "invoice", SizeText: "180 KB"},
				},
				AssignedTo: "James Okello", SLAText: "SLA 2d", CoverageOK: true,
			},
			{
				ID: "CLM-2025-00408", Claimant: "Aline Uwimana", PolicyNumber: "HLT-44120", Type: "health", Stage: "adjusting",
				IncidentDate: "2025-05-08", ReportedDate: "2025-05-09", Description: "Inpatient surgery - appendectomy at King Faisal Hospital.",
				ClaimedAmount: usd(8600), Deductible: usd(0),
				AISummary:      "Inpatient surgical claim. Hospital invoice, discharge summary and pre-authorization on file. Procedure covered under the policy; amounts within network tariff.",
				TriageSeverity: "medium", TriageFastTrack: false, FraudScore: 18, FraudFlags: []string{},
				SuggestedReserve: usd(8600), SuggestedSettlement: usd(8200), Reserve: usd(8600),
				Evidence: []EvidenceDoc{
					{ID: "cev-3", Name: "Hospital invoice.pdf", Kind: "invoice", SizeText: "610 KB"},
					{ID: "cev-4", Name: "Discharge summary.pdf", Kind: "statement", SizeText: "340 KB"},
					{ID: "cev-5", Name: "Pre-authorization.pdf", Kind: "contract", SizeText: "120 KB"},
				},
				AssignedTo: "James Okello", SLAText: "SLA 3d", CoverageOK: true,
			},
			{
				ID: "CLM-2025-00401", Claimant: "Eric Mugisha", PolicyNumber: "PRP-20984", Type: "property", Stage: "approval",
				IncidentDate: "2025-05-02", ReportedDate: "2025-05-03", Description: "Warehouse fire - stock and structural damage, Gikondo industrial zone.",
				ClaimedAmount: usd(184000), Deductible: usd(5000),
				AISummary:      "Major property loss. Loss-adjuster report estimates structural damage and destroyed inventory. Fire-brigade report confirms accidental electrical cause. High-value - over Finance Lead limit, requires dual approval.",
				TriageSeverity: "critical", TriageFastTrack: false, FraudScore: 34, FraudFlags: []string{"High value", "Inventory valuation pending second estimate"},
				SuggestedReserve: usd(179000), SuggestedSettlement: usd(176500), Reserve: usd(180000),
				Evidence: []EvidenceDoc{
					{ID: "cev-6", Name: "Loss adjuster report.pdf", Kind: "statement", SizeText: "2.1 MB"},
					{ID: "cev-7", Name: "Fire brigade report.pdf", Kind: "statement", SizeText: "480 KB"},
					{ID: "cev-8", Name: "Inventory schedule.xlsx", Kind: "invoice", SizeText: "210 KB"},
				},
				AssignedTo: "James Okello", SLAText: "SLA 5d", CoverageOK: true,
			},
			{
				ID: "CLM-2025-00395", Claimant: "Grace Keza", PolicyNumber: "MOT-77310", Type: "motor", Stage: "triage",
				IncidentDate: "2025-05-11", ReportedDate: "2025-05-15", Description: "Theft of vehicle accessories and reported windshield damage.",
				ClaimedAmount: usd(3200), Deductible: usd(200),
				AISummary:      "Reported 4 days after incident. Two similar claims on this policy in the last 90 days. Photos show inconsistent damage angles; no police report attached. Recommend SIU review before proceeding.",
				TriageSeverity: "high", TriageFastTrack: false, FraudScore: 78, FraudFlags: []string{"3rd claim in 90 days", "Late reporting (4 days)", "No police report", "Inconsistent photo evidence"},
				SuggestedReserve: usd(0), SuggestedSettlement: usd(0), Reserve: usd(1500),
				Evidence: []EvidenceDoc{
					{ID: "cev-9", Name: "Claim form.pdf", Kind: "statement", SizeText: "90 KB"},
					{ID: "cev-10", Name: "Photos.png", Kind: "receipt", SizeText: "1.4 MB"},
				},
				AssignedTo: "James Okello", SLAText: "SIU review", CoverageOK: false,
			},
			{
				ID: "CLM-2025-00370", Claimant: "Patrick Habiyaremye", PolicyNumber: "HLT-41902", Type: "health", Stage: "settlement",
				IncidentDate: "2025-04-28", ReportedDate: "2025-04-29", Description: "Outpatient treatment and prescription - covered, approved.",
				ClaimedAmount: usd(640), Deductible: usd(0),
				AISummary:      "Outpatient claim approved at $620. Payment issued to provider; matching against the bank feed.",
				TriageSeverity: "low", TriageFastTrack: true, FraudScore: 8, FraudFlags: []string{},
				SuggestedReserve: usd(640), SuggestedSettlement: usd(620), Reserve: usd(640),
				Evidence:   []EvidenceDoc{{ID: "cev-11", Name: "Pharmacy invoice.pdf", Kind: "invoice", SizeText: "70 KB"}},
				AssignedTo: "James Okello", SLAText: "Paid - reconciling", PaymentReconciled: &reconciledFalse, CoverageOK: true,
			},
			{
				ID: "CLM-2025-00355", Claimant: "Diane Ingabire", PolicyNumber: "MOT-69521", Type: "motor", Stage: "closed",
				IncidentDate: "2025-04-20", ReportedDate: "2025-04-20", Description: "Windshield replacement - settled and reconciled.",
				ClaimedAmount: usd(480), Deductible: usd(100),
				AISummary:      "Settled at $380 (after deductible). Payment matched to bank statement; claim closed.",
				TriageSeverity: "low", TriageFastTrack: true, FraudScore: 5, FraudFlags: []string{},
				SuggestedReserve: usd(380), SuggestedSettlement: usd(380), Reserve: usd(380),
				Evidence:   []EvidenceDoc{{ID: "cev-12", Name: "Repair invoice.pdf", Kind: "invoice", SizeText: "110 KB"}},
				AssignedTo: "James Okello", SLAText: "Closed", PaymentReconciled: &reconciledTrue, CoverageOK: true,
			},
		},
		Stats: ClaimStats{
			OpenClaims: 38, TotalReserves: usd(1240000), AvgCycleDays: 6.4, FraudFlagged: 4, LeakagePrevented: usd(86400),
			Pipeline: ClaimStageCounts{FNOL: 5, Triage: 12, Adjusting: 9, Approval: 4, Settlement: 6, Closed: 142},
		},
	}
}

func ConsentGrantsDemoData() []ConsentGrantData {
	return []ConsentGrantData{
		{ID: "cs-1", Grantee: "Bank of Kigali - SME Lending", GranteeType: "lender", Purpose: "Working-capital facility underwriting", Scopes: []string{"credit-passport", "financials", "bank-statements"}, Status: "active", Basis: "Explicit consent - loan application", GrantedBy: "Aline Mukamana", GrantedAt: "2026-04-02", ExpiresAt: "2026-10-02", LastAccessed: "2026-07-09"},
		{ID: "cs-2", Grantee: "I&M Bank - Trade Finance", GranteeType: "lender", Purpose: "Invoice-financing eligibility check", Scopes: []string{"credit-passport", "transactions"}, Status: "active", Basis: "Explicit consent - facility request", GrantedBy: "Eric Habimana", GrantedAt: "2025-05-01", ExpiresAt: "2025-08-01", LastAccessed: "2025-05-12"},
		{ID: "cs-3", Grantee: "TransUnion Africa", GranteeType: "bureau", Purpose: "Credit-bureau reporting & scoring", Scopes: []string{"credit-passport", "identity"}, Status: "active", Basis: "Legitimate interest - bureau agreement", GrantedBy: "Aline Mukamana", GrantedAt: "2025-01-15", ExpiresAt: "2026-01-15", LastAccessed: "2025-05-10"},
		{ID: "cs-4", Grantee: "Deloitte Rwanda - External Audit", GranteeType: "auditor", Purpose: "Annual statutory audit FY2024", Scopes: []string{"financials", "transactions", "contracts"}, Status: "active", Basis: "Statutory obligation", GrantedBy: "Aline Mukamana", GrantedAt: "2025-02-01", ExpiresAt: "2025-07-31", LastAccessed: "2025-05-17"},
		{ID: "cs-5", Grantee: "Equity Bank - Overdraft", GranteeType: "lender", Purpose: "Overdraft renewal assessment", Scopes: []string{"credit-passport", "bank-statements"}, Status: "pending", Basis: "Awaiting authorisation", GrantedBy: "Eric Habimana", GrantedAt: "2025-05-17", ExpiresAt: "2025-11-17"},
		{ID: "cs-6", Grantee: "AgriPartners Co-op", GranteeType: "partner", Purpose: "Supplier-network data exchange", Scopes: []string{"identity", "contracts"}, Status: "revoked", Basis: "Consent withdrawn", GrantedBy: "Aline Mukamana", GrantedAt: "2024-09-10", ExpiresAt: "2025-09-10", LastAccessed: "2025-03-01"},
		{ID: "cs-7", Grantee: "BNR - Central Bank Reporting", GranteeType: "regulator", Purpose: "Prudential returns submission", Scopes: []string{"financials"}, Status: "active", Basis: "Regulatory requirement", GrantedBy: "Aline Mukamana", GrantedAt: "2025-01-01", ExpiresAt: "2025-12-31", LastAccessed: "2025-05-15"},
		{ID: "cs-8", Grantee: "Old Mutual - Reinsurance", GranteeType: "partner", Purpose: "Reinsurance treaty data sharing", Scopes: []string{"transactions", "contracts"}, Status: "expired", Basis: "Treaty period ended", GrantedBy: "Eric Habimana", GrantedAt: "2024-01-01", ExpiresAt: "2025-01-01", LastAccessed: "2024-12-20"},
	}
}
