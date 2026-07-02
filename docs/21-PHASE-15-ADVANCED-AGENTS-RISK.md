# Phase 15: Advanced Agents And Risk Detection

## Status

Implemented and verified with seeded anomaly fixtures. Real customer calibration is still required for supplier-price thresholds, false-positive handling, and industry-specific risk scoring.

## Deterministic Risk Detection

`libs/riskanalytics` detects seeded anomalies from generic Kora data:

- Supplier price hikes by comparing supplier/item bill history.
- Missing approvals on payment events without approved or executed workflow evidence.
- Duplicate vendors from normalized supplier display names.
- Margin drops by comparing current and prior finance analytics reports.
- Unsupported payments without document, contract, obligation, purchase-order, or receipt links.

All flags carry evidence, severity, source ID, and a deterministic ID.

## Advanced Agents

The advanced agents consume deterministic reports and risk flags:

- `supplier_margin_agent` suggests supplier and margin review from supplier price, duplicate vendor, and margin-drop flags.
- `audit_compliance_agent` requests control review from missing approval, unsupported payment, and duplicate vendor flags.
- `sales_growth_agent` explains revenue, margin, and overdue receivables from an existing finance report.

Agents do not approve, post, send, pay, reverse, or execute financial actions. Review and suggestion outputs require human control.

## API And Persistence

- `POST /v1/risk-analytics/detect`
- `proto/financeops/finance_ops.proto`
- `deploy/migrations/019_advanced_risk_agents.sql`

Persistence includes immutable risk detection runs, advanced risk flags, and human feedback for correctness, false positives, risky cases, or unclear cases.

## Verification

Tests cover seeded supplier price hikes, missing approvals, duplicate vendors, margin drops, unsupported payments, tenant isolation, role authorization, agent refusals, allowed output types, and feedback persistence through SQL acceptance.
