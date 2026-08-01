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

export function AIInsightsCard({ insights }: { insights: InsightSeed[] }) {
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
        {insights.map((insight) => (
          <InsightRow key={insight.id} insight={insight} />
        ))}
      </ul>
    </GlassSurface>
  );
}

function InsightRow({ insight }: { insight: InsightSeed }) {
  const Icon = ICON_MAP[insight.iconKey];
  const ArrowIcon = insight.delta.direction === 'up' ? ArrowUpRight : ArrowDownRight;
  const isUp = insight.delta.direction === 'up';
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/60 p-3 ring-1 ring-white/70">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONE_MAP[insight.iconKey])}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{insight.title}</p>
        <p className="truncate text-[11px] text-ink-muted">{insight.subtitle}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-base font-bold text-ink tabular">{insight.primaryValue}</span>
          <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-bold', isUp ? 'text-success' : 'text-warning')}>
            <ArrowIcon className="size-3" />
            <span className="tabular">{insight.delta.valueText}</span>
            <span className="font-medium text-ink-muted">{insight.delta.label}</span>
          </span>
        </div>
      </div>
      <Sparkline data={insight.spark} color={insight.sparkColor} width={64} height={28} />
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
