import { Link } from '@tanstack/react-router';
import { Flame, Play, Target } from 'lucide-react';
import { AreaChart, ConfidenceChip, GlassSurface, MoneyCell, cn } from '../../design-system';
import { seedOperatorThroughput, seedResume } from '../../seed/operatorHome';

// "Resume where I left off" + throughput, combined into one motivating card.
export function ResumeThroughputCard({
  throughput = seedOperatorThroughput,
  resume = seedResume,
}: {
  throughput?: typeof seedOperatorThroughput;
  resume?: {
    reconId: string;
    party: string;
    amount: typeof seedResume.amount;
    tier: string;
    confidence: number;
    note: string;
  };
}) {
  const t = throughput;
  const r = resume;
  const goalPct = Math.min(1, t.clearedToday / t.dailyGoal);

  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-5 p-6">
      {/* Resume */}
      <div>
        <span className="text-[12px] font-semibold text-ink-muted">Resume where you left off</span>
        <Link
          to="/reconciliation"
          className="group mt-2 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-brand/95 to-brand-ink/95 p-4 ring-1 ring-white/25"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20 text-white">
            <Play className="size-5 fill-current" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-bold text-white">{r.party}</p>
              <ConfidenceChip score={r.confidence} />
            </div>
            <p className="truncate text-[12px] font-medium text-white/80">{r.note}</p>
          </div>
          <MoneyCell amount={r.amount} size="lg" className="!text-lg text-white" />
        </Link>
      </div>

      {/* Throughput */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold text-ink-muted">Cleared today</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold leading-none text-ink tabular">{t.clearedToday}</span>
            <span className="text-[13px] font-semibold text-ink-muted">/ {t.dailyGoal} goal</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning">
            <Flame className="size-3.5" /> {t.streakDays}-day streak
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">
            <Target className="size-3.5" /> {Math.round(goalPct * 100)}%
          </span>
        </div>
      </div>

      {/* Daily goal bar */}
      <div className="h-2 overflow-hidden rounded-full bg-ink/8">
        <div className={cn('h-full rounded-full bg-gradient-to-r from-brand to-ai')} style={{ width: `${goalPct * 100}%` }} />
      </div>

      {/* Weekly chart */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-ink-muted">This week</span>
          <span className="text-[12px] font-semibold text-ink">
            <span className="tabular">{t.clearedMonth.toLocaleString()}</span> this month
          </span>
        </div>
        <div className="min-h-[120px] flex-1">
          <AreaChart
            xLabels={[...t.weekLabels]}
            series={[{ name: 'Cleared', color: '#16a37b', data: [...t.weekSeries] }]}
            height={130}
            guideOnHover
          />
        </div>
      </div>
    </GlassSurface>
  );
}
