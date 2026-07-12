import {
  CANONICAL_BLUEPRINT_IDS,
  CANONICAL_ROLE_IDS,
  CLAIMS_PERMISSIONS,
  CUSTOM_BLUEPRINT_IDS,
  CUSTOM_ROLE_IDS,
  PERMISSIONS,
} from '../auth/catalog';
import type { Permission, Scope, Session } from '../auth/types';

// Tenant + Super Admin seed sessions — one per canonical role. The seed
// permissions are aligned with doc 13's role responsibilities. Real sessions
// will come from the identity service over gRPC; these exist so we can render
// every blueprint while building UI.

const SEED_TENANT_ID = 'tnt_seed_1';
const tenantScope: Scope = { kind: 'tenant', tenantId: SEED_TENANT_ID };
const globalScope: Scope = { kind: 'global' };

const baseTenant = { id: SEED_TENANT_ID, name: 'Acme Insurance (seed)' };
const now = new Date();
const tomorrow = new Date(Date.now() + 8 * 3600_000);

function makeSession(
  email: string,
  displayName: string,
  roleId: string,
  roleName: string,
  blueprintId: string,
  permissions: Permission[],
  scope: Scope = tenantScope,
): Session {
  return {
    user: { id: `usr_seed_${roleId}`, email, displayName },
    tenant: baseTenant,
    roles: [{ id: roleId, name: roleName, blueprintId }],
    permissions: permissions.map((permission) => ({ permission, scope })),
    // Seed sessions exist only to render the correct role before real login.
    // An empty token keeps data queries disabled until the gateway issues one.
    token: '',
    issuedAt: now.toISOString(),
    expiresAt: tomorrow.toISOString(),
  };
}

// Finance Lead: approve + post within policy.
const financeLeadPerms: Permission[] = [
  PERMISSIONS.TENANT_READ,
  PERMISSIONS.EVENTS_READ,
  PERMISSIONS.RECONCILIATION_REVIEW,
  PERMISSIONS.RECONCILIATION_RESOLVE,
  PERMISSIONS.APPROVAL_CREATE,
  PERMISSIONS.FINANCIAL_APPROVE,
  PERMISSIONS.LEDGER_POST,
  PERMISSIONS.COLLECTIONS_SEND,
  PERMISSIONS.RELATIONSHIPS_MANAGE,
  PERMISSIONS.RELATIONSHIPS_READ,
  PERMISSIONS.CONTRACTS_MANAGE,
  PERMISSIONS.CONTRACTS_READ,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.REPORTS_EXPORT,
  PERMISSIONS.ROI_READ,
  PERMISSIONS.CREDIT_PASSPORT_READ,
  PERMISSIONS.CREDIT_PASSPORT_GENERATE,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.CONSENT_MANAGE,
  PERMISSIONS.CONSENT_READ,
  PERMISSIONS.AGENTS_RUN,
  PERMISSIONS.AGENT_FEEDBACK,
];

// Organization Owner: everything Finance Lead has + ledger reverse + users/roles oversight.
const orgOwnerPerms: Permission[] = [
  ...financeLeadPerms,
  PERMISSIONS.LEDGER_REVERSE,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.POLICY_MANAGE,
  PERMISSIONS.SUPPLIERS_MANAGE,
];

// Finance Operator: prepare/propose only — no approve, no post.
const financeOperatorPerms: Permission[] = [
  PERMISSIONS.TENANT_READ,
  PERMISSIONS.DOCUMENTS_UPLOAD,
  PERMISSIONS.DATA_QUALITY_REVIEW,
  PERMISSIONS.EVENTS_READ,
  PERMISSIONS.RECONCILIATION_REVIEW,
  PERMISSIONS.RECONCILIATION_RESOLVE,
  PERMISSIONS.APPROVAL_CREATE,
  PERMISSIONS.COLLECTIONS_SEND,
  PERMISSIONS.AGENTS_RUN,
  PERMISSIONS.AGENT_FEEDBACK,
];

// Auditor: read-only across the financial surface + audit + consent log.
const auditorPerms: Permission[] = [
  PERMISSIONS.TENANT_READ,
  PERMISSIONS.EVENTS_READ,
  PERMISSIONS.RECONCILIATION_REVIEW,
  PERMISSIONS.RELATIONSHIPS_READ,
  PERMISSIONS.CONTRACTS_READ,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.CONSENT_READ,
  PERMISSIONS.AUDIT_FINDING_CREATE,
  PERMISSIONS.AGENTS_RUN,
  PERMISSIONS.AGENT_FEEDBACK,
];

