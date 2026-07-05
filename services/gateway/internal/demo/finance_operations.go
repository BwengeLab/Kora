package demo

type FinanceJournalLine struct {
	Account    string `json:"account"`
	Debit      Money  `json:"debit"`
	Credit     Money  `json:"credit"`
	CostCenter string `json:"costCenter,omitempty"`
}

type FinanceJournalEntry struct {
	ID     string               `json:"id"`
	Date   string               `json:"date"`
	Ref    string               `json:"ref"`
	Memo   string               `json:"memo"`
	Source string               `json:"source"`
	Status string               `json:"status"`
	Entity string               `json:"entity"`
	Lines  []FinanceJournalLine `json:"lines"`
}

type FinanceEvidenceDoc struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	SizeText string `json:"sizeText"`
}

type FinanceLinkedRecord struct {
	Kind string `json:"kind"`
	Ref  string `json:"ref"`
}

type FinanceTransaction struct {
	ID           string               `json:"id"`
	Date         string               `json:"date"`
	Description  string               `json:"description"`
	Counterparty string               `json:"counterparty"`
	Category     string               `json:"category"`
	Purpose      string               `json:"purpose"`
	Account      string               `json:"account"`
	Direction    string               `json:"direction"`
	Amount       Money                `json:"amount"`
	Reference    string               `json:"reference"`
	Reconciled   bool                 `json:"reconciled"`
	Entity       string               `json:"entity"`
	Linked       *FinanceLinkedRecord `json:"linked,omitempty"`
	Evidence     []FinanceEvidenceDoc `json:"evidence"`
	Review       string               `json:"review"`
	Note         string               `json:"note,omitempty"`
}

type FinanceBill struct {
	ID            string   `json:"id"`
	Vendor        string   `json:"vendor"`
	Ref           string   `json:"ref"`
	Amount        float64  `json:"amount"`
	Account       string   `json:"account"`
	CostCenter    string   `json:"costCenter"`
	POAmount      *float64 `json:"poAmount"`
	ReceiptAmount *float64 `json:"receiptAmount"`
	DueDate       string   `json:"dueDate"`
	Entity        string   `json:"entity"`
	Status        string   `json:"status"`
	EvidenceName  string   `json:"evidenceName"`
}

type FinanceOperationsSnapshot struct {
	Journals     []FinanceJournalEntry `json:"journals"`
	Bills        []FinanceBill         `json:"bills"`
	Transactions []FinanceTransaction  `json:"transactions"`
}

func ptrFloat64(v float64) *float64 { return &v }

