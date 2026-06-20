# Auditor / Compliance — UI/UX, Navigation & Features

*Experience name: "Audit & Risk Command Center." Independent oversight — sees everything, changes nothing. Entry on sign-in → **Home**.*

---

## Navigation (this role's sidebar)
Home (Audit & Risk) · Transactions (read) · Reconciliation (read) · Ledger (read) · Reports (read) · Relationships (read) · Contracts (read) · Consent log (read) · AI Agents (read) · + copilot, search, notifications. *(Everything read-only — independence by design.)*

---

## Pages / screens

### Home — Audit & Risk Command Center
- **Purpose:** the control & risk picture, and what to investigate.
- **On it:** **immutable audit log feed** (actor · action · evidence · time) · **Risk flags** · **Segregation-of-duty violations** · **Suspicious activity** · **Missing-document list** · **control-health score** · agent-flagged anomalies.
- **Features/functions:** filter/search the log; open any finding → evidence; copilot ("show all approvals over X without dual sign-off").

### Audit investigation / Evidence explorer
- **Purpose:** investigate a finding to its root.
- **On it:** the full evidence chain for any transaction/approval/match (source doc, confidence, who approved, when), the approval trail.
- **Features:** trace an item end-to-end; annotate findings.

### Risk board
- **Purpose:** track open risks & control gaps.
- **On it:** risk flags by severity, SoD conflicts, anomalies, status.
- **Features:** review, mark investigated, raise a finding to CFO/CEO.

### Audit-pack builder
- **Purpose:** produce the evidence package for an internal/external audit.
- **On it:** selectable scope (period, area), included evidence, export.
- **Features:** **export audit pack** (PDF/Excel).

### Read-only finance views
- **Purpose:** verify the numbers against evidence.
- **On it:** Transactions, Reconciliation, Ledger, Reports, Relationships, Contracts, Consent log — all view-only.

---

## Navigation / workflow flow (a typical review)
1. Sign in → **Home (Audit & Risk)** → scan risk flags, SoD violations, suspicious activity.
2. **Investigate** a finding → trace its full evidence chain.
3. **Risk board** → mark investigated, raise findings to leadership.
4. **Audit-pack builder** → export the evidence package when needed.
5. Use copilot for targeted control queries.
> Provides independent assurance to **Owner/CFO**; the Audit agent feeds detections; the auditor judges.

## Features & functions summary
Read-all (everything) · investigate evidence chains · review risk/SoD/suspicious flags · raise findings · export audit packs · control queries via copilot. **Cannot:** upload, prepare, approve, post, or change any setting — *independence is the point.* A focused role with a **rich, complete command center**, never barren.
