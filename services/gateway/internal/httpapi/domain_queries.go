package httpapi

import (
	"database/sql"
	"fmt"
	"strconv"
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

	return &AuditInvestigationsView{
		ControlHealth: AuditControlHealthData{
			Score:    92,
			TrendPts: 0,
			Subscores: []ControlSubscoreData{
				{Label: "Audit trail", Value: 95},
				{Label: "Risk coverage", Value: 85},
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
			{ID: "revenue", Label: "Revenue", Money: demo.Money{AmountMinor: fmt.Sprintf("%d", revenueMinor), Currency: "USD"}, Trend: Trend{Direction: "up", ValueText: "all time", Label: "aggregate"}, PositiveDirection: "up", IconTone: "lavender"},
			{ID: "receivables", Label: "Overdue Receivables", Money: demo.Money{AmountMinor: fmt.Sprintf("%d", overdueMinor), Currency: "USD"}, Trend: Trend{Direction: "up", ValueText: fmt.Sprintf("%d items", overdueCount), Label: "to collect"}, PositiveDirection: "down", IconTone: "success"},
			{ID: "expenses", Label: "Expenses", Money: demo.Money{AmountMinor: fmt.Sprintf("%d", expenseMinor), Currency: "USD"}, Trend: Trend{Direction: "down", ValueText: "all time", Label: "aggregate"}, PositiveDirection: "down", IconTone: "warning"},
		},
		CashFlow: OwnerCashFlow{
			NetPosition: Money{AmountMinor: fmt.Sprintf("%d", netMinor), Currency: "USD"},
			Inflow:      demo.Money{AmountMinor: fmt.Sprintf("%d", revenueMinor), Currency: "USD"},
			Outflow:     demo.Money{AmountMinor: fmt.Sprintf("%d", expenseMinor), Currency: "USD"},
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

	evidenceGaps := []demo.EvidenceGapData{}
	if missingDocs > 0 {
		evidenceGaps = append(evidenceGaps, demo.EvidenceGapData{
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
		ControlChecks: []demo.ControlCheckData{},
	}
}

func (s *Server) queryOwnerDashboard(orgID string) *demo.OwnerDashboardData {
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

	var docRows []demo.RecentDocument
	drows, err := s.db.Query(`
		SELECT id, file_name, content_type, size_bytes, created_at
		FROM documents
		WHERE organization_id = $1
		ORDER BY created_at DESC
		LIMIT 5`, orgID)
	if err == nil {
		defer drows.Close()
		for drows.Next() {
			var d demo.RecentDocument
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
		docRows = []demo.RecentDocument{}
	}

	return &demo.OwnerDashboardData{
		Insights: []demo.Insight{},
		Relationships: []demo.RelationshipRow{
			{ID: "credit", IconKey: "credit", Label: "Credit Score", Count: score, TrendText: label, TrendTone: "info"},
		},
		CreditPassport: demo.CreditPassportSummary{
			Score:   score,
			Label:   label,
			Caption: "Business Health Score",
			Updated: updated,
			Factors: []demo.CreditFactor{},
		},
		Documents: docRows,
	}
}

func (s *Server) queryAdminDashboard(orgID string) *demo.AdminDashboardData {
	var activeUsers int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM users WHERE organization_id = $1 AND status = 'active'`, orgID).Scan(&activeUsers)

	var pendingRequests int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM approval_tasks WHERE organization_id = $1 AND state = 'SUGGESTED'`, orgID).Scan(&pendingRequests)

	var policyCount int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM rule_policies WHERE organization_id = $1`, orgID).Scan(&policyCount)

	var userRows []demo.AdminUser
	urows, err := s.db.Query(`
		SELECT id, display_name, email, status, created_at
		FROM users
		WHERE organization_id = $1
		ORDER BY created_at ASC
		LIMIT 20`, orgID)
	if err == nil {
		defer urows.Close()
		for urows.Next() {
			var u demo.AdminUser
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
		userRows = []demo.AdminUser{}
	}

	return &demo.AdminDashboardData{
		Stats: demo.AdminStats{
			ActiveUsers:           activeUsers,
			PendingRequests:       pendingRequests,
			IntegrationsConnected: 0,
			IntegrationsTotal:     0,
			ActivePolicies:        policyCount,
			CustomRoles:           0,
		},
		Users:          userRows,
		AccessRequests: []demo.AccessRequest{},
		AccessAlerts:   []demo.AccessAlert{},
		Policies:       []demo.PolicyVersion{},
		Billing: demo.BillingSummary{
			Plan:  "Enterprise",
			Seats: activeUsers,
		},
	}
}

func (s *Server) queryOperatorDashboard(orgID string) *demo.OperatorHomeData {
	var unmatchedCount int
	var unmatchedMinor int64
	_ = s.db.QueryRow(`
		SELECT COUNT(*), COALESCE(SUM(le.credit_minor + le.debit_minor), 0)
		FROM match_candidates mc
		JOIN ledger_entries le ON mc.organization_id = le.organization_id
		WHERE mc.organization_id = $1 AND mc.state = 'UNMATCHED'
		LIMIT 1`, orgID, orgID).Scan(&unmatchedCount, &unmatchedMinor)

	var batchRows []demo.IntakeBatchData
	brows, err := s.db.Query(`
		SELECT id, status, created_at
		FROM ingestion_batches
		WHERE organization_id = $1
		ORDER BY created_at DESC
		LIMIT 5`, orgID)
	if err == nil {
		defer brows.Close()
		for brows.Next() {
			var b demo.IntakeBatchData
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
		batchRows = []demo.IntakeBatchData{}
	}

	return &demo.OperatorHomeData{
		Focus: demo.OperatorFocusData{
			ExceptionsToClear: unmatchedCount,
			UnmatchedCount:    unmatchedCount,
			UnmatchedValue:    demo.Money{AmountMinor: fmt.Sprintf("%d", unmatchedMinor), Currency: "USD"},
			DataQualityFlags:  0,
			AgentSuggestions:  0,
		},
		Throughput: demo.OperatorThroughputData{
			ClearedToday: 0,
			ClearedMonth: 0,
			DailyGoal:    30,
			StreakDays:   0,
			WeekLabels:   []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"},
			WeekSeries:   []int{0, 0, 0, 0, 0, 0, 0},
		},
		Resume: demo.ResumeItemData{
			ReconID:    "",
			Party:      "All clear",
			Amount:     demo.Money{},
			Tier:       "info",
			Confidence: 0,
			Note:       "No items need attention",
		},
		Tasks:         []demo.OperatorTaskData{},
		IntakeBatches: batchRows,
	}
}

func (s *Server) queryWorkflowSnapshot(orgID string) *demo.WorkflowSnapshot {
	var approvals []demo.ApprovalItem

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
			var item demo.ApprovalItem
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
			item.Amount = demo.Money{AmountMinor: fmt.Sprintf("%d", amtMinor), Currency: cur}
			item.Risk = evRisk
			item.PreparedBy = demo.Approver{Name: creatorName, Role: "Creator"}
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
			item.PolicyLimit = demo.Money{AmountMinor: "10000000", Currency: cur}
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
		approvals = []demo.ApprovalItem{}
	}

	var reconciliations []demo.Reconciliation
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
			var rc demo.Reconciliation
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

			rc.Transaction = demo.BankTransaction{
				ID:           leID,
				Source:       leSource,
				Date:         createdAt.Format("2006-01-02"),
				Amount:       demo.Money{AmountMinor: fmt.Sprintf("%d", leAmtMinor), Currency: leCur},
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
				rc.SuggestedRecord = &demo.BusinessRecord{
					ID:        reID,
					Type:      bizType,
					Date:      createdAt.Format("2006-01-02"),
					Amount:    demo.Money{AmountMinor: fmt.Sprintf("%d", reAmtMinor), Currency: reCur},
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
			rc.Deltas = []demo.FieldDelta{}

			if state == "DUPLICATE" {
				rc.DuplicateOf = "r-" + leID
			}

			reconciliations = append(reconciliations, rc)
		}
	}
	if reconciliations == nil {
		reconciliations = []demo.Reconciliation{}
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

	return &demo.WorkflowSnapshot{
		Approvals:         approvals,
		Reconciliations:   reconciliations,
		AuditLog:          auditLog,
		DismissedReconIDs: dismissed,
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


