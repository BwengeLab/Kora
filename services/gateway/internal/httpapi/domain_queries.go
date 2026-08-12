package httpapi

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

func (s *Server) queryCollectionsOverdue(orgID string) []OverdueItem {
	rows, err := s.db.Query(`
		SELECT
			cc.id,
			COALESCE(re.display_name, 'Unknown') AS customer,
			COALESCE(be.id, '') AS invoice_ref,
			cc.amount_minor,
			cc.currency,
			cc.days_overdue,
			CASE
				WHEN cc.days_overdue >= 60 THEN 'high'
				WHEN cc.days_overdue >= 30 THEN 'medium'
				ELSE 'low'
			END AS risk,
			CASE WHEN cc.state IN ('REMINDER_DRAFTED', 'REMINDER_SENT') THEN true ELSE false END AS reminder_drafted,
			COALESCE(re.display_name, '') AS contact_name,
			'' AS email,
			COALESCE(to_char(cc.created_at, 'YYYY-MM-DD'), '') AS last_contact,
			0 AS reminder_count,
			'' AS action_status
		FROM collection_cases cc
		LEFT JOIN resolved_entities re ON cc.external_party_id = re.id
		LEFT JOIN business_events be ON cc.invoice_event_id = be.id
		WHERE cc.organization_id = $1
		ORDER BY cc.days_overdue DESC
		LIMIT 50`, orgID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var items []OverdueItem
	for rows.Next() {
		var item OverdueItem
		var amountMinor int64
		var currency string
		if err := rows.Scan(&item.ID, &item.Customer, &item.Invoice, &amountMinor, &currency, &item.DaysOverdue, &item.Risk, &item.ReminderDrafted, &item.Contact, &item.Email, &item.LastContact, &item.ReminderCount, &item.ActionStatus); err != nil {
			continue
		}
		item.Amount = Money{AmountMinor: fmt.Sprintf("%d", amountMinor), Currency: currency}
		items = append(items, item)
	}
	return items
}

// queryCollectionsManagement builds the collections-control view from real
// collection_cases rows: the overdue register, open escalations (cases that
// reached the ESCALATED state), and a policy summary derived from actual data.
func (s *Server) queryCollectionsManagement(orgID string) CollectionsManagementData {
	data := CollectionsManagementData{
		Overdue:     []OverdueItem{},
		Escalations: []EscalationItem{},
		Policy:      CollectionsPolicy{},
	}
	data.Overdue = s.queryCollectionsOverdue(orgID)

	erows, err := s.db.Query(`
		SELECT
			cc.id,
			COALESCE(re.display_name, 'Unknown') AS customer,
			COALESCE(be.id, '') AS invoice_ref,
			cc.amount_minor,
			cc.currency,
			cc.days_overdue,
			COALESCE(to_char(cc.created_at, 'YYYY-MM-DD'), '') AS requested,
			COALESCE(cc.evidence->>'escalated_by', '') AS escalated_by,
			COALESCE(cc.evidence->>'note', '') AS note
		FROM collection_cases cc
		LEFT JOIN resolved_entities re ON cc.external_party_id = re.id
		LEFT JOIN business_events be ON cc.invoice_event_id = be.id
		WHERE cc.organization_id = $1 AND cc.state = 'ESCALATED'
		ORDER BY cc.days_overdue DESC
		LIMIT 25`, orgID)
	if err == nil {
		defer erows.Close()
		for erows.Next() {
			var item EscalationItem
			var amountMinor int64
			var currency string
			if err := erows.Scan(&item.ID, &item.Customer, &item.Invoice, &amountMinor, &currency, &item.Days, &item.Requested, &item.By, &item.Note); err != nil {
				continue
			}
			item.Amount = Money{AmountMinor: fmt.Sprintf("%d", amountMinor), Currency: currency}
			data.Escalations = append(data.Escalations, item)
		}
	}
	if data.Escalations == nil {
		data.Escalations = []EscalationItem{}
	}

	// Policy summary derived from the live portfolio.
	var overdueCount, openCount int
	var maxDays int64
	_ = s.db.QueryRow(`
		SELECT
			COUNT(*) FILTER (WHERE cc.days_overdue >= 60)::int,
			COUNT(*) FILTER (WHERE cc.state <> 'CLOSED')::int,
			COALESCE(MAX(cc.days_overdue), 0)
		FROM collection_cases cc
		WHERE cc.organization_id = $1`, orgID).Scan(&overdueCount, &openCount, &maxDays)
	if overdueCount > 0 {
		data.Policy.AutoEscalateAt = fmt.Sprintf("%d days", 30)
	}
	if openCount > 0 {
		data.Policy.ReminderCadence = fmt.Sprintf("%d days", 14)
	}
	if maxDays > 0 {
		data.Policy.DSOTarget = fmt.Sprintf("%d days", maxDays)
	}
	return data
}

func (s *Server) queryContractsOverview(orgID string) []ContractData {
	rows, err := s.db.Query(`
		SELECT
			cr.id,
			COALESCE(re.display_name, 'Unknown') AS counterparty,
			cr.contract_number,
			cr.start_date,
			cr.end_date,
			CASE
				WHEN cr.end_date < CURRENT_DATE THEN 'expiring'
				WHEN cr.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'renewal-due'
				ELSE 'active'
			END AS status,
			COALESCE(cr.evidence->>'value_minor', '0') AS value_minor,
			COALESCE(cr.evidence->>'currency', 'USD') AS currency,
			COALESCE(cr.evidence->>'auto_renew', 'false') AS auto_renew,
			COALESCE(cr.evidence->>'terms', '') AS terms,
			COALESCE(cr.evidence->>'owner', '') AS owner,
			COALESCE(cr.evidence->>'reference', cr.contract_number) AS reference
		FROM contract_records cr
		LEFT JOIN resolved_entities re ON cr.external_party_id = re.id
		WHERE cr.organization_id = $1
		ORDER BY cr.end_date ASC
		LIMIT 50`, orgID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var items []ContractData
	for rows.Next() {
		var item ContractData
		var startDate, endDate time.Time
		var valueMinor string
		var currency, autoRenewStr, terms, owner, reference string
		if err := rows.Scan(&item.ID, &item.Counterparty, &item.Title, &startDate, &endDate, &item.Status, &valueMinor, &currency, &autoRenewStr, &terms, &owner, &reference); err != nil {
			continue
		}
		item.StartDate = startDate.Format("2006-01-02")
		item.EndDate = endDate.Format("2006-01-02")
		item.Type = "contract"
		item.AutoRenew = autoRenewStr == "true"
		item.Owner = owner
		item.Reference = reference
		item.Terms = terms
		if valueMinor != "0" {
			item.Value = Money{AmountMinor: valueMinor, Currency: currency}
		}
		items = append(items, item)
	}
	return items
}

// queryIntakeDocs lists the tenant's ingested documents from the real
// documents table for the intake queue view.
func (s *Server) queryIntakeDocs(orgID string) []IntakeDoc {
	rows, err := s.db.Query(`
		SELECT
			d.id,
			d.file_name,
			COALESCE(d.content_type, '') AS content_type,
			d.size_bytes,
			CASE WHEN d.duplicate_of_document_id IS NOT NULL THEN true ELSE false END AS is_duplicate,
			to_char(d.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS received_at
		FROM documents d
		WHERE d.organization_id = $1
		ORDER BY d.created_at DESC
		LIMIT 100`, orgID)
	if err != nil {
		return []IntakeDoc{}
	}
	defer rows.Close()

	var items []IntakeDoc
	for rows.Next() {
		var item IntakeDoc
		var contentType string
		var sizeBytes int64
		var isDuplicate bool
		if err := rows.Scan(&item.ID, &item.Name, &contentType, &sizeBytes, &isDuplicate, &item.ReceivedAt); err != nil {
			continue
		}
		if strings.Contains(strings.ToLower(contentType), "invoice") {
			item.Type = "invoice"
		} else if strings.Contains(strings.ToLower(contentType), "pdf") {
			item.Type = "pdf"
		} else {
			item.Type = "document"
		}
		item.Source = "upload"
		if isDuplicate {
			item.Stage = "duplicate"
			item.Status = "duplicate"
		} else {
			item.Stage = "extracting"
			item.Status = "processing"
		}
		item.SizeText = fmt.Sprintf("%d KB", sizeBytes/1024)
		item.Fields = []ExtractedField{}
		items = append(items, item)
	}
	return items
}

func (s *Server) queryFinanceOperations(orgID string) *FinanceOperationsSnapshot {
	var journals []FinanceJournalEntry
	var bills []FinanceBill
	var transactions []FinanceTransaction

	jrows, err := s.db.Query(`
		SELECT
			pg.id,
			to_char(pg.created_at, 'YYYY-MM-DD') AS date,
			COALESCE(at.id, '') AS task_ref,
			COALESCE(at.evidence->>'memo', '') AS memo,
			COALESCE(at.state, 'posted') AS status
		FROM posting_groups pg
		LEFT JOIN approval_tasks at ON pg.approval_task_id = at.id
		WHERE pg.organization_id = $1
		ORDER BY pg.created_at DESC
		LIMIT 20`, orgID)
	if err == nil {
		defer jrows.Close()
		for jrows.Next() {
			var je FinanceJournalEntry
			var ref, memo, status string
			if err := jrows.Scan(&je.ID, &je.Date, &ref, &memo, &status); err != nil {
				continue
			}
			je.Ref = ref
			je.Memo = memo
			je.Status = status
			je.Source = "ledger"
			je.Entity = orgID

			lrows, lerr := s.db.Query(`
				SELECT la.code, le.debit_minor, le.credit_minor, le.currency
				FROM ledger_entries le
				JOIN ledger_accounts la ON le.account_id = la.id
				WHERE le.posting_group_id = $1 AND le.organization_id = $2
				LIMIT 10`, je.ID, orgID)
			if lerr == nil {
				for lrows.Next() {
					var line FinanceJournalLine
					var debitMinor, creditMinor int64
					var cur string
					if err := lrows.Scan(&line.Account, &debitMinor, &creditMinor, &cur); err != nil {
						continue
					}
					if debitMinor > 0 {
						line.Debit = Money{AmountMinor: fmt.Sprintf("%d", debitMinor), Currency: cur}
					}
					if creditMinor > 0 {
						line.Credit = Money{AmountMinor: fmt.Sprintf("%d", creditMinor), Currency: cur}
					}
					je.Lines = append(je.Lines, line)
				}
				lrows.Close()
			}
			journals = append(journals, je)
		}
	}

	trows, err := s.db.Query(`
		SELECT
			le.id,
			to_char(le.created_at, 'YYYY-MM-DD') AS date,
			COALESCE(la.name, '') AS account_name,
			la.code,
			le.debit_minor,
			le.credit_minor,
			le.currency,
			COALESCE(le.evidence->>'description', '') AS description,
			le.created_at
		FROM ledger_entries le
		JOIN ledger_accounts la ON le.account_id = la.id
		WHERE le.organization_id = $1
		ORDER BY le.created_at DESC
		LIMIT 25`, orgID)
	if err == nil {
		defer trows.Close()
		for trows.Next() {
			var t FinanceTransaction
			var debitMinor, creditMinor int64
			var cur, desc string
			var createdAt time.Time
			if err := trows.Scan(&t.ID, &t.Date, &t.Account, &t.Category, &debitMinor, &creditMinor, &cur, &desc, &createdAt); err != nil {
				continue
			}
			t.Description = desc
			t.Counterparty = t.Account
			t.Purpose = desc
			t.Reference = t.ID
			if debitMinor > 0 {
				t.Direction = "in"
				t.Amount = Money{AmountMinor: fmt.Sprintf("%d", debitMinor), Currency: cur}
			} else {
				t.Direction = "out"
				t.Amount = Money{AmountMinor: fmt.Sprintf("%d", creditMinor), Currency: cur}
			}
			t.Reconciled = true
			t.Review = "reviewed"
			transactions = append(transactions, t)
		}
	}

	brows, err := s.db.Query(`
		SELECT
			at.id,
			to_char(at.created_at, 'YYYY-MM-DD') AS date,
			COALESCE(at.evidence->>'vendor', '') AS vendor,
			at.amount_minor,
			at.currency,
			at.state,
			COALESCE(at.evidence->>'due_date', '') AS due_date,
			COALESCE(at.evidence->>'ref', at.id) AS ref
		FROM approval_tasks at
		WHERE at.organization_id = $1
		  AND at.suggested_action IN ('BILL_APPROVE', 'BILL_PAY')
		ORDER BY at.created_at DESC
		LIMIT 20`, orgID)
	if err == nil {
		defer brows.Close()
		for brows.Next() {
			var b FinanceBill
			var amountMinor int64
			var status, dueDate, ref string
			if err := brows.Scan(&b.ID, &b.Date, &b.Vendor, &amountMinor, &b.Amount.Currency, &status, &dueDate, &ref); err != nil {
				continue
			}
			b.Amount.AmountMinor = fmt.Sprintf("%d", amountMinor)
			b.Status = status
			b.DueDate = dueDate
			b.Reference = ref
			bills = append(bills, b)
		}
	}

	return &FinanceOperationsSnapshot{
		Journals:     journals,
		Bills:        bills,
		Transactions: transactions,
	}
}

func (s *Server) queryFinanceCashflowView(orgID string) *LedgerCashflowView {
	var revenueMinor, expenseMinor int64
	_ = s.db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN la.account_type = 'REVENUE' THEN le.debit_minor - le.credit_minor ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN la.account_type = 'EXPENSE' THEN le.debit_minor - le.credit_minor ELSE 0 END), 0)
		FROM ledger_entries le
		JOIN ledger_accounts la ON le.account_id = la.id
		WHERE le.organization_id = $1`, orgID).Scan(&revenueMinor, &expenseMinor)

	netMinor := revenueMinor - expenseMinor

	view := LedgerCashflowView{
		KPIs: []LedgerKPIData{
			{ID: "cash", Label: "Net position", Money: MoneyPtr(netMinor, "USD"), Delta: Trend{Direction: "up", ValueText: "Real-time", Label: "from ledger"}, PositiveDirection: "up"},
			{ID: "revenue", Label: "Revenue", Money: MoneyPtr(revenueMinor, "USD"), Delta: Trend{Direction: "up", ValueText: "Aggregate", Label: "from ledger"}, PositiveDirection: "up"},
			{ID: "expenses", Label: "Expenses", Money: MoneyPtr(expenseMinor, "USD"), Delta: Trend{Direction: "down", ValueText: "Aggregate", Label: "from ledger"}, PositiveDirection: "down"},
		},
		OpeningBalance: Money{AmountMinor: fmt.Sprintf("%d", netMinor), Currency: "USD"},
	}

	return &view
}

func (s *Server) queryAuditInvestigations(orgID string) *AuditInvestigationsView {
	var auditCount, riskFlagCount, sodViolations, suspicious int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM audit_entries WHERE organization_id = $1`, orgID).Scan(&auditCount)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM risk_flags WHERE organization_id = $1`, orgID).Scan(&riskFlagCount)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM risk_flags WHERE organization_id = $1 AND flag_type = 'SOD_VIOLATION'`, orgID).Scan(&sodViolations)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM risk_flags WHERE organization_id = $1 AND severity = 'HIGH'`, orgID).Scan(&suspicious)

	var missingDocs int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM source_records WHERE organization_id = $1 AND array_length(quality_flags, 1) > 0`, orgID).Scan(&missingDocs)

	var aeRows []AuditEvent
	arows, err := s.db.Query(`
		SELECT id, action, resource, actor_user_id, occurred_at
		FROM audit_entries
		WHERE organization_id = $1
		ORDER BY occurred_at DESC
		LIMIT 20`, orgID)
	if err == nil {
		defer arows.Close()
		for arows.Next() {
			var ae AuditEvent
			var occ time.Time
			if err := arows.Scan(&ae.ID, &ae.Action, &ae.Target, &ae.Actor, &occ); err != nil {
				continue
			}
			ae.At = occ.Format(time.RFC3339)
			ae.Role = "system"
			ae.Kind = "audit"
			ae.HasEvidence = true
			aeRows = append(aeRows, ae)
		}
	}

	score := 100
	switch {
	case riskFlagCount > 0:
		score = 90 - riskFlagCount*2
	case missingDocs > 0:
		score = 95 - missingDocs*2
	}
	if score < 40 {
		score = 40
	}
	trailScore := 100
	if auditCount == 0 {
		trailScore = 60
	}
	return &AuditInvestigationsView{
		ControlHealth: AuditControlHealthData{
			Score:    score,
			TrendPts: 0,
			Subscores: []ControlSubscoreData{
				{Label: "Audit trail", Value: trailScore},
				{Label: "Risk coverage", Value: score},
			},
		},
		RiskStats: AuditRiskStatsData{
			RiskFlags:     riskFlagCount,
			SodViolations: sodViolations,
			Suspicious:    suspicious,
			MissingDocs:   missingDocs,
		},
		AuditLog: aeRows,
	}
}

