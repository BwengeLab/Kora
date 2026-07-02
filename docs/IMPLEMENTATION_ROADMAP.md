# Kora Implementation Roadmap

This repository should be built in release gates, not as one large unfocused feature push.

For the full canonical phase-by-phase plan, use `docs/10-BUILD-PLAN.md`. This file is the compact gate tracker.

## Gate 1: Foundation

- Monorepo scaffold.
- Core protobuf contracts.
- Local datastore compose stack.
- Health-checking service skeletons.
- Synthetic fixtures.
- CI and task runner.

## Gate 2: Trust Spine

- Identity and access.
- Tenant isolation.
- RBAC.
- Segregation of duties.
- Evidence validation.
- Immutable audit records.
- Persistence tables for organizations, users, role bindings, audit entries, and SoD rules.

## Gate 3: Idempotent Intake

- Idempotency keys.
- File fingerprinting.
- Ingestion batches.
- Source record IDs.
- Extraction versions.
- Replay-safe jobs.

## Gate 4: Generic Event Ledger

- Generic business events.
- Correction events.
- Reversal and adjustment flows.
- Entity resolution.
- Source provenance.

## Gate 5: Reconciliation

- Configurable policy engine.
- Deterministic matching.
- Confidence tiers.
- Exception routing.
- Duplicate detection.

## Gate 6: Insurance MVP

- [x] Insurance adapter only.
- [x] No insurance types in the generic ledger.
- [x] Premiums, claims, brokers, policies, commissions, supplier payments, bank charges, and refunds mapped onto core objects.
- [x] Evidence-backed insurance reconciliation and exception report.
- [x] Claim approval and generic ledger posting integration test.
- [ ] Validate mappings and thresholds with anonymized design-partner records.

Implementation evidence: `docs/16-PHASE-10-INSURANCE-ADAPTER.md`.

## Gate 7: Evidence-Backed Reporting And ROI

- [x] Tenant-scoped and permission-checked report generation.
- [x] Reports revalidate balanced ledger postings and approval state.
- [x] Exceptions retain source evidence.
- [x] ROI is derived from events, workflow, postings, reconciliation, and verified audit records.
- [x] One source event cannot be counted twice.
- [x] Append-only report and ROI persistence schema.
- [ ] Review report format and priority ROI metrics with a finance user.

Implementation evidence: `docs/17-PHASE-11-REPORTING-ROI.md`.

## Phase 12: Consent And Data Sharing

- [x] Evidence-backed, approval-controlled grants.
- [x] Recipient, category, permission, period, expiry, purpose, and monitoring scopes.
- [x] Immediate one-way revocation.
- [x] Partner authorization gate.
- [x] Allowed and denied external access logs.
- [x] Lender, auditor, and advisor templates.

Implementation evidence: `docs/18-PHASE-12-CONSENT-DATA-SHARING.md`.

## Gate 8: Consent-Controlled Credit Passport

- [x] Reproducible passport from generic ledger and evidence.
- [x] Cashflow, payment discipline, receivables, obligations, and risk sections.
- [x] Evidence-backed risk flags.
- [x] Policy-versioned affordability with explicit assumptions.
- [x] Consent-filtered and audited partner API.
- [x] Grounded explanation-only Credit Passport agent.
- [ ] Review the passport and assumptions with a lender, MFI, SACCO, or credit advisor.

Implementation evidence: `docs/19-PHASE-13-CREDIT-PASSPORT.md`.

## Phase 14: Finance Intelligence, Collections, Contracts

- [x] Full ledger analytics for cashflow, P&L, margin, and receivables aging.
- [x] Finance intelligence agent explains deterministic analytics only.
- [x] Collections cases and draft reminders from overdue unmatched invoices.
- [x] Collections agent drafts only; humans must send.
- [x] Relationship graph from generic entities and business events.
- [x] Contract records, obligations, renewal alerts, and payment-contract mismatch flags.
- [x] Append-only persistence schema and SQL acceptance fixture.
- [ ] Review reminder tone, escalation rules, and contract-obligation outputs with a finance user.
- [ ] Add real sample contracts and receivables/payables workflows.

Implementation evidence: `docs/20-PHASE-14-FINANCE-COLLECTIONS-CONTRACTS.md`.

## Phase 15: Advanced Agents And Risk Detection

- [x] Deterministic anomaly detector for supplier price hikes.
- [x] Missing approval and unsupported payment detection.
- [x] Duplicate vendor detection.
- [x] Margin drop detection from finance analytics reports.
- [x] Supplier & Margin agent.
- [x] Audit & Compliance agent.
- [x] Sales & Growth agent.
- [x] Human feedback persistence for false positives and review labels.
- [ ] Calibrate anomaly thresholds with real customer data.
- [ ] Track false-positive rates over a larger seeded dataset.

Implementation evidence: `docs/21-PHASE-15-ADVANCED-AGENTS-RISK.md`.

## Phase 16: Integrations

- [x] Replay-safe connector import framework.
- [x] MoMo, EBM/RRA, bank statement/API, accounting, and email/SMS connector kinds.
- [x] Connector imports feed existing ingestion and normalization paths.
- [x] Connector retries are idempotent.
- [x] Duplicate connector payloads do not duplicate generic events.
- [x] Raw credentials are rejected; integrations use secret references.
- [x] Integration API, proto, persistence schema, and SQL acceptance fixture.
- [x] MoMo sandbox auth, balance, account-holder validation, request-to-pay, callback ingestion, and bulk transaction import.
- [ ] Add live provider adapters after sandbox/API access is available.
- [ ] Validate connector mappings with real MoMo, EBM/RRA, bank, and accounting exports.

Implementation evidence: `docs/22-PHASE-16-INTEGRATIONS.md`.

## Phase 17: Web And Desktop Clients

- [ ] Owned by separate frontend agent.
- [ ] Backend should support the web client through existing service contracts.

## Phase 18: Backend Production Hardening

- [x] Structured request logging and trace ID propagation.
- [x] Metrics endpoint foundation.
- [x] Health dependency reporting foundation.
- [x] Backup manifest and local Postgres backup script.
- [x] Restore drill verification and local restore script.
- [x] Tenant isolation security-check records.
- [x] Append-only operational persistence schema.
- [x] Tenant and agent/model cost tracking.
- [ ] Run load tests on realistic datasets.
- [ ] Complete external security/compliance review.
- [ ] Provision staging and production infrastructure.

Implementation evidence: `docs/23-PHASE-18-PRODUCTION-HARDENING.md`.
