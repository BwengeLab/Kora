import { ShieldCheck } from 'lucide-react';
import { GlassSurface, ProgressRing, cn } from '../../design-system';
import { seedControlHealth } from '../../seed/auditorHome';

export function ControlHealthCard({ controlHealth = seedControlHealth }: { controlHealth?: typeof seedControlHealth }) {
  const c = controlHealth;
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-xl bg-success-soft text-success">
          <ShieldCheck className="size-4" />
        </span>
        <h3 className="font-display text-base font-bold text-ink">Control health</h3>
      </div>

      <div className="flex items-center gap-5">
        <ProgressRing value={c.score / 100} size={120} thickness={12} color="#16a37b">
          <div className="flex flex-col">
            <span className="font-display text-2xl font-bold text-ink tabular">{c.score}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">/ 100</span>
          </div>
        </ProgressRing>
        <div className="flex flex-1 flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">
            ▲ {c.trendPts} pts vs last month
          </span>
          {c.subscores.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-[11.5px] font-medium text-ink-soft">{s.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8">
                <div className={cn('h-full rounded-full', s.value >= 90 ? 'bg-success' : 'bg-warning')} style={{ width: `${s.value}%` }} />
              </div>
              <span className="w-8 text-right text-[11px] font-bold tabular text-ink-soft">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassSurface>
  );
}
