# Kora Full System Build Plan

> **CANONICAL build plan.** This is the authoritative, phase-by-phase execution plan Kora is built against. It supersedes the detail in `09-DEVELOPMENT-JOURNEY.md` (which remains a higher-level narrative). Architecture lives in `06-SYSTEM-ARCHITECTURE.md`; features in `07-FEATURE-SPECIFICATION.md`; structure in `08-PROJECT-STRUCTURE.md`.

## Summary
Build Kora as a generic finance-and-relationship operating layer, not an insurance-only system. The first vertical will be insurance, but the core domain must stay reusable for logistics, SaaS, schools, clinics, SACCOs, NGOs, banks, and other businesses.
Execution order is backend-first: prove the trust spine and reconciliation pipeline through APIs/tests before building web and desktop clients.

Primary stack:
- Go for core backend services.
- Python for document AI, agent runtime, and AI agents.
- gRPC/protobuf for service contracts.
- REST/JSON gateway for client apps and partner APIs.
- PostgreSQL/TimescaleDB, pgvector, Redis Streams, MinIO, Docker Compose.
- Synthetic data first, anonymized real insurance data as soon as available.

## Core Product Rules
- Kora core uses generic objects: `Organization`, `User`, `ExternalParty`, `Account`, `Transaction`, `Payment`, `Invoice`, `Bill`, `Receipt`, `Contract`, `Obligation`, `Document`, `BusinessEvent`, `ApprovalTask`, `LedgerEntry`, `RiskFlag`, `Evidence`, `Report`.
- Insurance is a vertical adapter: `Policy`, `Claim`, `Broker`, and `Premium` map onto generic core objects instead of becoming core ledger concepts.
- Business events are append-only. Mistakes are corrected through reversal, adjustment, replacement, or evidence-addition events linked to the original event.
- AI agents may suggest, explain, classify, draft, and score, but they never post financial actions or approve sensitive actions.
- Every alert, report, match, recommendation, agent output, approval, posting, and ROI claim must carry evidence.
- All ingestion and processing must be idempotent and replay-safe.

## Shared Interfaces And Types
Define these early in `proto/common` and treat them as system-wide contracts:
- `TenantContext`: organization, user, role, permissions, request scope.
- `Money`: amount, currency, precision, exchange-rate metadata when needed.
- `Evidence`: source document, source record, transaction reference, date, amount, confidence, reason, responsible party, suggested action.
- `Confidence`: score, tier, method, calibration metadata.
- `BusinessEvent`: generic event type, tenant, external party, account, source, evidence, status.
- `CorrectionEvent`: reversal, adjustment, replacement, evidence addition, linked original event.
- `ApprovalTask`: suggested action, approver role, state, deadline, evidence.
- `LedgerEntry`: debit/credit/posting records created only after valid approval or allowed deterministic rule.
- `RulePolicy`: configurable thresholds, approval limits, evidence requirements, matching tolerances, sharing scopes.
- `ConsentGrant`: external party, allowed data categories, period, expiry, purpose, revocation status.
- `AgentEvaluationResult`: expected output, actual output, evidence grounding, confidence calibration, hallucination/refusal status.

## Phase 0 — Foundation
Build:
- Monorepo skeleton.
- `proto/`, `services/`, `agents/`, `libs/`, `deploy/`, `docs/`, `scripts/`, `testdata/`.
- Docker Compose for PostgreSQL/TimescaleDB, Redis Streams, MinIO, optional pgvector.
- Make targets: `make proto`, `make test`, `make up`, `make down`, `make seed`.
- CI checks for build, tests, proto generation, migrations, linting.
- Synthetic testdata generator for bank statements, MoMo statements, invoices, receipts, contracts, claims, premiums, suppliers, duplicate files, messy files.

Acceptance:
- Fresh clone can boot local infrastructure.
- Empty service skeletons expose health checks.
- Proto generation is reproducible.
- CI fails on broken build, tests, or migrations.

## Phase 1 — Trust Spine
Build:
- Identity and access service.
- Organization/tenant model.
- Users, roles, permissions, RBAC.
- Segregation-of-duty rules.
- Gateway auth middleware.
- Immutable audit log.
- Generic evidence validation library.

Acceptance:
- Tenant A cannot access tenant B.
- Unauthorized roles are denied.
- Same user cannot create and approve restricted actions.
- Audit entries cannot be edited or deleted.
- Outputs without required evidence are rejected.

