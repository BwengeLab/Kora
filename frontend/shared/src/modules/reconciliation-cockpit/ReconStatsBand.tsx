import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Flame,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import {
  GlassSurface,
  MoneyCell,
  ProgressRing,
  Sparkline,
  cn,
} from '../../design-system';
import {
  seedReconciliationStats,
  seedTierStats,
  type ReconciliationTier,
} from '../../seed/reconciliation';

const TIER_ICON: Record<ReconciliationTier, LucideIcon> = {
  auto: CheckCircle2,
  suggested: Sparkles,
  review: AlertTriangle,
  duplicate: Copy,
  suspicious: AlertOctagon,
};

const TIER_TONE: Record<ReconciliationTier, string> = {
  auto: 'bg-success-soft text-success',
  suggested: 'bg-ai-soft text-ai',
  review: 'bg-warning-soft text-warning',
  duplicate: 'bg-info-soft text-info',
  suspicious: 'bg-danger-soft text-danger',
};

export interface ReconStatsBandProps {
  activeTier: ReconciliationTier | 'all';
  onTier: (t: ReconciliationTier | 'all') => void;
}

export function ReconStatsBand({ activeTier, onTier }: ReconStatsBandProps) {
  const s = seedReconciliationStats;
  const pct = s.reconciled / s.total;

  return (
    <section className="grid grid-cols-1 gap-5 @4xl:grid-cols-[300px_1fr_240px]">
      {/* Progress */}
      <GlassSurface tone="strong" className="flex items-center gap-5 p-6">
        <ProgressRing value={pct} size={128} thickness={13} color="gradient">
          <div className="flex flex-col">
            <span className="font-display text-2xl font-bold text-ink tabular">{Math.round(pct * 100)}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">reconciled</span>
          </div>
        </ProgressRing>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-ink-muted">{s.period} progress</span>
          <span className="font-display text-xl font-bold text-ink tabular">
            {s.reconciled.toLocaleString()}
            <span className="text-ink-muted"> / {s.total.toLocaleString()}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning">
            {s.remaining} left to clear
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted">
            <TrendingUp className="size-3.5 text-success" />
            {Math.round(s.autoMatchRate * 100)}% auto-match rate
          </span>
        </div>
      </GlassSurface>

      {/* Tier filters with money value */}
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-5">
        {seedTierStats.map((t) => {
          const Icon = TIER_ICON[t.tier];
          const active = activeTier === t.tier;
          return (
            <button
              key={t.tier}
              type="button"
              onClick={() => onTier(active ? 'all' : t.tier)}
              className={cn(
                'flex h-full flex-col gap-2 rounded-3xl border p-4 text-left transition-all',
                'bg-glass-strong backdrop-blur-glass shadow-glass',
                active ? 'border-brand/40 ring-2 ring-brand/30' : 'border-white/65 hover:-translate-y-0.5',
              )}
            >
              <span className={cn('grid size-9 place-items-center rounded-xl', TIER_TONE[t.tier])}>
                <Icon className="size-[18px]" />
              </span>
              <span className="font-display text-2xl font-bold leading-none text-ink tabular">
                {t.count.toLocaleString()}
              </span>
              <span className="text-[12px] font-semibold leading-tight text-ink">{t.label}</span>
              <MoneyCell amount={t.value} size="sm" className="!text-[12px] font-semibold text-ink-soft" />
              <span className="text-[10px] font-medium leading-tight text-ink-muted">{t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Your work today */}
      <GlassSurface tone="strong" className="flex flex-col justify-between gap-3 p-6">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-ink-muted">Your work today</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning">
            <Flame className="size-3" /> 6-day streak
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-display text-4xl font-bold leading-none text-ink tabular">{s.clearedToday}</span>
            <span className="mt-1 text-[11px] font-medium text-ink-muted">exceptions cleared</span>
          </div>
          <Sparkline data={s.clearedTodaySeries} color="#16a37b" width={96} height={40} />
        </div>
        <div className="rounded-xl bg-white/55 px-3 py-2 text-[11px] font-medium text-ink-soft ring-1 ring-white/60">
          <span className="font-bold text-ink">{s.preparedAwaitingApproval}</span> prepared · awaiting Finance Lead
        </div>
      </GlassSurface>
    </section>
  );
}
