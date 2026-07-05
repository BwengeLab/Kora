package demo

import "strconv"

type Money struct {
	AmountMinor string `json:"amountMinor"`
	Currency    string `json:"currency"`
}

type AuditEvent struct {
	ID          string `json:"id"`
	At          string `json:"at"`
	Actor       string `json:"actor"`
	Role        string `json:"role"`
	Kind        string `json:"kind"`
	Action      string `json:"action"`
	Target      string `json:"target"`
	Amount      *Money `json:"amount,omitempty"`
	HasEvidence bool   `json:"hasEvidence"`
}

type EvidenceDoc struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	SizeText string `json:"sizeText"`
	PageRef  string `json:"pageRef,omitempty"`
}

type HistoryEvent struct {
	ID        string `json:"id"`
	At        string `json:"at"`
	Actor     string `json:"actor"`
	ActorRole string `json:"actorRole"`
	Kind      string `json:"kind"`
	Action    string `json:"action"`
}

type Approver struct {
	Name string `json:"name"`
	Role string `json:"role"`
	At   string `json:"at,omitempty"`
}

type ApprovalItem struct {
	ID                   string         `json:"id"`
	Type                 string         `json:"type"`
	Title                string         `json:"title"`
	Subtitle             string         `json:"subtitle"`
	Amount               Money          `json:"amount"`
	Risk                 string         `json:"risk"`
	PreparedBy           Approver       `json:"preparedBy"`
	PreparedAt           string         `json:"preparedAt"`
	DeadlineText         string         `json:"deadlineText"`
	Urgent               bool           `json:"urgent"`
	Confidence           *int           `json:"confidence,omitempty"`
	Stage                string         `json:"stage"`
	RequiresDualApproval bool           `json:"requiresDualApproval"`
	PolicyLimit          Money          `json:"policyLimit"`
	WithinLimit          bool           `json:"withinLimit"`
	Approvals            []Approver     `json:"approvals"`
	IsOwnItem            bool           `json:"isOwnItem"`
	AgentRecommendation  string         `json:"agentRecommendation,omitempty"`
	Evidence             []EvidenceDoc  `json:"evidence"`
	History              []HistoryEvent `json:"history"`
}

type BankTransaction struct {
	ID           string `json:"id"`
	Source       string `json:"source"`
	Date         string `json:"date"`
	Amount       Money  `json:"amount"`
	Counterparty string `json:"counterparty"`
	Reference    string `json:"reference,omitempty"`
	Direction    string `json:"direction"`
}

type BusinessRecord struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Date      string `json:"date"`
	Amount    Money  `json:"amount"`
	PartyName string `json:"partyName"`
	Reference string `json:"reference"`
}

type FieldDelta struct {
	Field       string `json:"field"`
	Status      string `json:"status"`
	BankValue   string `json:"bankValue"`
	RecordValue string `json:"recordValue"`
	Note        string `json:"note,omitempty"`
}

type Reconciliation struct {
	ID                    string          `json:"id"`
	Stage                 string          `json:"stage"`
	Transaction           BankTransaction `json:"transaction"`
	SuggestedRecord       *BusinessRecord `json:"suggestedRecord,omitempty"`
	Confidence            int             `json:"confidence"`
	Tier                  string          `json:"tier"`
	Reason                string          `json:"reason"`
	Deltas                []FieldDelta    `json:"deltas"`
	Evidence              []EvidenceDoc   `json:"evidence"`
	History               []HistoryEvent  `json:"history"`
	AgeText               string          `json:"ageText"`
	DuplicateOf           string          `json:"duplicateOf,omitempty"`
	UnexplainedDifference *Money          `json:"unexplainedDifference,omitempty"`
}

type WorkflowSnapshot struct {
	Approvals         []ApprovalItem   `json:"approvals"`
	Reconciliations   []Reconciliation `json:"reconciliations"`
	AuditLog          []AuditEvent     `json:"auditLog"`
	DismissedReconIDs []string         `json:"dismissedReconIds"`
}

