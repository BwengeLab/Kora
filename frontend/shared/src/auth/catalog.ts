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
  RELATIONSHIPS_READ: 'relationships:read',
  RELATIONSHIPS_MANAGE: 'relationships:manage',
  CONTRACTS_READ: 'contracts:read',
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
  CONSENT_READ: 'consent:read',
  AUDIT_READ: 'audit:read',
  AUDIT_FINDING_CREATE: 'audit:finding.create',
  AGENTS_RUN: 'agents:run',
  AGENT_FEEDBACK: 'agents:feedback',
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

// Custom / vertical-pack roles. Not part of the 7 system roles — these are
// composed from the catalog when a tenant unlocks a vertical pack (doc 16 §4).
export const CUSTOM_ROLE_IDS = {
  CLAIMS_OFFICER: 'role.claims_officer',
} as const;

export const CUSTOM_BLUEPRINT_IDS = {
  CLAIMS_OFFICER: 'blueprint.claims_officer',
} as const;

// Claims-specific permissions added to the catalog by the Insurance pack.
export const CLAIMS_PERMISSIONS = {
  CLAIMS_REVIEW: 'claims:review',
  CLAIMS_PREPARE: 'claims:prepare',
  CLAIMS_SETTLE: 'claims:settle',
} as const;