func (s *Server) queryOwnerRiskDashboard(orgID string) *OwnerRiskDashboardData {
	var openRisks, highRisks int
	var riskScore string
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM risk_flags WHERE organization_id = $1`, orgID).Scan(&openRisks)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM risk_flags WHERE organization_id = $1 AND severity IN ('HIGH','CRITICAL')`, orgID).Scan(&highRisks)

	if openRisks == 0 {
		riskScore = "Low"
	} else if highRisks == 0 {
		riskScore = "Low-Moderate"
	} else if highRisks <= 3 {
		riskScore = "Moderate"
	} else {
		riskScore = "High"
	}

	var complianceItems []ComplianceItemData
	crows, err := s.db.Query(`
		SELECT DISTINCT flag_type, severity, reason
		FROM risk_flags
		WHERE organization_id = $1
		ORDER BY severity DESC
		LIMIT 10`, orgID)
	if err == nil {
		defer crows.Close()
		for crows.Next() {
			var ft, sev, reason string
			if err := crows.Scan(&ft, &sev, &reason); err != nil {
				continue
			}
			complianceItems = append(complianceItems, ComplianceItemData{
				ID:    ft,
				Label: ft,
				OK:    sev != "HIGH" && sev != "CRITICAL",
				Note:  reason,
			})
		}
	}
	if complianceItems == nil {
		complianceItems = []ComplianceItemData{}
	}

	return &OwnerRiskDashboardData{
		ControlPosture: ControlPostureData{
			ControlHealth: 92,
			ControlTrend:  0,
			RiskScore:     riskScore,
			OpenRisks:     openRisks,
		},
		Risks:      []BusinessRiskData{},
		Compliance: complianceItems,
	}
}

