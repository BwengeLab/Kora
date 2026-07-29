package httpapi

import (
	"fmt"
)

type agentRunEvent struct {
	action string
	detail string
	tone   string
	link   string
	linkTo string
}

type agentInsightResult struct {
	insight   string
	processed int
	events    []agentRunEvent
}

func (s *Server) queryAgentInsight(orgID, agentID string) *agentInsightResult {
	if s.db == nil {
		return nil
	}

	switch agentID {
	case "a-intake":
		return s.queryIntake(orgID)
	case "a-recon":
		return s.queryRecon(orgID)
	case "a-cfo":
		return s.queryCFO(orgID)
	case "a-rel":
		return s.queryRelationships(orgID)
	case "a-contract":
		return s.queryContracts(orgID)
	case "a-coll":
		return s.queryCollections(orgID)
	case "a-credit":
		return s.queryCredit(orgID)
	case "a-supplier":
		return s.querySupplier(orgID)
	case "a-sales":
		return s.querySales(orgID)
	case "a-audit":
		return s.queryAudit(orgID)
	}
	return nil
}

func (s *Server) queryIntake(orgID string) *agentInsightResult {
	var docCount, flaggedCount int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM documents WHERE organization_id = $1`, orgID).Scan(&docCount)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM source_records WHERE organization_id = $1 AND array_length(quality_flags, 1) > 0`, orgID).Scan(&flaggedCount)

	if docCount == 0 {
		return &agentInsightResult{
			insight:   "No documents processed yet - upload documents to get started.",
			processed: 0,
			events: []agentRunEvent{{
				action: "Scanned intake queue",
				detail: "No documents found in the intake pipeline.",
				tone:   "info",
			}},
		}
	}

	detail := fmt.Sprintf("%d documents processed", docCount)
	if flaggedCount > 0 {
		detail += fmt.Sprintf("; %d low-confidence fields need review", flaggedCount)
	} else {
		detail += "; all fields passed quality checks."
	}

	return &agentInsightResult{
		insight:   detail,
		processed: docCount,
		events: []agentRunEvent{{
			action: "Processed the inbox",
			detail: detail,
			tone:   func() string { if flaggedCount > 0 { return "warning" }; return "success" }(),
			link:   "Open data intake",
			linkTo: "/data-intake",
		}},
	}
}

func (s *Server) queryRecon(orgID string) *agentInsightResult {
	var suggested, unmatched int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM match_candidates WHERE organization_id = $1 AND state = 'SUGGESTED'`, orgID).Scan(&suggested)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM match_candidates WHERE organization_id = $1 AND state = 'UNMATCHED'`, orgID).Scan(&unmatched)

	total := suggested + unmatched
	if total == 0 {
		return &agentInsightResult{
			insight:   "No new unmatched items - everything is already matched.",
			processed: total,
			events: []agentRunEvent{{
				action: "Swept the bank feed",
				detail: "No new unmatched items - everything is already suggested or matched.",
				tone:   "success",
				link:   "View reconciliation",
				linkTo: "/reconciliation",
			}},
		}
	}

	detail := fmt.Sprintf("%d fresh matches moved into review; %d still unmatched.", suggested, unmatched)
	return &agentInsightResult{
		insight:   detail,
		processed: total,
		events: []agentRunEvent{{
			action: fmt.Sprintf("Suggested %d new matches", suggested),
			detail: fmt.Sprintf("Moved %d detected bank items into review. %d items remain unmatched.", suggested, unmatched),
			tone:   "ai",
			link:   "View reconciliation",
			linkTo: "/reconciliation",
		}},
	}
}

