import { Clock, FileSearch, Layers, ShieldAlert, TrendingDown } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { CLAIM_STAGES, seedClaimsStats, type ClaimStage } from '../../seed/claims';
import { useClaimsStore } from '../../state/claimsStore';

export interface ClaimsPipelineBandProps {
  activeStage: ClaimStage | 'all';
  onStage: (s: ClaimStage | 'all') => void;
}

export function ClaimsPipelineBand({ activeStage, onStage }: ClaimsPipelineBandProps) {
  const claims = useClaimsStore((s) => s.claims);
  const s = seedClaimsStats;

  // live snapshot counts from the queue, blended with the larger period totals
  const liveCount = (stage: ClaimStage) => claims.filter((c) => c.stage === stage).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Portfolio KPIs */}
      <section className="grid grid-cols-2 gap-4 @2xl:grid-cols-3 @5xl:grid-cols-5">
        <Kpi icon={<Layers className="size-[18px]" />} tone="bg-brand-soft text-brand-ink" value={String(s.openClaims)} label="Open claims" />
        <KpiMoney icon={<FileSearch className="size-[18px]" />} tone="bg-ai-soft text-ai" money={s.totalReserves} label="Total reserves" />
        <Kpi icon={<Clock className="size-[18px]" />} tone="bg-info-soft text-info" value={`${s.avgCycleDays}d`} label="Avg cycle time" />
        <Kpi icon={<ShieldAlert className="size-[18px]" />} tone="bg-danger-soft text-danger" value={String(s.fraudFlagged)} label="Fraud flagged" />
        <KpiMoney icon={<TrendingDown className="size-[18px]" />} tone="bg-success-soft text-success" money={s.leakagePrevented} label="Leakage prevented" />
      </section>

      {/* Pipeline by stage (clickable filters) */}
      <GlassSurface tone="strong" className="flex flex-wrap items-stretch gap-2 p-3">
        <StageChip label="All" count={claims.length} active={activeStage === 'all'} onClick={() => onStage('all')} />
        {CLAIM_STAGES.map((st, i) => (
          <div key={st.id} className="flex items-center gap-2">
            {i > 0 ? <span className="text-ink-muted">→</span> : null}
            <StageChip
              label={st.label}
              count={st.id === 'closed' ? s.pipeline.closed : liveCount(st.id)}
              active={activeStage === st.id}
              onClick={() => onStage(st.id)}
            />
          </div>
        ))}
      </GlassSurface>
    </div>
  );
}

function StageChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-[88px] flex-col items-center rounded-2xl px-3 py-2 transition-colors',
        active ? 'bg-brand text-white shadow-glass-soft' : 'bg-white/55 text-ink-soft ring-1 ring-white/60 hover:bg-white',
      )}
    >
      <span className="font-display text-xl font-bold leading-none tabular">{count}</span>
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

function Kpi({ icon, tone, value, label }: { icon: React.ReactNode; tone: string; value: string; label: string }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-1.5 p-4">
      <span className={cn('grid size-9 place-items-center rounded-xl', tone)}>{icon}</span>
      <span className="font-display text-2xl font-bold leading-none text-ink tabular">{value}</span>
      <span className="text-[11.5px] font-semibold text-ink-soft">{label}</span>
    </GlassSurface>
  );
}

function KpiMoney({ icon, tone, money, label }: { icon: React.ReactNode; tone: string; money: Parameters<typeof MoneyCell>[0]['amount']; label: string }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-1.5 p-4">
      <span className={cn('grid size-9 place-items-center rounded-xl', tone)}>{icon}</span>
      <MoneyCell amount={money} size="lg" className="!text-xl" />
      <span className="text-[11.5px] font-semibold text-ink-soft">{label}</span>
    </GlassSurface>
  );
}