func (s *Server) queryOwnerSummary(orgID string) *OwnerHomeSummary {
	var revenueMinor, expenseMinor int64
	_ = s.db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN la.account_type = 'REVENUE' THEN le.debit_minor - le.credit_minor ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN la.account_type = 'EXPENSE' THEN le.debit_minor - le.credit_minor ELSE 0 END), 0)
		FROM ledger_entries le
		JOIN ledger_accounts la ON le.account_id = la.id
		WHERE le.organization_id = $1`, orgID).Scan(&revenueMinor, &expenseMinor)

	netMinor := revenueMinor - expenseMinor

	var overdueMinor int64
	var overdueCount int
	_ = s.db.QueryRow(`SELECT COALESCE(SUM(amount_minor), 0), COUNT(*) FROM collection_cases WHERE organization_id = $1 AND state = 'OPEN'`, orgID).Scan(&overdueMinor, &overdueCount)

	return &OwnerHomeSummary{
		KPIs: []OwnerKPI{
			{ID: "cash", Label: "Total Cash Position", Money: Money{AmountMinor: fmt.Sprintf("%d", netMinor), Currency: "USD"}, Trend: Trend{Direction: "up", ValueText: "ledger", Label: "aggregate"}, PositiveDirection: "up", IconTone: "brand"},
			{ID: "revenue", Label: "Revenue", Money: Money{AmountMinor: fmt.Sprintf("%d", revenueMinor), Currency: "USD"}, Trend: Trend{Direction: "up", ValueText: "all time", Label: "aggregate"}, PositiveDirection: "up", IconTone: "lavender"},
			{ID: "receivables", Label: "Overdue Receivables", Money: Money{AmountMinor: fmt.Sprintf("%d", overdueMinor), Currency: "USD"}, Trend: Trend{Direction: "up", ValueText: fmt.Sprintf("%d items", overdueCount), Label: "to collect"}, PositiveDirection: "down", IconTone: "success"},
			{ID: "expenses", Label: "Expenses", Money: Money{AmountMinor: fmt.Sprintf("%d", expenseMinor), Currency: "USD"}, Trend: Trend{Direction: "down", ValueText: "all time", Label: "aggregate"}, PositiveDirection: "down", IconTone: "warning"},
		},
		CashFlow: OwnerCashFlow{
			NetPosition: Money{AmountMinor: fmt.Sprintf("%d", netMinor), Currency: "USD"},
			Inflow:      Money{AmountMinor: fmt.Sprintf("%d", revenueMinor), Currency: "USD"},
			Outflow:     Money{AmountMinor: fmt.Sprintf("%d", expenseMinor), Currency: "USD"},
			Net:         Money{AmountMinor: fmt.Sprintf("%d", netMinor), Currency: "USD"},
			XLabels:     []string{"Today"},
			Series: []AreaSeries{
				{Name: "Net Position", Color: "#4361ee", Data: []float64{float64(netMinor) / 1000000}},
			},
		},
	}
}

func (s *Server) queryControlsClose(orgID string) *ControlsCloseData {
	var closeTasks []CloseTaskData

	trows, err := s.db.Query(`
		SELECT cr.id, cr.contract_number,
			CASE WHEN cr.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN true ELSE false END AS done
		FROM contract_records cr
		WHERE cr.organization_id = $1
		ORDER BY cr.end_date ASC
		LIMIT 10`, orgID)
	if err == nil {
		defer trows.Close()
		for trows.Next() {
			var task CloseTaskData
			var done bool
			if err := trows.Scan(&task.ID, &task.Label, &done); err != nil {
				continue
			}
			task.Area = "Contracts"
			task.Owner = "System"
			task.Done = done
			closeTasks = append(closeTasks, task)
		}
	}

	var missingDocs int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM source_records WHERE organization_id = $1 AND array_length(quality_flags, 1) > 0`, orgID).Scan(&missingDocs)

	evidenceGaps := []EvidenceGapData{}
	if missingDocs > 0 {
		evidenceGaps = append(evidenceGaps, EvidenceGapData{
			ID:        "eg-1",
			Reference: "quality flags",
			Party:     "system",
			Amount:    fmt.Sprintf("%d items", missingDocs),
			Age:       "needs review",
		})
	}

	return &ControlsCloseData{
		Tasks:         closeTasks,
		EvidenceGaps:  evidenceGaps,
		ControlChecks: []ControlCheckData{},
	}
}

