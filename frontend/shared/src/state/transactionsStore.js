import { create } from 'zustand';
import { seedCashMovements } from '../seed/cashLedger';
// Seed the review state: unreconciled items still need a preparer's eyes; the
// suspicious OFFSHORE transfer arrives pre-flagged.
function seedTxns() {
    return seedCashMovements.map((m) => {
        if (m.counterparty === 'OFFSHORE LTD')
            return { ...m, review: 'flagged', note: 'No contract on file — escalated to Finance Lead.' };
        return { ...m, review: m.reconciled ? 'reviewed' : 'needs-review' };
    });
}
export const useTransactionsStore = create((set) => ({
    txns: seedTxns(),
    hydrate: (txns) => set({ txns }),
    classify: (id, category) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, category, review: t.review === 'needs-review' ? 'reviewed' : t.review } : t)) })),
    setReview: (id, review) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, review } : t)) })),
    setNote: (id, note) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, note } : t)) })),
    prepare: (id) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, review: 'prepared' } : t)) })),
    flag: (id, note) => set((s) => ({ txns: s.txns.map((t) => (t.id === id ? { ...t, review: 'flagged', ...(note ? { note } : {}) } : t)) })),
}));
export const REVIEW_META = {
    'needs-review': { label: 'Needs review', tone: 'bg-warning-soft text-warning' },
    reviewed: { label: 'Reviewed', tone: 'bg-info-soft text-info' },
    prepared: { label: 'Prepared', tone: 'bg-success-soft text-success' },
    flagged: { label: 'Flagged', tone: 'bg-danger-soft text-danger' },
};
