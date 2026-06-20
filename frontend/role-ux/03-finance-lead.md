# Finance Lead (CFO / Finance Manager) — UI/UX, Navigation & Features

*Experience name: "Finance Control Center." The primary approver & decision-maker. Goal: see what needs deciding, decide fast and compliantly, run finance. Entry on sign-in → **Home**.*

---

## Navigation (this role's sidebar)
Home · Reconciliation · Action Center · Ledger & Cashflow · Collections · Reports · Value/ROI · Relationships · Contracts · Credit Passport · AI Agents · Audit (read) · Consent · + copilot, search, notifications.

---

## Pages / screens

### Home — Finance Control dashboard
- **Purpose:** the finance state + what's awaiting my approval.
- **On it:** **Cash position + forecast**, **Approvals awaiting you** (the priority block), reconciliation status snapshot, **margin** & receivables/payables, **ROI**, **AI Insights** (cash-risk, overdue, margin pressure, forecast).
- **Features/functions:** one-click into any approval or insight; date-range; export summary.

### Action Center (Approvals) — *(see `15-FLAGSHIP-SCREENS.md`)*
- **Purpose:** the control point — approve/reject what AI + operators prepared.
- **On it:** prioritized approval queue (type, amount, risk, deadline, who-owns-now), task detail with full evidence, suggested action, approval chain, **dual-approval state**, **SoD guard**.
- **Features:** approve / reject (reason) / escalate / reassign / request info; over-limit → two approvers.
- **Actions:** approve (executes + audits); cannot approve own prepared item.

### Reconciliation (approve tier)
- **Purpose:** approve the suggested-tier matches operators prepared; oversee status.
- **On it:** same cockpit, weighted to items awaiting approval; confidence + evidence.
- **Features:** approve/reject matches, spot-check auto-matched, view exceptions.

### Ledger & Cashflow
- **Purpose:** the real financial position + close.
- **On it:** cashflow (actual + forecast), P&L, margin (by product/customer/branch), receivables/payables, working capital, **accounting periods + close status**, multi-currency.
- **Features:** drill any figure → evidence; **run month-end close** (checklist of outstanding exceptions); export.

### Collections
- **Purpose:** approve/drive collections + decisions.
- **On it:** overdue list, customer risk, agent-drafted reminders, escalation status.
- **Features:** approve & send reminders, escalate, **decide stop-credit** (policy-gated).

### Reports
- **Purpose:** decision-ready outputs.
- **On it:** report library (CFO/CEO/board/exception/collections/supplier/credit), scheduled + on-demand, export.
- **Features:** generate, schedule, export, share (consent-gated).

### Value / ROI
- **Purpose:** prove Kora's value.
- **On it:** money recovered, duplicates avoided, unsupported caught, hours saved, etc., with drill-to-evidence.

### Relationships · Contracts
- **Purpose:** oversee external parties & obligations.
- **On it:** party directory + profiles (money in/out, risk, owner), contract map, renewals, payment-vs-contract mismatches.
- **Features:** review, assign owner, approve renewals/spend, flag.

### Credit Passport
- **Purpose:** generate & share the lender-ready profile.
- **On it:** score + sub-scores, trends, affordability + assumptions, evidence pack, sharing controls.
- **Features:** **generate/refresh**, **share with a lender** (consent: scope + expiry), revoke.

### AI Agents · Audit (read) · Consent
- AI Agents: see all agents' work + insights, give feedback. · Audit: read-only oversight. · Consent: manage external sharing grants.

---

## Navigation / workflow flow (a typical day)
1. Sign in → **Home** → scan cash + **approvals awaiting you** + AI insights.
2. **Action Center** → clear approvals (matches, payments, collections) — approve/reject with evidence; over-limit items get a 2nd approver.
3. **Ledger & Cashflow** → check position, margin, forecast; near month-end → run **close**.
4. **Reports / ROI** → generate management/board reports; check value.
5. **Credit Passport / Consent** → generate & share with a lender when needed.
6. Throughout: copilot, search, notifications.
> Receives prepared work from **Finance Operators**; escalates the biggest items to **Owner**; provides evidence to **Auditor**.

## Features & functions summary
Approve matches/payments (within limits) · dual-approval over threshold · post/oversee ledger · run month-end close · approve & drive collections · generate reports · generate & share Credit Passport (consent) · oversee relationships/contracts · view audit · use AI insights. **Cannot:** approve own prepared item; system admin (unless also Admin).
