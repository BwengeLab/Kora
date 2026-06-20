# Org Admin — UI/UX, Navigation & Features

*Experience name: "Admin Console." Governs the org's users, roles, policies, integrations, billing, and data — **no financial approval authority.** Entry on sign-in → **Home**.*

---

## Navigation (this role's sidebar)
Home (org health) · Settings → Organization · Users & Roles · Rules & Policies · Integrations · Billing · Data & Retention · + copilot, search, notifications.

---

## Pages / screens

### Home — Admin overview
- **Purpose:** the health of the org's setup.
- **On it:** **user & access overview** (who has what role) · **integration status** · **active policy versions** · **billing & usage** · system/access alerts · pending access requests.
- **Features/functions:** jump to any setting; quick "invite user"; copilot.

### Users & Roles
- **Purpose:** manage people and what they can do.
- **On it:** user list (status, roles), invite/deactivate, role assignment (multi-role), and the **custom-role builder** (create/clone/edit/deactivate roles from the permission catalog, with SoD validation).
- **Features:** invite/manage users, assign roles, **build custom roles** (template/clone → pick permissions → scope → validate → save, versioned + audited).
- **Actions:** manage users, manage roles, assign.

### Rules & Policies (Policy Engine UI)
- **Purpose:** configure how the system behaves per tenant.
- **On it:** auto-match thresholds, duplicate windows, payment tolerances, **approval limits**, evidence requirements, aging buckets, renewal windows, risk scoring — **versioned & audited**.
- **Features:** edit policies (no code), see version history.

### Integrations
- **Purpose:** connect data sources.
- **On it:** connectors (MoMo, EBM/RRA, banks, accounting, email/SMS) with status; credentials (write-only, never shown after save).
- **Features:** connect/disconnect, configure, monitor sync.

### Billing
- **Purpose:** manage the Kora subscription.
- **On it:** plan, usage, invoices, payment.

### Data & Retention
- **Purpose:** data governance.
- **On it:** retention policy, **data deletion / subject requests**, language (EN/FR/Kinyarwanda).

---

## Navigation / workflow flow (a typical setup/maintenance session)
1. Sign in → **Home (Admin overview)** → check access, integrations, alerts.
2. **Users & Roles** → onboard a new hire, assign roles, or **build a custom role** (e.g. "Claims Officer").
3. **Rules & Policies** → adjust an approval limit or matching threshold.
4. **Integrations** → connect a new bank/MoMo source.
5. **Billing / Data** → manage subscription, set retention.
> Defines *who can do what* (with CFO on approval limits); the Auditor sees every change in the audit log.

## Features & functions summary
Manage users · assign roles · **build/edit/deactivate custom roles** · configure policies (no code) · manage integrations · manage billing · manage data retention/deletion · set language. **Cannot:** approve financial actions, reconcile, post ledger, or do audit work — admin governs access, not money.