Your work:
- Define initial roles: Owner/CEO, CFO, Finance Manager, Accountant, Auditor, Admin, External Lender, External Auditor.
- Define high-risk actions requiring approval.

## Phase 2 — Rules & Policy Engine
Build:
- Tenant-configurable rules service.
- Policy versioning and audit trail.
- Rules for auto-match thresholds, duplicate windows, payment tolerances, approval limits, evidence requirements, aging buckets, renewal alerts, risk scoring, and credit-sharing limits.
- Runtime policy lookup used by reconciliation, workflow, ledger, reporting, credit passport, and agents.

Acceptance:
- Rules can differ per tenant.
- Rule changes are versioned and audited.
- Reconciliation and approval behavior changes based on policy configuration without code changes.

Your work:
- Provide first default policy set for SMEs and insurance companies.
- Confirm approval limits and matching thresholds with a finance person.

## Phase 3 — Idempotent Data Intake
Build:
- Ingestion service for uploads.
- Raw document storage in object storage.
- File hashing/fingerprinting.
- Ingestion batch IDs.
- Source record IDs.
- Idempotency keys for API requests and worker jobs.
- Versioned extracted records.
- Duplicate-source detection.
- Replay-safe processing jobs.
- Data quality scoring: complete, incomplete, duplicate-risk, low-confidence, missing-document, needs-review, source-conflict.

Acceptance:
- Uploading the same file twice does not duplicate business events.
- Retried jobs do not duplicate records.
- Reprocessed files create new extraction versions, not silent overwrites.
- Bad input is flagged before it becomes trusted output.

Your work:
- Collect or generate realistic sample files.
- Label which files are clean, messy, duplicate, incomplete, or conflicting.

## Phase 4 — Document AI And Extraction
Build:
- Python `document_ai` service.
- CSV, Excel, PDF, and receipt/image parsing.
- Extraction schemas for transactions, invoices, receipts, bills, contracts, payments, parties, dates, amounts, references.
- Per-field confidence.
- Missing-field warnings.
- Golden-file extraction tests.

Acceptance:
- Clean fixtures extract accurately.
- Messy fixtures produce lower confidence and review flags.
- Extracted records preserve links to source document, source page/row, batch, and extraction version.

Your work:
- Provide examples of bank, MoMo, invoice, receipt, contract, premium, and claim records.
- Mark expected fields for labelled fixtures.

## Phase 5 — Generic Business Event Ledger
Build:
- Normalization service.
- Generic business event store.
- Entity resolution for `ExternalParty`, `Account`, `Document`, `Contract`, `Invoice`, `Payment`, `Transaction`.
- Correction event model.
- Event provenance linking extracted records to business events.
- Append-only persistence with reversals and adjustments.

Acceptance:
- Extracted records become generic business events.
- Every event has tenant, source, evidence, confidence, and status.
- Mistakes are corrected with reversal or adjustment events.
- Original events remain preserved.

Your work:
- Confirm the first generic event taxonomy.
- Review examples to ensure insurance objects map cleanly without polluting core domain.

## Phase 6 — Reconciliation Engine
Build:
- Deterministic Go reconciliation service.
- Matching on amount, date, reference, counterparty, source type, document links, tolerance policy.
- Match states: matched, suggested, rejected, unmatched, duplicate, suspicious.
- Confidence tiers from policy.
- Duplicate detection.
- Exception generation.
- Evidence for every match and exception.

Acceptance:
- Auto-match precision target is high enough for finance trust.
- No false auto-posts.
- Duplicate payments/invoices are caught.
- Low-confidence items route to review.
- Rules come from the policy engine.

Your work:
- Define first matching rules for payments to invoices, premiums to policies, claims to approvals, bills to payments.
- Label a reconciliation test set.

## Phase 7 — Workflow, Approval, And Ledger Posting
Build:
- Workflow service.
- Approval queue.
- State machine: suggested, assigned, approved, rejected, executed, escalated, reversed.
- Human approval requirements from policy engine.
- Ledger service basics: receivables, payables, balances, postings.
- Posting reversals.
- Full audit trail for approvals, rejections, executions, and reversals.

Acceptance:
- AI suggestions cannot post directly.
- Human-approved actions create ledger entries and audit entries.
- Wrong approvals can be reversed through proper reversal events.
- Approval history is visible and immutable.

Your work:
- Define approval chains by role.
- Decide which actions require one approver vs two approvers.

