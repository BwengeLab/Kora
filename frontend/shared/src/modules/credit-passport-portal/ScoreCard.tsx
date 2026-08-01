import { RefreshCw } from 'lucide-react';
import { GaugeChart, GlassSurface, cn } from '../../design-system';

const RATING_TONE: Record<Rating, string> = {
  Strong: 'text-success',
  Good: 'text-success',
  Fair: 'text-warning',
  Low: 'text-danger',
};

export function ScoreCard({
  passport,
  subScores,
}: {
  passport: { score: number; label: string; band: string; updated: string };
  subScores: SubScore[];
}) {
  const p = passport;
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6 @2xl:flex-row @2xl:items-center">
      {/* Gauge */}
      <div className="flex flex-col items-center gap-2">
        <GaugeChart value={p.score} size={196} color="#16a37b" centerValue={p.score} centerLabel={p.label} />
        <span className="rounded-full bg-success-soft px-3 py-1 text-[12px] font-bold text-success">
          Band {p.band} · Business Health
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted">
          <RefreshCw className="size-3" /> Updated {p.updated}
        </span>
      </div>

      {/* Sub-scores */}
      <div className="flex flex-1 flex-col gap-3">
        {subScores.map((s) => (
          <button key={s.id} type="button" className="group flex flex-col gap-1.5 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 hover:bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-ink">{s.label}</span>
              <span className={cn('text-[12px] font-bold', RATING_TONE[s.rating])}>{s.rating} · {s.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/8">
              <div className={cn('h-full rounded-full', s.value >= 85 ? 'bg-success' : s.value >= 70 ? 'bg-ai' : 'bg-warning')} style={{ width: `${s.value}%` }} />
            </div>
            <span className="text-[11px] text-ink-muted">{s.evidence}</span>
          </button>
        ))}
      </div>
    </GlassSurface>
  );
}