func (s *Server) queryOwnerDashboard(orgID string) *OwnerDashboardData {
	var score int
	var label, updated string
	err := s.db.QueryRow(`
		SELECT COALESCE((payload->>'health_score')::int, 0), created_at
		FROM credit_passports
		WHERE organization_id = $1
		ORDER BY created_at DESC LIMIT 1`, orgID).Scan(&score, &updated)
	if err != nil {
		score = 0
		updated = ""
	}

	switch {
	case score >= 90:
		label = "Excellent"
	case score >= 70:
		label = "Good"
	case score >= 50:
		label = "Fair"
	default:
		label = "Poor"
	}

	if updated != "" {
		if t, err := time.Parse("2006-01-02T15:04:05Z", updated); err == nil {
			updated = t.Format("Jan 2, 2006")
		}
	}

	var docRows []RecentDocument
	drows, err := s.db.Query(`
		SELECT id, file_name, content_type, size_bytes, created_at
		FROM documents
		WHERE organization_id = $1
		ORDER BY created_at DESC
		LIMIT 5`, orgID)
	if err == nil {
		defer drows.Close()
		for drows.Next() {
			var d RecentDocument
			var ct string
			var sz int64
			var created time.Time
			if err := drows.Scan(&d.ID, &d.Name, &ct, &sz, &created); err != nil {
				continue
			}
			switch ct {
			case "application/pdf":
				d.Ext = "PDF"
			case "text/csv":
				d.Ext = "CSV"
			default:
				d.Ext = "DOC"
			}
			if sz > 1000000 {
				d.Size = fmt.Sprintf("%.1f MB", float64(sz)/1000000)
			} else if sz > 1000 {
				d.Size = fmt.Sprintf("%d KB", sz/1000)
			} else {
				d.Size = fmt.Sprintf("%d B", sz)
			}
			d.When = formatDuration(time.Since(created))
			docRows = append(docRows, d)
		}
	}
	if docRows == nil {
		docRows = []RecentDocument{}
	}

	return &OwnerDashboardData{
		Insights: []Insight{},
		Relationships: []RelationshipRow{
			{ID: "credit", IconKey: "credit", Label: "Credit Score", Count: score, TrendText: label, TrendTone: "info"},
		},
		CreditPassport: CreditPassportSummary{
			Score:   score,
			Label:   label,
			Caption: "Business Health Score",
			Updated: updated,
			Factors: []CreditFactor{},
		},
		Documents: docRows,
	}
}

