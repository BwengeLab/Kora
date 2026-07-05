import { ArrowDownLeft, ArrowUpRight, ChevronRight, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import {
  ACCOUNTS,
  CATEGORY_META,
  type Account,
  type CashCategory,
  type CashMovement,
  type Direction,
} from '../../seed/cashLedger';
import { entityName } from '../../seed/entities';
import { useEntityStore } from '../../state/entityStore';
import { MovementDrawer, type LedgerMode } from './MovementDrawer';

type DirFilter = 'all' | Direction;

function useRunningBalances(base: CashMovement[], openingBalance: Money) {
  return useMemo(() => {
    const asc = [...base].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const map = new Map<string, bigint>();
    let balance = openingBalance.amountMinor;
    for (const movement of asc) {
      balance += movement.direction === 'in' ? movement.amount.amountMinor : -movement.amount.amountMinor;
      map.set(movement.id, balance);
    }
    return map;
  }, [base, openingBalance]);
}

export function CashMovementsTab({
  mode = 'oversight',
  movements,
  openingBalance,
  onReconcile,
  onHold,
  onPost,
  onFlag,
}: {
  mode?: LedgerMode;
  movements: CashMovement[];
  openingBalance: Money;
  onReconcile?: (movement: CashMovement) => void | Promise<void>;
  onHold?: (movement: CashMovement) => void | Promise<void>;
  onPost?: (movement: CashMovement) => void | Promise<void>;
  onFlag?: (movement: CashMovement) => void | Promise<void>;
}) {
  const scope = useEntityStore((s) => s.scope);
  const [query, setQuery] = useState('');
  const [dir, setDir] = useState<DirFilter>('all');
  const [category, setCategory] = useState<CashCategory | 'all'>('all');
  const [account, setAccount] = useState<Account | 'all'>('all');
  const [onlyUnreconciled, setOnlyUnreconciled] = useState(false);
  const [selected, setSelected] = useState<CashMovement | null>(null);

  const base = useMemo(() => (scope === 'all' ? movements : movements.filter((item) => item.entity === scope)), [movements, scope]);
  const balances = useRunningBalances(base, openingBalance);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return base
      .filter((item) => (dir === 'all' ? true : item.direction === dir))
      .filter((item) => (category === 'all' ? true : item.category === category))
      .filter((item) => (account === 'all' ? true : item.account === account))
      .filter((item) => (onlyUnreconciled ? !item.reconciled : true))
      .filter((item) => normalized === '' ? true : [item.description, item.counterparty, item.purpose, item.reference].some((value) => value.toLowerCase().includes(normalized)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [base, query, dir, category, account, onlyUnreconciled]);

  const totalIn: Money = { amountMinor: filtered.filter((item) => item.direction === 'in').reduce((sum, item) => sum + item.amount.amountMinor, 0n), currency: 'USD' };
  const totalOut: Money = { amountMinor: filtered.filter((item) => item.direction === 'out').reduce((sum, item) => sum + item.amount.amountMinor, 0n), currency: 'USD' };
  const net: Money = { amountMinor: totalIn.amountMinor - totalOut.amountMinor, currency: 'USD' };
  const unreconciledCount = base.filter((item) => !item.reconciled).length;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]">
      <GlassSurface tone="strong" className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/55 p-4">
          <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
            <Search className="size-4 text-ink-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search description, party, purpose, ref..." className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
          </div>
          <div className="flex h-10 items-center gap-0.5 rounded-xl bg-white/55 p-0.5 ring-1 ring-white/60">
            {(['all', 'in', 'out'] as DirFilter[]).map((value) => (
              <button key={value} type="button" onClick={() => setDir(value)} className={cn('h-9 rounded-lg px-3 text-[12px] font-bold capitalize transition-colors', dir === value ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-muted hover:text-ink')}>
                {value === 'all' ? 'All' : value === 'in' ? 'Money in' : 'Money out'}
              </button>
            ))}
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value as CashCategory | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select>
          <select value={account} onChange={(event) => setAccount(event.target.value as Account | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
            <option value="all">All accounts</option>
            {ACCOUNTS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-[1fr_104px_120px_120px_28px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
          <span>Movement</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Status</span>
          <span />
        </div>

        <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {filtered.map((movement) => (
            <Row key={movement.id} movement={movement} balance={{ amountMinor: balances.get(movement.id) ?? 0n, currency: 'USD' }} onClick={() => setSelected(movement)} />
          ))}
          {filtered.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No movements match your filters.</li> : null}
        </ul>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/55 bg-white/45 px-4 py-3">
          <span className="text-[12px] font-semibold text-ink-muted"><span className="tabular text-ink">{filtered.length}</span> movements · <span className="font-bold text-ink">{entityName(scope)}</span>{scope === 'all' ? ' (consolidated)' : ''}</span>
          <div className="flex items-center gap-4 text-[12.5px]">
            <span className="inline-flex items-center gap-1.5 font-bold text-success"><ArrowDownLeft className="size-3.5" /> <MoneyCell amount={totalIn} size="sm" className="!text-[12.5px] text-success" /></span>
            <span className="inline-flex items-center gap-1.5 font-bold text-danger"><ArrowUpRight className="size-3.5" /> <MoneyCell amount={totalOut} size="sm" className="!text-[12.5px] text-danger" /></span>
            <span className="inline-flex items-center gap-1.5 font-bold text-ink">Net <MoneyCell amount={net} size="sm" className="!text-[12.5px]" showSign /></span>
          </div>
        </footer>
      </GlassSurface>

      <div className="flex flex-col gap-4">
        <CategoryBreakdown movements={base} />
        <UnreconciledCard count={unreconciledCount} active={onlyUnreconciled} onToggle={() => setOnlyUnreconciled((value) => !value)} />
        <AgentFlags hasSuspicious={base.some((item) => item.counterparty === 'OFFSHORE LTD')} onFilterSuspicious={() => { setQuery('OFFSHORE'); setOnlyUnreconciled(false); }} />
      </div>

      <MovementDrawer
        movement={selected}
        onClose={() => setSelected(null)}
        mode={mode}
        {...(onReconcile ? { onReconcile } : {})}
        {...(onHold ? { onHold } : {})}
        {...(onPost ? { onPost } : {})}
        {...(onFlag ? { onFlag } : {})}
      />
    </div>
  );
}

function Row({ movement, balance, onClick }: { movement: CashMovement; balance: Money; onClick: () => void }) {
  const isIn = movement.direction === 'in';
  const meta = CATEGORY_META[movement.category];
  return (
    <li>
      <button type="button" onClick={onClick} className="grid w-full grid-cols-[1fr_104px_120px_120px_28px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', isIn ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
            {isIn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-ink">{movement.counterparty}</p>
              <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', meta.tone)}>{meta.label}</span>
            </div>
            <p className="truncate text-[11px] text-ink-muted">{movement.purpose} · {movement.account} · {new Date(movement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        <span className={cn('text-right text-[13px] font-bold tabular', isIn ? 'text-success' : 'text-danger')}>
          {isIn ? '+' : '-'}<MoneyCell amount={movement.amount} size="sm" className={cn('!text-[13px]', isIn ? 'text-success' : 'text-danger')} />
        </span>
        <MoneyCell amount={balance} size="sm" className="text-right font-semibold !text-[12.5px] text-ink-soft" />
        <span className="flex justify-end">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', movement.reconciled ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
            {movement.reconciled ? 'Reconciled' : 'Unreconciled'}
          </span>
        </span>
        <ChevronRight className="size-4 justify-self-end text-ink-muted" />
      </button>
    </li>
  );
}

function CategoryBreakdown({ movements }: { movements: CashMovement[] }) {
  const totals = useMemo(() => {
    const map = new Map<CashCategory, { in: bigint; out: bigint }>();
    for (const movement of movements) {
      const entry = map.get(movement.category) ?? { in: 0n, out: 0n };
      if (movement.direction === 'in') entry.in += movement.amount.amountMinor;
      else entry.out += movement.amount.amountMinor;
      map.set(movement.category, entry);
    }
    const rows = [...map.entries()].map(([category, value]) => ({ category, net: value.in - value.out, gross: value.in + value.out }));
    const max = Math.max(...rows.map((row) => Number(row.gross)), 1);
    return rows.sort((a, b) => Number(b.gross - a.gross)).slice(0, 6).map((row) => ({ ...row, pct: (Number(row.gross) / max) * 100 }));
  }, [movements]);

  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-4">
      <h4 className="text-[12px] font-bold text-ink">Flow by category</h4>
      {totals.length === 0 ? <p className="text-[11.5px] text-ink-muted">No movements in this view.</p> : null}
      {totals.map((row) => (
        <div key={row.category}>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="font-medium text-ink-soft">{CATEGORY_META[row.category].label}</span>
            <span className={cn('font-bold tabular', row.net >= 0n ? 'text-success' : 'text-danger')}>
              <MoneyCell amount={{ amountMinor: row.net, currency: 'USD' }} size="sm" className={cn('!text-[11.5px]', row.net >= 0n ? 'text-success' : 'text-danger')} showSign />
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8">
            <div className={cn('h-full rounded-full', row.net >= 0n ? 'bg-success' : 'bg-danger')} style={{ width: `${row.pct}%` }} />
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

function AgentFlags({ hasSuspicious, onFilterSuspicious }: { hasSuspicious: boolean; onFilterSuspicious: () => void }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2.5 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15">
      <header className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-ai" />
        <h4 className="text-[12px] font-bold text-ink">CFO agent flags</h4>
      </header>
      {hasSuspicious ? (
        <button type="button" onClick={onFilterSuspicious} className="rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white">
          <span className="font-bold text-danger">Suspicious $15,400</span> transfer to OFFSHORE LTD is unreconciled with no contract. <span className="font-semibold text-brand">Review →</span>
        </button>
      ) : (
        <div className="rounded-xl bg-white/55 p-2.5 text-[11.5px] text-ink-muted ring-1 ring-white/60">No suspicious activity flagged in this view.</div>
      )}
      <div className="rounded-xl bg-white/55 p-2.5 text-[11.5px] text-ink ring-1 ring-white/60">
        <span className="font-bold text-warning">Software & subscriptions up 22%</span> MoM ($4,100). Worth a supplier review.
      </div>
    </GlassSurface>
  );
}