## Phase 8 — Agent Runtime And Evaluation System
Build:
- Python agent runtime.
- Structured agent output schemas.
- Model router with minimal-data policy.
- Agent evaluation harness.
- Regression datasets.
- Expected-answer tests.
- Evidence grounding checks.
- Hallucination checks.
- Confidence calibration checks.
- Missing-evidence refusal tests.
- Human feedback capture.

Acceptance:
- Every agent output validates against schema.
- Agents refuse when evidence is insufficient.
- Agent results can be evaluated against labelled datasets.
- Feedback can improve future prompts/rules without losing auditability.

Your work:
- Review agent outputs during demos and mark correct, incorrect, risky, or unclear.
- Help define unacceptable agent behavior.

## Phase 9 — Data Intake And Reconciliation Agents
Build:
- Data Intake agent for extraction review, missing data explanation, and classification help.
- Reconciliation agent for ambiguous 70-94% cases.
- Agent outputs linked to evidence and workflow tasks.
- Guardrails preventing direct posting or approval.

Acceptance:
- Reconciliation agent improves suggestion quality on ambiguous cases.
- Every suggestion includes evidence and reason.
- Agent cannot execute money movement.
- Agent regression tests pass before release.

## Phase 10 — Insurance Vertical Adapter
Build:
- Insurance adapter package outside the generic core.
- Domain mappings:
  - Policy linked to customer, contract, invoice/payment, business event.
  - Claim linked to approval, payment, evidence, ledger entry.
  - Broker as external party with role `BROKER`.
  - Premium as event/payment/invoice category.
- Insurance-specific import templates.
- Insurance-specific reconciliation scenarios.
- Insurance exception report.

Acceptance:
- Insurance workflow works end to end without changing generic ledger model.
- Premiums, claims, commissions, suppliers, bank charges, and refunds map to generic events.
- CFO can see matched premiums, unmatched payments, unsupported claims, duplicate items, and approval tasks.

Your work:
- Secure anonymized insurance data from a design partner.
- Validate whether the insurance adapter reflects real finance operations.

## Phase 11 — Reporting And ROI
Build:
- Reporting service.
- Exception reports.
- CFO/CEO reports.
- Audit reports.
- Basic export to PDF/Excel later.
- ROI metrics: money recovered, duplicate payments avoided, unsupported payments caught, late invoices collected, hours saved, missing documents fixed.
- ROI tied to approved workflow and audit events.

Acceptance:
- Reports reconcile to ledger and evidence.
- ROI cannot be manually invented.
- ROI does not double-count the same event.
- Report outputs are tenant-scoped and permission-checked.

Your work:
- Define which ROI metrics matter most to the first customer.
- Review report format with a CFO/accountant.

## Phase 12 — Consent And Data Sharing
Build:
- Consent and data-sharing service.
- Sharing grants for lenders, auditors, advisors, partners, and external APIs.
- Scope controls: recipient, period, data categories, expiry, monitoring access, revocation.
- Partner API authorization based on active consent.
- Audit trail for every external access.

Acceptance:
- External users only see explicitly shared data.
- Access expires automatically.
- Revoked access immediately stops future reads.
- Every external access is logged.

Your work:
- Define first consent templates for lender, auditor, and advisor access.

## Phase 13 — Credit Passport
Build:
- Credit Passport service.
- Credit Passport agent.
- Lender-ready report from verified ledger, cashflow, payment discipline, receivables, obligations, risk flags, and evidence.
- Partner API guarded by consent.
- Affordability estimate with explanation.

Acceptance:
- Credit Passport is reproducible from ledger and evidence.
- Lender cannot see data outside consent scope.
- Affordability estimate explains assumptions.
- Risk flags link to evidence.

Your work:
- Identify a lender/MFI/SACCO partner or advisor to review the first passport format.

## Phase 14 — Finance Intelligence, Collections, Contracts
Build:
- Full ledger analytics: cashflow, P&L, margin, aging.
- CFO agent.
- Collections service and collections agent.
- Relationship graph.
- Contract extraction and obligation tracking.
- Renewal alerts.
- Payment-vs-contract mismatch detection.

Acceptance:
- Cashflow and P&L match expected test data.
- Overdue invoices and reminders are correct.
- Contract dates and obligations are extracted with evidence.
- Payments without matching contract/PO can be flagged.

Your work:
- Provide sample contracts and receivables/payables workflows.
- Confirm reminder/escalation tone and rules.

