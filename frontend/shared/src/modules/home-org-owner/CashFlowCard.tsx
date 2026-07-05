import type { OwnerCashFlow } from '../../api/ownerHome';
import { ChevronDown, Info, Maximize2, MoreHorizontal } from 'lucide-react';
import { AreaChart, GlassSurface, MoneyCell } from '../../design-system';

export function CashFlowCard({ cashFlow }: { cashFlow: OwnerCashFlow }) {
  const { netPosition, inflow, outflow, net, series, xLabels } = cashFlow;
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-5 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-semibold text-ink">Cash Flow Overview</h3>
          <Info className="size-3.5 text-ink-muted" />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white/70 px-3 text-xs font-semibold text-ink-soft ring-1 ring-white/80 hover:bg-white"
          >
            This Month <ChevronDown className="size-3" />
          </button>
          <RoundIcon label="Expand"><Maximize2 className="size-4" /></RoundIcon>
          <RoundIcon label="More"><MoreHorizontal className="size-4" /></RoundIcon>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(200px,240px)_1fr] grid-rows-1 gap-4">
        <div className="flex flex-col gap-4">
          <div>
            <MoneyCell amount={netPosition} size="xl" className="!text-[26px]" />
            <p className="mt-0.5 text-xs font-medium text-ink-muted">Net Cash Position</p>
          </div>
          <LegendRow color="#4361ee" label="Cash Inflow" money={inflow} />
          <LegendRow color="#9a8ce8" label="Cash Outflow" money={outflow} />
          <LegendRow color="#16a37b" label="Net Cash Flow" money={net} />
        </div>
        <div className="min-h-0 min-w-0">
          <AreaChart
            xLabels={[...xLabels]}
            series={series.map((s) => ({ ...s, data: [...s.data] }))}
            height="100%"
          />
        </div>
      </div>
    </GlassSurface>
  );
}

function LegendRow({ color, label, money }: { color: string; label: string; money: Parameters<typeof MoneyCell>[0]['amount'] }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-3 place-items-center rounded-full" style={{ backgroundColor: color }}>
        <span className="size-1.5 rounded-full bg-white" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-medium text-ink-muted">{label}</span>
        <MoneyCell amount={money} size="sm" className="font-semibold !text-[13.5px]" />
      </div>
    </div>
  );
}

function RoundIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-xl text-ink-muted hover:bg-white/60 hover:text-ink"
    >
      {children}
    </button>
  );
}