func FinanceOperationsDemoData() FinanceOperationsSnapshot {
	return FinanceOperationsSnapshot{
		Journals: []FinanceJournalEntry{
			{ID: "je-open", Date: "2025-05-01", Ref: "OB-2025-05", Memo: "Opening balances - May 2025", Source: "opening", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{
				{Account: "1010", Debit: moneyValue(120000000, "USD"), Credit: moneyValue(0, "USD")},
				{Account: "1020", Debit: moneyValue(60000000, "USD"), Credit: moneyValue(0, "USD")},
				{Account: "1040", Debit: moneyValue(18000000, "USD"), Credit: moneyValue(0, "USD")},
				{Account: "1100", Debit: moneyValue(21489000, "USD"), Credit: moneyValue(0, "USD")},
				{Account: "1500", Debit: moneyValue(45000000, "USD"), Credit: moneyValue(0, "USD")},
				{Account: "3000", Debit: moneyValue(0, "USD"), Credit: moneyValue(150000000, "USD")},
				{Account: "3100", Debit: moneyValue(0, "USD"), Credit: moneyValue(54489000, "USD")},
				{Account: "2500", Debit: moneyValue(0, "USD"), Credit: moneyValue(26880000, "USD")},
				{Account: "2000", Debit: moneyValue(0, "USD"), Credit: moneyValue(4560000, "USD")},
				{Account: "2400", Debit: moneyValue(0, "USD"), Credit: moneyValue(28560000, "USD")},
			}},
			{ID: "je-01", Date: "2025-05-02", Ref: "JE-0421", Memo: "Premium - Kigali Corporate Group", Source: "AR", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "1010", Debit: moneyValue(18600000, "USD"), Credit: moneyValue(0, "USD")}, {Account: "4000", Debit: moneyValue(0, "USD"), Credit: moneyValue(18600000, "USD"), CostCenter: "cc-uw"}}},
			{ID: "je-02", Date: "2025-05-04", Ref: "JE-0433", Memo: "Group health premium - Umoja SACCO (MoMo)", Source: "AR", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "1040", Debit: moneyValue(6400000, "USD"), Credit: moneyValue(0, "USD")}, {Account: "4000", Debit: moneyValue(0, "USD"), Credit: moneyValue(6400000, "USD"), CostCenter: "cc-uw"}}},
			{ID: "je-03", Date: "2025-05-02", Ref: "JE-RI-118", Memo: "Reinsurance recovery - Swiss Re", Source: "bank", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "1020", Debit: moneyValue(4200000, "USD"), Credit: moneyValue(0, "USD")}, {Account: "4200", Debit: moneyValue(0, "USD"), Credit: moneyValue(4200000, "USD")}}},
			{ID: "je-04", Date: "2025-05-09", Ref: "CLM-00408", Memo: "Claim settlement - King Faisal Hospital", Source: "claims", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "5000", Debit: moneyValue(820000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-claims"}, {Account: "1030", Debit: moneyValue(0, "USD"), Credit: moneyValue(820000, "USD")}}},
			{ID: "je-05", Date: "2025-05-15", Ref: "PAY-2025-05", Memo: "Payroll - May salaries (42 staff)", Source: "payroll", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "5200", Debit: moneyValue(12840000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-ops"}, {Account: "1020", Debit: moneyValue(0, "USD"), Credit: moneyValue(12840000, "USD")}}},
			{ID: "je-06", Date: "2025-05-07", Ref: "COMM-Q2", Memo: "Broker commission - BK Insurance Brokers", Source: "AP", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "5100", Debit: moneyValue(1860000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-sales"}, {Account: "1010", Debit: moneyValue(0, "USD"), Credit: moneyValue(1860000, "USD")}}},
			{ID: "je-07", Date: "2025-05-10", Ref: "ACME-10356", Memo: "Supplier invoice - ACME Supplies", Source: "AP", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "5700", Debit: moneyValue(4560000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-ops"}, {Account: "2000", Debit: moneyValue(0, "USD"), Credit: moneyValue(4560000, "USD")}}},
			{ID: "je-08", Date: "2025-05-16", Ref: "PAY-ACME", Memo: "Payment to ACME Supplies", Source: "AP", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "2000", Debit: moneyValue(4560000, "USD"), Credit: moneyValue(0, "USD")}, {Account: "1020", Debit: moneyValue(0, "USD"), Credit: moneyValue(4560000, "USD")}}},
			{ID: "je-09", Date: "2025-05-03", Ref: "RENT-MAY", Memo: "Office rent - Kigali Office Park", Source: "AP", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "5300", Debit: moneyValue(1248000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-fin"}, {Account: "1010", Debit: moneyValue(0, "USD"), Credit: moneyValue(1248000, "USD")}}},
			{ID: "je-10", Date: "2025-05-15", Ref: "RRA-2025-04", Memo: "PAYE & VAT accrual - April", Source: "tax", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "5600", Debit: moneyValue(3860000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-fin"}, {Account: "2200", Debit: moneyValue(0, "USD"), Credit: moneyValue(3860000, "USD")}}},
			{ID: "je-11", Date: "2025-05-08", Ref: "JE-KE-0440", Memo: "Corporate health premium - MediCare (Kenya)", Source: "AR", Status: "posted", Entity: "ent-ke", Lines: []FinanceJournalLine{{Account: "1030", Debit: moneyValue(5800000, "USD"), Credit: moneyValue(0, "USD")}, {Account: "4000", Debit: moneyValue(0, "USD"), Credit: moneyValue(5800000, "USD"), CostCenter: "cc-uw"}}},
			{ID: "je-12", Date: "2025-05-14", Ref: "CLM-KE-00412", Memo: "Motor claim settlement (Kenya)", Source: "claims", Status: "posted", Entity: "ent-ke", Lines: []FinanceJournalLine{{Account: "5000", Debit: moneyValue(220000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-claims"}, {Account: "1030", Debit: moneyValue(0, "USD"), Credit: moneyValue(220000, "USD")}}},
			{ID: "je-13", Date: "2025-05-18", Ref: "COMM-UG-05", Memo: "Agent commissions (Uganda)", Source: "AP", Status: "posted", Entity: "ent-ug", Lines: []FinanceJournalLine{{Account: "5100", Debit: moneyValue(1420000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-sales"}, {Account: "1040", Debit: moneyValue(0, "USD"), Credit: moneyValue(1420000, "USD")}}},
			{ID: "je-14", Date: "2025-05-06", Ref: "SUB-Q2", Memo: "Core systems subscription - Cloud Services", Source: "AP", Status: "posted", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "5400", Debit: moneyValue(224000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-ops"}, {Account: "1020", Debit: moneyValue(0, "USD"), Credit: moneyValue(224000, "USD")}}},
			{ID: "je-draft", Date: "2025-05-18", Ref: "DV-2025-05", Memo: "Analytics platform subscription (draft)", Source: "AP", Status: "draft", Entity: "ent-rw", Lines: []FinanceJournalLine{{Account: "5400", Debit: moneyValue(186000, "USD"), Credit: moneyValue(0, "USD"), CostCenter: "cc-ops"}, {Account: "2000", Debit: moneyValue(0, "USD"), Credit: moneyValue(186000, "USD")}}},
		},
		Bills: []FinanceBill{
			{ID: "bill-1", Vendor: "ACME Supplies Ltd.", Ref: "INV-10356", Amount: 45600, Account: "5700", CostCenter: "cc-ops", POAmount: ptrFloat64(45600), ReceiptAmount: ptrFloat64(45600), DueDate: "2025-05-25", Entity: "ent-rw", Status: "draft", EvidenceName: "Invoice INV-10356.pdf"},
			{ID: "bill-2", Vendor: "Cloud Services Inc", Ref: "SUB-Q3", Amount: 2240, Account: "5400", CostCenter: "cc-ops", POAmount: ptrFloat64(2240), ReceiptAmount: nil, DueDate: "2025-05-28", Entity: "ent-rw", Status: "draft", EvidenceName: "Subscription invoice.pdf"},
			{ID: "bill-3", Vendor: "TechHub Rwanda", Ref: "TH-INV-2241", Amount: 9800, Account: "1500", CostCenter: "cc-ops", POAmount: ptrFloat64(9800), ReceiptAmount: ptrFloat64(9800), DueDate: "2025-06-01", Entity: "ent-rw", Status: "draft", EvidenceName: "Hardware invoice.pdf"},
			{ID: "bill-4", Vendor: "PT Imports", Ref: "PT-0441", Amount: 8760, Account: "5700", CostCenter: "cc-ops", POAmount: ptrFloat64(8500), ReceiptAmount: ptrFloat64(8500), DueDate: "2025-05-22", Entity: "ent-rw", Status: "draft", EvidenceName: "PO-2025-441.pdf"},
			{ID: "bill-5", Vendor: "DataViz Co", Ref: "DV-2025-05", Amount: 1860, Account: "5400", CostCenter: "cc-ops", POAmount: nil, ReceiptAmount: nil, DueDate: "2025-06-03", Entity: "ent-rw", Status: "draft", EvidenceName: "DataViz invoice.pdf"},
			{ID: "bill-6", Vendor: "CleanCo Rwanda", Ref: "SVC-MAY", Amount: 1200, Account: "5700", CostCenter: "cc-fin", POAmount: nil, ReceiptAmount: nil, DueDate: "2025-05-20", Entity: "ent-rw", Status: "approved", EvidenceName: "Facilities invoice.pdf"},
			{ID: "bill-7", Vendor: "Bank of Kigali", Ref: "LN-INT-05", Amount: 3200, Account: "5700", CostCenter: "cc-fin", POAmount: nil, ReceiptAmount: nil, DueDate: "2025-05-15", Entity: "ent-rw", Status: "paid", EvidenceName: "Loan interest advice.pdf"},
		},
		Transactions: []FinanceTransaction{
			{ID: "cm-01", Date: "2025-05-02", Description: "Premium - Kigali Corporate Group", Counterparty: "Kigali Corporate Group", Category: "premium", Purpose: "Annual motor fleet policy premium", Account: "BK", Direction: "in", Amount: moneyValue(18600000, "USD"), Reference: "PRM-2025-0421", Reconciled: true, Entity: "ent-rw", Linked: &FinanceLinkedRecord{Kind: "policy", Ref: "POL-MOT-7781"}, Evidence: []FinanceEvidenceDoc{{ID: "e1", Name: "Premium advice.pdf", Kind: "invoice", SizeText: "120 KB"}}, Review: "reviewed"},
			{ID: "cm-02", Date: "2025-05-02", Description: "Reinsurance recovery - Swiss Re", Counterparty: "Swiss Re", Category: "reinsurance", Purpose: "Recovery on prior-period large claim", Account: "HSBC", Direction: "in", Amount: moneyValue(4200000, "USD"), Reference: "RI-2025-118", Reconciled: true, Entity: "ent-rw", Evidence: []FinanceEvidenceDoc{{ID: "e2", Name: "Reinsurance statement.pdf", Kind: "statement", SizeText: "210 KB"}}, Review: "reviewed"},
			{ID: "cm-03", Date: "2025-05-03", Description: "Office lease - Kigali Office Park", Counterparty: "Kigali Office Park Ltd.", Category: "rent", Purpose: "May office rent", Account: "BK", Direction: "out", Amount: moneyValue(1248000, "USD"), Reference: "RENT-MAY", Reconciled: true, Entity: "ent-rw", Linked: &FinanceLinkedRecord{Kind: "contract", Ref: "OL-2025-05"}, Evidence: []FinanceEvidenceDoc{{ID: "e3", Name: "Office Lease 2025.pdf", Kind: "contract", SizeText: "850 KB"}}, Review: "reviewed"},
			{ID: "cm-04", Date: "2025-05-04", Description: "Premium - Umoja SACCO", Counterparty: "Umoja SACCO", Category: "premium", Purpose: "Group health cover premium", Account: "MTN MoMo", Direction: "in", Amount: moneyValue(6400000, "USD"), Reference: "PRM-2025-0433", Reconciled: true, Entity: "ent-ke", Evidence: []FinanceEvidenceDoc{}, Review: "reviewed"},
			{ID: "cm-05", Date: "2025-05-05", Description: "Claim payout - windshield (Diane Ingabire)", Counterparty: "Diane Ingabire", Category: "claim", Purpose: "Motor windshield replacement settlement", Account: "MTN MoMo", Direction: "out", Amount: moneyValue(38000, "USD"), Reference: "CLM-2025-00355", Reconciled: true, Entity: "ent-rw", Linked: &FinanceLinkedRecord{Kind: "claim", Ref: "CLM-2025-00355"}, Evidence: []FinanceEvidenceDoc{{ID: "e4", Name: "Repair invoice.pdf", Kind: "invoice", SizeText: "110 KB"}}, Review: "reviewed"},
			{ID: "cm-06", Date: "2025-05-06", Description: "Software - Cloud Services Inc", Counterparty: "Cloud Services Inc", Category: "software", Purpose: "Quarterly SaaS subscription (core systems)", Account: "HSBC", Direction: "out", Amount: moneyValue(224000, "USD"), Reference: "SUB-Q2", Reconciled: false, Entity: "ent-rw", Linked: &FinanceLinkedRecord{Kind: "bill", Ref: "SUB-Q2-2025"}, Evidence: []FinanceEvidenceDoc{{ID: "e5", Name: "Subscription invoice.pdf", Kind: "invoice", SizeText: "90 KB"}}, Review: "needs-review"},
			{ID: "cm-07", Date: "2025-05-07", Description: "Commission - BK Insurance Brokers", Counterparty: "BK Insurance Brokers", Category: "commission", Purpose: "Broker commission on Q2 new business", Account: "BK", Direction: "out", Amount: moneyValue(1860000, "USD"), Reference: "COMM-2025-Q2", Reconciled: true, Entity: "ent-rw", Evidence: []FinanceEvidenceDoc{{ID: "e6", Name: "Commission statement.xlsx", Kind: "invoice", SizeText: "140 KB"}}, Review: "reviewed"},
			{ID: "cm-08", Date: "2025-05-08", Description: "Premium - MediCare Network", Counterparty: "MediCare Network", Category: "premium", Purpose: "Corporate health scheme premium", Account: "I&M", Direction: "in", Amount: moneyValue(5800000, "USD"), Reference: "PRM-2025-0440", Reconciled: true, Entity: "ent-ke", Evidence: []FinanceEvidenceDoc{}, Review: "reviewed"},
			{ID: "cm-09", Date: "2025-05-09", Description: "Claim payout - appendectomy (Aline Uwimana)", Counterparty: "King Faisal Hospital", Category: "claim", Purpose: "Inpatient surgery settlement to provider", Account: "I&M", Direction: "out", Amount: moneyValue(820000, "USD"), Reference: "CLM-2025-00408", Reconciled: false, Entity: "ent-ke", Linked: &FinanceLinkedRecord{Kind: "claim", Ref: "CLM-2025-00408"}, Evidence: []FinanceEvidenceDoc{{ID: "e7", Name: "Hospital invoice.pdf", Kind: "invoice", SizeText: "610 KB"}}, Review: "needs-review"},
			{ID: "cm-10", Date: "2025-05-10", Description: "Supplier - ACME Supplies", Counterparty: "ACME Supplies Ltd.", Category: "supplier", Purpose: "Office equipment & stationery", Account: "HSBC", Direction: "out", Amount: moneyValue(4560000, "USD"), Reference: "ACME-INV-10356", Reconciled: false, Entity: "ent-rw", Linked: &FinanceLinkedRecord{Kind: "invoice", Ref: "INV-10356"}, Evidence: []FinanceEvidenceDoc{{ID: "e8", Name: "Invoice INV-10356.pdf", Kind: "invoice", SizeText: "320 KB"}}, Review: "needs-review"},
			{ID: "cm-11", Date: "2025-05-12", Description: "Premium - corporate motor fleet renewal", Counterparty: "Acme Logistics", Category: "premium", Purpose: "Fleet policy renewal premium", Account: "BK", Direction: "in", Amount: moneyValue(9600000, "USD"), Reference: "PRM-2025-0451", Reconciled: true, Entity: "ent-ug", Evidence: []FinanceEvidenceDoc{}, Review: "reviewed"},
			{ID: "cm-12", Date: "2025-05-12", Description: "Suspicious transfer - OFFSHORE LTD", Counterparty: "OFFSHORE LTD", Category: "supplier", Purpose: "Unrecognised - flagged, no contract on file", Account: "BK", Direction: "out", Amount: moneyValue(1540000, "USD"), Reference: "-", Reconciled: false, Entity: "ent-rw", Evidence: []FinanceEvidenceDoc{}, Review: "flagged", Note: "No contract on file - escalated to Finance Lead."},
			{ID: "cm-13", Date: "2025-05-13", Description: "Premium - premium top-up (M. Iradukunda)", Counterparty: "Marie Iradukunda", Category: "premium", Purpose: "Individual policy top-up", Account: "Airtel", Direction: "in", Amount: moneyValue(42000, "USD"), Reference: "PREM-7741", Reconciled: true, Entity: "ent-ug", Evidence: []FinanceEvidenceDoc{}, Review: "reviewed"},
			{ID: "cm-14", Date: "2025-05-13", Description: "Travel reimbursement (D. Uwase)", Counterparty: "Diane Uwase", Category: "payroll", Purpose: "Staff travel reimbursement", Account: "MTN MoMo", Direction: "out", Amount: moneyValue(18000, "USD"), Reference: "EXP-TRAV-2205", Reconciled: true, Entity: "ent-rw", Evidence: []FinanceEvidenceDoc{{ID: "e9", Name: "Travel receipt.jpg", Kind: "receipt", SizeText: "1.2 MB"}}, Review: "reviewed"},
			{ID: "cm-15", Date: "2025-05-14", Description: "Claim - motor collision (J-P Niyonzima)", Counterparty: "Kigali Auto Garage", Category: "claim", Purpose: "Motor repair settlement to garage", Account: "BK", Direction: "out", Amount: moneyValue(220000, "USD"), Reference: "CLM-2025-00412", Reconciled: false, Entity: "ent-rw", Linked: &FinanceLinkedRecord{Kind: "claim", Ref: "CLM-2025-00412"}, Evidence: []FinanceEvidenceDoc{{ID: "e10", Name: "Repair quote.pdf", Kind: "invoice", SizeText: "180 KB"}}, Review: "needs-review"},
			{ID: "cm-16", Date: "2025-05-15", Description: "Payroll - May salaries", Counterparty: "Staff payroll", Category: "payroll", Purpose: "Monthly staff salaries (42 employees)", Account: "HSBC", Direction: "out", Amount: moneyValue(12840000, "USD"), Reference: "PAY-2025-05", Reconciled: true, Entity: "ent-rw", Linked: &FinanceLinkedRecord{Kind: "payroll", Ref: "PAY-2025-05"}, Evidence: []FinanceEvidenceDoc{{ID: "e11", Name: "Payroll run.xlsx", Kind: "invoice", SizeText: "88 KB"}}, Review: "reviewed"},
			{ID: "cm-17", Date: "2025-05-15", Description: "Tax remittance - RRA (PAYE + VAT)", Counterparty: "Rwanda Revenue Authority", Category: "tax", Purpose: "PAYE and VAT for April", Account: "BK", Direction: "out", Amount: moneyValue(3860000, "USD"), Reference: "RRA-2025-04", Reconciled: true, Entity: "ent-rw", Evidence: []FinanceEvidenceDoc{{ID: "e12", Name: "RRA receipt.pdf", Kind: "statement", SizeText: "60 KB"}}, Review: "reviewed"},
			{ID: "cm-18", Date: "2025-05-15", Description: "Fee income - policy admin fees", Counterparty: "Various policyholders", Category: "fee", Purpose: "Policy administration & endorsement fees", Account: "BK", Direction: "in", Amount: moneyValue(840000, "USD"), Reference: "FEE-2025-05", Reconciled: true, Entity: "ent-ke", Evidence: []FinanceEvidenceDoc{}, Review: "reviewed"},
			{ID: "cm-19", Date: "2025-05-16", Description: "Premium - health scheme installment", Counterparty: "Bright Schools Group", Category: "premium", Purpose: "Group health premium installment", Account: "MTN MoMo", Direction: "in", Amount: moneyValue(3100000, "USD"), Reference: "PRM-2025-0460", Reconciled: false, Entity: "ent-ug", Evidence: []FinanceEvidenceDoc{}, Review: "needs-review"},
			{ID: "cm-20", Date: "2025-05-16", Description: "Loan repayment - equipment finance", Counterparty: "Bank of Kigali", Category: "loan", Purpose: "Monthly equipment-finance installment", Account: "BK", Direction: "out", Amount: moneyValue(2240000, "USD"), Reference: "LN-2024-0099", Reconciled: true, Entity: "ent-rw", Evidence: []FinanceEvidenceDoc{{ID: "e13", Name: "Loan schedule.pdf", Kind: "contract", SizeText: "140 KB"}}, Review: "reviewed"},
			{ID: "cm-21", Date: "2025-05-17", Description: "Premium refund - cancelled policy", Counterparty: "P. Habiyaremye", Category: "refund", Purpose: "Pro-rata refund on cancelled motor policy", Account: "Airtel", Direction: "out", Amount: moneyValue(64000, "USD"), Reference: "RFD-2025-021", Reconciled: true, Entity: "ent-rw", Evidence: []FinanceEvidenceDoc{}, Review: "reviewed"},
			{ID: "cm-22", Date: "2025-05-17", Description: "Supplier - IT hardware", Counterparty: "TechHub Rwanda", Category: "supplier", Purpose: "Laptops for claims team", Account: "HSBC", Direction: "out", Amount: moneyValue(980000, "USD"), Reference: "TH-INV-2241", Reconciled: false, Entity: "ent-ug", Evidence: []FinanceEvidenceDoc{{ID: "e14", Name: "Hardware invoice.pdf", Kind: "invoice", SizeText: "120 KB"}}, Review: "needs-review"},
			{ID: "cm-23", Date: "2025-05-18", Description: "Premium - corporate liability", Counterparty: "Gikondo Industrial", Category: "premium", Purpose: "Public liability cover premium", Account: "I&M", Direction: "in", Amount: moneyValue(7400000, "USD"), Reference: "PRM-2025-0471", Reconciled: true, Entity: "ent-ke", Evidence: []FinanceEvidenceDoc{}, Review: "reviewed"},
			{ID: "cm-24", Date: "2025-05-18", Description: "Commission - agent network payout", Counterparty: "Agent network", Category: "commission", Purpose: "Monthly tied-agent commissions", Account: "MTN MoMo", Direction: "out", Amount: moneyValue(1420000, "USD"), Reference: "COMM-2025-05", Reconciled: false, Entity: "ent-ug", Evidence: []FinanceEvidenceDoc{}, Review: "needs-review"},
			{ID: "cm-25", Date: "2025-05-18", Description: "Software - analytics platform", Counterparty: "DataViz Co", Category: "software", Purpose: "BI & reporting subscription", Account: "HSBC", Direction: "out", Amount: moneyValue(186000, "USD"), Reference: "DV-2025-05", Reconciled: false, Entity: "ent-rw", Evidence: []FinanceEvidenceDoc{}, Review: "needs-review"},
		},
	}
}
