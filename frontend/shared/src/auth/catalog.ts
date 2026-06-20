// The platform-wide permission catalog. Single source of truth for what
// permissions can exist. Roles (canonical + custom) are NAMED BUNDLES over
// this catalog — never hardcoded in the UI.
//
// Source: docs/13-ROLES-DEFINITION.md §4. As new modules come online, their
// permissions are added here and the catalog grows. Tenant-plane permissions
// live under tenant-scoped resources; platform-plane permissions are reserved
// for Super Admin and live under the PLATFORM_* keys.

export const PERMISSIONS = {
  // Platform plane (Super Admin only — never granted to tenant users)
  PLATFORM_ADMIN: 'platform:admin',

  // Tenant plane — organization fundamentals
  TENANT_READ: 'tenant:read',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
  POLICY_MANAGE: 'policy:manage',
  INTEGRATIONS_MANAGE: 'integrations:manage',
  BILLING_MANAGE: 'billing:manage',
  DATA_RETENTION_MANAGE: 'data:retention.manage',

  // Data + ingestion + business events
  DOCUMENTS_UPLOAD: 'documents:upload',
  DATA_QUALITY_REVIEW: 'data_quality:review',
  EVENTS_READ: 'events:read',

  // Reconciliation + approvals + ledger
  RECONCILIATION_REVIEW: 'reconciliation:review',
  RECONCILIATION_RESOLVE: 'reconciliation:resolve',
  APPROVAL_CREATE: 'approval:create',
  FINANCIAL_APPROVE: 'financial:approve',
  LEDGER_POST: 'ledger:post',
  LEDGER_REVERSE: 'ledger:reverse',

  // Collections + external relationships
  COLLECTIONS_SEND: 'collections:send',
  RELATIONSHIPS_MANAGE: 'relationships:manage',
  CONTRACTS_MANAGE: 'contracts:manage',
  SUPPLIERS_MANAGE: 'suppliers:manage',

  // Reporting + ROI
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',
  ROI_READ: 'roi:read',

  // Credit passport + consent + audit
  CREDIT_PASSPORT_GENERATE: 'credit_passport:generate',
  CREDIT_PASSPORT_READ: 'credit_passport:read',
  CONSENT_MANAGE: 'consent:manage',
  AUDIT_READ: 'audit:read',
} as const;

export type CanonicalPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// The 7 canonical roles. Custom roles use their own ids; vertical-pack roles
// (e.g. "Claims Officer") get their own ids too. These are the only roles the
// system ships with — everything else is composed at runtime.
export const CANONICAL_ROLE_IDS = {
  SUPER_ADMIN: 'role.super_admin',
  ORG_OWNER: 'role.org_owner',
  FINANCE_LEAD: 'role.finance_lead',
  FINANCE_OPERATOR: 'role.finance_operator',
  AUDITOR: 'role.auditor',
  ORG_ADMIN: 'role.org_admin',
  EXTERNAL_COLLABORATOR: 'role.external_collaborator',
} as const;

export type CanonicalRoleId = (typeof CANONICAL_ROLE_IDS)[keyof typeof CANONICAL_ROLE_IDS];

// Blueprint ids map 1:1 with canonical role ids for the system roles. Custom
// roles get auto-composed blueprints with their own ids.
export const CANONICAL_BLUEPRINT_IDS = {
  SUPER_ADMIN: 'blueprint.super_admin',
  ORG_OWNER: 'blueprint.org_owner',
  FINANCE_LEAD: 'blueprint.finance_lead',
  FINANCE_OPERATOR: 'blueprint.finance_operator',
  AUDITOR: 'blueprint.auditor',
  ORG_ADMIN: 'blueprint.org_admin',
  EXTERNAL_COLLABORATOR: 'blueprint.external_collaborator',
} as const;

export type CanonicalBlueprintId =
  (typeof CANONICAL_BLUEPRINT_IDS)[keyof typeof CANONICAL_BLUEPRINT_IDS];
