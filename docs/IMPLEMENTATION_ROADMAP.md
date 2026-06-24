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