func (s *Server) queryCFO(orgID string) *agentInsightResult {
	var revenueMinor, expenseMinor int64
	var revenueCount, expenseCount int

	rows, err := s.db.Query(`
		SELECT la.account_type,
		       COALESCE(SUM(le.debit_minor - le.credit_minor), 0) AS balance_minor,
		       COUNT(*) AS entry_count
		FROM ledger_entries le
		JOIN ledger_accounts la ON le.account_id = la.id
		WHERE le.organization_id = $1
		  AND la.account_type IN ('REVENUE', 'EXPENSE')
		GROUP BY la.account_type`, orgID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var acctType string
			var bal int64
			var cnt int
			if err := rows.Scan(&acctType, &bal, &cnt); err != nil {
				continue
			}
			if acctType == "REVENUE" {
				revenueMinor = bal
				revenueCount = cnt
			} else if acctType == "EXPENSE" {
				expenseMinor = bal
				expenseCount = cnt
			}
		}
	}

	totalEntries := revenueCount + expenseCount
	if totalEntries == 0 {
		return &agentInsightResult{
			insight:   "No ledger data available yet.",
			processed: 0,
			events: []agentRunEvent{{
				action: "Refreshed the forecast",
				detail: "No cash flow data found. Upload financial documents to generate insights.",
				tone:   "info",
				link:   "Open cash flow",
				linkTo: "/ledger",
			}},
		}
	}

	netCash := revenueMinor - expenseMinor
	detail := fmt.Sprintf("Revenue: %s | Expenses: %s | Net: %s.",
		formatMoney(revenueMinor),
		formatMoney(expenseMinor),
		formatMoney(netCash))

	return &agentInsightResult{
		insight:   detail,
		processed: totalEntries,
		events: []agentRunEvent{{
			action: "Refreshed the forecast",
			detail: detail,
			tone:   func() string { if netCash < 0 { return "warning" }; return "ai" }(),
			link:   "Open cash flow",
			linkTo: "/ledger",
		}},
	}
}

func (s *Server) queryRelationships(orgID string) *agentInsightResult {
	var expiringContracts, riskFlags int
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM contract_records
		WHERE organization_id = $1
		  AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`, orgID).Scan(&expiringContracts)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM risk_flags WHERE organization_id = $1`, orgID).Scan(&riskFlags)

	if expiringContracts == 0 && riskFlags == 0 {
		return &agentInsightResult{
			insight:   "No contracts expiring soon and no active risk flags.",
			processed: 0,
			events: []agentRunEvent{{
				action: "Updated the relationship graph",
				detail: "All relationships stable. No contracts expiring within 30 days.",
				tone:   "success",
				link:   "Open relationships",
				linkTo: "/relationships",
			}},
		}
	}

	detail := fmt.Sprintf("%d contracts expire within 30 days; %d active risk flags.", expiringContracts, riskFlags)
	return &agentInsightResult{
		insight:   detail,
		processed: expiringContracts + riskFlags,
		events: []agentRunEvent{{
			action: "Updated the relationship graph",
			detail: detail,
			tone:   func() string { if riskFlags > 0 { return "warning" }; return "info" }(),
			link:   "Open relationships",
			linkTo: "/relationships",
		}},
	}
}

func (s *Server) queryContracts(orgID string) *agentInsightResult {
	var upcomingDeadlines, totalContracts int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM contract_records WHERE organization_id = $1`, orgID).Scan(&totalContracts)
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM contract_records
		WHERE organization_id = $1
		  AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`, orgID).Scan(&upcomingDeadlines)

	if totalContracts == 0 {
		return &agentInsightResult{
			insight:   "No contracts on file yet.",
			processed: 0,
			events: []agentRunEvent{{
				action: "Reviewed contract deadlines",
				detail: "No contracts found. Upload agreements to start tracking obligations.",
				tone:   "info",
				link:   "Open contracts",
				linkTo: "/contracts",
			}},
		}
	}

	detail := fmt.Sprintf("%d contracts on file; %d deadlines within 30 days.", totalContracts, upcomingDeadlines)
	return &agentInsightResult{
		insight:   detail,
		processed: totalContracts,
		events: []agentRunEvent{{
			action: "Reviewed contract deadlines",
			detail: detail,
			tone:   func() string { if upcomingDeadlines > 0 { return "warning" }; return "success" }(),
			link:   "Open contracts",
			linkTo: "/contracts",
		}},
	}
}

