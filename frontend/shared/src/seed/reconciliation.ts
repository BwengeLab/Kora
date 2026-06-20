// Reconciliation cockpit seed data. Shapes mirror what the Reconciliation
// service (Go) + Reconciliation agent (Py) will return over gRPC. Every
// reconciliation carries its confidence tier, the agent's reason, and a
// per-field delta breakdown so the operator can prepare a match with full
// evidence — never a silent guess. (Per doc 06 §5.)

import type { Money } from '../lib/money';

const M = (amount: number, currency = 'USD'): Money => ({
  amountMinor: BigInt(Math.round(amount * 100)),
  currency,
});

// ─── Sides of a match ──────────────────────────────────────────────────────
export interface BankTransaction {
  id: string;
  source: string; // "HSBC", "BK", "MTN MoMo", "Airtel Money", "I&M Bank"
  date: string; // ISO
  amount: Money;
  counterparty: string;
  reference?: string;
  // Direction relative to the tenant
  direction: 'inflow' | 'outflow';
}

export interface BusinessRecord {
  id: string;
  type: 'invoice' | 'bill' | 'expense' | 'po' | 'contract';
  date: string; // ISO
  amount: Money;
  partyName: string;
  reference: string;
}

// ─── Reconciliations ───────────────────────────────────────────────────────
export type ReconciliationTier = 'auto' | 'suggested' | 'review' | 'duplicate' | 'suspicious';

export interface FieldDelta {
  field: 'amount' | 'reference' | 'date' | 'party';
  status: 'match' | 'near' | 'diff';
  bankValue: string;
  recordValue: string;
  note?: string; // e.g. "-1 day", "87% similar"
}

export interface Reconciliation {
  id: string;
  transaction: BankTransaction;
  suggestedRecord?: BusinessRecord;
  confidence: number; // 0–100
  tier: ReconciliationTier;
  /** Plain-English reason from the agent. Never silent — always shown. */
  reason: string;
  deltas: FieldDelta[];
  /** True if the agent thinks it's a duplicate of a previously matched item. */
  duplicateOf?: string;
  /** Anything unexplained ($ left over after a partial match, e.g.) */
  unexplainedDifference?: Money;
}

// ─── Seed ──────────────────────────────────────────────────────────────────
function txn(
  id: string,
  source: string,
  date: string,
  amount: Money,
  counterparty: string,
  reference: string | undefined,
  direction: BankTransaction['direction'] = 'outflow',
): BankTransaction {
  return reference !== undefined
    ? { id, source, date, amount, counterparty, reference, direction }
    : { id, source, date, amount, counterparty, direction };
}

function rec(
  id: string,
  type: BusinessRecord['type'],
  date: string,
  amount: Money,
  partyName: string,
  reference: string,
): BusinessRecord {
  return { id, type, date, amount, partyName, reference };
}

