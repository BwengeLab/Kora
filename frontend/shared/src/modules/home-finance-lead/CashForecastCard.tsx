import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Info } from 'lucide-react';
import { AreaChart, GlassSurface, MoneyCell } from '../../design-system';
import { seedCashForecast } from '../../seed/financeLeadHome';

export function CashForecastCard() {
  const c = seedCashForecast;
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-bold text-ink">Cash position &amp; forecast</h3>
          <Info className="size-3.5 text-ink-muted" />
        </div>
        <Link to="/ledger" className="text-xs font-semibold text-brand hover:text-brand-ink">Ledger</Link>
      </header>

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Today</span>
          <MoneyCell amount={c.current} size="xl" className="!text-[26px]" />
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Projected May 31</span>
          <div className="flex items-center gap-2">
            <MoneyCell amount={c.projected} size="lg" className="!text-xl text-brand-ink" />
            <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success">
              <ArrowUpRight className="size-3" /> 23%
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] font-semibold text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brand" /> Actual</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed border-ai" /> Forecast</span>
        </div>
      </div>

      <div className="min-h-[180px] flex-1">
        <AreaChart
          xLabels={[...c.labels]}
          height="100%"
          series={[
            { name: 'Actual', color: '#4361ee', data: [...c.actual] },
            { name: 'Forecast', color: '#8b5cf6', data: [...c.forecast], dashed: true },
          ]}
        />
      </div>
    </GlassSurface>
  );
}
