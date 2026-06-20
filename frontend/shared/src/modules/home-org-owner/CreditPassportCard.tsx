import { RefreshCw } from 'lucide-react';
import { GaugeChart, GlassSurface } from '../../design-system';
import { seedCreditPassport } from '../../seed/orgOwnerHome';

export function CreditPassportCard() {
  const { score, label, caption, updated, factors } = seedCreditPassport;
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">Credit Passport</h3>
        <button type="button" className="text-xs font-semibold text-brand hover:text-brand-ink">
          View details
        </button>
      </header>
      <div className="flex items-center gap-5">
        <GaugeChart value={score} size={170} centerValue={score} centerLabel={label} />
        <ul className="flex flex-1 flex-col gap-2.5">
          {factors.map((f) => (
            <li key={f.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-success" />
                <span className="text-[12.5px] font-medium text-ink">{f.name}</span>
              </span>
              <span className="text-[12px] font-semibold text-success">{f.rating}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="-mt-1 text-[11px] text-ink-muted">{caption} · Updated {updated}</p>
    </GlassSurface>
  );
}
