import {
  AlertOctagon,
  ArrowDownRight,
  ArrowUpRight,
  LineChart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { GlassSurface, Sparkline, cn } from '../../design-system';
import { seedInsights, type InsightSeed } from '../../seed/orgOwnerHome';

const ICON_MAP: Record<InsightSeed['iconKey'], LucideIcon> = {
  forecast: LineChart,
  overdue: AlertOctagon,
  rising: TrendingUp,
  margin: TrendingDown,
};

const TONE_MAP: Record<InsightSeed['iconKey'], string> = {
  forecast: 'bg-success-soft text-success',
  overdue: 'bg-warning-soft text-warning',
  rising: 'bg-ai-soft text-ai',
  margin: 'bg-info-soft text-info',
};

export function AIInsightsCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white">
            <Sparkles className="size-3.5" />
          </span>
          <h3 className="font-display text-base font-semibold text-ink">AI Insights</h3>
        </div>
        <ViewAll />
      </header>
      <ul className="flex flex-col gap-2.5">
        {seedInsights.map((i) => (
          <InsightRow key={i.id} insight={i} />
        ))}
      </ul>
    </GlassSurface>
  );
}

function InsightRow({ insight: i }: { insight: InsightSeed }) {
  const Icon = ICON_MAP[i.iconKey];
  const ArrowIcon = i.delta.direction === 'up' ? ArrowUpRight : ArrowDownRight;
  const isUp = i.delta.direction === 'up';
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/60 p-3 ring-1 ring-white/70">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONE_MAP[i.iconKey])}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{i.title}</p>
        <p className="truncate text-[11px] text-ink-muted">{i.subtitle}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-base font-bold text-ink tabular">{i.primaryValue}</span>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-bold',
              isUp ? 'text-success' : 'text-warning',
            )}
          >
            <ArrowIcon className="size-3" />
            <span className="tabular">{i.delta.valueText}</span>
            <span className="font-medium text-ink-muted">{i.delta.label}</span>
          </span>
        </div>
      </div>
      <Sparkline data={i.spark} color={i.sparkColor} width={64} height={28} />
    </li>
  );
}

function ViewAll() {
  return (
    <button type="button" className="text-xs font-semibold text-brand hover:text-brand-ink">
      View all
    </button>
  );
}