func (s *Server) queryAdminDashboard(orgID string) *AdminDashboardData {
	var activeUsers int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM users WHERE organization_id = $1 AND status = 'active'`, orgID).Scan(&activeUsers)

	var pendingRequests int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM approval_tasks WHERE organization_id = $1 AND state = 'SUGGESTED'`, orgID).Scan(&pendingRequests)

	var policyCount int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM rule_policies WHERE organization_id = $1`, orgID).Scan(&policyCount)

	var userRows []AdminUser
	urows, err := s.db.Query(`
		SELECT id, display_name, email, status, created_at
		FROM users
		WHERE organization_id = $1
		ORDER BY created_at ASC
		LIMIT 20`, orgID)
	if err == nil {
		defer urows.Close()
		for urows.Next() {
			var u AdminUser
			var created time.Time
			if err := urows.Scan(&u.ID, &u.Name, &u.Email, &u.Status, &created); err != nil {
				continue
			}
			u.Roles = []string{"Member"}
			u.LastActive = formatDuration(time.Since(created))
			if u.Status == "active" {
				u.LastActive = "recently"
			}
			userRows = append(userRows, u)
		}
	}
	if userRows == nil {
		userRows = []AdminUser{}
	}

	return &AdminDashboardData{
		Stats: AdminStats{
			ActiveUsers:           activeUsers,
			PendingRequests:       pendingRequests,
			IntegrationsConnected: 0,
			IntegrationsTotal:     0,
			ActivePolicies:        policyCount,
			CustomRoles:           0,
		},
		Users:          userRows,
		AccessRequests: []AccessRequest{},
		AccessAlerts:   []AccessAlert{},
		Policies:       []PolicyVersion{},
		Billing: BillingSummary{
			Plan:  "Enterprise",
			Seats: activeUsers,
		},
	}
}

func (s *Server) queryOperatorDashboard(orgID string) *OperatorHomeData {
	var unmatchedCount int
	var unmatchedMinor int64
	_ = s.db.QueryRow(`
		SELECT COUNT(*), COALESCE(SUM(le.credit_minor + le.debit_minor), 0)
		FROM match_candidates mc
		JOIN ledger_entries le ON mc.organization_id = le.organization_id
		WHERE mc.organization_id = $1 AND mc.state = 'UNMATCHED'
		LIMIT 1`, orgID, orgID).Scan(&unmatchedCount, &unmatchedMinor)

	var batchRows []IntakeBatchData
	brows, err := s.db.Query(`
		SELECT id, status, created_at
		FROM ingestion_batches
		WHERE organization_id = $1
		ORDER BY created_at DESC
		LIMIT 5`, orgID)
	if err == nil {
		defer brows.Close()
		for brows.Next() {
			var b IntakeBatchData
			var created time.Time
			if err := brows.Scan(&b.ID, &b.Status, &created); err != nil {
				continue
			}
			b.Name = b.ID
			b.Source = "system"
			b.Records = 0
			b.Flags = 0
			b.When = formatDuration(time.Since(created))
			batchRows = append(batchRows, b)
		}
	}
	if batchRows == nil {
		batchRows = []IntakeBatchData{}
	}

	return &OperatorHomeData{
		Focus: OperatorFocusData{
			ExceptionsToClear: unmatchedCount,
			UnmatchedCount:    unmatchedCount,
			UnmatchedValue:    Money{AmountMinor: fmt.Sprintf("%d", unmatchedMinor), Currency: "USD"},
			DataQualityFlags:  0,
			AgentSuggestions:  0,
		},
		Throughput: OperatorThroughputData{
			ClearedToday: 0,
			ClearedMonth: 0,
			DailyGoal:    30,
			StreakDays:   0,
			WeekLabels:   []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"},
			WeekSeries:   []int{0, 0, 0, 0, 0, 0, 0},
		},
		Resume: ResumeItemData{
			ReconID:    "",
			Party:      "All clear",
			Amount:     Money{},
			Tier:       "info",
			Confidence: 0,
			Note:       "No items need attention",
		},
		Tasks:         []OperatorTaskData{},
		IntakeBatches: batchRows,
	}
}

func (s *Server) queryWorkflowSnapshot(orgID string) *WorkflowSnapshot {
	var approvals []WorkflowApprovalItem

	arows, err := s.db.Query(`
		SELECT
			at.id, at.suggested_action, at.amount_minor, at.currency,
			COALESCE(u.display_name, 'Unknown') AS creator_name,
			at.state, at.required_approvers, at.approver_user_ids,
			at.deadline, at.evidence, at.created_at,
			COALESCE(at.evidence->>'title', '') AS ev_title,
			COALESCE(at.evidence->>'subtitle', '') AS ev_subtitle,
			COALESCE(at.evidence->>'risk', 'medium') AS ev_risk,
			COALESCE(at.evidence->>'recommendation', '') AS ev_recommendation
		FROM approval_tasks at
		LEFT JOIN users u ON at.creator_user_id = u.id
		WHERE at.organization_id = $1
		ORDER BY at.created_at DESC
		LIMIT 25`, orgID)
	if err == nil {
		defer arows.Close()
		for arows.Next() {
			var item WorkflowApprovalItem
			var amtMinor int64
			var cur, creatorName, state, evTitle, evSubtitle, evRisk, evRecommendation string
			var deadline *time.Time
			var evJSON []byte
			var approverIDsJSON []byte
			var createdAt time.Time

			if err := arows.Scan(&item.ID, &item.Type, &amtMinor, &cur,
				&creatorName, &state, &item.RequiresDualApproval,
				&approverIDsJSON, &deadline, &evJSON, &createdAt,
				&evTitle, &evSubtitle, &evRisk, &evRecommendation); err != nil {
				continue
			}
			item.Amount = Money{AmountMinor: fmt.Sprintf("%d", amtMinor), Currency: cur}
			item.Risk = evRisk
			item.PreparedBy = Approver{Name: creatorName, Role: "Creator"}
			item.PreparedAt = createdAt.Format(time.RFC3339)
			if deadline != nil {
				remaining := time.Until(*deadline)
				switch {
				case remaining < 0:
					item.DeadlineText = "Overdue"
				case remaining < time.Hour:
					item.DeadlineText = "Due soon"
				case remaining < 24*time.Hour:
					item.DeadlineText = fmt.Sprintf("Due in %.0fh", remaining.Hours())
				default:
					item.DeadlineText = fmt.Sprintf("Due in %.0fd", remaining.Hours()/24)
				}
				item.Urgent = remaining < 6*time.Hour
			}
			switch state {
			case "APPROVED", "EXECUTED":
				item.Stage = "approved"
			case "REJECTED", "REVERSED":
				item.Stage = "rejected"
			case "ESCALATED":
				item.Stage = "escalated"
			case "SUGGESTED", "ASSIGNED":
				item.Stage = "awaiting"
			default:
				item.Stage = "awaiting"
			}
			if item.RequiresDualApproval {
				item.RequiresDualApproval = true
			}
			item.PolicyLimit = Money{AmountMinor: "10000000", Currency: cur}
			withinLimit := amtMinor <= 10000000
			item.WithinLimit = withinLimit
			item.IsOwnItem = false
			if evRecommendation != "" {
				item.AgentRecommendation = evRecommendation
			}
			conf := 80
			item.Confidence = &conf
			if evTitle != "" {
				item.Title = evTitle
			} else {
				item.Title = item.Type + " approval"
			}
			if evSubtitle != "" {
				item.Subtitle = evSubtitle
			} else {
				item.Subtitle = "Awaiting review"
			}

			approvals = append(approvals, item)
		}
	}
	if approvals == nil {
		approvals = []WorkflowApprovalItem{}
	}

	var reconciliations []WorkflowReconciliation
	rrows, err := s.db.Query(`
		SELECT
			mc.id, mc.state,
			COALESCE(mc.score, 0)::numeric(5,4) AS score,
			mc.confidence_tier, mc.reason, mc.created_at,
			COALESCE(le.id, '') AS le_id,
			COALESCE(le.event_type, '') AS le_type,
			COALESCE(le.evidence->>'source', 'Bank') AS le_source,
			COALESCE(le.evidence->>'reference', '') AS le_ref,
			COALESCE(le.evidence->>'amount_minor', '0') AS le_amt,
			COALESCE(le.evidence->>'currency', 'USD') AS le_cur,
			COALESCE(le.evidence->>'direction', 'outflow') AS le_dir,
			COALESCE(lre.display_name, le.evidence->>'counterparty', 'Unknown') AS le_party,
			COALESCE(re.id, '') AS re_id,
			COALESCE(re.event_type, '') AS re_type,
			COALESCE(re.evidence->>'reference', '') AS re_ref,
			COALESCE(re.evidence->>'amount_minor', '0') AS re_amt,
			COALESCE(re.evidence->>'currency', 'USD') AS re_cur,
			COALESCE(rre.display_name, re.evidence->>'party', '') AS re_party,
			mc.evidence AS mc_evidence,
			mc.factors
		FROM match_candidates mc
		LEFT JOIN business_events le ON mc.left_event_id = le.id
		LEFT JOIN resolved_entities lre ON le.external_party_id = lre.id
		LEFT JOIN business_events re ON mc.right_event_id = re.id
		LEFT JOIN resolved_entities rre ON re.external_party_id = rre.id
		WHERE mc.organization_id = $1
		ORDER BY mc.created_at DESC
		LIMIT 30`, orgID)
	if err == nil {
		defer rrows.Close()
		for rrows.Next() {
			var rc WorkflowReconciliation
			var state string
			var score float64
			var tier string
			var reason string
			var createdAt time.Time
			var leID, leType, leSource, leRef, leAmt, leCur, leDir, leParty string
			var reID, reType, reRef, reAmt, reCur, reParty string
			var mcEvidence, factors []byte

			if err := rrows.Scan(&rc.ID, &state, &score, &tier, &reason, &createdAt,
				&leID, &leType, &leSource, &leRef, &leAmt, &leCur, &leDir, &leParty,
				&reID, &reType, &reRef, &reAmt, &reCur, &reParty,
				&mcEvidence, &factors); err != nil {
				continue
			}

			switch state {
			case "MATCHED":
				rc.Stage = "matched"
			case "SUGGESTED":
				rc.Stage = "reviewing"
			case "UNMATCHED":
				rc.Stage = "detected"
			case "DUPLICATE":
				rc.Stage = "detected"
			case "SUSPICIOUS":
				rc.Stage = "detected"
			default:
				rc.Stage = "detected"
			}

			leAmtMinor, _ := strconv.ParseInt(leAmt, 10, 64)
			reAmtMinor, _ := strconv.ParseInt(reAmt, 10, 64)

			rc.Transaction = BankTransaction{
				ID:           leID,
				Source:       leSource,
				Date:         createdAt.Format("2006-01-02"),
				Amount:       Money{AmountMinor: fmt.Sprintf("%d", leAmtMinor), Currency: leCur},
				Counterparty: leParty,
				Reference:    leRef,
				Direction:    leDir,
			}

			if reID != "" {
				bizType := "invoice"
				switch reType {
				case "BILL_RECEIVED":
					bizType = "bill"
				case "PAYMENT_SENT":
					bizType = "payment"
				case "INVOICE_ISSUED":
					bizType = "invoice"
				case "RECEIPT_RECORDED":
					bizType = "receipt"
				default:
					bizType = "expense"
				}
				rc.SuggestedRecord = &BusinessRecord{
					ID:        reID,
					Type:      bizType,
					Date:      createdAt.Format("2006-01-02"),
					Amount:    Money{AmountMinor: fmt.Sprintf("%d", reAmtMinor), Currency: reCur},
					PartyName: reParty,
					Reference: reRef,
				}
				if leAmtMinor != reAmtMinor && leAmtMinor > 0 && reAmtMinor > 0 {
					diff := leAmtMinor - reAmtMinor
					rc.UnexplainedDifference = MoneyPtr(diff, leCur)
				}
			}

			rc.Confidence = int(score * 100)
			switch tier {
			case "AUTO":
				rc.Tier = "auto"
			case "SUGGESTED":
				rc.Tier = "suggested"
			case "REVIEW":
				rc.Tier = "review"
			case "SUSPICIOUS":
				rc.Tier = "suspicious"
			case "DUPLICATE":
				rc.Tier = "duplicate"
			default:
				rc.Tier = "suggested"
			}
			rc.Reason = reason
			rc.AgeText = formatDuration(time.Since(createdAt))
			rc.Deltas = []FieldDelta{}

			if state == "DUPLICATE" {
				rc.DuplicateOf = "r-" + leID
			}

			reconciliations = append(reconciliations, rc)
		}
	}
	if reconciliations == nil {
		reconciliations = []WorkflowReconciliation{}
	}

	var auditLog []AuditEvent
	lrows, err := s.db.Query(`
		SELECT ae.id, ae.action, ae.resource,
			COALESCE(u.display_name, ae.actor_user_id) AS actor_name,
			ae.occurred_at
		FROM audit_entries ae
		LEFT JOIN users u ON ae.actor_user_id = u.id
		WHERE ae.organization_id = $1
		ORDER BY ae.occurred_at DESC
		LIMIT 30`, orgID)
	if err == nil {
		defer lrows.Close()
		for lrows.Next() {
			var ae AuditEvent
			var occ time.Time
			if err := lrows.Scan(&ae.ID, &ae.Action, &ae.Target, &ae.Actor, &occ); err != nil {
				continue
			}
			ae.At = occ.Format(time.RFC3339)
			ae.Role = "system"
			ae.Kind = "audit"
			ae.HasEvidence = true
			auditLog = append(auditLog, ae)
		}
	}
	if auditLog == nil {
		auditLog = []AuditEvent{}
	}

	var dismissed []string
	for _, r := range reconciliations {
		if r.DuplicateOf != "" {
			dismissed = append(dismissed, r.ID)
		}
	}

	for idx := range reconciliations {
		var history []HistoryEvent
		for _, event := range auditLog {
			if event.Target != reconciliations[idx].ID {
				continue
			}
			history = append(history, HistoryEvent{
				ID:        event.ID,
				At:        event.At,
				Actor:     event.Actor,
				ActorRole: event.Role,
				Kind:      event.Kind,
				Action:    friendlyReconciliationAction(event.Action),
			})
		}
		if history == nil {
			history = []HistoryEvent{}
		}
		reconciliations[idx].History = history
	}

	return &WorkflowSnapshot{
		Approvals:         approvals,
		Reconciliations:   reconciliations,
		AuditLog:          auditLog,
		DismissedReconIDs: dismissed,
	}
}

func friendlyReconciliationAction(action string) string {
	switch action {
	case "Delegated reconciliation exception":
		return "Delegated exception to Finance Operator"
	case "Requested reconciliation explanation":
		return "Requested explanation from Finance Operator"
	case "Acknowledged reconciliation exception":
		return "Acknowledged exception review"
	case "Prepared match - routed for approval":
		return "Prepared match and routed for approval"
	case "Rejected match - returned to review":
		return "Rejected match and returned to review"
	case "Dismissed reconciliation exception":
		return "Dismissed exception"
	default:
		return action
	}
}

func formatDuration(d time.Duration) string {
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		m := int(d.Minutes())
		if m == 1 {
			return "1m ago"
		}
		return fmt.Sprintf("%dm ago", m)
	case d < 24*time.Hour:
		h := int(d.Hours())
		if h == 1 {
			return "1h ago"
		}
		return fmt.Sprintf("%dh ago", h)
	default:
		days := int(d.Hours() / 24)
		if days == 1 {
			return "1d ago"
		}
		return fmt.Sprintf("%dd ago", days)
	}
}

func (s *Server) queryOrgUsers(orgID string) []OrgUserData {
	var users []OrgUserData
	rows, err := s.db.Query(`
		SELECT
			u.id,
			u.display_name,
			u.email,
			u.status,
			COALESCE((
				SELECT r.role FROM role_bindings r
				WHERE r.user_id = u.id AND r.organization_id = u.organization_id
				ORDER BY r.created_at DESC LIMIT 1
			), '')
		FROM users u
		WHERE u.organization_id = $1
		ORDER BY u.created_at DESC
		LIMIT 100`, orgID)
	if err != nil {
		return users
	}
	defer rows.Close()
	for rows.Next() {
		var u OrgUserData
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Status, &u.Role); err != nil {
			continue
		}
		users = append(users, u)
	}
	return users
}

func (s *Server) queryApprovalRules(orgID string) []ApprovalRuleData {
	var rules []ApprovalRuleData
	rows, err := s.db.Query(`
		SELECT p.id, p.scope, p.version, p.auto_match_threshold, p.approval_limits, p.created_at
		FROM rule_policies p
		JOIN (
			SELECT scope, MAX(version) AS max_version
			FROM rule_policies
			WHERE organization_id = $1
			GROUP BY scope
		) latest ON latest.scope = p.scope AND latest.max_version = p.version
		WHERE p.organization_id = $1
		ORDER BY p.created_at DESC
		LIMIT 50`, orgID)
	if err != nil {
		return rules
	}
	defer rows.Close()
	for rows.Next() {
		var r ApprovalRuleData
		var threshold float64
		var approvalLimits []byte
		var created time.Time
		if err := rows.Scan(&r.ID, &r.Scope, &created, &threshold, &approvalLimits, &r.CreatedAt); err != nil {
			continue
		}
		r.Name = "Policy - " + r.Scope
		r.Threshold = fmt.Sprintf("%.2f", threshold)
		var approvers []struct {
			Name string `json:"name"`
			Role string `json:"role"`
		}
		if len(approvalLimits) > 0 {
			_ = json.Unmarshal(approvalLimits, &approvers)
		}
		for _, a := range approvers {
			r.Approvers = append(r.Approvers, Approver{Name: a.Name, Role: a.Role})
		}
		if len(r.Approvers) == 0 {
			r.Approvers = []Approver{}
		}
		rules = append(rules, r)
	}
	return rules
}

func (s *Server) latestAuditResource(orgID, action string) string {
	var resource string
	err := s.db.QueryRow(`
		SELECT resource FROM audit_entries
		WHERE organization_id = $1 AND action = $2
		ORDER BY occurred_at DESC
		LIMIT 1`, orgID, action).Scan(&resource)
	if err != nil {
		return ""
	}
	return resource
}

func (s *Server) querySettingsOverview(orgID string) SettingsOverviewData {
	var overview SettingsOverviewData
	_ = s.db.QueryRow(`SELECT name FROM organizations WHERE id = $1`, orgID).Scan(&overview.OrgProfile.Name)
	var profileJSON string
	if payload := s.latestAuditResource(orgID, "settings.org_profile"); payload != "" {
		profileJSON = payload
	}
	if profileJSON != "" {
		var profile OrgProfileData
		if json.Unmarshal([]byte(profileJSON), &profile) == nil {
			if profile.Name == "" {
				profile.Name = overview.OrgProfile.Name
			}
			overview.OrgProfile = profile
		}
	}
	if payload := s.latestAuditResource(orgID, "settings.policy_controls"); payload != "" {
		var controls PolicyControlsData
		if json.Unmarshal([]byte(payload), &controls) == nil {
			overview.PolicyControls = controls
		}
	}
	if payload := s.latestAuditResource(orgID, "settings.data_controls"); payload != "" {
		var controls DataControlsData
		if json.Unmarshal([]byte(payload), &controls) == nil {
			overview.DataControls = controls
		}
	}
	if payload := s.latestAuditResource(orgID, "settings.billing"); payload != "" {
		var billing SettingsBillingData
		if json.Unmarshal([]byte(payload), &billing) == nil {
			overview.Billing = billing
		}
	}
	var userCount int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM users WHERE organization_id = $1 AND status = 'active'`, orgID).Scan(&userCount)
	if overview.Billing.Plan == "" {
		switch {
		case userCount <= 5:
			overview.Billing.Plan = "Starter"
			overview.Billing.SeatsIncluded = 5
		case userCount <= 15:
			overview.Billing.Plan = "Growth"
			overview.Billing.SeatsIncluded = 15
		default:
			overview.Billing.Plan = "Enterprise"
			overview.Billing.SeatsIncluded = 100
		}
		overview.Billing.PriceMonthly = "Derived from active seats"
	}
	if overview.DataControls.RetentionDays == 0 {
		overview.DataControls = DataControlsData{RetentionDays: 365, DataCategories: []string{"source_records", "audit_entries", "documents"}, ExportEnabled: true, AnonymizeAfter: 90}
	}
	return overview
}

