import { ArrowUpRight, Banknote, Download, Info, Percent, TrendingUp, Wallet2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { AreaChart, GlassSurface, KpiCard, MoneyCell, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { CATEGORY_META, OPENING_BALANCE, seedCashMovements, type CashCategory } from '../../seed/cashLedger';
import { seedLedgerCashflow, seedLedgerKpis, seedMarginBySegment, seedPnl, type LedgerKpi } from '../../seed/ownerLedger';
import { toast } from '../../state/toastStore';
import { CashMovementsTab } from './CashMovementsTab';

const KPI_ICON: Record<LedgerKpi['id'], React.ReactNode> = {
  cash: <Banknote />,
  netflow: <TrendingUp />,
  margin: <Percent />,
  workingCapital: <Wallet2 />,
};

type Tab = 'movements' | 'statement' | 'pnl' | 'forecast';

const TABS: { id: Tab; label: string }[] = [
  { id: 'movements', label: 'Cash movements' },
  { id: 'statement', label: 'Cashflow statement' },
  { id: 'pnl', label: 'Profit & loss' },
  { id: 'forecast', label: 'Forecast' },
];

// Org Owner "Cash Flow / Ledger" — a working ledger, not a dashboard. The body
// is every cash movement (with its purpose), filterable and drillable.
export function LedgerCashflow() {
  const [tab, setTab] = useState<Tab>('movements');
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Cash Flow"
        subtitle={<>Every cash movement in the business — what came in, what went out, and why.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => toast({ tone: 'info', title: 'Exporting', body: 'Cash ledger (Excel) is being prepared.' })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink">
              <Download className="size-4" /> Export
            </button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 px-8 pb-6">
        {/* Orient band */}
        <section className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
          {seedLedgerKpis.map((k) =>
            k.money ? (
              <KpiCard key={k.id} label={k.label} money={k.money} icon={KPI_ICON[k.id]} delta={k.delta} positiveDirection={k.positiveDirection} />
            ) : (
              <KpiCard key={k.id} label={k.label} valueText={k.valueText!} icon={KPI_ICON[k.id]} delta={k.delta} positiveDirection={k.positiveDirection} />
            ),
          )}
        </section>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/55">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn('relative px-3.5 pb-2.5 text-[13.5px] font-semibold transition-colors', tab === t.id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft')}>
              {t.label}
              {tab === t.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'movements' ? <CashMovementsTab /> : null}
        {tab === 'statement' ? <StatementTab /> : null}
        {tab === 'pnl' ? <PnlTab /> : null}
        {tab === 'forecast' ? <ForecastTab /> : null}
      </div>
    </div>
  );
}

// ── Cashflow statement (computed from the movements) ────────────────────────
function StatementTab() {
  const rows = useMemo(() => {
    const map = new Map<CashCategory, { in: bigint; out: bigint }>();
    for (const m of seedCashMovements) {
      const e = map.get(m.category) ?? { in: 0n, out: 0n };
      if (m.direction === 'in') e.in += m.amount.amountMinor;
      else e.out += m.amount.amountMinor;
      map.set(m.category, e);
    }
    return [...map.entries()].map(([cat, v]) => ({ cat, inflow: v.in, outflow: v.out, net: v.in - v.out }));
  }, []);

  const financingCats: CashCategory[] = ['loan'];
  const operating = rows.filter((r) => !financingCats.includes(r.cat));
  const financing = rows.filter((r) => financingCats.includes(r.cat));
  const opNet = operating.reduce((a, r) => a + r.net, 0n);
  const finNet = financing.reduce((a, r) => a + r.net, 0n);
  const netChange = opNet + finNet;
  const closing = OPENING_BALANCE.amountMinor + netChange;
  const m = (v: bigint): Money => ({ amountMinor: v, currency: 'USD' });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <GlassSurface tone="strong" className="mx-auto max-w-3xl p-7">
        <h3 className="font-display text-lg font-bold text-ink">Cashflow statement · May 2025</h3>
        <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
          <span /><span className="text-right">In</span><span className="text-right">Out</span><span className="text-right">Net</span>
        </div>

        <Section title="Operating activities" rows={operating} />
        <SubtotalRow label="Net cash from operations" amount={m(opNet)} />

        <Section title="Financing activities" rows={financing} />
        <SubtotalRow label="Net cash from financing" amount={m(finNet)} />

        <div className="mt-4 space-y-1.5 border-t-2 border-ink/15 pt-3">
          <BalanceRow label="Opening balance" amount={OPENING_BALANCE} />
          <BalanceRow label="Net change in cash" amount={m(netChange)} signed />
          <BalanceRow label="Closing balance" amount={m(closing)} bold />
        </div>
      </GlassSurface>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: { cat: CashCategory; inflow: bigint; outflow: bigint; net: bigint }[] }) {
  return (
    <div className="mt-4">
      <p className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">{title}</p>
      <ul>
        {rows.map((r) => (
          <li key={r.cat} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 border-b border-white/45 py-2 text-[13px]">
            <span className="font-medium text-ink">{CATEGORY_META[r.cat].label}</span>
            <span className="text-right tabular text-success">{r.inflow > 0n ? <MoneyCell amount={{ amountMinor: r.inflow, currency: 'USD' }} size="sm" className="!text-[12.5px] text-success" /> : '—'}</span>
            <span className="text-right tabular text-danger">{r.outflow > 0n ? <MoneyCell amount={{ amountMinor: r.outflow, currency: 'USD' }} size="sm" className="!text-[12.5px] text-danger" /> : '—'}</span>
            <span className={cn('text-right font-semibold tabular', r.net >= 0n ? 'text-ink' : 'text-danger')}><MoneyCell amount={{ amountMinor: r.net, currency: 'USD' }} size="sm" className="!text-[12.5px]" showSign /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubtotalRow({ label, amount }: { label: string; amount: Money }) {
  return (
    <div className="mt-1 flex items-center justify-between rounded-xl bg-white/55 px-3 py-2">
      <span className="text-[13px] font-bold text-ink">{label}</span>
      <MoneyCell amount={amount} size="sm" className="font-bold !text-[13px]" showSign />
    </div>
  );
}

function BalanceRow({ label, amount, signed, bold }: { label: string; amount: Money; signed?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-[13.5px]', bold ? 'font-bold text-ink' : 'font-medium text-ink-soft')}>{label}</span>
      <MoneyCell amount={amount} size="sm" className={cn('!text-[13.5px]', bold && 'font-bold')} showSign={signed ?? false} />
    </div>
  );
}

// ── P&L tab ─────────────────────────────────────────────────────────────────
function PnlTab() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 gap-5 @5xl:grid-cols-2">
        <GlassSurface tone="strong" className="flex flex-col gap-3 p-6">
          <h3 className="font-display text-base font-bold text-ink">Profit &amp; loss · May 2025</h3>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
            <span /><span className="text-right">This period</span><span className="text-right">Prior</span>
          </div>
          <ul className="flex flex-col">
            {seedPnl.map((l) => (
              <li key={l.label} className={cn('grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-2.5', l.emphasis && 'border-t border-white/55', l.emphasis === 'total' && 'mt-1 rounded-xl bg-white/55 px-3 ring-1 ring-white/60')}>
                <span className={cn('text-[13px]', l.emphasis ? 'font-bold text-ink' : 'font-medium text-ink-soft')}>{l.label}</span>
                <MoneyCell amount={l.amount} size="sm" className={cn('text-right !text-[13px]', l.emphasis === 'total' && 'font-bold')} />
                <MoneyCell amount={l.prior} size="sm" className="text-right !text-[12px] text-ink-muted" />
              </li>
            ))}
          </ul>
        </GlassSurface>
        <GlassSurface tone="strong" className="flex flex-col gap-3 p-6">
          <h3 className="font-display text-base font-bold text-ink">Margin by segment</h3>
          <ul className="flex flex-col gap-3">
            {seedMarginBySegment.map((s) => (
              <li key={s.segment}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold text-ink">{s.segment}</span>
                  <span className="flex items-center gap-1.5 font-bold text-ink">{s.marginPct}%<span className={cn('text-[10.5px] font-bold', s.trendPts >= 0 ? 'text-success' : 'text-danger')}>{s.trendPts >= 0 ? '+' : ''}{s.trendPts}pp</span></span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8"><div className="h-full rounded-full bg-gradient-to-r from-brand to-ai" style={{ width: `${s.marginPct}%` }} /></div>
              </li>
            ))}
          </ul>
        </GlassSurface>
      </div>
    </div>
  );
}

// ── Forecast tab ────────────────────────────────────────────────────────────
function ForecastTab() {
  const c = seedLedgerCashflow;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <GlassSurface tone="strong" className="flex flex-col gap-4 p-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2"><h3 className="font-display text-base font-bold text-ink">Cashflow forecast</h3><Info className="size-3.5 text-ink-muted" /></div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brand" /> Inflow</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-lavender" /> Outflow</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed border-ai" /> Forecast</span>
          </div>
        </header>
        <div className="flex flex-wrap items-end gap-6">
          <div><span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Today</span><MoneyCell amount={c.current} size="xl" className="!text-[26px]" /></div>
          <div><span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Projected EOM</span><div className="flex items-center gap-2"><MoneyCell amount={c.projected} size="lg" className="!text-xl text-brand-ink" /><span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success"><ArrowUpRight className="size-3" /> 23%</span></div></div>
        </div>
        <div className="h-[300px]">
          <AreaChart xLabels={[...c.labels]} height="100%" series={[{ name: 'Inflow', color: '#4361ee', data: [...c.inflow] }, { name: 'Outflow', color: '#9a8ce8', data: [...c.outflow] }, { name: 'Forecast', color: '#8b5cf6', data: [...c.forecast], dashed: true }]} />
        </div>
      </GlassSurface>
    </div>
  );
}
