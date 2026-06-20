import { ArrowDownRight, ArrowUpRight, Receipt, TrendingUp, Wallet, Wallet2 } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import type { KpiSeed } from '../../seed/orgOwnerHome';

// 4 KPI cards across the top. Designed to mirror the reference: large bold
// number on the left, colored icon-tile on the right, delta chip below.
export function KpiStripCard({ kpi }: { kpi: KpiSeed }) {
  const Icon = iconFor(kpi.id);
  const isGood = kpi.trend.direction === kpi.positiveDirection;
  const ArrowIcon = kpi.trend.direction === 'up' ? ArrowUpRight : ArrowDownRight;
  const toneClass = ICON_TONES[kpi.iconTone];

  return (
    <GlassSurface tone="strong" className="flex items-start justify-between gap-4 p-5">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-[13px] font-semibold text-ink-soft">{kpi.label}</span>
        <MoneyCell amount={kpi.money} size="xl" />
        <div className="flex items-center gap-1.5 text-[12px]">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-bold',
              isGood ? 'text-success' : 'text-danger',
            )}
          >
            <ArrowIcon className="size-3.5" />
            <span className="tabular">{kpi.trend.valueText}</span>
          </span>
          <span className="text-ink-muted">{kpi.trend.label}</span>
        </div>
      </div>
      <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl shadow-glass-inner', toneClass)}>
        <Icon className="size-6" />
      </span>
    </GlassSurface>
  );
}

const ICON_TONES = {
  brand: 'bg-gradient-to-br from-brand-soft via-white/70 to-brand-soft/50 text-brand ring-1 ring-white/80',
  lavender: 'bg-gradient-to-br from-lavender-soft via-white/70 to-lavender-soft/50 text-lavender ring-1 ring-white/80',
  success: 'bg-gradient-to-br from-success-soft via-white/70 to-success-soft/50 text-success ring-1 ring-white/80',
  warning: 'bg-gradient-to-br from-warning-soft via-white/70 to-warning-soft/50 text-warning ring-1 ring-white/80',
} as const;

function iconFor(id: KpiSeed['id']): ComponentType<SVGProps<SVGSVGElement>> {
  switch (id) {
    case 'cash':
      return Wallet;
    case 'revenue':
      return TrendingUp;
    case 'receivables':
      return Wallet2;
    case 'payables':
      return Receipt;
  }
}
