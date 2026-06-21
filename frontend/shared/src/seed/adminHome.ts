// Org Admin "Admin Console" home seed (doc 06). Governs users, roles,
// policies, integrations, billing — NO financial approval authority.

export const seedAdminStats = {
  activeUsers: 24,
  pendingRequests: 3,
  integrationsConnected: 6,
  integrationsTotal: 8,
  activePolicies: 12,
  customRoles: 4,
};

// ─── Users & access ────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'active' | 'invited' | 'suspended';
  lastActive: string;
  sodConflict?: boolean;
}

export const seedAdminUsers: AdminUser[] = [
  { id: 'u-1', name: 'Aline Mukamana', email: 'owner@acme.local', roles: ['Organization Owner'], status: 'active', lastActive: '2m ago' },
  { id: 'u-2', name: 'Eric Habimana', email: 'cfo@acme.local', roles: ['Finance Lead'], status: 'active', lastActive: '8m ago' },
  { id: 'u-3', name: 'Diane Uwase', email: 'accountant@acme.local', roles: ['Finance Operator'], status: 'active', lastActive: '1m ago' },
  { id: 'u-4', name: 'Patrick Niyonsenga', email: 'auditor@acme.local', roles: ['Auditor'], status: 'active', lastActive: '1h ago' },
  { id: 'u-5', name: 'James Okello', email: 'claims@acme.local', roles: ['Claims Officer'], status: 'active', lastActive: '20m ago', sodConflict: true },
  { id: 'u-6', name: 'Grace Mutoni', email: 'grace@acme.local', roles: ['Finance Operator'], status: 'invited', lastActive: 'Invited 1d ago' },
];

// ─── Pending access requests ───────────────────────────────────────────────
export interface AccessRequest {
  id: string;
  name: string;
  requestedRole: string;
  reason: string;
  when: string;
}

export const seedAccessRequests: AccessRequest[] = [
  { id: 'ar-1', name: 'BK Lender Officer', requestedRole: 'External Collaborator · Credit Passport', reason: 'Loan assessment', when: '2h ago' },
  { id: 'ar-2', name: 'Grace Mutoni', requestedRole: 'Reconciliation: resolve', reason: 'Onboarding', when: '1d ago' },
  { id: 'ar-3', name: 'External Auditor (PwC)', requestedRole: 'Audit pack · 30-day scope', reason: 'Annual audit', when: '2d ago' },
];

// ─── Access alerts (SoD / risk suggestions) ────────────────────────────────
export interface AccessAlert {
  id: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium';
}

export const seedAccessAlerts: AccessAlert[] = [
  { id: 'aa-1', title: 'SoD conflict on "Claims Officer"', detail: 'Role allows create-party AND approve-payment. Split the bundle.', severity: 'high' },
  { id: 'aa-2', title: '2 users without 2FA', detail: 'Enforce two-factor for finance roles.', severity: 'medium' },
  { id: 'aa-3', title: 'Stale invite', detail: 'Grace Mutoni invited 1d ago — not yet accepted.', severity: 'medium' },
];

// ─── Integrations ──────────────────────────────────────────────────────────
export type IntegrationStatus = 'connected' | 'syncing' | 'error' | 'disconnected';

export interface Integration {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  lastSync: string;
}

export const seedIntegrations: Integration[] = [
  { id: 'in-1', name: 'MTN MoMo', category: 'Mobile money', status: 'connected', lastSync: '5m ago' },
  { id: 'in-2', name: 'Bank of Kigali', category: 'Bank feed', status: 'connected', lastSync: '12m ago' },
  { id: 'in-3', name: 'EBM / RRA', category: 'Tax & invoices', status: 'syncing', lastSync: 'now' },
  { id: 'in-4', name: 'HSBC', category: 'Bank feed', status: 'connected', lastSync: '1h ago' },
  { id: 'in-5', name: 'QuickBooks', category: 'Accounting', status: 'error', lastSync: 'failed 2h ago' },
  { id: 'in-6', name: 'Airtel Money', category: 'Mobile money', status: 'connected', lastSync: '8m ago' },
];

// ─── Policy versions ───────────────────────────────────────────────────────
export interface PolicyVersion {
  id: string;
  name: string;
  version: string;
  updatedBy: string;
  when: string;
}

export const seedPolicies: PolicyVersion[] = [
  { id: 'p-1', name: 'Approval limits', version: 'v4', updatedBy: 'Sarah Ingabire', when: '2h ago' },
  { id: 'p-2', name: 'Auto-match threshold', version: 'v2', updatedBy: 'Eric Habimana', when: '3d ago' },
  { id: 'p-3', name: 'Duplicate window', version: 'v1', updatedBy: 'Sarah Ingabire', when: '2w ago' },
  { id: 'p-4', name: 'Evidence requirements', version: 'v3', updatedBy: 'Sarah Ingabire', when: '1mo ago' },
];

// ─── Billing ───────────────────────────────────────────────────────────────
export const seedBilling = {
  plan: 'Enterprise',
  seats: 24,
  seatsIncluded: 30,
  usagePct: 0.74,
  renews: 'Jun 1, 2025',
};