func WorkflowSnapshotData() WorkflowSnapshot {
	yes91 := 91
	yes58 := 58
	yes94 := 94
	return WorkflowSnapshot{
		Approvals: []ApprovalItem{
			{
				ID:                   "ap-1",
				Type:                 "payment",
				Title:                "Payment to ACME Supplies",
				Subtitle:             "Invoice INV-10356 · matched & prepared",
				Amount:               usd(45600),
				Risk:                 "medium",
				PreparedBy:           Approver{Name: "Diane Uwase", Role: "Finance Operator"},
				PreparedAt:           "2025-05-15T16:20:00Z",
				DeadlineText:         "Due in 6h",
				Urgent:               true,
				Confidence:           &yes91,
				Stage:                "awaiting",
				RequiresDualApproval: false,
				PolicyLimit:          usd(100000),
				WithinLimit:          true,
				Approvals:            []Approver{},
				IsOwnItem:            false,
				AgentRecommendation:  "Approve. The bank payment cleanly matches invoice INV-10356; supplier is in good standing with no open disputes.",
				Evidence: []EvidenceDoc{
					{ID: "ae-1", Name: "Invoice INV-10356.pdf", Kind: "invoice", SizeText: "320 KB"},
					{ID: "ae-2", Name: "HSBC Statement - May 2025.pdf", Kind: "statement", SizeText: "2.4 MB", PageRef: "p.3, line 14"},
				},
				History: []HistoryEvent{
					{ID: "ah-1a", At: "2025-05-14T09:12:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Matched payment to invoice (91%)"},
					{ID: "ah-1b", At: "2025-05-15T16:20:00Z", Actor: "Diane Uwase", ActorRole: "Finance Operator", Kind: "user", Action: "Prepared match - routed for approval"},
				},
			},
			{
				ID:                   "ap-2",
				Type:                 "payment",
				Title:                "Payment to PT Imports",
				Subtitle:             "PO-2025-441 · $260 over PO",
				Amount:               usd(8760),
				Risk:                 "high",
				PreparedBy:           Approver{Name: "Diane Uwase", Role: "Finance Operator"},
				PreparedAt:           "2025-05-15T15:02:00Z",
				DeadlineText:         "Overdue 2h",
				Urgent:               true,
				Confidence:           &yes58,
				Stage:                "awaiting",
				RequiresDualApproval: false,
				PolicyLimit:          usd(100000),
				WithinLimit:          true,
				Approvals:            []Approver{},
				IsOwnItem:            false,
				AgentRecommendation:  "Hold. The amount is above the purchase order and no corrected invoice is attached.",
				Evidence: []EvidenceDoc{
					{ID: "ae-3", Name: "PO-2025-441.pdf", Kind: "po", SizeText: "210 KB"},
					{ID: "ae-4", Name: "I&M Statement - May.pdf", Kind: "statement", SizeText: "1.1 MB", PageRef: "p.2, line 3"},
				},
				History: []HistoryEvent{
					{ID: "ah-2a", At: "2025-05-15T11:20:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Flagged: $260 over PO"},
					{ID: "ah-2b", At: "2025-05-15T15:02:00Z", Actor: "Diane Uwase", ActorRole: "Finance Operator", Kind: "user", Action: "Prepared with note - routed for approval"},
				},
			},
			{
				ID:                   "ap-3",
				Type:                 "payment",
				Title:                "Capital equipment purchase",
				Subtitle:             "Server infrastructure · CapEx 2025",
				Amount:               usd(184500),
				Risk:                 "high",
				PreparedBy:           Approver{Name: "Diane Uwase", Role: "Finance Operator"},
				PreparedAt:           "2025-05-15T10:00:00Z",
				DeadlineText:         "Due in 1d",
				Urgent:               false,
				Stage:                "partial",
				RequiresDualApproval: true,
				PolicyLimit:          usd(100000),
				WithinLimit:          false,
				Approvals:            []Approver{{Name: "Eric Habimana", Role: "Finance Lead", At: "2025-05-15T12:30:00Z"}},
				IsOwnItem:            false,
				AgentRecommendation:  "Within budget. Finance Lead approved (1 of 2); Organization Owner gives the final signature.",
				Evidence: []EvidenceDoc{
					{ID: "ae-5", Name: "Equipment quote.pdf", Kind: "invoice", SizeText: "540 KB"},
					{ID: "ae-6", Name: "CapEx budget 2025.xlsx", Kind: "contract", SizeText: "88 KB"},
				},
				History: []HistoryEvent{
					{ID: "ah-3a", At: "2025-05-15T10:00:00Z", Actor: "Diane Uwase", ActorRole: "Finance Operator", Kind: "user", Action: "Prepared payment"},
					{ID: "ah-3b", At: "2025-05-15T12:30:00Z", Actor: "Eric Habimana", ActorRole: "Finance Lead", Kind: "user", Action: "Approved (1 of 2)"},
				},
			},
			{
				ID:                   "ap-4",
				Type:                 "posting",
				Title:                "Post month-end accruals",
				Subtitle:             "May 2025 close - 14 journal entries",
				Amount:               usd(62300),
				Risk:                 "medium",
				PreparedBy:           Approver{Name: "Diane Uwase", Role: "Finance Operator"},
				PreparedAt:           "2025-05-15T14:10:00Z",
				DeadlineText:         "Due in 3d",
				Urgent:               false,
				Stage:                "awaiting",
				RequiresDualApproval: false,
				PolicyLimit:          usd(100000),
				WithinLimit:          true,
				Approvals:            []Approver{},
				IsOwnItem:            false,
				AgentRecommendation:  "Entries balance and tie to supporting schedules. Safe to post.",
				Evidence:             []EvidenceDoc{{ID: "ae-7", Name: "Accruals schedule - May.xlsx", Kind: "contract", SizeText: "120 KB"}},
				History:              []HistoryEvent{{ID: "ah-4a", At: "2025-05-15T14:10:00Z", Actor: "Diane Uwase", ActorRole: "Finance Operator", Kind: "user", Action: "Prepared 14 entries"}},
			},
			{
				ID:                   "ap-5",
				Type:                 "collection",
				Title:                "Send overdue reminders",
				Subtitle:             "8 invoices - 48+ days overdue",
				Amount:               Money{AmountMinor: "21489030", Currency: "USD"},
				Risk:                 "low",
				PreparedBy:           Approver{Name: "Collections Agent", Role: "Kora AI"},
				PreparedAt:           "2025-05-15T08:00:00Z",
				DeadlineText:         "Due today",
				Urgent:               false,
				Stage:                "awaiting",
				RequiresDualApproval: false,
				PolicyLimit:          usd(100000),
				WithinLimit:          true,
				Approvals:            []Approver{},
				IsOwnItem:            false,
				AgentRecommendation:  "Approve to send. Tone-matched reminders drafted per customer history; no customer is in an active dispute.",
				Evidence:             []EvidenceDoc{{ID: "ae-8", Name: "Overdue aging - May.xlsx", Kind: "contract", SizeText: "96 KB"}},
				History:              []HistoryEvent{{ID: "ah-5a", At: "2025-05-15T08:00:00Z", Actor: "Collections Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Drafted 8 reminders"}},
			},
			{
				ID:                   "ap-6",
				Type:                 "renewal",
				Title:                "Office Lease renewal",
				Subtitle:             "Kigali Office Park - expires in 14 days",
				Amount:               usd(149760),
				Risk:                 "medium",
				PreparedBy:           Approver{Name: "Contract Agent", Role: "Kora AI"},
				PreparedAt:           "2025-05-14T09:00:00Z",
				DeadlineText:         "Due in 5d",
				Urgent:               false,
				Stage:                "awaiting",
				RequiresDualApproval: true,
				PolicyLimit:          usd(100000),
				WithinLimit:          false,
				Approvals:            []Approver{},
				IsOwnItem:            false,
				AgentRecommendation:  "Rent unchanged from prior term. Annual value exceeds your limit - dual approval required.",
				Evidence:             []EvidenceDoc{{ID: "ae-9", Name: "Office Lease 2025.pdf", Kind: "contract", SizeText: "850 KB"}},
				History:              []HistoryEvent{{ID: "ah-6a", At: "2025-05-14T09:00:00Z", Actor: "Contract Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Extracted renewal terms"}},
			},
			{
				ID:                   "ap-7",
				Type:                 "match",
				Title:                "Approve match: Cloud Services",
				Subtitle:             "Subscription SUB-Q2 · prepared by you",
				Amount:               usd(2240),
				Risk:                 "low",
				PreparedBy:           Approver{Name: "Eric Habimana", Role: "Finance Lead"},
				PreparedAt:           "2025-05-15T16:40:00Z",
				DeadlineText:         "Due in 2d",
				Urgent:               false,
				Confidence:           &yes94,
				Stage:                "awaiting",
				RequiresDualApproval: false,
				PolicyLimit:          usd(100000),
				WithinLimit:          true,
				Approvals:            []Approver{},
				IsOwnItem:            true,
				AgentRecommendation:  "High-confidence recurring subscription. Because you prepared this, another approver must sign off.",
				Evidence: []EvidenceDoc{
					{ID: "ae-10", Name: "HSBC Statement - May 2025.pdf", Kind: "statement", SizeText: "2.4 MB", PageRef: "p.2, line 9"},
				},
				History: []HistoryEvent{
					{ID: "ah-7a", At: "2025-05-13T10:00:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Matched subscription (94%)"},
					{ID: "ah-7b", At: "2025-05-15T16:40:00Z", Actor: "Eric Habimana", ActorRole: "Finance Lead", Kind: "user", Action: "Prepared match"},
				},
			},
			{
				ID:                   "ap-8",
				Type:                 "refund",
				Title:                "Customer refund - Marie Iradukunda",
				Subtitle:             "Policy cancellation - PREM-7741",
				Amount:               usd(420),
				Risk:                 "low",
				PreparedBy:           Approver{Name: "Diane Uwase", Role: "Finance Operator"},
				PreparedAt:           "2025-05-15T13:00:00Z",
				DeadlineText:         "Due in 1d",
				Urgent:               false,
				Stage:                "awaiting",
				RequiresDualApproval: false,
				PolicyLimit:          usd(100000),
				WithinLimit:          true,
				Approvals:            []Approver{},
				IsOwnItem:            false,
				AgentRecommendation:  "Cancellation within the cooling-off window; refund is due per policy terms.",
				Evidence:             []EvidenceDoc{{ID: "ae-11", Name: "Policy PREM-7741.pdf", Kind: "contract", SizeText: "180 KB"}},
				History:              []HistoryEvent{{ID: "ah-8a", At: "2025-05-15T13:00:00Z", Actor: "Diane Uwase", ActorRole: "Finance Operator", Kind: "user", Action: "Prepared refund"}},
			},
		},
		Reconciliations: []Reconciliation{
			{
				ID:              "r-1",
				Stage:           "reviewing",
				Transaction:     BankTransaction{ID: "t-1", Source: "HSBC", Date: "2025-05-14", Amount: usd(45600), Counterparty: "ACME Supplies", Reference: "ACME-INV-10356", Direction: "outflow"},
				SuggestedRecord: &BusinessRecord{ID: "inv-1", Type: "invoice", Date: "2025-05-13", Amount: usd(45600), PartyName: "ACME Supplies Ltd.", Reference: "INV-10356"},
				Confidence:      91,
				Tier:            "suggested",
				Reason:          "The amount and party match exactly, the reference is 87% similar, and the dates are one day apart.",
				AgeText:         "2h ago",
				Deltas: []FieldDelta{
					{Field: "amount", Status: "match", BankValue: "$45,600.00", RecordValue: "$45,600.00"},
					{Field: "reference", Status: "near", BankValue: "ACME-INV-10356", RecordValue: "INV-10356", Note: "87% similar"},
					{Field: "date", Status: "near", BankValue: "May 14", RecordValue: "May 13", Note: "-1 day"},
					{Field: "party", Status: "match", BankValue: "ACME Supplies", RecordValue: "ACME Supplies Ltd."},
				},
				Evidence: []EvidenceDoc{
					{ID: "e-1", Name: "HSBC Statement - May 2025.pdf", Kind: "statement", SizeText: "2.4 MB", PageRef: "p.3, line 14"},
					{ID: "e-2", Name: "Invoice INV-10356.pdf", Kind: "invoice", SizeText: "320 KB"},
				},
				History: []HistoryEvent{
					{ID: "h-1a", At: "2025-05-14T09:12:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"},
					{ID: "h-1b", At: "2025-05-14T09:12:01Z", Actor: "System", ActorRole: "Kora", Kind: "system", Action: "Routed to Suggested queue (91% confidence)"},
				},
			},
			{
				ID:              "r-2",
				Stage:           "reviewing",
				Transaction:     BankTransaction{ID: "t-2", Source: "BK", Date: "2025-05-15", Amount: usd(12480), Counterparty: "Kigali Office Park", Reference: "RENT-MAY", Direction: "outflow"},
				SuggestedRecord: &BusinessRecord{ID: "bill-1", Type: "bill", Date: "2025-05-01", Amount: usd(12480), PartyName: "Kigali Office Park Ltd.", Reference: "OL-2025-05"},
				Confidence:      78,
				Tier:            "suggested",
				Reason:          "The amount matches a recurring monthly rent. References differ but the 2-week gap to the bill date is normal for this lease, and the party matches.",
				AgeText:         "4h ago",
				Deltas: []FieldDelta{
					{Field: "amount", Status: "match", BankValue: "$12,480.00", RecordValue: "$12,480.00"},
					{Field: "reference", Status: "diff", BankValue: "RENT-MAY", RecordValue: "OL-2025-05"},
					{Field: "date", Status: "near", BankValue: "May 15", RecordValue: "May 1", Note: "recurring"},
					{Field: "party", Status: "match", BankValue: "Kigali Office Park", RecordValue: "Kigali Office Park Ltd."},
				},
				Evidence: []EvidenceDoc{
					{ID: "e-3", Name: "BK Statement - May 2025.pdf", Kind: "statement", SizeText: "1.8 MB", PageRef: "p.1, line 7"},
					{ID: "e-4", Name: "Office Lease 2025.pdf", Kind: "contract", SizeText: "850 KB"},
				},
				History: []HistoryEvent{{ID: "h-2a", At: "2025-05-15T08:02:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"}},
			},
			{
				ID:              "r-3",
				Stage:           "detected",
				Transaction:     BankTransaction{ID: "t-3", Source: "MTN MoMo", Date: "2025-05-15", Amount: usd(820), Counterparty: "J. Habimana", Reference: "CLAIM-08812", Direction: "outflow"},
				SuggestedRecord: &BusinessRecord{ID: "exp-1", Type: "expense", Date: "2025-05-15", Amount: usd(820), PartyName: "Jean Habimana", Reference: "CL-08812"},
				Confidence:      96,
				Tier:            "auto",
				Reason:          "Amount, date and party match exactly; reference is 94% similar. Auto-matched with high confidence.",
				AgeText:         "5h ago",
				Deltas: []FieldDelta{
					{Field: "amount", Status: "match", BankValue: "$820.00", RecordValue: "$820.00"},
					{Field: "reference", Status: "near", BankValue: "CLAIM-08812", RecordValue: "CL-08812", Note: "94%"},
					{Field: "date", Status: "match", BankValue: "May 15", RecordValue: "May 15"},
					{Field: "party", Status: "match", BankValue: "J. Habimana", RecordValue: "Jean Habimana"},
				},
				Evidence: []EvidenceDoc{{ID: "e-5", Name: "MoMo Statement - May.csv", Kind: "statement", SizeText: "64 KB"}},
				History:  []HistoryEvent{{ID: "h-3a", At: "2025-05-15T07:40:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"}},
			},
			{
				ID:              "r-4",
				Stage:           "reviewing",
				Transaction:     BankTransaction{ID: "t-4", Source: "I&M Bank", Date: "2025-05-15", Amount: usd(8760), Counterparty: "PT IMPORTS", Direction: "outflow"},
				SuggestedRecord: &BusinessRecord{ID: "po-1", Type: "po", Date: "2025-05-08", Amount: usd(8500), PartyName: "PT Imports", Reference: "PO-2025-441"},
				Confidence:      58,
				Tier:            "review",
				Reason:          "The amount is $260 higher than the purchase order and there is no reference on the bank side.",
				AgeText:         "1h ago",
				Deltas: []FieldDelta{
					{Field: "amount", Status: "diff", BankValue: "$8,760.00", RecordValue: "$8,500.00", Note: "+$260"},
					{Field: "reference", Status: "diff", BankValue: "-", RecordValue: "PO-2025-441"},
					{Field: "date", Status: "near", BankValue: "May 15", RecordValue: "May 8", Note: "+7 days"},
					{Field: "party", Status: "near", BankValue: "PT IMPORTS", RecordValue: "PT Imports"},
				},
				Evidence: []EvidenceDoc{
					{ID: "e-6", Name: "I&M Statement - May.pdf", Kind: "statement", SizeText: "1.1 MB", PageRef: "p.2, line 3"},
					{ID: "e-7", Name: "PO-2025-441.pdf", Kind: "po", SizeText: "210 KB"},
				},
				History: []HistoryEvent{
					{ID: "h-4a", At: "2025-05-15T11:20:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"},
					{ID: "h-4b", At: "2025-05-15T11:20:01Z", Actor: "System", ActorRole: "Kora", Kind: "system", Action: "Flagged: unexplained difference of $260"},
				},
				UnexplainedDifference: money(26000, "USD"),
			},
			{
				ID:          "r-5",
				Stage:       "detected",
				Transaction: BankTransaction{ID: "t-5", Source: "HSBC", Date: "2025-05-14", Amount: usd(45600), Counterparty: "ACME Supplies", Reference: "ACME-INV-10356", Direction: "outflow"},
				Confidence:  99,
				Tier:        "duplicate",
				Reason:      "Identical to transaction r-1 - same amount, reference and counterparty, posted within 60 seconds.",
				AgeText:     "2h ago",
				Deltas:      []FieldDelta{},
				Evidence:    []EvidenceDoc{{ID: "e-8", Name: "HSBC Statement - May 2025.pdf", Kind: "statement", SizeText: "2.4 MB", PageRef: "p.3, line 15"}},
				History:     []HistoryEvent{{ID: "h-5a", At: "2025-05-14T09:13:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"}},
				DuplicateOf: "r-1",
			},
			{
				ID:          "r-6",
				Stage:       "detected",
				Transaction: BankTransaction{ID: "t-6", Source: "BK", Date: "2025-05-12", Amount: usd(15400), Counterparty: "OFFSHORE LTD", Direction: "outflow"},
				Confidence:  22,
				Tier:        "suspicious",
				Reason:      "Unknown counterparty with no contract or PO on file, large round amount, posted outside business hours.",
				AgeText:     "3d ago",
				Deltas:      []FieldDelta{},
				Evidence:    []EvidenceDoc{{ID: "e-9", Name: "BK Statement - May 2025.pdf", Kind: "statement", SizeText: "1.8 MB", PageRef: "p.4, line 22"}},
				History: []HistoryEvent{
					{ID: "h-6a", At: "2025-05-12T22:41:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"},
					{ID: "h-6b", At: "2025-05-12T22:41:02Z", Actor: "Audit Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Raised suspicious-activity flag"},
				},
			},
			{
				ID:              "r-7",
				Stage:           "reviewing",
				Transaction:     BankTransaction{ID: "t-7", Source: "Airtel Money", Date: "2025-05-15", Amount: usd(420), Counterparty: "M. Iradukunda", Reference: "PREMIUM-7741", Direction: "inflow"},
				SuggestedRecord: &BusinessRecord{ID: "inv-2", Type: "invoice", Date: "2025-05-15", Amount: usd(420), PartyName: "Marie Iradukunda", Reference: "PREM-7741"},
				Confidence:      88,
				Tier:            "suggested",
				Reason:          "A premium payment in. Amount, party and date all match; the reference is the policy ID (88% similar).",
				AgeText:         "6h ago",
				Deltas: []FieldDelta{
					{Field: "amount", Status: "match", BankValue: "$420.00", RecordValue: "$420.00"},
					{Field: "reference", Status: "near", BankValue: "PREMIUM-7741", RecordValue: "PREM-7741", Note: "88%"},
					{Field: "date", Status: "match", BankValue: "May 15", RecordValue: "May 15"},
					{Field: "party", Status: "match", BankValue: "M. Iradukunda", RecordValue: "Marie Iradukunda"},
				},
				Evidence: []EvidenceDoc{{ID: "e-10", Name: "Airtel Statement - May.csv", Kind: "statement", SizeText: "48 KB"}},
				History:  []HistoryEvent{{ID: "h-7a", At: "2025-05-15T06:30:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"}},
			},
			{
				ID:              "r-8",
				Stage:           "prepared",
				Transaction:     BankTransaction{ID: "t-8", Source: "HSBC", Date: "2025-05-13", Amount: usd(2240), Counterparty: "CLOUD SERVICES INC", Reference: "SUB-Q2", Direction: "outflow"},
				SuggestedRecord: &BusinessRecord{ID: "exp-2", Type: "expense", Date: "2025-05-13", Amount: usd(2240), PartyName: "Cloud Services Inc", Reference: "SUB-Q2-2025"},
				Confidence:      94,
				Tier:            "suggested",
				Reason:          "Quarterly software subscription. Amount and date match exactly; party and reference align with last quarter.",
				AgeText:         "Prepared 20m ago",
				Deltas: []FieldDelta{
					{Field: "amount", Status: "match", BankValue: "$2,240.00", RecordValue: "$2,240.00"},
					{Field: "reference", Status: "near", BankValue: "SUB-Q2", RecordValue: "SUB-Q2-2025", Note: "90%"},
					{Field: "date", Status: "match", BankValue: "May 13", RecordValue: "May 13"},
					{Field: "party", Status: "match", BankValue: "CLOUD SERVICES INC", RecordValue: "Cloud Services Inc"},
				},
				Evidence: []EvidenceDoc{{ID: "e-11", Name: "HSBC Statement - May 2025.pdf", Kind: "statement", SizeText: "2.4 MB", PageRef: "p.2, line 9"}},
				History: []HistoryEvent{
					{ID: "h-8a", At: "2025-05-13T10:00:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"},
					{ID: "h-8b", At: "2025-05-15T16:40:00Z", Actor: "Diane Uwase", ActorRole: "Finance Operator", Kind: "user", Action: "Prepared match - awaiting Finance Lead approval"},
				},
			},
			{
				ID:          "r-9",
				Stage:       "reviewing",
				Transaction: BankTransaction{ID: "t-9", Source: "BK", Date: "2025-05-14", Amount: usd(3920), Counterparty: "Vendor 7741", Direction: "outflow"},
				Confidence:  41,
				Tier:        "review",
				Reason:      "No matching invoice or PO found in the last 60 days. A document is likely missing - request it before matching.",
				AgeText:     "1d ago",
				Deltas:      []FieldDelta{},
				Evidence:    []EvidenceDoc{{ID: "e-12", Name: "BK Statement - May 2025.pdf", Kind: "statement", SizeText: "1.8 MB", PageRef: "p.3, line 1"}},
				History:     []HistoryEvent{{ID: "h-9a", At: "2025-05-14T13:05:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"}},
			},
			{
				ID:              "r-10",
				Stage:           "reviewing",
				Transaction:     BankTransaction{ID: "t-10", Source: "MTN MoMo", Date: "2025-05-13", Amount: usd(180), Counterparty: "D. Uwase", Reference: "TRAVEL-MAY", Direction: "outflow"},
				SuggestedRecord: &BusinessRecord{ID: "exp-3", Type: "expense", Date: "2025-05-12", Amount: usd(180), PartyName: "Diane Uwase", Reference: "EXP-TRAV-2205"},
				Confidence:      82,
				Tier:            "suggested",
				Reason:          "A travel reimbursement. Amount and party match; one day apart. References use different schemes but are consistent.",
				AgeText:         "1d ago",
				Deltas: []FieldDelta{
					{Field: "amount", Status: "match", BankValue: "$180.00", RecordValue: "$180.00"},
					{Field: "reference", Status: "diff", BankValue: "TRAVEL-MAY", RecordValue: "EXP-TRAV-2205"},
					{Field: "date", Status: "near", BankValue: "May 13", RecordValue: "May 12", Note: "-1 day"},
					{Field: "party", Status: "match", BankValue: "D. Uwase", RecordValue: "Diane Uwase"},
				},
				Evidence: []EvidenceDoc{{ID: "e-13", Name: "Travel receipt.jpg", Kind: "receipt", SizeText: "1.2 MB"}},
				History:  []HistoryEvent{{ID: "h-10a", At: "2025-05-13T15:00:00Z", Actor: "Reconciliation Agent", ActorRole: "Kora AI", Kind: "agent", Action: "Detected and scored this transaction"}},
			},
		},
		AuditLog: []AuditEvent{
			{ID: "al-1", At: "2025-05-15T16:42:00Z", Actor: "Aline Mukamana", Role: "Organization Owner", Kind: "approval", Action: "Approved payment", Target: "ACME Supplies - INV-10356", Amount: ptr(usd(45600)), HasEvidence: true},
			{ID: "al-2", At: "2025-05-15T16:40:00Z", Actor: "Eric Habimana", Role: "Finance Lead", Kind: "posting", Action: "Posted journal entries", Target: "May accruals - 14 entries", Amount: ptr(usd(62300)), HasEvidence: true},
			{ID: "al-4", At: "2025-05-15T14:05:00Z", Actor: "Reconciliation Agent", Role: "Kora AI", Kind: "agent", Action: "Flagged suspicious transaction", Target: "OFFSHORE LTD - $15,400", Amount: ptr(usd(15400)), HasEvidence: true},
		},
		DismissedReconIDs: []string{},
	}
}

func money(amountMinor int64, currency string) *Money {
	return &Money{AmountMinor: intToString(amountMinor), Currency: currency}
}

func usd(major int64) Money {
	return Money{AmountMinor: intToString(major * 100), Currency: "USD"}
}

func intToString(v int64) string {
	return strconv.FormatInt(v, 10)
}

func ptr[T any](value T) *T { return &value }
