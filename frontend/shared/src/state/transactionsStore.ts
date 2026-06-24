import { create } from 'zustand';
import { seedCashMovements, type CashCategory, type CashMovement } from '../seed/cashLedger';

// The transaction register state for the Finance Operator. Each movement carries
// a review lifecycle the operator drives: needs-review → reviewed → prepared
// (handed to reconciliation), or flagged (kicked back / escalated). This is the
// preparer's working layer on top of the raw event ledger.

export type ReviewState = 'needs-review' | 'reviewed' | 'prepared' | 'flagged';

export interface Txn extends CashMovement {
  review: ReviewState;
  note?: string;
}

// Seed the review state: unreconciled items still need a preparer's eyes; the
// suspicious OFFSHORE transfer arrives pre-flagged.
function seedTxns(): Txn[] {
  return seedCashMovements.map((m) => {
    if (m.counterparty === 'OFFSHORE LTD') return { ...m, review: 'flagged' as const, note: 'No contract on file — escalated to Finance Lead.' };
    return { ...m, review: m.reconciled ? ('reviewed' as const) : ('needs-review' as const) };
  });
}

interface TxnState {
  txns: Txn[];
  classify: (id: string, category: CashCategory) => void;
  setReview: (id: string, review: ReviewState) => void;
  setNote: (id: string, note: string) => void;
  prepare: (id: string) => void;
  flag: (id: string, note?: string) => void;
}

export const useTransactionsStore = create<TxnState>((set) => ({
  txns: seedTxns(),
  classify: (id, category) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, category, review: t.review === 'needs-review' ? 'reviewed' : t.review } : t)) })),
  setReview: (id, review) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, review } : t)) })),
  setNote: (id, note) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, note } : t)) })),
  prepare: (id) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, review: 'prepared' } : t)) })),
  flag: (id, note) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, review: 'flagged', ...(note ? { note } : {}) } : t)) })),
}));

export const REVIEW_META: Record<ReviewState, { label: string; tone: string }> = {
  'needs-review': { label: 'Needs review', tone: 'bg-warning-soft text-warning' },
  reviewed: { label: 'Reviewed', tone: 'bg-info-soft text-info' },
  prepared: { label: 'Prepared', tone: 'bg-success-soft text-success' },
  flagged: { label: 'Flagged', tone: 'bg-danger-soft text-danger' },
};
