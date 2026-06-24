import { ArrowDownLeft, ArrowUpRight, ChevronRight, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import {
  ACCOUNTS,
  CATEGORY_META,
  OPENING_BALANCE,
  seedCashMovements,
  type Account,
  type CashCategory,
  type CashMovement,
  type Direction,
} from '../../seed/cashLedger';
import { MovementDrawer } from './MovementDrawer';

type DirFilter = 'all' | Direction;

// True running balance computed over ALL movements (date order), regardless of
// the active filter — so the balance column always reflects reality.
function useRunningBalances() {
  return useMemo(() => {
    const asc = [...seedCashMovements].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const map = new Map<string, bigint>();
    let bal = OPENING_BALANCE.amountMinor;
    for (const m of asc) {
      bal += m.direction === 'in' ? m.amount.amountMinor : -m.amount.amountMinor;
      map.set(m.id, bal);
    }
    return map;
  }, []);
}

export function CashMovementsTab() {
  const balances = useRunningBalances();
  const [query, setQuery] = useState('');
  const [dir, setDir] = useState<DirFilter>('all');
  const [category, setCategory] = useState<CashCategory | 'all'>('all');
  const [account, setAccount] = useState<Account | 'all'>('all');
  const [onlyUnreconciled, setOnlyUnreconciled] = useState(false);
  const [selected, setSelected] = useState<CashMovement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seedCashMovements
      .filter((m) => (dir === 'all' ? true : m.direction === dir))
      .filter((m) => (category === 'all' ? true : m.category === category))
      .filter((m) => (account === 'all' ? true : m.account === account))
      .filter((m) => (onlyUnreconciled ? !m.reconciled : true))
      .filter((m) =>
        q === '' ? true : [m.description, m.counterparty, m.purpose, m.reference].some((s) => s.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [query, dir, category, account, onlyUnreconciled]);

  const totalIn: Money = { amountMinor: filtered.filter((m) => m.direction === 'in').reduce((a, m) => a + m.amount.amountMinor, 0n), currency: 'USD' };
  const totalOut: Money = { amountMinor: filtered.filter((m) => m.direction === 'out').reduce((a, m) => a + m.amount.amountMinor, 0n), currency: 'USD' };
  const net: Money = { amountMinor: totalIn.amountMinor - totalOut.amountMinor, currency: 'USD' };
  const unreconciledCount = seedCashMovements.filter((m) => !m.reconciled).length;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]">
      {/* Workbench */}
      <GlassSurface tone="strong" className="flex min-h-0 flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/55 p-4">
          <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
            <Search className="size-4 text-ink-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search description, party, purpose, ref…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
          </div>
          {/* Direction segmented */}
          <div className="flex h-10 items-center gap-0.5 rounded-xl bg-white/55 p-0.5 ring-1 ring-white/60">
            {(['all', 'in', 'out'] as DirFilter[]).map((d) => (
              <button key={d} type="button" onClick={() => setDir(d)} className={cn('h-9 rounded-lg px-3 text-[12px] font-bold capitalize transition-colors', dir === d ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-muted hover:text-ink')}>
                {d === 'all' ? 'All' : d === 'in' ? 'Money in' : 'Money out'}
              </button>
            ))}
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value as CashCategory | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={account} onChange={(e) => setAccount(e.target.value as Account | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
            <option value="all">All accounts</option>
            {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Column header */}
        <div className="grid grid-cols-[1fr_104px_120px_120px_28px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
          <span>Movement</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Status</span>
          <span />
        </div>

        {/* Rows */}
        <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {filtered.map((m) => (
            <Row key={m.id} m={m} balance={{ amountMinor: balances.get(m.id) ?? 0n, currency: 'USD' }} onClick={() => setSelected(m)} />
          ))}
          {filtered.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No movements match your filters.</li> : null}
        </ul>

        {/* Totals footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/55 bg-white/45 px-4 py-3">
          <span className="text-[12px] font-semibold text-ink-muted"><span className="tabular text-ink">{filtered.length}</span> movements</span>
          <div className="flex items-center gap-4 text-[12.5px]">
            <span className="inline-flex items-center gap-1.5 font-bold text-success"><ArrowDownLeft className="size-3.5" /> <MoneyCell amount={totalIn} size="sm" className="!text-[12.5px] text-success" /></span>
            <span className="inline-flex items-center gap-1.5 font-bold text-danger"><ArrowUpRight className="size-3.5" /> <MoneyCell amount={totalOut} size="sm" className="!text-[12.5px] text-danger" /></span>
            <span className="inline-flex items-center gap-1.5 font-bold text-ink">Net <MoneyCell amount={net} size="sm" className="!text-[12.5px]" showSign /></span>
          </div>
        </footer>
      </GlassSurface>

      {/* Helper rail */}
      <div className="flex flex-col gap-4">
        <CategoryBreakdown />
        <UnreconciledCard count={unreconciledCount} active={onlyUnreconciled} onToggle={() => setOnlyUnreconciled((v) => !v)} />
        <AgentFlags onFilterSuspicious={() => { setQuery('OFFSHORE'); setOnlyUnreconciled(false); }} />
      </div>

      <MovementDrawer movement={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Row({ m, balance, onClick }: { m: CashMovement; balance: Money; onClick: () => void }) {
  const isIn = m.direction === 'in';
  const cat = CATEGORY_META[m.category];
  return (
    <li>
      <button type="button" onClick={onClick} className="grid w-full grid-cols-[1fr_104px_120px_120px_28px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', isIn ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
            {isIn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-ink">{m.counterparty}</p>
              <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', cat.tone)}>{cat.label}</span>
            </div>
            <p className="truncate text-[11px] text-ink-muted">{m.purpose} · {m.account} · {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        <span className={cn('text-right text-[13px] font-bold tabular', isIn ? 'text-success' : 'text-danger')}>
          {isIn ? '+' : '−'}<MoneyCell amount={m.amount} size="sm" className={cn('!text-[13px]', isIn ? 'text-success' : 'text-danger')} />
        </span>
        <MoneyCell amount={balance} size="sm" className="text-right font-semibold !text-[12.5px] text-ink-soft" />
        <span className="flex justify-end">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', m.reconciled ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
            {m.reconciled ? 'Reconciled' : 'Unreconciled'}
          </span>
        </span>
        <ChevronRight className="size-4 justify-self-end text-ink-muted" />
      </button>
    </li>
  );
}

function CategoryBreakdown() {
  const totals = useMemo(() => {
    const map = new Map<CashCategory, { in: bigint; out: bigint }>();
    for (const m of seedCashMovements) {
      const e = map.get(m.category) ?? { in: 0n, out: 0n };
      if (m.direction === 'in') e.in += m.amount.amountMinor;
      else e.out += m.amount.amountMinor;
      map.set(m.category, e);
    }
    const rows = [...map.entries()].map(([cat, v]) => ({ cat, net: v.in - v.out, gross: v.in + v.out }));
    const max = Math.max(...rows.map((r) => Number(r.gross)), 1);
    return rows.sort((a, b) => Number(b.gross - a.gross)).slice(0, 6).map((r) => ({ ...r, pct: (Number(r.gross) / max) * 100 }));
  }, []);
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-4">
      <h4 className="text-[12px] font-bold text-ink">Flow by category</h4>
      {totals.map((r) => (
        <div key={r.cat}>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="font-medium text-ink-soft">{CATEGORY_META[r.cat].label}</span>
            <span className={cn('font-bold tabular', r.net >= 0n ? 'text-success' : 'text-danger')}>
              <MoneyCell amount={{ amountMinor: r.net, currency: 'USD' }} size="sm" className={cn('!text-[11.5px]', r.net >= 0n ? 'text-success' : 'text-danger')} showSign />
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8">
            <div className={cn('h-full rounded-full', r.net >= 0n ? 'bg-success' : 'bg-danger')} style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </GlassSurface>
  );
}

function UnreconciledCard({ count, active, onToggle }: { count: number; active: boolean; onToggle: () => void }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2 p-4">
      <h4 className="text-[12px] font-bold text-ink">Needs reconciling</h4>
      <span className="font-display text-3xl font-bold text-warning tabular">{count}</span>
      <button type="button" onClick={onToggle} className={cn('inline-flex h-9 items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold transition-colors', active ? 'bg-brand text-white' : 'bg-white/70 text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink')}>
        {active ? 'Showing unreconciled' : 'Filter to unreconciled'}
      </button>
    </GlassSurface>
  );
}

function AgentFlags({ onFilterSuspicious }: { onFilterSuspicious: () => void }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2.5 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15">
      <header className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-ai" />
        <h4 className="text-[12px] font-bold text-ink">CFO agent flags</h4>
      </header>
      <button type="button" onClick={onFilterSuspicious} className="rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white">
        <span className="font-bold text-danger">Suspicious $15,400</span> transfer to OFFSHORE LTD is unreconciled with no contract. <span className="font-semibold text-brand">Review →</span>
      </button>
      <div className="rounded-xl bg-white/55 p-2.5 text-[11.5px] text-ink ring-1 ring-white/60">
        <span className="font-bold text-warning">Software & subscriptions up 22%</span> MoM ($4,100). Worth a supplier review.
      </div>
    </GlassSurface>
  );
}
