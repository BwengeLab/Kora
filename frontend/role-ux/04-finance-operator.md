# Finance Operator (Accountant) — UI/UX, Navigation & Features

*Experience name: "Reconciliation Cockpit / My Work." The highest-volume daily user. Goal: clear exceptions fast and confidently. Entry on sign-in → **Home**.*

---

## Navigation (this role's sidebar)
Home · Data Intake · Transactions · Reconciliation · Action Center (My Tasks) · Collections · Ledger (read) · AI Agents · + global: Kora AI copilot, search (⌘K), notifications.

---

## Pages / screens

### Home — "My Work" dashboard
- **Purpose:** open straight into what needs the operator today.
- **On it:** **My exception queue** (count + top items), **Unmatched transactions** card, **Data-quality flags** (files needing review), **My tasks** (assigned/prepared/awaiting), **Agent suggestions awaiting my review**, **My throughput** ("cleared 120 today / 1,248 this month"), recent documents.
- **Features/functions:** jump into any exception/task; quick-upload; "resume where I left off."
- **Actions:** open queue, open a task, upload, ask copilot.

### Data Intake
- **Purpose:** get records in and flagged.
- **On it:** drag-drop upload, connected-source status, ingestion batches with status, **data-quality badges** per record, field-mapping wizard for new file types.
- **Features:** upload, map columns, re-process, send flagged records to review.
- **Actions:** upload · connect · map · reprocess.

### Transactions (Business Event Ledger)
- **Purpose:** browse the source of truth.
- **On it:** filterable dense table (type, party, amount, date, source, status, confidence), event detail with correction history + evidence.
- **Features:** filters/saved views, open event, raise a correction (→ approval), export.

### Reconciliation — the cockpit *(see `15-FLAGSHIP-SCREENS.md`)*
- **Purpose:** the core job — match money to reality, resolve exceptions.
- **On it:** summary chips (auto/suggested/review/duplicate/suspicious), exception list (left), side-by-side match workspace (right) with matched fields, deltas, confidence + reason, agent suggestion, match-type controls (1:1, 1:many, many:many, partial, timing), unexplained-difference tracker.
- **Features:** accept/reject/manual-match/split, bulk actions, keyboard nav, mark duplicate/suspicious, request document, assign, escalate.
- **Actions:** **prepare** matches (no approve — routes to Finance Lead).

### Action Center — My Tasks
- **Purpose:** the operator's task list (their slice of the approval/workflow system).
- **On it:** tasks assigned to or prepared by them, status, deadlines, evidence.
- **Features:** work a task, add explanation, request info, reassign; **no approve button** (SoD).

### Collections
- **Purpose:** prepare collection follow-ups.
- **On it:** overdue receivables (aging), customer payment behavior, **agent-drafted reminders**, promise-to-pay tracker.
- **Features:** edit/prepare reminder (send routes to approval), record promise-to-pay, escalate.

### Ledger (read-only)
- **Purpose:** context — see balances/receivables/payables they're reconciling toward.
- **On it:** cashflow, balances, receivables/payables, aging — view only.

### AI Agents (relevant)
- **Purpose:** see the agents working for them and act on outputs.
- **On it:** Data Intake & Reconciliation agent activity + suggestions, each with evidence + confidence; **feedback controls** (correct/incorrect).
- **Features:** review suggestion → accept (prepare) / reject; give feedback.

---

## Navigation / workflow flow (a typical day)
1. Sign in → **Home (My Work)** → see exception queue + flagged data.
2. **Data Intake** → upload/clear today's statements; fix data-quality flags.
3. **Reconciliation cockpit** → work the suggested + review tiers; accept clean matches, split/partial where needed, mark duplicates, request missing docs; **prepare** the ones needing approval.
4. **Action Center (My Tasks)** → handle assigned items, respond to requests.
5. **Collections** → prepare reminders the agent drafted.
6. Throughout: **copilot** ("explain this transaction"), **search**, notifications.
> Their prepared items flow up to the **Finance Lead** for approval — they never approve their own (SoD).

## Features & functions summary
Upload & map data · review extractions · accept/reject AI matches · split/partial/timing matches · mark duplicate/suspicious · request documents · prepare matches & payments (no approve) · draft collections · raise corrections · give agent feedback · copilot + search. **Cannot:** approve, post ledger, settings, audit, consent, generate Credit Passport.
