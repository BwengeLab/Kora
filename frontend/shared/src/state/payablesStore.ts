import { create } from 'zustand';
import { seedBills, type Bill } from '../seed/payables';
import { useGLStore } from './glStore';

// Accounts Payable state. Approving/paying a bill posts a REAL balanced journal
// into the General Ledger — so the books and financial statements move with the
// AP workflow. This is the operator→lead handoff made operational end-to-end.

const toMinor = (n: number) => BigInt(Math.round(n * 100));

interface PayablesState {
  bills: Bill[];
  hydrate: (bills: Bill[]) => void;
  approve: (id: string, by: string) => void; // recognise the liability in the GL
  pay: (id: string, cashAccount?: string) => void; // settle it from cash
}

export const usePayablesStore = create<PayablesState>((set, get) => ({
  bills: seedBills,
  hydrate: (bills) => set({ bills }),
  approve: (id) => {
    const b = get().bills.find((x) => x.id === id);
    if (!b || b.status !== 'draft') return;
    // DR expense/asset · CR Accounts Payable (2000)
    useGLStore.getState().postJournal({
      date: new Date().toISOString().slice(0, 10),
      ref: b.ref,
      memo: `Bill — ${b.vendor}`,
      source: 'AP',
      entity: b.entity,
      lines: [
        { account: b.account, debit: toMinor(b.amount), credit: 0n, costCenter: b.costCenter },
        { account: '2000', debit: 0n, credit: toMinor(b.amount) },
      ],
    });
    set((s) => ({ bills: s.bills.map((x) => (x.id === id ? { ...x, status: 'approved' } : x)) }));
  },
  pay: (id, cashAccount = '1010') => {
    const b = get().bills.find((x) => x.id === id);
    if (!b || b.status !== 'approved') return;
    // DR Accounts Payable · CR cash
    useGLStore.getState().postJournal({
      date: new Date().toISOString().slice(0, 10),
      ref: `PAY-${b.ref}`,
      memo: `Payment — ${b.vendor}`,
      source: 'AP',
      entity: b.entity,
      lines: [
        { account: '2000', debit: toMinor(b.amount), credit: 0n },
        { account: cashAccount, debit: 0n, credit: toMinor(b.amount) },
      ],
    });
    set((s) => ({ bills: s.bills.map((x) => (x.id === id ? { ...x, status: 'paid' } : x)) }));
  },
}));
