# Kora Definitive Roles Definition

> **AUTHORITATIVE AND LOCKED.** This is the role contract for backend RBAC, database seed data, APIs, and frontend role-based rendering. Kora has seven canonical system roles: one platform role and six tenant roles. Industry and department variations use custom roles and vertical templates, not new system roles.

## Two Authorization Planes

- **Platform plane:** Kora staff operating the shared platform across tenants.
- **Tenant plane:** users working inside one customer organization.
- A platform user is not a tenant user.
- A tenant user cannot access another tenant.
- Platform support access to tenant data must be explicit, time-boxed, tenant-consented, and audited.

## Platform Role

### Super Admin (`SUPER_ADMIN`)

Operates Kora itself: provisions and suspends tenants, manages platform billing and configuration, monitors health and usage, manages platform staff, and controls platform security.

Super Admin does not receive ordinary tenant permissions and cannot approve tenant financial actions. Support access requires a valid `platform_support_access_grant`.

## Tenant Roles

### Organization Owner (`ORGANIZATION_OWNER`)

Ultimate organization authority with whole-business visibility and final approval authority for top-value and high-risk actions. May manage users and roles, but ledger posting still requires a finance role.

### Finance Lead (`FINANCE_LEAD`)

Runs finance operations: reconciliation approval, policy-limited financial approval, ledger posting and reversal, close, reporting, collections, cash and risk review, and Credit Passport generation.

### Finance Operator (`FINANCE_OPERATOR`)

Prepares and resolves work: uploads documents, reviews data quality, accepts or rejects reconciliation suggestions, resolves exceptions, and creates approval requests. Cannot approve financial actions or post ledger entries.

### Auditor / Compliance (`AUDITOR_COMPLIANCE`)

Independent read-only oversight. Reviews events, evidence, reconciliation, reports, Credit Passport data, and immutable audit records. Cannot modify financial or operational data.

### Org Admin (`ORG_ADMIN`)

Manages tenant users, roles, policies, integrations, billing, retention settings, and consent configuration. Has no financial approval or ledger authority.

### External Collaborator (`EXTERNAL_COLLABORATOR`)

Represents lenders, external auditors, advisors, and other outside parties. The role grants no static data permissions. Every read must be allowed by an active, time-boxed, revocable consent grant for the target organization.

## Permission Catalog

Tenant permissions:

`tenant:read` | `users:manage` | `roles:manage` | `policy:manage` | `integrations:manage` | `billing:manage` | `data:retention.manage` | `documents:upload` | `data_quality:review` | `events:read` | `reconciliation:review` | `reconciliation:resolve` | `approval:create` | `financial:approve` | `ledger:post` | `ledger:reverse` | `collections:send` | `relationships:manage` | `contracts:manage` | `suppliers:manage` | `reports:read` | `reports:export` | `roi:read` | `credit_passport:generate` | `credit_passport:read` | `consent:manage` | `audit:read`

Platform permissions:

`platform:tenants.manage` | `platform:billing.manage` | `platform:config.manage` | `platform:health.read` | `platform:usage.read` | `platform:staff.manage` | `platform:security.manage` | `platform:support_access`

## Role Permission Matrix

| Role | Main permissions | Explicit exclusions |
|---|---|---|
| Super Admin | Platform tenant, billing, configuration, health, usage, staff, security, and support-access administration | No ordinary tenant permission or tenant financial approval |
| Organization Owner | Whole-business reads, final financial approval, reports, ROI, Credit Passport, consent, audit, user and role management | No ledger posting without an additional Finance Lead role |
| Finance Lead | Finance preparation and approval, ledger posting/reversal, reporting, collections, relationships, contracts, suppliers, Credit Passport | No user, role, integration, billing, or retention administration |
| Finance Operator | Document upload, data-quality work, event reads, reconciliation review/resolution, approval preparation, report reads | No financial approval, ledger posting/reversal, or administration |
| Auditor / Compliance | Data-quality, event, reconciliation, report, ROI, Credit Passport, and audit reads/exports | No mutation, approval, posting, or administration |
| Org Admin | User, role, policy, integration, billing, retention, consent, and audit administration | No financial approval, reconciliation resolution, or ledger posting |
| External Collaborator | Only permissions in an active consent grant | No static access and no internal mutation permissions |

## Custom Roles and Vertical Templates

- System roles are fixed; do not add title-based or industry-specific system roles.
- Custom roles are tenant-owned, versioned permission bundles.
- A role manager cannot grant a permission they do not hold.
- Role changes are high-risk, versioned, and audited.
- Vertical adapters provide templates such as Claims Officer or Fleet Accountant over the generic permission catalog.
- Users may hold multiple internal tenant roles; permissions combine additively.
- External Collaborator cannot be combined with an internal tenant role.

## Global Controls

- Tenant isolation is mandatory.
- A creator or preparer cannot approve their own action.
- Payments above the configured threshold require two distinct approvers.
- Approving matches, posting, reversing postings, granting external access, changing policy, and managing roles are high-risk actions.
- AI agents may suggest, score, classify, and draft; only humans approve or post financial actions.
- Roles, approvals, postings, policy changes, support access, and consent grants are versioned and audited.

## Locked Role Set

The seven system roles are:

1. `SUPER_ADMIN`
2. `ORGANIZATION_OWNER`
3. `FINANCE_LEAD`
4. `FINANCE_OPERATOR`
5. `AUDITOR_COMPLIANCE`
6. `ORG_ADMIN`
7. `EXTERNAL_COLLABORATOR`

Do not restore the retired title-based roles `OWNER`, `CEO`, `CFO`, `FINANCE_MANAGER`, `ACCOUNTANT`, `AUDITOR`, `ADMIN`, `EXTERNAL_LENDER`, or `EXTERNAL_AUDITOR`.
