import { ChevronDown, Info } from 'lucide-react';
import { DonutChart, GlassSurface } from '../../design-system';
import { seedReconciliation } from '../../seed/orgOwnerHome';

export function ReconciliationSnapshotCard() {
  const { total, slices } = seedReconciliation;
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold text-ink">Reconciliation Snapshot</h3>
          <Info className="size-3.5 text-ink-muted" />
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white/70 px-3 text-xs font-semibold text-ink-soft ring-1 ring-white/80 hover:bg-white"
        >
          This Month <ChevronDown className="size-3" />
        </button>
      </header>
      <div className="flex items-center gap-5">
        <DonutChart
          slices={slices.map(({ name, value, color }) => ({ name, value, color }))}
          centerLabel={total.toLocaleString()}
          centerSub="Total"
          size={170}
        />
        <ul className="flex flex-1 flex-col gap-3">
          {slices.map((s) => (
            <li key={s.name} className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-[13px] font-medium text-ink">{s.name}</span>
              <span className="text-[13px] font-semibold tabular text-ink">{s.value.toLocaleString()}</span>
              <span className="w-10 text-right text-[11px] font-medium text-ink-muted">{s.pctText}</span>
            </li>
          ))}
        </ul>
      </div>
    </GlassSurface>
  );
}