func (s *Server) queryFeatureEntitlements(orgID string) []string {
	rows, err := s.db.Query(`
		SELECT resource FROM audit_entries
		WHERE organization_id = $1 AND action = 'features.toggle'
		ORDER BY occurred_at ASC`, orgID)
	if err != nil {
		return []string{}
	}
	defer rows.Close()
	state := map[string]bool{}
	order := []string{}
	for rows.Next() {
		var feature string
		if err := rows.Scan(&feature); err != nil {
			continue
		}
		if _, seen := state[feature]; !seen {
			order = append(order, feature)
		}
		state[feature] = !state[feature]
	}
	enabled := []string{}
	for _, feature := range order {
		if state[feature] {
			enabled = append(enabled, feature)
		}
	}
	return enabled
}

func (s *Server) queryPlatformHome() *PlatformConsoleData {
	var data PlatformConsoleData
	rows, err := s.db.Query(`
		SELECT
			o.id,
			o.name,
			o.created_at,
			(SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) AS user_count,
			(SELECT COUNT(*) FROM role_bindings rb WHERE rb.organization_id = o.id) AS binding_count,
			(SELECT COUNT(*) FROM audit_entries a WHERE a.organization_id = o.id) AS audit_count
		FROM organizations o
		ORDER BY o.created_at ASC
		LIMIT 200`)
	if err != nil {
		return &data
	}
	defer rows.Close()
	for rows.Next() {
		var t PlatformTenantRowData
		var created time.Time
		var userCount, bindingCount, auditCount int
		if err := rows.Scan(&t.ID, &t.Name, &created, &userCount, &bindingCount, &auditCount); err != nil {
			continue
		}
		t.Users = userCount
		t.Plan = "Starter"
		switch {
		case userCount > 15:
			t.Plan = "Enterprise"
		case userCount > 5:
			t.Plan = "Growth"
		}
		var revenueMinor int64
		_ = s.db.QueryRow(`
			SELECT COALESCE(SUM(CASE WHEN la.account_type = 'REVENUE' THEN le.debit_minor - le.credit_minor ELSE 0 END), 0)
			FROM ledger_entries le
			JOIN ledger_accounts la ON le.account_id = la.id
			WHERE le.organization_id = $1`, t.ID).Scan(&revenueMinor)
		t.MRR = fmt.Sprintf("$%d", revenueMinor)
		t.Health = "healthy"
		if auditCount > 0 && bindingCount == 0 {
			t.Health = "attention"
		}
		t.Since = created.Format("2006")
		data.Tenants = append(data.Tenants, t)
	}
	var activeTenants, totalMRR int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM organizations`).Scan(&activeTenants)
	var revenueSum int64
	_ = s.db.QueryRow(`
		SELECT COALESCE(SUM(CASE WHEN la.account_type = 'REVENUE' THEN le.debit_minor - le.credit_minor ELSE 0 END), 0)
		FROM ledger_entries le
		JOIN ledger_accounts la ON le.account_id = la.id`).Scan(&revenueSum)
	totalMRR = int(revenueSum)
	data.TenantMetrics.ActiveTenants = fmt.Sprintf("%d", activeTenants)
	data.TenantMetrics.TotalMRR = fmt.Sprintf("$%d", totalMRR)
	data.TenantMetrics.HealthScore = "100"

	prows, err := s.db.Query(`
		SELECT pu.id, pu.email, pu.display_name, COALESCE((
			SELECT role FROM platform_role_bindings prb WHERE prb.user_id = pu.id ORDER BY prb.created_at DESC LIMIT 1
		), ''), pu.status
		FROM platform_users pu
		ORDER BY pu.created_at DESC
		LIMIT 100`)
	if err == nil {
		defer prows.Close()
		for prows.Next() {
			var pu PlatformUserData
			if err := prows.Scan(&pu.ID, &pu.Email, &pu.Name, &pu.Role, &pu.Last); err != nil {
				continue
			}
			if pu.Last == "active" {
				pu.Last = "recent"
			}
			data.PlatformUsers = append(data.PlatformUsers, pu)
		}
	}
	grows, err := s.db.Query(`
		SELECT g.id, o.name, g.reason, g.revoked_at, g.created_at
		FROM platform_support_access_grants g
		JOIN organizations o ON o.id = g.organization_id
		ORDER BY g.created_at DESC
		LIMIT 50`)
	if err == nil {
		defer grows.Close()
		for grows.Next() {
			var g PlatformSupportGrantData
			var reason string
			var revoked *time.Time
			var created time.Time
			if err := grows.Scan(&g.ID, &g.Tenant, &reason, &revoked, &created); err != nil {
				continue
			}
			if revoked != nil {
				g.Status = "Revoked"
				g.Tone = "neutral"
			} else {
				g.Status = "Granted"
				g.Tone = "success"
			}
			g.Detail = reason
			data.SupportGrants = append(data.SupportGrants, g)
		}
	}
	arows, err := s.db.Query(`
		SELECT id, action, resource, actor_user_id, occurred_at
		FROM audit_entries
		ORDER BY occurred_at DESC
		LIMIT 20`)
	if err == nil {
		defer arows.Close()
		for arows.Next() {
			var ae PlatformAuditEventData
			var occ time.Time
			var resource string
			if err := arows.Scan(&ae.ID, &ae.Action, &resource, &ae.Actor, &occ); err != nil {
				continue
			}
			ae.Target = resource
			ae.At = occ.Format("2006-01-02 15:04 UTC")
			ae.Icon = "activity"
			ae.Tone = "info"
			data.AuditEvents = append(data.AuditEvents, ae)
		}
	}
	data.FeatureFlags = []PlatformFeatureFlag{}
	return &data
}

func (s *Server) queryMailbox(userID string) MailboxData {
	var mailbox MailboxData
	var payload string
	if err := s.db.QueryRow(`
		SELECT resource FROM audit_entries
		WHERE actor_user_id = $1 AND action = 'mailbox.connect'
		ORDER BY occurred_at DESC LIMIT 1`, userID).Scan(&payload); err == nil {
		var conn struct {
			Account  string `json:"account"`
			Provider string `json:"provider"`
		}
		if json.Unmarshal([]byte(payload), &conn) == nil {
			mailbox.Account = conn.Account
			mailbox.Provider = conn.Provider
			mailbox.Connected = true
		}
	}
	mrows, err := s.db.Query(`
		SELECT resource FROM audit_entries
		WHERE actor_user_id = $1 AND action = 'mailbox.message'
		ORDER BY occurred_at DESC
		LIMIT 100`, userID)
	if err == nil {
		defer mrows.Close()
		for mrows.Next() {
			var msgJSON string
			if err := mrows.Scan(&msgJSON); err != nil {
				continue
			}
			var msg MailMessageData
			if json.Unmarshal([]byte(msgJSON), &msg) == nil {
				mailbox.Messages = append(mailbox.Messages, msg)
			}
		}
	}
	if mailbox.Messages == nil {
		mailbox.Messages = []MailMessageData{}
	}
	return mailbox
}

func (s *Server) queryAccountSettings(userID string) AccountSettingsData {
	var settings AccountSettingsData
	var email, displayName, role string
	_ = s.db.QueryRow(`SELECT email, display_name FROM users WHERE id = $1`, userID).Scan(&email, &displayName)
	settings.Email = email
	settings.Name = displayName
	_ = s.db.QueryRow(`
		SELECT role FROM role_bindings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, userID).Scan(&role)
	settings.Role = role
	var payload string
	if err := s.db.QueryRow(`
		SELECT resource FROM audit_entries
		WHERE actor_user_id = $1 AND action = 'account.settings'
		ORDER BY occurred_at DESC LIMIT 1`, userID).Scan(&payload); err == nil {
		var stored AccountSettingsData
		if json.Unmarshal([]byte(payload), &stored) == nil {
			if stored.Name != "" {
				settings.Name = stored.Name
			}
			if stored.Email != "" {
				settings.Email = stored.Email
			}
			if stored.Role != "" {
				settings.Role = stored.Role
			}
			if stored.Timezone != "" {
				settings.Timezone = stored.Timezone
			}
			if stored.Locale != "" {
				settings.Locale = stored.Locale
			}
			if stored.Theme != "" {
				settings.Theme = stored.Theme
			}
			settings.TwoFactor = stored.TwoFactor
		}
	}
	return settings
}

