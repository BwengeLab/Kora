# Kora — System Documentation (Frontend)

> Evidence-first finance & business-control platform for African enterprises.
> Ships as **web + desktop** from one shared codebase. This document describes
> what the **frontend** currently is, how it's structured, and how its logic and
> workflows behave. It is the spec the backend will serve.

---

## 1. What Kora is

Kora is two products in one engine:

1. **A control + close + audit layer** — segregation of duties, a configurable
   approval matrix, evidence on everything, an immutable audit trail, and a
   month-end close. (The "BlackLine/FloQast" posture.)
2. **A system of record** — a real double-entry General Ledger with a Chart of
   Accounts, balanced journals, a trial balance that ties out, and financial
   statements derived from it. (The "NetSuite" posture.)

The wedge: **control → trust → capital.** Clean, evidence-backed books produce a
trustworthy financial record, which feeds the **Credit Passport** — the on-ramp
to financing that African SMEs/enterprises can't otherwise access.

**Horizontal, not vertical:** Kora generalises the finance *operating model* that
every enterprise shares (P2P, O2C, R2R, close, controls), with sector specifics
(insurance, NGO, government) delivered as unlockable packs/dimensions.

---

## 2. Architecture

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces — `shared`, `web` (Vite), `desktop` (Tauri 2/Rust) |
| UI | React 18, TypeScript (strict), Tailwind (shared preset, glass tokens) |
| Routing | TanStack Router (route tree + permission guards) |
| State | Zustand stores (some `persist`ed) |
| Charts | ECharts via echarts-for-react |
| Primitives | Radix UI (Dialog, Popover, DropdownMenu…), lucide icons, i18next (en/fr/rw) |

All business UI lives in `shared/src`; `web` and `desktop` are thin shells that
import the shared `AppRouter`.

### Role-isolated page resolution
- Each role has a **blueprint** (`shared/src/blueprints/canonical/*`) that defines
  its sidebar nav.
- `shared/src/pages/RolePage.tsx` holds a **REGISTRY**: `pageKey → blueprintId →
  Component`. The same route renders a *different* page per role; an unbuilt
  combination falls back to a role-scoped placeholder — never another role's screen.
- Routes are permission-guarded (`routing/guards.ts`).
- A dev **"Preview as"** switcher (`previewRoleStore`) hydrates a seed session so
  any role can be walked.

---

## 3. Roles (the segregation-of-duties chain)

| Role | Real-world | Does |
|---|---|---|
| **Finance Operator** | AP/AR clerk, bookkeeper | Prepares — data intake, transactions, reconciliation prep, bill entry, collections chasing. **Cannot approve.** |
| **Finance Lead** | Controller / Finance Manager | Operates — approves within policy, posts to GL, reviews reconciliations, runs close, produces statements & reports. |
| **Organization Owner** | Owner / CEO / final approver | Oversees — assurance views, top-tier/final approval, risk governance. |
| **Auditor** | Internal/external auditor | Verifies — read-only investigator; immutable audit trail, evidence, control tests. Changes nothing. |
| **Org Admin** | Finance-systems admin | Manages org, users & roles, the approval matrix, integrations, billing. **No financial authority.** |
| **Super Admin** | Kora staff (vendor) | Platform plane — tenants, plans, health, usage, support, platform audit. |
| **External Collaborator** | Lender / external auditor | Consent-scoped portal — Credit Passport + access requests. |
| **Claims Officer** | Insurance claims handler | Custom, feature-unlocked sector role (the pack pattern). |

The universal flow: **Operator prepares → DOA routes → Lead/Owner approve (SoD) →
posted → Auditor sees it.**

---

## 4. The accounting engine (system of record)

- **Chart of Accounts** (`seed/chartOfAccounts.ts`) — assets/liabilities/equity/
  revenue/expense with codes and normal balances.
- **Journals** (`seed/journals.ts`, `state/glStore.ts`) — double-entry entries;
  every entry must balance (`linesBalanced`: Σdebits = Σcredits). Lines carry
  **dimensions** (entity, cost center).
- **General Ledger page** (`modules/general-ledger`) — Journal entries, Chart of
  accounts with live balances, **Trial balance that ties out**, and a journal
  **creator that won't post unless balanced**. Role-aware (Lead/Operator post;
  Owner/Auditor read).
- **Financial statements** (`modules/financial-statements`, derivations in
  `glStore`) — **Income Statement**, **Balance Sheet** (Assets = Liabilities +
  Equity, with net income rolled to equity), **Cash Flow** (direct, from cash-
  account movements). All computed live from posted journals, so they tie out.

