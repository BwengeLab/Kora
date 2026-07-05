import { ArrowUpRight, Banknote, Download, Info, Percent, TrendingUp, Wallet2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { fetchFinanceCashflowView, flagCashMovement, holdCashMovement, postCashMovement, reconcileCashMovement, type FinanceCashflowViewPayload } from '../../api/financeAuditViews';
import { DateRangePill, PageHeader } from '../../app/shell';
import { AreaChart, GlassSurface, KpiCard, MoneyCell, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { seedCashMovements, type CashMovement } from '../../seed/cashLedger';
import { seedLedgerCashflow, seedLedgerKpis, seedMarginBySegment, seedPnl, type LedgerKpi } from '../../seed/ownerLedger';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { CashMovementsTab } from './CashMovementsTab';
import type { LedgerMode } from './MovementDrawer';

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

const LEDGER_SUBTITLE: Record<LedgerMode, string> = {
  operate: 'Every cash movement - record and reconcile each one against the bank, none missed.',
  post: 'Every cash movement - review and post each entry to the ledger. You commit; the operator reconciles.',
  oversight: 'Every cash movement in the business - what came in, what went out, and why.',
  read: 'Every cash movement in the business - read-only, with full purpose and evidence.',
};

export function LedgerCashflow({ mode = 'oversight' }: { mode?: LedgerMode }) {
  const token = useSessionStore((s) => s.session?.token ?? '');
  const apiBaseUrl = getApiBaseUrl();
  const tabs = mode === 'operate' ? TABS.filter((item) => item.id === 'movements' || item.id === 'statement') : TABS;
  const [tab, setTab] = useState<Tab>('movements');
  const [view, setView] = useState<FinanceCashflowViewPayload | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchFinanceCashflowView(apiBaseUrl, token, controller.signal)
      .then(setView)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          toast({ tone: 'warning', title: 'Cashflow unavailable', body: error instanceof Error ? error.message : 'Could not load ledger cashflow.' });
        }
      });
    return () => controller.abort();
  }, [apiBaseUrl, token]);

  const kpis = view?.kpis ?? seedLedgerKpis;
  const forecast = view?.forecast ?? seedLedgerCashflow;
  const pnl = view?.pnl ?? seedPnl;
  const marginBySegment = view?.marginBySegment ?? seedMarginBySegment;
  const movements = view?.movements ?? seedCashMovements;
  const openingBalance = view?.openingBalance ?? { amountMinor: 198000000n, currency: 'USD' };

  const refresh = async (runner: () => Promise<FinanceCashflowViewPayload>, success: { title: string; body: string }) => {
    try {
      const payload = await runner();
      setView(payload);
      toast({ tone: 'success', title: success.title, body: success.body });
    } catch (error) {
      toast({ tone: 'warning', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not update the cash movement.' });
    }
  };

  const handleReconcile = async (movement: CashMovement) => {
    if (!token) {
      toast({ tone: 'success', title: 'Marked reconciled', body: `${movement.reference} matched and reconciled.` });
      return;
    }
    await refresh(() => reconcileCashMovement(apiBaseUrl, token, movement.id), {
      title: 'Marked reconciled',
      body: `${movement.reference} matched and reconciled.`,
    });
  };

  const handleHold = async (movement: CashMovement) => {
    if (!token) {
      toast({ tone: 'warning', title: 'Held for query', body: `${movement.reference} held - sent back to the operator with a query.` });
      return;
    }
    await refresh(() => holdCashMovement(apiBaseUrl, token, movement.id, 'Held for operator follow-up.'), {
      title: 'Held for query',
      body: `${movement.reference} held - sent back to the operator with a query.`,
    });
  };

  const handlePost = async (movement: CashMovement) => {
    if (!token) {
      toast({ tone: 'success', title: 'Posted to ledger', body: `${movement.reference} committed to the general ledger and audited.` });
      return;
    }
    await refresh(() => postCashMovement(apiBaseUrl, token, movement.id), {
      title: 'Posted to ledger',
      body: `${movement.reference} committed to the general ledger and audited.`,
    });
  };

  const handleFlag = async (movement: CashMovement) => {
    if (!token) {
      toast({ tone: 'warning', title: 'Flagged for review', body: `${movement.reference} flagged for finance to check.` });
      return;
    }
    await refresh(() => flagCashMovement(apiBaseUrl, token, movement.id, 'Flagged from cashflow oversight.'), {
      title: 'Flagged for review',
      body: `${movement.reference} flagged for finance to check.`,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Cash Flow"
        subtitle={LEDGER_SUBTITLE[mode]}
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
        <section className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
          {kpis.map((kpi) =>
            kpi.money ? (
              <KpiCard key={kpi.id} label={kpi.label} money={kpi.money} icon={KPI_ICON[kpi.id]} delta={kpi.delta} positiveDirection={kpi.positiveDirection} />
            ) : (
              <KpiCard key={kpi.id} label={kpi.label} valueText={kpi.valueText!} icon={KPI_ICON[kpi.id]} delta={kpi.delta} positiveDirection={kpi.positiveDirection} />
            ),
          )}
        </section>

        <div className="flex gap-1 border-b border-white/55">
          {tabs.map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={cn('relative px-3.5 pb-2.5 text-[13.5px] font-semibold transition-colors', tab === item.id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft')}>
              {item.label}
              {tab === item.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
            </button>
          ))}
        </div>

        {tab === 'movements' ? <CashMovementsTab mode={mode} movements={movements} openingBalance={openingBalance} onReconcile={handleReconcile} onHold={handleHold} onPost={handlePost} onFlag={handleFlag} /> : null}
        {tab === 'statement' ? <StatementTab movements={movements} openingBalance={openingBalance} /> : null}
        {tab === 'pnl' ? <PnlTab lines={pnl} marginBySegment={marginBySegment} /> : null}
        {tab === 'forecast' ? <ForecastTab forecast={forecast} /> : null}
      </div>
    </div>
  );
}

function StatementTab({ movements, openingBalance }: { movements: CashMovement[]; openingBalance: Money }) {
  const rows = useMemo(() => {
    const map = new Map<string, { inflow: bigint; outflow: bigint }>();
    for (const movement of movements) {
      const entry = map.get(movement.category) ?? { inflow: 0n, outflow: 0n };
      if (movement.direction === 'in') entry.inflow += movement.amount.amountMinor;
      else entry.outflow += movement.amount.amountMinor;
      map.set(movement.category, entry);
    }
    return [...map.entries()].map(([category, value]) => ({ category, inflow: value.inflow, outflow: value.outflow, net: value.inflow - value.outflow }));
  }, [movements]);

  const financingCats = ['loan'];
  const operating = rows.filter((row) => !financingCats.includes(row.category));
  const financing = rows.filter((row) => financingCats.includes(row.category));
  const opNet = operating.reduce((sum, row) => sum + row.net, 0n);
  const finNet = financing.reduce((sum, row) => sum + row.net, 0n);
  const netChange = opNet + finNet;
  const closing = openingBalance.amountMinor + netChange;
  const money = (value: bigint): Money => ({ amountMinor: value, currency: 'USD' });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <GlassSurface tone="strong" className="mx-auto max-w-3xl p-7">
        <h3 className="font-display text-lg font-bold text-ink">Cashflow statement · May 2025</h3>
        <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
          <span />
          <span className="text-right">In</span>
          <span className="text-right">Out</span>
          <span className="text-right">Net</span>
        </div>

        <Section title="Operating activities" rows={operating} />
        <SubtotalRow label="Net cash from operations" amount={money(opNet)} />

        <Section title="Financing activities" rows={financing} />
        <SubtotalRow label="Net cash from financing" amount={money(finNet)} />

        <div className="mt-4 space-y-1.5 border-t-2 border-ink/15 pt-3">
          <BalanceRow label="Opening balance" amount={openingBalance} />
          <BalanceRow label="Net change in cash" amount={money(netChange)} signed />
          <BalanceRow label="Closing balance" amount={money(closing)} bold />
        </div>
      </GlassSurface>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: { category: string; inflow: bigint; outflow: bigint; net: bigint }[] }) {
  const categoryLabels: Record<string, string> = {
    premium: 'Premium',
    claim: 'Claim payout',
    commission: 'Commission',
    payroll: 'Payroll',
    supplier: 'Supplier',
    rent: 'Rent',
    software: 'Software',
    tax: 'Tax',
    loan: 'Loan',
    refund: 'Refund',
    fee: 'Fee income',
    reinsurance: 'Reinsurance',
  };

  return (
    <div className="mt-4">
      <p className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">{title}</p>
      <ul>
        {rows.map((row) => (
          <li key={row.category} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 border-b border-white/45 py-2 text-[13px]">
            <span className="font-medium text-ink">{categoryLabels[row.category] ?? row.category}</span>
            <span className="text-right tabular text-success">{row.inflow > 0n ? <MoneyCell amount={{ amountMinor: row.inflow, currency: 'USD' }} size="sm" className="!text-[12.5px] text-success" /> : '—'}</span>
            <span className="text-right tabular text-danger">{row.outflow > 0n ? <MoneyCell amount={{ amountMinor: row.outflow, currency: 'USD' }} size="sm" className="!text-[12.5px] text-danger" /> : '—'}</span>
            <span className={cn('text-right font-semibold tabular', row.net >= 0n ? 'text-ink' : 'text-danger')}><MoneyCell amount={{ amountMinor: row.net, currency: 'USD' }} size="sm" className="!text-[12.5px]" showSign /></span>
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

function PnlTab({ lines, marginBySegment }: { lines: FinanceCashflowViewPayload['pnl']; marginBySegment: FinanceCashflowViewPayload['marginBySegment'] }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 gap-5 @5xl:grid-cols-2">
        <GlassSurface tone="strong" className="flex flex-col gap-3 p-6">
          <h3 className="font-display text-base font-bold text-ink">Profit &amp; loss · May 2025</h3>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
            <span />
            <span className="text-right">This period</span>
            <span className="text-right">Prior</span>
          </div>
          <ul className="flex flex-col">
            {lines.map((line) => (
              <li key={line.label} className={cn('grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-2.5', line.emphasis && 'border-t border-white/55', line.emphasis === 'total' && 'mt-1 rounded-xl bg-white/55 px-3 ring-1 ring-white/60')}>
                <span className={cn('text-[13px]', line.emphasis ? 'font-bold text-ink' : 'font-medium text-ink-soft')}>{line.label}</span>
                <MoneyCell amount={line.amount} size="sm" className={cn('text-right !text-[13px]', line.emphasis === 'total' && 'font-bold')} />
                <MoneyCell amount={line.prior} size="sm" className="text-right !text-[12px] text-ink-muted" />
              </li>
            ))}
          </ul>
        </GlassSurface>
        <GlassSurface tone="strong" className="flex flex-col gap-3 p-6">
          <h3 className="font-display text-base font-bold text-ink">Margin by segment</h3>
          <ul className="flex flex-col gap-3">
            {marginBySegment.map((segment) => (
              <li key={segment.segment}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold text-ink">{segment.segment}</span>
                  <span className="flex items-center gap-1.5 font-bold text-ink">{segment.marginPct}%<span className={cn('text-[10.5px] font-bold', segment.trendPts >= 0 ? 'text-success' : 'text-danger')}>{segment.trendPts >= 0 ? '+' : ''}{segment.trendPts}pp</span></span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8"><div className="h-full rounded-full bg-gradient-to-r from-brand to-ai" style={{ width: `${segment.marginPct}%` }} /></div>
              </li>
            ))}
          </ul>
        </GlassSurface>
      </div>
    </div>
  );
}

function ForecastTab({ forecast }: { forecast: { current: Money; projected: Money; labels: string[]; inflow: Array<number | null>; outflow: Array<number | null>; forecast: Array<number | null> } }) {
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
          <div><span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Today</span><MoneyCell amount={forecast.current} size="xl" className="!text-[26px]" /></div>
          <div><span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Projected EOM</span><div className="flex items-center gap-2"><MoneyCell amount={forecast.projected} size="lg" className="!text-xl text-brand-ink" /><span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success"><ArrowUpRight className="size-3" /> 23%</span></div></div>
        </div>
        <div className="h-[300px]">
          <AreaChart xLabels={[...forecast.labels]} height="100%" series={[{ name: 'Inflow', color: '#4361ee', data: [...forecast.inflow] }, { name: 'Outflow', color: '#9a8ce8', data: [...forecast.outflow] }, { name: 'Forecast', color: '#8b5cf6', data: [...forecast.forecast], dashed: true }]} />
        </div>
      </GlassSurface>
    </div>
  );
}