func (s *Server) queryCollections(orgID string) *agentInsightResult {
	var overdueCount int
	var totalMinor int64
	_ = s.db.QueryRow(`
		SELECT COUNT(*), COALESCE(SUM(amount_minor), 0)
		FROM collection_cases
		WHERE organization_id = $1 AND state = 'OPEN'`, orgID).Scan(&overdueCount, &totalMinor)

	if overdueCount == 0 {
		return &agentInsightResult{
			insight:   "No overdue items. All collections are up to date.",
			processed: 0,
			events: []agentRunEvent{{
				action: "Drafted reminders",
				detail: "No overdue invoices found. All accounts current.",
				tone:   "success",
				link:   "Open collections",
				linkTo: "/collections",
			}},
		}
	}

	detail := fmt.Sprintf("%s overdue across %d invoices - reminder drafts ready for approval.",
		formatMoney(totalMinor), overdueCount)
	return &agentInsightResult{
		insight:   detail,
		processed: overdueCount,
		events: []agentRunEvent{{
			action: fmt.Sprintf("Drafted %d reminders", overdueCount),
			detail: detail,
			tone:   "warning",
			link:   "Open collections",
			linkTo: "/collections",
		}},
	}
}

func (s *Server) queryCredit(orgID string) *agentInsightResult {
	var passportCount, highRiskFlags int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM credit_passports WHERE organization_id = $1`, orgID).Scan(&passportCount)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM risk_flags WHERE organization_id = $1 AND severity IN ('HIGH','CRITICAL')`, orgID).Scan(&highRiskFlags)

	if passportCount == 0 {
		return &agentInsightResult{
			insight:   "No credit passport generated yet. Run credit analysis to get started.",
			processed: 0,
			events: []agentRunEvent{{
				action: "Recomputed the score",
				detail: "No credit passport data available yet.",
				tone:   "info",
			}},
		}
	}

	var score int
	_ = s.db.QueryRow(`
		SELECT COALESCE((payload->>'health_score')::int, 0)
		FROM credit_passports
		WHERE organization_id = $1
		ORDER BY created_at DESC LIMIT 1`, orgID).Scan(&score)

	scoreLabel := "Good"
	if score < 50 {
		scoreLabel = "Poor"
	} else if score < 70 {
		scoreLabel = "Fair"
	} else if score < 90 {
		scoreLabel = "Good"
	} else {
		scoreLabel = "Excellent"
	}

	detail := fmt.Sprintf("Business health score: %d (%s). %d high-severity risk flags.",
		score, scoreLabel, highRiskFlags)
	return &agentInsightResult{
		insight:   detail,
		processed: passportCount,
		events: []agentRunEvent{{
			action: "Recomputed the score",
			detail: detail,
			tone:   func() string { if highRiskFlags > 0 { return "warning" }; return "success" }(),
		}},
	}
}

func (s *Server) querySupplier(orgID string) *agentInsightResult {
	type flagCount struct {
		flagType string
		count    int
	}
	var flags []flagCount
	rows, err := s.db.Query(`
		SELECT flag_type, COUNT(*) as cnt
		FROM advanced_risk_flags
		WHERE organization_id = $1
		  AND flag_type IN ('SUPPLIER_PRICE_HIKE', 'DUPLICATE_VENDOR', 'MARGIN_DROP')
		GROUP BY flag_type
		ORDER BY cnt DESC`, orgID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var fc flagCount
			if err := rows.Scan(&fc.flagType, &fc.count); err != nil {
				continue
			}
			flags = append(flags, fc)
		}
	}

	totalFlags := 0
	for _, f := range flags {
		totalFlags += f.count
	}

	if totalFlags == 0 {
		return &agentInsightResult{
			insight:   "No supplier risk flags detected. All suppliers appear clean.",
			processed: 0,
			events: []agentRunEvent{{
				action: "Checked supplier spend",
				detail: "No price hikes, duplicate vendors, or margin drops detected.",
				tone:   "success",
				link:   "Open payables",
				linkTo: "/payables",
			}},
		}
	}

	detail := fmt.Sprintf("%d supplier risk flags: ", totalFlags)
	for i, f := range flags {
		if i > 0 {
			detail += ", "
		}
		detail += fmt.Sprintf("%d %s", f.count, f.flagType)
	}
	detail += "."

	return &agentInsightResult{
		insight:   detail,
		processed: totalFlags,
		events: []agentRunEvent{{
			action: "Checked supplier spend",
			detail: detail,
			tone:   "danger",
			link:   "Open payables",
			linkTo: "/payables",
		}},
	}
}

