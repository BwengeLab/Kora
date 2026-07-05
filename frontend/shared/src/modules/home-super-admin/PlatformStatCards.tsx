import { ArrowUpRight, Building2, Gauge, Percent, Wallet } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { seedPlatformStats } from '../../seed/platformHome';

export function PlatformStatCards({ stats = seedPlatformStats }: { stats?: typeof seedPlatformStats }) {
  const s = stats;
  return (
    <section className="grid grid-cols-2 gap-5 @5xl:grid-cols-4">
      <Card icon={<Building2 className="size-[18px]" />} tone="bg-brand-soft text-brand-ink" value={String(s.activeTenants)} label="Active tenants" delta={`+${s.tenantsAddedThisMonth} this month`} good />
      <MoneyCardItem stats={s} />
      <Card icon={<Gauge className="size-[18px]" />} tone="bg-success-soft text-success" value={`${s.uptimePct}%`} label="Uptime (30d)" delta="SLA 99.9%" good />
      <Card icon={<Percent className="size-[18px]" />} tone="bg-ai-soft text-ai" value={`${s.grossMarginPct}%`} label="Gross margin" delta="cost vs revenue" good />
    </section>
  );
}

function MoneyCardItem({ stats }: { stats: typeof seedPlatformStats }) {
  const s = stats;
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2 p-5">
      <span className="grid size-10 place-items-center rounded-2xl bg-lavender-soft text-lavender">
        <Wallet className="size-[18px]" />
      </span>
      <MoneyCell amount={s.mrr} size="xl" className="!text-[28px]" />
      <span className="text-[12.5px] font-semibold text-ink">Monthly recurring revenue</span>
      <span className="inline-flex w-fit items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success">
        <ArrowUpRight className="size-3" /> {s.mrrGrowthPct}% MoM
      </span>
    </GlassSurface>
  );
}

function Card({ icon, tone, value, label, delta, good }: { icon: React.ReactNode; tone: string; value: string; label: string; delta: string; good?: boolean }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2 p-5">
      <span className={cn('grid size-10 place-items-center rounded-2xl', tone)}>{icon}</span>
      <span className="font-display text-3xl font-bold leading-none text-ink tabular">{value}</span>
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      <span className={cn('text-[11px] font-medium', good ? 'text-success' : 'text-ink-muted')}>{delta}</span>
    </GlassSurface>
  );
}
