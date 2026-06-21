import { Link } from '@tanstack/react-router';
import { Clock, Copy, HandCoins, ShieldAlert, type LucideIcon } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { seedFinanceLeadRoi, type RoiMetric } from '../../seed/financeLeadHome';

const ICON: Record<RoiMetric['icon'], LucideIcon> = {
  recovered: HandCoins,
  duplicates: Copy,
  unsupported: ShieldAlert,
  hours: Clock,
};
const TONE: Record<RoiMetric['icon'], string> = {
  recovered: 'bg-success-soft text-success',
  duplicates: 'bg-info-soft text-info',
  unsupported: 'bg-warning-soft text-warning',
  hours: 'bg-ai-soft text-ai',
};

export function RoiValueCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-ink">Value Kora delivered</h3>
        <Link to="/roi" className="text-xs font-semibold text-brand hover:text-brand-ink">View ROI</Link>
      </header>
      <div className="grid flex-1 grid-cols-2 gap-3 @2xl:grid-cols-4">
        {seedFinanceLeadRoi.map((m) => {
          const Icon = ICON[m.icon];
          return (
            <div key={m.id} className="flex flex-col gap-2 rounded-2xl bg-white/55 p-4 ring-1 ring-white/60">
              <span className={cn('grid size-9 place-items-center rounded-xl', TONE[m.icon])}>
                <Icon className="size-[18px]" />
              </span>
              {m.valueOverride ? (
                <span className="font-display text-xl font-bold text-ink tabular">{m.valueOverride}</span>
              ) : (
                <MoneyCell amount={m.value} size="lg" className="!text-xl" />
              )}
              <span className="text-[11.5px] font-medium leading-tight text-ink-muted">{m.label}</span>
            </div>
          );
        })}
      </div>
    </GlassSurface>
  );
}