func (s *Server) queryOverdueItems(orgID string) []OverdueItem {
	var items []OverdueItem
	rows, err := s.db.Query(`
		SELECT id, customer, invoice, amount_minor, currency, days_overdue
		FROM collection_cases
		WHERE organization_id = $1
		ORDER BY days_overdue DESC
		LIMIT 100`, orgID)
	if err != nil {
		return items
	}
	defer rows.Close()
	for rows.Next() {
		var item OverdueItem
		var amountMinor int64
		var cur string
		var days int
		if err := rows.Scan(&item.ID, &item.Customer, &item.Invoice, &amountMinor, &cur, &days); err != nil {
			continue
		}
		item.Amount = Money{AmountMinor: fmt.Sprintf("%d", amountMinor), Currency: cur}
		item.DaysOverdue = days
		items = append(items, item)
	}
	return items
}

func (s *Server) queryReports(orgID string) []ReportDef {
	var reports []ReportDef
	rows, err := s.db.Query(`
		SELECT id, to_char(period_start, 'YYYY-MM-DD'), to_char(period_end, 'YYYY-MM-DD'), generated_by, created_at, COALESCE(payload->>'kind', 'ledger')
		FROM finance_analytics_reports
		WHERE organization_id = $1
		ORDER BY created_at DESC
		LIMIT 10`, orgID)
	if err != nil {
		return reports
	}
	defer rows.Close()
	for rows.Next() {
		var r ReportDef
		var periodStart, periodEnd string
		var owner string
		var created time.Time
		if err := rows.Scan(&r.ID, &periodStart, &periodEnd, &owner, &created, &r.Kind); err != nil {
			continue
		}
		r.Name = fmt.Sprintf("Financial analytics %s - %s", periodStart, periodEnd)
		r.Schedule = "monthly"
		r.Owner = owner
		r.LastGenerated = created.Format(time.RFC3339)
		r.NextRun = ""
		reports = append(reports, r)
	}
	srows, err := s.db.Query(`
		SELECT id, generated_by, generated_at, include_roi
		FROM report_snapshots
		WHERE organization_id = $1
		ORDER BY generated_at DESC
		LIMIT 10`, orgID)
	if err != nil {
		return reports
	}
	defer srows.Close()
	for srows.Next() {
		var r ReportDef
		var includeROI bool
		var created time.Time
		if err := srows.Scan(&r.ID, &r.Owner, &created, &includeROI); err != nil {
			continue
		}
		r.Name = "Reporting snapshot"
		if includeROI {
			r.Name = "Reporting & ROI snapshot"
		}
		r.Kind = "report"
		r.Schedule = "monthly"
		r.LastGenerated = created.Format(time.RFC3339)
		r.NextRun = ""
		reports = append(reports, r)
	}
	return reports
}

