# Super Admin (System Owner — you) — UI/UX, Navigation & Features

*Experience name: "Platform Command Center." Runs the Kora **platform** across all tenants — a **separate console**, not the tenant finance app. Entry on sign-in → **Home**.*

---

## Navigation (platform console sidebar)
Home · Tenants · Plans & Billing · Platform Config · System Health · Usage & Cost · Platform Users · Support Access · Platform Audit · + copilot, global search, notifications.

---

## Pages / screens

### Home — Platform Command Center
- **Purpose:** the health and growth of the whole platform.
- **On it:** tenant growth, active/suspended tenants, **system health**, platform **revenue & usage**, **cost-vs-revenue per tenant/model**, open incidents, support queue.
- **Features/functions:** drill into any tenant or metric; alerts; copilot ("which tenants are over cost?").

### Tenants
- **Purpose:** manage customer organizations.
- **On it:** tenant list (plan, status, usage, health), tenant detail.
- **Features:** **provision** new tenant, **suspend/reactivate**, configure, set plan.

### Plans & Billing
- **Purpose:** the subscription/business side.
- **On it:** plans/tiers, per-tenant billing, invoices, revenue.
- **Features:** manage plans, billing, dunning.

### Platform Config
- **Purpose:** system-wide defaults.
- **On it:** default policies, **feature flags**, model/integration configuration at platform level.
- **Features:** set defaults, roll features, configure models/providers.

### System Health & Usage/Cost
- **Purpose:** keep it running and profitable.
- **On it:** uptime, error rates, latency, throughput; **usage and cost per tenant and per model** (margin watch).
- **Features:** monitor, alert thresholds, drill to incidents.

### Platform Users
- **Purpose:** manage Kora's own staff (later: support/ops roles).
- **On it:** platform staff + their access.

### Support Access (the trust discipline)
- **Purpose:** enter a tenant for support — **only** with explicit, time-boxed, tenant-consented, **audited** access.
- **On it:** access requests, active grants, expiry, full log of every entry.
- **Features:** request/exercise scoped support access; everything logged ("not even the owner reads books silently").

### Platform Audit
- **Purpose:** oversight of platform actions.
- **On it:** immutable log of platform-level actions (provisioning, config, support access).

---

## Navigation / workflow flow (a typical day)
1. Sign in → **Home (Platform Command Center)** → check system health, growth, cost, incidents.
2. **Tenants** → provision a new customer / handle a suspension.
3. **Usage & Cost** → watch per-tenant/model cost vs revenue (margin).
4. **Support Access** → if a customer needs help, request audited, consented entry.
5. **Plans & Billing / Platform Config** → manage the business + platform settings.
> Operates the *system*, not customers' finances — and even support access is consented + logged.

## Features & functions summary
Provision/suspend/configure tenants · manage plans & billing · platform config & feature flags · monitor system health · track usage & cost (margin) · manage platform staff · audited/consented support access · platform audit. **Does not:** routinely view tenant financial data or approve tenant financial actions.