Everything is **entity-scoped**: the top-bar entity switcher slices the GL,
statements, and ledgers by subsidiary, or consolidates ("All entities").

---

## 5. Operational workflows

- **Procure-to-Pay / AP** (`modules/payables`, `payablesStore`) — vendor bills
  with **3-way match** (PO ↔ goods receipt ↔ invoice), the DOA approval chain per
  bill, and **approve/pay that posts real journals to the GL** (DR expense/asset,
  CR AP on approval; DR AP, CR cash on payment). The books move with the workflow.
- **Reconciliation** — Operator **cockpit** prepares matches → routes up; Lead
  **review & approve** queue (field-by-field deltas + evidence) → posts; Owner
  **assurance** (value-at-risk, delegate); Auditor read-only. Shared
  `workflowStore` carries reconciliations → approvals → audit log.
- **Action Center / Approvals** — Lead full queue, Owner top-tier, Operator
  tracking-only ("My submissions", no approve). Enforces SoD, dual-approval
  ordering, owner-approves-last.
- **Collections** — Operator chases (reminders, promise-to-pay, escalate); Lead
  manages; Owner oversees receivables health.
- **Month-end close** (`modules/controls-close`) — checklist, exceptions to clear,
  evidence gaps, control tests, lock the period.

---

## 6. The control layer

- **Segregation of duties** — a preparer can never approve their own item
  (`approvalBlockReason`).
- **Delegation of Authority matrix** (`seed/approvalPolicy.ts`,
  `approvalPolicyStore`, editor in `modules/settings/DoaMatrix.tsx`) — editable
  rules: amount band × category × entity → multi-level approval chain. The
  workflow engine resolves the required chain from it (`resolveChain`), with a
  live policy simulator. No hardcoded threshold.
- **Evidence-first** — documents attach to movements, bills, reconciliations,
  approvals; a `DocViewer` renders them.
- **Immutable audit trail** — every approval/posting/config/consent action is
  appended to `workflowStore.auditLog`; the Auditor's **Audit & Investigations**
  surface searches/filters it, verifies evidence, and raises findings.

---

## 7. Scale features (any size)

- **Multi-entity** (`seed/entities.ts`, `entityStore`) — legal entities + cost
  centers; the entity switcher re-scopes financial data; "All entities" = consolidated.
- **Dimensional accounting** — journal lines tagged by entity + cost center
  (fund/grant/project planned) — the abstraction that serves insurance/NGO/gov.
- **Many users + scoping** — multiple users per role, scoped by entity/department
  (Org Admin → Users & Roles).

---

## 8. Global features

Mailbox (per-user, compose/send, "Draft with Kora"), Tools (calculator, currency,
margin, loan + per-page VAT/DSO/pro-rata), grounded **Copilot**, **DocViewer**,
live notifications, per-user **Account & Preferences**, branded error/404 and an
app-level error boundary, keyboard focus rings + reduced-motion.

---

## 9. AI agents

A roster of finance agents (`seed/agents.ts`, `modules/ai-agents`) that perform
the grunt work — reconciliation matching, collections drafting, AP 3-way matching,
fraud flagging, close progression — under human approval. Agents run and produce
**observable changes** in the live stores, logged to an agent activity feed (see
`state/agentActivityStore.ts`).

---

## 10. State stores (map)

| Store | Purpose |
|---|---|
| `glStore` | Journals, trial balance, statements (the books) |
| `payablesStore` | Vendor bills; posts to GL |
| `workflowStore` | Reconciliations, approvals, audit log |
| `approvalPolicyStore` | The DOA matrix + resolver |
| `entityStore` | Active entity scope |
| `transactionsStore` | Operator transaction register |
| `intakeStore` | Data-intake documents |
| `mailStore` | Per-user mailbox |
| `personalSettingsStore` | Per-user preferences |
| `featureStore` | Feature-pack unlocks (custom roles) |
| `toastStore`, `docViewerStore`, `copilotStore`, `toolsStore`, `agentActivityStore` | UX/global |

---

## 11. Frontend-real vs. needs backend

**Real in the browser now:** double-entry that balances, trial balance + statements
that tie out, AP→GL posting, SoD + DOA enforcement, the full role model, multi-entity
scoping, agent activity with observable effects.

**Needs the backend to be deployable:** persistence (data resets on full reload),
real auth/SSO + server-enforced RBAC, bank/mobile-money integrations, multi-currency
consolidation/eliminations, tax/regulatory engines, security/compliance (SOC2,
encryption, server-side immutable audit).

The frontend is the accurate behavioural spec for all of the above.