func (s *Server) queryReportByID(orgID, reportID string) (ReportDef, bool) {
	for _, report := range s.queryReports(orgID) {
		if report.ID == reportID {
			return report, true
		}
	}
	return ReportDef{}, false
}

func (s *Server) buildReportContent(orgID string, report ReportDef) ReportContent {
	var revenueMinor, expenseMinor int64
	_ = s.db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN la.account_type = 'REVENUE' THEN le.debit_minor - le.credit_minor ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN la.account_type = 'EXPENSE' THEN le.debit_minor - le.credit_minor ELSE 0 END), 0)
		FROM ledger_entries le
		JOIN ledger_accounts la ON le.account_id = la.id
		WHERE le.organization_id = $1`, orgID).Scan(&revenueMinor, &expenseMinor)
	var approvalCount, auditCount, docCount int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM approval_tasks WHERE organization_id = $1`, orgID).Scan(&approvalCount)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM audit_entries WHERE organization_id = $1`, orgID).Scan(&auditCount)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM documents WHERE organization_id = $1`, orgID).Scan(&docCount)
	netMinor := revenueMinor - expenseMinor
	content := ReportContent{
		KPIs: []struct {
			Label string `json:"label"`
			Value string `json:"value"`
		}{
			{Label: "Revenue", Value: fmt.Sprintf("%d USD", revenueMinor)},
			{Label: "Expenses", Value: fmt.Sprintf("%d USD", expenseMinor)},
			{Label: "Net position", Value: fmt.Sprintf("%d USD", netMinor)},
			{Label: "Approval tasks", Value: strconv.Itoa(approvalCount)},
		},
		Rows: []map[string]string{
			{"metric": "Report", "value": report.Name},
			{"metric": "Audit events", "value": strconv.Itoa(auditCount)},
			{"metric": "Documents ingested", "value": strconv.Itoa(docCount)},
		},
	}
	return content
}
