import { ArrowDownLeft, ArrowUpRight, ChevronRight, Search, Sparkles, Calculator } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { ACCOUNTS, CATEGORY_META, type Account, type CashCategory, type Direction } from '../../seed/cashLedger';
import { REVIEW_META, useTransactionsStore, type ReviewState, type Txn } from '../../state/transactionsStore';
import { TxnDrawer } from './TxnDrawer';

type DirFilter = 'all' | Direction;
type ReviewFilter = 'all' | ReviewState;

const sum = (rows: Txn[], dir: Direction): Money => ({ amountMinor: rows.filter((m) => m.direction === dir).reduce((a, m) => a + m.amount.amountMinor, 0n), currency: 'USD' });

// The Finance Operator's transaction register — every money movement as a row of
// work: classify it, attach evidence, prepare it for reconciliation or flag it.
// `readOnly` serves the Auditor / Finance Lead a non-editable view of the same data.
export function TransactionsPage({ readOnly = false }: { readOnly?: boolean }) {
  const txns = useTransactionsStore((s) => s.txns);
  const [query, setQuery] = useState('');
  const [dir, setDir] = useState<DirFilter>('all');
  const [category, setCategory] = useState<CashCategory | 'all'>('all');
  const [account, setAccount] = useState<Account | 'all'>('all');
  const [review, setReview] = useState<ReviewFilter>('all');
  const [selected, setSelected] = useState<Txn | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txns
      .filter((m) => (dir === 'all' ? true : m.direction === dir))
      .filter((m) => (category === 'all' ? true : m.category === category))
      .filter((m) => (account === 'all' ? true : m.account === account))
      .filter((m) => (review === 'all' ? true : m.review === review))
      .filter((m) => (q === '' ? true : [m.description, m.counterparty, m.purpose, m.reference].some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [txns, query, dir, category, account, review]);

  // keep the open drawer in sync with store updates
  const selectedLive = selected ? txns.find((t) => t.id === selected.id) ?? null : null;

  const totalIn = sum(filtered, 'in');
  const totalOut = sum(filtered, 'out');
  const net: Money = { amountMinor: totalIn.amountMinor - totalOut.amountMinor, currency: 'USD' };
  const counts = useMemo(() => ({
    needs: txns.filter((t) => t.review === 'needs-review').length,
    prepared: txns.filter((t) => t.review === 'prepared').length,
    flagged: txns.filter((t) => t.review === 'flagged').length,
  }), [txns]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={readOnly ? 'Transactions' : 'Transactions'}
        subtitle={readOnly ? 'Every recorded money movement — read-only, with full evidence trail.' : 'Record, classify and prepare every money movement. Nothing posts until it is reviewed and evidenced.'}
        right={<DateRangePill label="May 2025" />}
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        {/* Stats band */}
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="Needs review" value={String(counts.needs)} tone="warning" active={review === 'needs-review'} onClick={() => setReview(review === 'needs-review' ? 'all' : 'needs-review')} />
          <Stat label="Prepared" value={String(counts.prepared)} tone="success" active={review === 'prepared'} onClick={() => setReview(review === 'prepared' ? 'all' : 'prepared')} />
          <Stat label="Flagged" value={String(counts.flagged)} tone="danger" active={review === 'flagged'} onClick={() => setReview(review === 'flagged' ? 'all' : 'flagged')} />
          <Stat label="Net this period" money={net} tone={net.amountMinor >= 0n ? 'success' : 'danger'} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]">
          <GlassSurface tone="strong" className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/55 p-4">
              <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
                <Search className="size-4 text-ink-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search party, purpose, reference…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>
              <div className="flex h-10 items-center gap-0.5 rounded-xl bg-white/55 p-0.5 ring-1 ring-white/60">
                {(['all', 'in', 'out'] as DirFilter[]).map((d) => (
                  <button key={d} type="button" onClick={() => setDir(d)} className={cn('h-9 rounded-lg px-3 text-[12px] font-bold transition-colors', dir === d ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-muted hover:text-ink')}>
                    {d === 'all' ? 'All' : d === 'in' ? 'In' : 'Out'}
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

            <div className="grid grid-cols-[1fr_108px_120px_28px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
              <span>Transaction</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
              <span />
            </div>

            <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {filtered.map((t) => <Row key={t.id} t={t} onClick={() => setSelected(t)} />)}
              {filtered.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No transactions match your filters.</li> : null}
            </ul>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/55 bg-white/45 px-4 py-3">
              <span className="text-[12px] font-semibold text-ink-muted"><span className="tabular text-ink">{filtered.length}</span> transactions</span>
              <div className="flex items-center gap-4 text-[12.5px]">
                <span className="inline-flex items-center gap-1.5 font-bold text-success"><ArrowDownLeft className="size-3.5" /><MoneyCell amount={totalIn} size="sm" className="!text-[12.5px] text-success" /></span>
                <span className="inline-flex items-center gap-1.5 font-bold text-danger"><ArrowUpRight className="size-3.5" /><MoneyCell amount={totalOut} size="sm" className="!text-[12.5px] text-danger" /></span>
              </div>
            </footer>
          </GlassSurface>

          {/* Helper rail */}
          <div className="flex flex-col gap-4">
            {!readOnly ? <AgentSuggestions onReview={() => { setReview('needs-review'); }} onFlagged={() => { setReview('flagged'); }} /> : null}
            <VatTool />
            {!readOnly ? (
              <GlassSurface tone="strong" className="flex flex-col gap-2 p-4">
                <h4 className="text-[12px] font-bold text-ink">Preparer throughput</h4>
                <p className="text-[11.5px] text-ink-muted">Reviewed today</p>
                <span className="font-display text-3xl font-bold text-success tabular">{txns.filter((t) => t.review !== 'needs-review').length}<span className="text-base text-ink-muted">/{txns.length}</span></span>
              </GlassSurface>
            ) : null}
          </div>
        </div>
      </div>

      <TxnDrawer txn={selectedLive} onClose={() => setSelected(null)} {...(readOnly ? { readOnly: true } : {})} />
    </div>
  );
}

function Row({ t, onClick }: { t: Txn; onClick: () => void }) {
  const isIn = t.direction === 'in';
  const cat = CATEGORY_META[t.category];
  return (
    <li>
      <button type="button" onClick={onClick} className="grid w-full grid-cols-[1fr_108px_120px_28px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', isIn ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
            {isIn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-ink">{t.counterparty}</p>
              <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', cat.tone)}>{cat.label}</span>
            </div>
            <p className="truncate text-[11px] text-ink-muted">{t.purpose} · {t.account} · {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        <span className={cn('text-right text-[13px] font-bold tabular', isIn ? 'text-success' : 'text-danger')}>
          {isIn ? '+' : '−'}<MoneyCell amount={t.amount} size="sm" className={cn('!text-[13px]', isIn ? 'text-success' : 'text-danger')} />
        </span>
        <span className="flex justify-end">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', REVIEW_META[t.review].tone)}>{REVIEW_META[t.review].label}</span>
        </span>
        <ChevronRight className="size-4 justify-self-end text-ink-muted" />
      </button>
    </li>
  );
}

function Stat({ label, value, money, tone, active, onClick }: { label: string; value?: string; money?: Money; tone: 'warning' | 'success' | 'danger'; active?: boolean; onClick?: () => void }) {
  const toneCls = { warning: 'text-warning', success: 'text-success', danger: 'text-danger' }[tone];
  const Comp = onClick ? 'button' : 'div';
  return (
    <GlassSurface tone="strong" className={cn('p-3.5', active && 'ring-2 ring-brand/40')}>
      <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={cn('flex w-full flex-col gap-0.5 text-left', onClick && 'cursor-pointer')}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
        {money ? <MoneyCell amount={money} size="lg" className={cn('!text-2xl font-bold', toneCls)} showSign /> : <span className={cn('font-display text-2xl font-bold tabular', toneCls)}>{value}</span>}
        {onClick ? <span className="text-[10.5px] font-semibold text-brand">{active ? 'Filtered · clear' : 'Filter'}</span> : null}
      </Comp>
    </GlassSurface>
  );
}

function AgentSuggestions({ onReview, onFlagged }: { onReview: () => void; onFlagged: () => void }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2.5 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15">
      <header className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-ai" /><h4 className="text-[12px] font-bold text-ink">Agent suggestions</h4></header>
      <button type="button" onClick={onFlagged} className="rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white">
        <span className="font-bold text-danger">1 flagged transfer</span> to OFFSHORE LTD has no contract. <span className="font-semibold text-brand">Open →</span>
      </button>
      <button type="button" onClick={onReview} className="rounded-xl bg-white/55 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white">
        <span className="font-bold text-warning">Items need review</span> — Kora pre-classified them; confirm and prepare.
      </button>
    </GlassSurface>
  );
}

// Per-page tool: a quick Rwanda VAT / withholding extractor for the preparer.
function VatTool() {
  const [gross, setGross] = useState('');
  const [rate, setRate] = useState(18);
  const g = parseFloat(gross || '0');
  const net = g / (1 + rate / 100);
  const vat = g - net;
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-4">
      <header className="flex items-center gap-1.5"><Calculator className="size-3.5 text-brand" /><h4 className="text-[12px] font-bold text-ink">VAT extractor</h4></header>
      <input value={gross} onChange={(e) => setGross(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Gross amount" className="h-10 rounded-xl bg-white/70 px-3 text-[13px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30" />
      <div className="flex gap-1">
        {[18, 5, 0].map((r) => (
          <button key={r} type="button" onClick={() => setRate(r)} className={cn('h-8 flex-1 rounded-lg text-[11.5px] font-bold transition-colors', rate === r ? 'bg-brand text-white' : 'bg-white/60 text-ink-soft ring-1 ring-white/60 hover:bg-white')}>{r}%</button>
        ))}
      </div>
      <div className="rounded-xl bg-white/55 p-2.5 text-[12px] ring-1 ring-white/60">
        <div className="flex justify-between py-0.5"><span className="text-ink-muted">Net (excl.)</span><span className="font-bold text-ink tabular">{net.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
        <div className="flex justify-between py-0.5"><span className="text-ink-muted">VAT {rate}%</span><span className="font-bold text-brand tabular">{vat.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
      </div>
    </GlassSurface>
  );
}
