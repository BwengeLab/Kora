import { ArrowUpRight, Banknote, Download, Info, Percent, TrendingUp, Wallet2 } from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { AreaChart, GlassSurface, KpiCard, MoneyCell, cn } from '../../design-system';
import { toast } from '../../state/toastStore';
import {
  seedClose,
  seedLedgerCashflow,
  seedLedgerKpis,
  seedMarginBySegment,
  seedPayablesAging,
  seedPnl,
  seedReceivablesAging,
  type AgingBucket,
  type LedgerKpi,
} from '../../seed/ownerLedger';

const KPI_ICON: Record<LedgerKpi['id'], React.ReactNode> = {
  cash: <Banknote />,
  netflow: <TrendingUp />,
  margin: <Percent />,
  workingCapital: <Wallet2 />,
};

// Org Owner "Ledger & Cashflow" — the financial position with drill-anywhere.
export function LedgerCashflow() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Ledger & Cashflow"
        subtitle={<>The real financial position — cashflow, P&amp;L, margin and working capital.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => toast({ tone: 'info', title: 'Exporting', body: 'Financial summary (PDF) is being prepared.' })}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink"
            >
              <Download className="size-4" /> Export
            </button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        {/* KPI strip */}
        <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4">
          {seedLedgerKpis.map((k) =>
            k.money ? (
              <KpiCard key={k.id} label={k.label} money={k.money} icon={KPI_ICON[k.id]} delta={k.delta} positiveDirection={k.positiveDirection} />
            ) : (
              <KpiCard key={k.id} label={k.label} valueText={k.valueText!} icon={KPI_ICON[k.id]} delta={k.delta} positiveDirection={k.positiveDirection} />
            ),
          )}
        </section>

        {/* Cashflow + P&L */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7"><CashflowCard /></div>
          <div className="@5xl:col-span-5"><PnlCard /></div>
        </section>

        {/* Margin + aging + close */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-3">
          <MarginCard />
          <AgingCard title="Receivables aging" buckets={seedReceivablesAging} tone="success" />
          <AgingCard title="Payables aging" buckets={seedPayablesAging} tone="warning" />
        </section>

        <section><CloseCard /></section>
      </div>
    </div>
  );
}

function CashflowCard() {
  const c = seedLedgerCashflow;
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-bold text-ink">Cashflow &amp; forecast</h3>
          <Info className="size-3.5 text-ink-muted" />
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brand" /> Inflow</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-lavender" /> Outflow</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed border-ai" /> Forecast</span>
        </div>
      </header>
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Today</span>
          <MoneyCell amount={c.current} size="xl" className="!text-[26px]" />
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Projected EOM</span>
          <div className="flex items-center gap-2">
            <MoneyCell amount={c.projected} size="lg" className="!text-xl text-brand-ink" />
            <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success"><ArrowUpRight className="size-3" /> 23%</span>
          </div>
        </div>
      </div>
      <div className="min-h-[200px] flex-1">
        <AreaChart
          xLabels={[...c.labels]}
          height="100%"
          series={[
            { name: 'Inflow', color: '#4361ee', data: [...c.inflow] },
            { name: 'Outflow', color: '#9a8ce8', data: [...c.outflow] },
            { name: 'Forecast', color: '#8b5cf6', data: [...c.forecast], dashed: true },
          ]}
        />
      </div>
    </GlassSurface>
  );
}

function PnlCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <h3 className="font-display text-base font-bold text-ink">Profit &amp; loss</h3>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
        <span />
        <span className="text-right">This period</span>
        <span className="text-right">Prior</span>
      </div>
      <ul className="flex flex-col">
        {seedPnl.map((l) => (
          <li
            key={l.label}
            className={cn(
              'grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-2.5',
              l.emphasis && 'border-t border-white/55',
              l.emphasis === 'total' && 'mt-1 rounded-xl bg-white/55 px-3 ring-1 ring-white/60',
            )}
          >
            <span className={cn('text-[13px]', l.emphasis ? 'font-bold text-ink' : 'font-medium text-ink-soft')}>{l.label}</span>
            <MoneyCell amount={l.amount} size="sm" className={cn('text-right !text-[13px]', l.emphasis === 'total' && 'font-bold')} />
            <span className="text-right text-[12px] text-ink-muted tabular">
              <MoneyCell amount={l.prior} size="sm" className="!text-[12px] text-ink-muted" />
            </span>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}

function MarginCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <h3 className="font-display text-base font-bold text-ink">Margin by segment</h3>
      <ul className="flex flex-col gap-3">
        {seedMarginBySegment.map((s) => (
          <li key={s.segment}>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-semibold text-ink">{s.segment}</span>
              <span className="flex items-center gap-1.5 font-bold text-ink">
                {s.marginPct}%
                <span className={cn('text-[10.5px] font-bold', s.trendPts >= 0 ? 'text-success' : 'text-danger')}>
                  {s.trendPts >= 0 ? '+' : ''}{s.trendPts}pp
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
              <div className="h-full rounded-full bg-gradient-to-r from-brand to-ai" style={{ width: `${s.marginPct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}

function AgingCard({ title, buckets, tone }: { title: string; buckets: AgingBucket[]; tone: 'success' | 'warning' }) {
  const total = buckets.reduce((acc, b) => acc + b.amount.amountMinor, 0n);
  const barTone = tone === 'success' ? 'bg-success' : 'bg-warning';
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      <MoneyCell amount={{ amountMinor: total, currency: 'USD' }} size="lg" className="!text-xl" />
      <ul className="flex flex-col gap-2.5">
        {buckets.map((b) => {
          const pct = total > 0n ? Number((b.amount.amountMinor * 100n) / total) : 0;
          return (
            <li key={b.bucket}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-ink-soft">{b.bucket}</span>
                <MoneyCell amount={b.amount} size="sm" className="font-semibold !text-[12px]" />
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8">
                <div className={cn('h-full rounded-full', barTone)} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </GlassSurface>
  );
}

function CloseCard() {
  const c = seedClose;
  const pct = Math.round((c.checklistDone / c.checklistTotal) * 100);
  return (
    <GlassSurface tone="strong" className="flex flex-wrap items-center gap-6 p-6">
      <div className="flex flex-col">
        <span className="text-[12px] font-semibold text-ink-muted">Month-end close · {c.period}</span>
        <span className="font-display text-xl font-bold text-ink">{c.status}</span>
        <span className="text-[11.5px] text-ink-muted">{c.dueText}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between text-[12px] font-semibold text-ink">
          <span>Checklist {c.checklistDone}/{c.checklistTotal}</span>
          <span className="text-warning">{c.openExceptions} open exceptions</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-ink/8">
          <div className="h-full rounded-full bg-gradient-to-r from-brand to-ai" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => toast({ tone: 'info', title: 'Close checklist', body: `${c.openExceptions} exceptions remain before you can close ${c.period}.` })}
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"
      >
        Run month-end close
      </button>
    </GlassSurface>
  );
}