## Phase 15 — Advanced Agents
Build:
- Supplier & Margin agent.
- Audit & Compliance agent.
- Sales & Growth agent.
- Advanced anomaly and risk detection.
- Seeded anomaly tests for supplier price hikes, missing approvals, duplicate vendors, margin drops, unsupported payments.

Acceptance:
- Agents catch seeded anomalies.
- Alerts are evidence-backed.
- Human feedback is captured.
- False positives are tracked.

## Phase 16 — Integrations
Build in this order:
- MoMo import.
- EBM/RRA import.
- Bank statement/API import.
- Accounting tools such as QuickBooks, Sage, Xero.
- Email/SMS notification providers.
- Later: CRM, WhatsApp, POS, e-signature.

Acceptance:
- Connector data produces the same generic business events as uploaded files.
- Uploaded and connector-pulled duplicate data does not duplicate events.
- Connector retries are idempotent.
- Integration credentials are never committed.

Your work:
- Help obtain sandbox/API access for MoMo, EBM/RRA, banks, and accounting systems.

## Phase 17 — Web And Desktop Clients
Build:
- Shared API client.
- Shared UI component library.
- Web app first.
- Desktop wrapper later using Tauri, Wails, or Electron after web app is stable.
- Screens: login, organization settings, upload, data quality, reconciliation, approval queue, ledger, reports, ROI, relationships, contracts, credit passport, consent management, audit log.

Acceptance:
- Finance user can complete the full workflow without APIs.
- Web and desktop use the same gateway.
- Approval and audit behavior matches backend rules.
- UI tests run against seeded backend.

Your work:
- Test the workflow as a finance user.
- Give feedback on confusing screens, missing actions, and report usefulness.

## Phase 18 — Production Hardening
Build:
- Structured logging.
- OpenTelemetry tracing.
- Metrics and dashboards.
- Error tracking.
- Secrets management.
- Backups and restore drills.
- Load tests.
- Security review.
- Tenant isolation tests.
- Data protection and compliance checklist.
- Staging and production environments.
- Cost tracking per tenant and per agent/model.

Acceptance:
- Restore-from-backup works.
- Tenant isolation survives automated security tests.
- Performance is acceptable on realistic datasets.
- Production errors and costs are observable.
- Compliance review issues are tracked and resolved.

## Release Gates
- **Gate 1:** Foundation boots locally and tests pass.
- **Gate 2:** Trust spine enforces tenant isolation, RBAC, SoD, evidence, and audit.
- **Gate 3:** Idempotent ingestion prevents duplicate source data.
- **Gate 4:** Generic business events and correction events work.
- **Gate 5:** Reconciliation produces reliable matches and review tasks.
- **Gate 6:** Insurance MVP works end to end through APIs.
- **Gate 7:** Reports and ROI are evidence-backed.
- **Gate 8:** Consent-controlled Credit Passport works.
- **Gate 9:** Web app supports full finance workflow.
- **Gate 10:** System passes security, backup, load, and observability checks.

## Your Responsibilities
- Keep Kora focused: first real customer problem is reconciliation and finance control.
- Provide or approve realistic test data.
- Find one design partner, ideally insurance, and get anonymized real records.
- Bring finance-domain feedback for matching rules, approvals, reports, and exceptions.
- Review demos at every gate.
- Decide business partnerships: lender, MoMo/bank/EBM access, compliance reviewer, cloud budget.
- Avoid adding UI-first features before backend trust is proven.

## Test Plan
- Unit tests for rules, RBAC, tenancy, matching, quality scoring, event corrections, ledger math.
- Golden tests for extraction and reconciliation.
- Contract tests for protobuf/gRPC services.
- Integration tests for upload → extract → normalize → reconcile → approve → post → report.
- Idempotency tests for duplicate upload, retry, timeout, worker replay, connector replay.
- Security tests for tenant isolation, RBAC, SoD, external consent scope.
- Agent evals for grounding, hallucination, refusal, confidence calibration, regression behavior.
- UAT with finance users before claiming the product works.

## Assumptions
- Current implementation starts from an empty Kora workspace.
- The plan targets solo founder plus Codex execution, so phases are sequential and demoable.
- Synthetic data is acceptable for early development, but real anonymized data is required before sales claims.
- Insurance is the first vertical adapter, not the permanent core domain.
- Kora wins through trust: evidence, auditability, configurability, idempotency, consent, and human approval.
