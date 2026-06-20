import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { GlassSurface } from '../glass/GlassSurface';
import { cn } from '../../utils/cn';
import { MoneyCell } from './MoneyCell';
import type { Money } from '../../../lib/money';

// KPI cards across the dashboard (Cash Position, Revenue MTD, Receivables, Costs).
// Either pass `money` for a formatted currency value, or `valueText` for any string.

export interface KpiCardProps {
  label: string;
  money?: Money;
  valueText?: string;
  icon?: ReactNode;
  delta?: {
    direction: 'up' | 'down';
    valueText: string; // e.g. "+12.4%" — caller formats
    label?: string; // e.g. "vs last month"
  };
  // Positive direction (caller's intent) — by default `up` reads as good and
  // colors green. Set to 'down' for metrics where a drop is good (e.g. expenses).
  positiveDirection?: 'up' | 'down';
  className?: string;
}

export function KpiCard({
  label,
  money,
  valueText,
  icon,
  delta,
  positiveDirection = 'up',
  className,
}: KpiCardProps) {
  const isGood = delta ? delta.direction === positiveDirection : null;
  const ArrowIcon = delta?.direction === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <GlassSurface className={cn('flex flex-col gap-3 p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        {icon ? (
          <span className="grid size-9 place-items-center rounded-xl bg-white/60 text-ink-soft [&>svg]:size-[18px]">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline gap-2">
        {money ? <MoneyCell amount={money} size="xl" /> : null}
        {valueText ? <span className="font-display text-3xl font-semibold tracking-tight tabular">{valueText}</span> : null}
      </div>
      {delta ? (
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
              isGood ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
            )}
          >
            <ArrowIcon className="size-3" />
            <span className="tabular">{delta.valueText}</span>
          </span>
          {delta.label ? <span className="text-ink-muted">{delta.label}</span> : null}
        </div>
      ) : null}
    </GlassSurface>
  );
}
