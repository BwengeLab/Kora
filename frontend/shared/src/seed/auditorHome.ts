// Auditor "Audit & Risk Command Center" home seed (doc 05). Everything is
// read-only — the auditor reads, traces, and exports; changes nothing.

import type { Money } from '../lib/money';

const M = (amount: number, currency = 'USD'): Money => ({
  amountMinor: BigInt(Math.round(amount * 100)),
  currency,
});

export const seedControlHealth = {
  score: 92,
  trendPts: 3, // vs last month
  subscores: [
    { label: 'Approvals & SoD', value: 95 },
    { label: 'Evidence coverage', value: 88 },
    { label: 'Reconciliation integrity', value: 96 },
    { label: 'Access controls', value: 90 },
  ],
};

export const seedRiskStats = {
  riskFlags: 11,
  sodViolations: 2,
  suspicious: 4,
  missingDocs: 9,
};

// ─── Immutable audit log feed ──────────────────────────────────────────────
export type AuditKind = 'approval' | 'posting' | 'access' | 'config' | 'agent' | 'consent' | 'audit' | 'claim';

export interface AuditEvent {
  id: string;
  at: string; // ISO
  actor: string;
  role: string;
  kind: AuditKind;
  action: string;
  target: string;
  amount?: Money;
  hasEvidence: boolean;
}

export const seedAuditLog: AuditEvent[] = [
  { id: 'al-1', at: '2025-05-15T16:42:00Z', actor: 'Aline Mukamana', role: 'Organization Owner', kind: 'approval', action: 'Approved payment', target: 'ACME Supplies · INV-10356', amount: M(45600), hasEvidence: true },
  { id: 'al-2', at: '2025-05-15T16:40:00Z', actor: 'Eric Habimana', role: 'Finance Lead', kind: 'posting', action: 'Posted journal entries', target: 'May accruals · 14 entries', amount: M(62300), hasEvidence: true },
  { id: 'al-3', at: '2025-05-15T15:10:00Z', actor: 'Sarah Ingabire', role: 'Org Admin', kind: 'config', action: 'Changed approval limit', target: 'Finance Lead · $80K → $100K', hasEvidence: true },
  { id: 'al-4', at: '2025-05-15T14:05:00Z', actor: 'Reconciliation Agent', role: 'Kora AI', kind: 'agent', action: 'Flagged suspicious transaction', target: 'OFFSHORE LTD · $15,400', amount: M(15400), hasEvidence: true },
  { id: 'al-5', at: '2025-05-15T12:30:00Z', actor: 'Aline Mukamana', role: 'Organization Owner', kind: 'approval', action: 'Approved (1 of 2)', target: 'Capital equipment · CapEx', amount: M(184500), hasEvidence: true },
  { id: 'al-6', at: '2025-05-15T11:18:00Z', actor: 'Eric Habimana', role: 'Finance Lead', kind: 'consent', action: 'Shared Credit Passport', target: 'Bank of Kigali · 30-day scope', hasEvidence: true },
  { id: 'al-7', at: '2025-05-15T10:02:00Z', actor: 'Diane Uwase', role: 'Finance Operator', kind: 'access', action: 'Exported transactions', target: '412 rows · HSBC May', hasEvidence: false },
  { id: 'al-8', at: '2025-05-14T17:55:00Z', actor: 'Kora Super Admin', role: 'Super Admin', kind: 'access', action: 'Support access ended', target: 'Tenant: Acme Insurance', hasEvidence: true },
];

// ─── SoD violations ────────────────────────────────────────────────────────
export interface SodViolation {
  id: string;
  user: string;
  role: string;
  conflict: string;
  severity: 'high' | 'medium';
  detail: string;
}

export const seedSodViolations: SodViolation[] = [
  { id: 'sod-1', user: 'Eric Habimana', role: 'Finance Lead', conflict: 'Prepared & attempted self-approve', severity: 'high', detail: 'Cloud Services match SUB-Q2 · blocked by SoD' },
  { id: 'sod-2', user: 'James Okello', role: 'Custom: Claims Officer', conflict: 'Create party + approve payment', severity: 'medium', detail: 'Permission bundle allows both — review role' },
];

// ─── Missing-document list ─────────────────────────────────────────────────
export interface MissingDoc {
  id: string;
  party: string;
  reference: string;
  amount: Money;
  missing: string;
  ageText: string;
}

export const seedMissingDocs: MissingDoc[] = [
  { id: 'md-1', party: 'Vendor 7741', reference: 'BK · May 14', amount: M(3920), missing: 'No invoice or PO', ageText: '1d' },
  { id: 'md-2', party: 'PT Imports', reference: 'PO-2025-441', amount: M(8760), missing: 'Corrected invoice', ageText: '6h' },
  { id: 'md-3', party: 'OFFSHORE LTD', reference: 'BK · May 12', amount: M(15400), missing: 'Contract on file', ageText: '3d' },
  { id: 'md-4', party: 'Diane Uwase', reference: 'TRAVEL-MAY', amount: M(180), missing: 'Receipt image', ageText: '1d' },
];
