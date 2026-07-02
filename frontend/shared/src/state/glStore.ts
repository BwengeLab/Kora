import { create } from 'zustand';
import { accountByCode, seedChartOfAccounts, type Account } from '../seed/chartOfAccounts';
import { seedJournals, type JournalEntry, type JournalLine } from '../seed/journals';
import type { EntityScope } from '../seed/entities';

// The General Ledger engine. Holds journal entries; enforces that every entry
// balances (Σdebits = Σcredits); derives account balances and a trial balance
// that ties out. Entity-scoped. This is the accounting substance under the
// control layer — the thing that makes Kora a system of record.

export const linesBalanced = (lines: JournalLine[]): boolean => {
  const dr = lines.reduce((a, l) => a + l.debit, 0n);
  const cr = lines.reduce((a, l) => a + l.credit, 0n);
  return dr === cr && dr > 0n;
};

interface GLState {
  journals: JournalEntry[];
  postJournal: (entry: Omit<JournalEntry, 'id' | 'status'>) => boolean;
  voidJournal: (id: string) => void;
}

export const useGLStore = create<GLState>((set) => ({
  journals: seedJournals,
  postJournal: (entry) => {
    if (!linesBalanced(entry.lines)) return false;
    const full: JournalEntry = { ...entry, id: `je-${Date.now()}`, status: 'posted' };
    set((s) => ({ journals: [full, ...s.journals] }));
    return true;
  },
  voidJournal: (id) => set((s) => ({ journals: s.journals.filter((j) => j.id !== id) })),
}));

// ─── Pure derivations (entity-scoped) ───────────────────────────────────────
const inScope = (e: JournalEntry, scope: EntityScope) => scope === 'all' || e.entity === scope;

export interface TrialRow extends Account {
  debit: bigint; // net balance shown in the debit column (0 if credit-side)
  credit: bigint;
}

// Net balance per account (debit-positive), posted entries only, scoped.
export function accountNets(journals: JournalEntry[], scope: EntityScope): Map<string, bigint> {
  const m = new Map<string, bigint>();
  for (const e of journals) {
    if (e.status !== 'posted' || !inScope(e, scope)) continue;
    for (const l of e.lines) m.set(l.account, (m.get(l.account) ?? 0n) + l.debit - l.credit);
  }
  return m;
}

// Trial balance — each account's net shown in its natural column; totals tie out.
export function trialBalance(journals: JournalEntry[], scope: EntityScope): { rows: TrialRow[]; totalDebit: bigint; totalCredit: bigint } {
  const nets = accountNets(journals, scope);
  const rows: TrialRow[] = [];
  let totalDebit = 0n;
  let totalCredit = 0n;
  for (const acct of seedChartOfAccounts) {
    const net = nets.get(acct.code) ?? 0n;
    if (net === 0n) continue;
    const debit = net > 0n ? net : 0n;
    const credit = net < 0n ? -net : 0n;
    totalDebit += debit;
    totalCredit += credit;
    rows.push({ ...acct, debit, credit });
  }
  return { rows, totalDebit, totalCredit };
}

// Display balance for an account (positive in its normal direction).
export function displayBalance(code: string, journals: JournalEntry[], scope: EntityScope): bigint {
  const net = accountNets(journals, scope).get(code) ?? 0n;
  const acct = accountByCode(code);
  return acct?.normal === 'credit' ? -net : net;
}

// ─── Financial statements (all derived from the GL, so they tie out) ─────────
export interface StatementLine {
  code: string;
  name: string;
  amount: bigint;
}

const CASH_ACCOUNTS = ['1010', '1020', '1030', '1040', '1050'];

// Income statement: revenue − expenses = net income.
export function incomeStatement(journals: JournalEntry[], scope: EntityScope) {
  const nets = accountNets(journals, scope);
  const lineFor = (type: 'revenue' | 'expense'): StatementLine[] =>
    seedChartOfAccounts
      .filter((a) => a.type === type)
      .map((a) => ({ code: a.code, name: a.name, amount: (a.normal === 'credit' ? -1n : 1n) * (nets.get(a.code) ?? 0n) }))
      .filter((l) => l.amount !== 0n);
  const revenue = lineFor('revenue');
  const expenses = lineFor('expense');
  const totalRevenue = revenue.reduce((a, l) => a + l.amount, 0n);
  const totalExpense = expenses.reduce((a, l) => a + l.amount, 0n);
  return { revenue, expenses, totalRevenue, totalExpense, netIncome: totalRevenue - totalExpense };
}

// Balance sheet: assets = liabilities + equity + net income (period).
export function balanceSheet(journals: JournalEntry[], scope: EntityScope) {
  const nets = accountNets(journals, scope);
  const section = (type: 'asset' | 'liability' | 'equity'): StatementLine[] =>
    seedChartOfAccounts
      .filter((a) => a.type === type)
      .map((a) => ({ code: a.code, name: a.name, amount: (a.normal === 'credit' ? -1n : 1n) * (nets.get(a.code) ?? 0n) }))
      .filter((l) => l.amount !== 0n);
  const assets = section('asset');
  const liabilities = section('liability');
  const equity = section('equity');
  const { netIncome } = incomeStatement(journals, scope);
  const totalAssets = assets.reduce((a, l) => a + l.amount, 0n);
  const totalLiabilities = liabilities.reduce((a, l) => a + l.amount, 0n);
  const totalEquity = equity.reduce((a, l) => a + l.amount, 0n) + netIncome;
  return { assets, liabilities, equity, netIncome, totalAssets, totalLiabilities, totalEquity, balances: totalAssets === totalLiabilities + totalEquity };
}

// Cash-flow statement (direct method): change in cash, categorised by the
// contra accounts of each entry that touches a cash/bank/MoMo account.
export function cashFlow(journals: JournalEntry[], scope: EntityScope) {
  let opening = 0n;
  let operating = 0n;
  let investing = 0n;
  let financing = 0n;
  for (const e of journals) {
    if (e.status !== 'posted' || (scope !== 'all' && e.entity !== scope)) continue;
    const cashDelta = e.lines.filter((l) => CASH_ACCOUNTS.includes(l.account)).reduce((a, l) => a + l.debit - l.credit, 0n);
    if (cashDelta === 0n) continue;
    if (e.source === 'opening') { opening += cashDelta; continue; }
    const nonCash = e.lines.filter((l) => !CASH_ACCOUNTS.includes(l.account)).map((l) => l.account);
    const isFinancing = nonCash.some((c) => c === '2500' || c === '3000' || c === '3100');
    const isInvesting = nonCash.some((c) => c === '1500');
    if (isFinancing) financing += cashDelta;
    else if (isInvesting) investing += cashDelta;
    else operating += cashDelta;
  }
  const netChange = operating + investing + financing;
  return { opening, operating, investing, financing, netChange, closing: opening + netChange };
}