func (s *Server) querySales(orgID string) *agentInsightResult {
	var revenueMinor int64
	var found bool
	err := s.db.QueryRow(`
		SELECT (payload->'profit_and_loss'->>'revenue_minor')::bigint
		FROM finance_analytics_reports
		WHERE organization_id = $1
		ORDER BY period_end DESC LIMIT 1`, orgID).Scan(&revenueMinor)
	if err == nil {
		found = true
	}

	if !found {
		return &agentInsightResult{
			insight:   "No structured sales data available yet. Upload financial reports to activate sales insights.",
			processed: 0,
			events: []agentRunEvent{{
				action: "Scanned growth signals",
				detail: "Insufficient structured sales data for stronger recommendations yet.",
				tone:   "info",
			}},
		}
	}

	var growthPct float64
	_ = s.db.QueryRow(`
		SELECT CASE WHEN prev.revenue > 0
		       THEN ROUND((curr.revenue - prev.revenue) * 100.0 / prev.revenue, 1)
		       ELSE 0 END
		FROM (
			SELECT (payload->'profit_and_loss'->>'revenue_minor')::bigint AS revenue
			FROM finance_analytics_reports
			WHERE organization_id = $1
			ORDER BY period_end DESC LIMIT 1
		) curr
		CROSS JOIN (
			SELECT (payload->'profit_and_loss'->>'revenue_minor')::bigint AS revenue
			FROM finance_analytics_reports
			WHERE organization_id = $1
			ORDER BY period_end DESC OFFSET 1 LIMIT 1
		) prev`, orgID, orgID).Scan(&growthPct)

	detail := fmt.Sprintf("Revenue: %s", formatMoney(revenueMinor))
	if growthPct != 0 {
		detail += fmt.Sprintf(" (%+.1f%% vs prior period)", growthPct)
	}

	return &agentInsightResult{
		insight:   detail,
		processed: 1,
		events: []agentRunEvent{{
			action: "Scanned growth signals",
			detail: detail,
			tone:   func() string { if growthPct < 0 { return "warning" }; return "ai" }(),
		}},
	}
}

func (s *Server) queryAudit(orgID string) *agentInsightResult {
	var auditCount, riskFlagCount int
	var highRiskCount int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM audit_entries WHERE organization_id = $1`, orgID).Scan(&auditCount)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM risk_flags WHERE organization_id = $1`, orgID).Scan(&riskFlagCount)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM risk_flags WHERE organization_id = $1 AND severity IN ('HIGH','CRITICAL')`, orgID).Scan(&highRiskCount)

	if auditCount == 0 && riskFlagCount == 0 {
		return &agentInsightResult{
			insight:   "No audit events or risk flags. Everything is clean.",
			processed: 0,
			events: []agentRunEvent{{
				action: "Audit check passed",
				detail: "No suspicious activity or compliance violations detected.",
				tone:   "success",
				link:   "Open audit",
				linkTo: "/audit",
			}},
		}
	}

	var events []agentRunEvent

	if highRiskCount > 0 {
		events = append(events, agentRunEvent{
			action: fmt.Sprintf("Flagged %d high-severity risks", highRiskCount),
			detail: fmt.Sprintf("%d high-severity risk flags require immediate attention.", highRiskCount),
			tone:   "danger",
			link:   "Open audit",
			linkTo: "/audit",
		})
	}

	detail := fmt.Sprintf("%d audit events on record; %d total risk flags (%d high/critical).",
		auditCount, riskFlagCount, highRiskCount)

	if len(events) == 0 {
		events = append(events, agentRunEvent{
			action: "Audit check passed",
			detail: detail,
			tone:   "info",
			link:   "Open audit",
			linkTo: "/audit",
		})
	}

	return &agentInsightResult{
		insight:   detail,
		processed: auditCount + riskFlagCount,
		events:    events,
	}
}

func formatMoney(minor int64) string {
	if minor < 0 {
		return "-$" + formatMinor(-minor)
	}
	return "$" + formatMinor(minor)
}

func formatMinor(minor int64) string {
	major := minor / 100
	frac := minor % 100
	s := fmt.Sprintf("%d.%02d", major, frac)
	if major >= 1000 {
		return addCommas(s)
	}
	return s
}

func addCommas(s string) string {
	idx := len(s) - 6
	for idx > 0 {
		s = s[:idx] + "," + s[idx:]
		idx -= 4
	}
	return s
}


