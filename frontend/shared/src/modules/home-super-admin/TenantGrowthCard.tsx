import { Activity, Gauge, Timer, Zap } from 'lucide-react';
import { AreaChart, GlassSurface, MoneyCell } from '../../design-system';
import type { TenantGrowthData, SystemHealthData } from '../../types/api';

export function TenantGrowthCard({
  tenantGrowth,
  systemHealth,
}: {
  tenantGrowth?: TenantGrowthData;
  systemHealth?: SystemHealthData;
}) {
  const g = tenantGrowth;
  const h = systemHealth;
  
  if (!g || !h) {
    return (
      <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
        <header className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-ink">Tenant growth</h3>
          <span className="text-[12px] font-semibold text-ink-muted">last 6 months</span>
        </header>
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          No data available
        </div>
      </GlassSurface>
    );
  }
  
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink">Tenant growth</h3>
        <span className="text-[12px] font-semibold text-ink-muted">last 6 months</span>
      </header>

      <div className="min-h-[150px] flex-1">
        <AreaChart
          xLabels={[...g.labels]}
          height="100%"
          series={[{ name: 'Tenants', color: '#4361ee', data: [...g.series] }]}
        />
      </div>

      {/* System health strip */}
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        <Health icon={<Gauge className="size-4" />} value={`${h.uptimePct}%`} label="Uptime" />
        <Health icon={<Activity className="size-4" />} value={`${h.errorRatePct}%`} label="Error rate" />
        <Health icon={<Timer className="size-4" />} value={`${h.p95LatencyMs}ms`} label="p95 latency" />
        <Health icon={<Zap className="size-4" />} value={h.requestsPerSec.toLocaleString()} label="req/sec" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl bg-white/55 px-4 py-2.5 ring-1 ring-white/60">
        <span className="text-[12px] font-semibold text-ink-muted">Model spend today</span>
        <MoneyCell amount={h.modelSpendToday} size="sm" className="ml-auto font-bold !text-[13px]" />
      </div>
    </GlassSurface>
  );
}

function Health({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
      <span className="grid size-7 place-items-center rounded-lg bg-white/80 text-ink-soft">{icon}</span>
      <span className="font-display text-lg font-bold text-ink tabular">{value}</span>
      <span className="text-[10.5px] font-medium text-ink-muted">{label}</span>
    </div>
  );
}