export const seedReconciliations: Reconciliation[] = [
  {
    id: 'r-1',
    transaction: txn('t-1', 'HSBC', '2025-05-14', M(45600), 'ACME Supplies', 'ACME-INV-10356'),
    suggestedRecord: rec('inv-1', 'invoice', '2025-05-13', M(45600), 'ACME Supplies Ltd.', 'INV-10356'),
    confidence: 91,
    tier: 'suggested',
    reason: 'Amount and party match exactly; reference matches to 87%; 1 day apart.',
    deltas: [
      { field: 'amount', status: 'match', bankValue: '$45,600.00', recordValue: '$45,600.00' },
      { field: 'reference', status: 'near', bankValue: 'ACME-INV-10356', recordValue: 'INV-10356', note: '87% similar' },
      { field: 'date', status: 'near', bankValue: 'May 14', recordValue: 'May 13', note: '-1 day' },
      { field: 'party', status: 'match', bankValue: 'ACME Supplies', recordValue: 'ACME Supplies Ltd.' },
    ],
  },
  {
    id: 'r-2',
    transaction: txn('t-2', 'BK', '2025-05-15', M(12480), 'Kigali Office Park', 'RENT-MAY'),
    suggestedRecord: rec('bill-1', 'bill', '2025-05-01', M(12480), 'Kigali Office Park Ltd.', 'OL-2025-05'),
    confidence: 78,
    tier: 'suggested',
    reason: 'Amount matches; recurring rent pattern; 2-week gap to bill date is normal for this lease.',
    deltas: [
      { field: 'amount', status: 'match', bankValue: '$12,480.00', recordValue: '$12,480.00' },
      { field: 'reference', status: 'diff', bankValue: 'RENT-MAY', recordValue: 'OL-2025-05' },
      { field: 'date', status: 'near', bankValue: 'May 15', recordValue: 'May 1', note: 'recurring' },
      { field: 'party', status: 'match', bankValue: 'Kigali Office Park', recordValue: 'Kigali Office Park Ltd.' },
    ],
  },
  {
    id: 'r-3',
    transaction: txn('t-3', 'MTN MoMo', '2025-05-15', M(820), 'J. Habimana', 'CLAIM-08812', 'outflow'),
    suggestedRecord: rec('exp-1', 'expense', '2025-05-15', M(820), 'Jean Habimana', 'CL-08812'),
    confidence: 96,
    tier: 'auto',
    reason: 'Amount, date, and party match exactly; reference matches to 94%.',
    deltas: [
      { field: 'amount', status: 'match', bankValue: '$820.00', recordValue: '$820.00' },
      { field: 'reference', status: 'near', bankValue: 'CLAIM-08812', recordValue: 'CL-08812', note: '94%' },
      { field: 'date', status: 'match', bankValue: 'May 15', recordValue: 'May 15' },
      { field: 'party', status: 'match', bankValue: 'J. Habimana', recordValue: 'Jean Habimana' },
    ],
  },
  {
    id: 'r-4',
    transaction: txn('t-4', 'I&M Bank', '2025-05-15', M(8760), 'PT IMPORTS', undefined),
    suggestedRecord: rec('po-1', 'po', '2025-05-08', M(8500), 'PT Imports', 'PO-2025-441'),
    confidence: 58,
    tier: 'review',
    reason: 'Amount differs by $260; no reference on the bank side; party similar.',
    deltas: [
      { field: 'amount', status: 'diff', bankValue: '$8,760.00', recordValue: '$8,500.00', note: '+$260' },
      { field: 'reference', status: 'diff', bankValue: '—', recordValue: 'PO-2025-441' },
      { field: 'date', status: 'near', bankValue: 'May 15', recordValue: 'May 8', note: '+7 days' },
      { field: 'party', status: 'near', bankValue: 'PT IMPORTS', recordValue: 'PT Imports' },
    ],
    unexplainedDifference: M(260),
  },
  {
    id: 'r-5',
    transaction: txn('t-5', 'HSBC', '2025-05-14', M(45600), 'ACME Supplies', 'ACME-INV-10356'),
    confidence: 99,
    tier: 'duplicate',
    reason: 'Identical to transaction r-1 (same amount, ref, counterparty, posted within 60s).',
    deltas: [],
    duplicateOf: 'r-1',
  },
  {
    id: 'r-6',
    transaction: txn('t-6', 'BK', '2025-05-12', M(15400), 'OFFSHORE LTD', undefined),
    confidence: 22,
    tier: 'suspicious',
    reason: 'Unknown counterparty; no contract or PO on file; outside business hours.',
    deltas: [],
  },
  {
    id: 'r-7',
    transaction: txn('t-7', 'Airtel Money', '2025-05-15', M(420), 'M. Iradukunda', 'PREMIUM-7741', 'inflow'),
    suggestedRecord: rec('inv-2', 'invoice', '2025-05-15', M(420), 'Marie Iradukunda', 'PREM-7741'),
    confidence: 88,
    tier: 'suggested',
    reason: 'Amount, party, and date match; reference is the policy ID match.',
    deltas: [
      { field: 'amount', status: 'match', bankValue: '$420.00', recordValue: '$420.00' },
      { field: 'reference', status: 'near', bankValue: 'PREMIUM-7741', recordValue: 'PREM-7741', note: '88%' },
      { field: 'date', status: 'match', bankValue: 'May 15', recordValue: 'May 15' },
      { field: 'party', status: 'match', bankValue: 'M. Iradukunda', recordValue: 'Marie Iradukunda' },
    ],
  },
  {
    id: 'r-8',
    transaction: txn('t-8', 'HSBC', '2025-05-13', M(2240), 'CLOUD SERVICES INC', 'SUB-Q2'),
    suggestedRecord: rec('exp-2', 'expense', '2025-05-13', M(2240), 'Cloud Services Inc', 'SUB-Q2-2025'),
    confidence: 94,
    tier: 'suggested',
    reason: 'Amount and date match exactly; party and reference align with last quarter\'s pattern.',
    deltas: [
      { field: 'amount', status: 'match', bankValue: '$2,240.00', recordValue: '$2,240.00' },
      { field: 'reference', status: 'near', bankValue: 'SUB-Q2', recordValue: 'SUB-Q2-2025', note: '90%' },
      { field: 'date', status: 'match', bankValue: 'May 13', recordValue: 'May 13' },
      { field: 'party', status: 'match', bankValue: 'CLOUD SERVICES INC', recordValue: 'Cloud Services Inc' },
    ],
  },
  {
    id: 'r-9',
    transaction: txn('t-9', 'BK', '2025-05-14', M(3920), 'Vendor 7741', undefined),
    confidence: 41,
    tier: 'review',
    reason: 'No matching invoice or PO found in the last 60 days. Manual review needed.',
    deltas: [],
  },
  {
    id: 'r-10',
    transaction: txn('t-10', 'MTN MoMo', '2025-05-13', M(180), 'D. Uwase', 'TRAVEL-MAY', 'outflow'),
    suggestedRecord: rec('exp-3', 'expense', '2025-05-12', M(180), 'Diane Uwase', 'EXP-TRAV-2205'),
    confidence: 82,
    tier: 'suggested',
    reason: 'Travel reimbursement; amount and party match; 1 day apart.',
    deltas: [
      { field: 'amount', status: 'match', bankValue: '$180.00', recordValue: '$180.00' },
      { field: 'reference', status: 'diff', bankValue: 'TRAVEL-MAY', recordValue: 'EXP-TRAV-2205' },
      { field: 'date', status: 'near', bankValue: 'May 13', recordValue: 'May 12', note: '-1 day' },
      { field: 'party', status: 'match', bankValue: 'D. Uwase', recordValue: 'Diane Uwase' },
    ],
  },
];

// ─── Summary counts ────────────────────────────────────────────────────────
// These are the larger period numbers shown in the chips bar (May to date),
// of which the table above is a current snapshot.
export const seedReconciliationSummary = {
  auto: 842,
  suggested: 236,
  review: 170,
  duplicate: 12,
  suspicious: 4,
  total: 1264,
};
