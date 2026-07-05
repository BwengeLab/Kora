import { Check, HandCoins } from 'lucide-react';
import { GlassSurface, MoneyCell } from '../../design-system';

export function AffordabilityCard({
  affordability,
}: {
  affordability: {
    maxFacility: Parameters<typeof MoneyCell>[0]['amount'];
    monthlyCapacity: Parameters<typeof MoneyCell>[0]['amount'];
    termMonths: number;
    assumptions: string[];
  };
}) {
  const a = affordability;
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-xl bg-success-soft text-success"><HandCoins className="size-4" /></span>
        <h3 className="font-display text-base font-bold text-ink">Affordability estimate</h3>
      </header>

      <div className="flex flex-wrap gap-6 rounded-2xl bg-white/55 p-4 ring-1 ring-white/60">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Max facility</span>
          <MoneyCell amount={a.maxFacility} size="xl" className="!text-[26px]" />
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Monthly capacity</span>
          <MoneyCell amount={a.monthlyCapacity} size="lg" className="!text-xl" />
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Indicative term</span>
          <span className="block font-display text-xl font-bold text-ink tabular">{a.termMonths} months</span>
        </div>
      </div>

      <div>
        <span className="text-[11.5px] font-bold uppercase tracking-wider text-ink-muted">Assumptions explained</span>
        <ul className="mt-2 flex flex-col gap-1.5">
          {a.assumptions.map((x) => (
            <li key={x} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
              <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
              {x}
            </li>
          ))}
        </ul>
      </div>
    </GlassSurface>
  );
}