// Org Admin: org config only — explicitly NO financial approval.
const orgAdminPerms: Permission[] = [
  PERMISSIONS.TENANT_READ,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.POLICY_MANAGE,
  PERMISSIONS.INTEGRATIONS_MANAGE,
  PERMISSIONS.BILLING_MANAGE,
  PERMISSIONS.DATA_RETENTION_MANAGE,
];

// External Collaborator: only what a consent grant exposes — here, a lender's read of Credit Passport.
const externalPerms: Permission[] = [PERMISSIONS.CREDIT_PASSPORT_READ];

// Super Admin: platform plane.
const superAdminPerms: Permission[] = [PERMISSIONS.PLATFORM_ADMIN];

export const seedSessions = {
  [CANONICAL_ROLE_IDS.SUPER_ADMIN]: makeSession(
    'super@kora.local',
    'Kora Super Admin',
    CANONICAL_ROLE_IDS.SUPER_ADMIN,
    'Super Admin',
    CANONICAL_BLUEPRINT_IDS.SUPER_ADMIN,
    superAdminPerms,
    globalScope,
  ),
  [CANONICAL_ROLE_IDS.ORG_OWNER]: makeSession(
    'owner@acme.local',
    'Aline Mukamana',
    CANONICAL_ROLE_IDS.ORG_OWNER,
    'Organization Owner',
    CANONICAL_BLUEPRINT_IDS.ORG_OWNER,
    orgOwnerPerms,
  ),
  [CANONICAL_ROLE_IDS.FINANCE_LEAD]: makeSession(
    'cfo@acme.local',
    'Eric Habimana',
    CANONICAL_ROLE_IDS.FINANCE_LEAD,
    'Finance Lead',
    CANONICAL_BLUEPRINT_IDS.FINANCE_LEAD,
    financeLeadPerms,
  ),
  [CANONICAL_ROLE_IDS.FINANCE_OPERATOR]: makeSession(
    'accountant@acme.local',
    'Diane Uwase',
    CANONICAL_ROLE_IDS.FINANCE_OPERATOR,
    'Finance Operator',
    CANONICAL_BLUEPRINT_IDS.FINANCE_OPERATOR,
    financeOperatorPerms,
  ),
  [CANONICAL_ROLE_IDS.AUDITOR]: makeSession(
    'auditor@acme.local',
    'Patrick Niyonsenga',
    CANONICAL_ROLE_IDS.AUDITOR,
    'Auditor',
    CANONICAL_BLUEPRINT_IDS.AUDITOR,
    auditorPerms,
  ),
  [CANONICAL_ROLE_IDS.ORG_ADMIN]: makeSession(
    'admin@acme.local',
    'Sarah Ingabire',
    CANONICAL_ROLE_IDS.ORG_ADMIN,
    'Org Admin',
    CANONICAL_BLUEPRINT_IDS.ORG_ADMIN,
    orgAdminPerms,
  ),
  [CANONICAL_ROLE_IDS.EXTERNAL_COLLABORATOR]: makeSession(
    'officer@bk.local',
    'BK Lender Officer',
    CANONICAL_ROLE_IDS.EXTERNAL_COLLABORATOR,
    'External Collaborator (Lender)',
    CANONICAL_BLUEPRINT_IDS.EXTERNAL_COLLABORATOR,
    externalPerms,
  ),
  // Custom role from the Insurance vertical pack (cloned from Finance Operator,
  // scoped to claims). Only usable once the Org Admin unlocks the pack.
  [CUSTOM_ROLE_IDS.CLAIMS_OFFICER]: makeSession(
    'claims@acme.local',
    'James Okello',
    CUSTOM_ROLE_IDS.CLAIMS_OFFICER,
    'Claims Officer',
    CUSTOM_BLUEPRINT_IDS.CLAIMS_OFFICER,
    [
      PERMISSIONS.TENANT_READ,
      PERMISSIONS.DOCUMENTS_UPLOAD,
      PERMISSIONS.DATA_QUALITY_REVIEW,
      PERMISSIONS.EVENTS_READ,
      PERMISSIONS.RECONCILIATION_REVIEW,
      PERMISSIONS.RECONCILIATION_RESOLVE,
      PERMISSIONS.APPROVAL_CREATE,
      CLAIMS_PERMISSIONS.CLAIMS_REVIEW,
      CLAIMS_PERMISSIONS.CLAIMS_PREPARE,
      PERMISSIONS.AGENTS_RUN,
      PERMISSIONS.AGENT_FEEDBACK,
    ],
  ),
} satisfies Record<string, Session>;

export type SeedRoleId = keyof typeof seedSessions;

export function getSeedSession(roleId: SeedRoleId): Session {
  return seedSessions[roleId];
}
