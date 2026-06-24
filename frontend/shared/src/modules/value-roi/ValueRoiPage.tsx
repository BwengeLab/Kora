import { Clock, Copy, Download, HandCoins, ShieldAlert, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { AreaChart, GlassSurface, MoneyCell, cn } from '../../design-system';
import { seedRoi, type RoiItem } from '../../seed/ownerExtra';
import { toast } from '../../state/toastStore';

const ICON: Record<RoiItem['icon'], LucideIcon> = {
  recovered: HandCoins,
  duplicates: Copy,
  unsupported: ShieldAlert,
  hours: Clock,
  leakage: TrendingUp,
  credit: Wallet,
};
const TONE: Record<RoiItem['icon'], string> = {
  recovered: 'bg-success-soft text-success',
  duplicates: 'bg-info-soft text-info',
  unsupported: 'bg-warning-soft text-warning',
  hours: 'bg-ai-soft text-ai',
  leakage: 'bg-brand-soft text-brand-ink',
  credit: 'bg-lavender-soft text-lavender',
};

// Org Owner "Value / ROI" — proves Kora's worth (doc §Value/ROI).
export function ValueRoiPage() {
  const r = seedRoi;
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Value / ROI"
        subtitle={<>The money Kora makes and saves you — recovered, protected, and freed up.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => toast({ tone: 'info', title: 'Exporting', body: 'ROI summary (PDF) is being prepared.' })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink">
              <Download className="size-4" /> Export
            </button>
            <DateRangePill label="Last 6 months" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        {/* Hero */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <GlassSurface tone="strong" className="flex flex-col justify-center gap-2 p-7 @5xl:col-span-4">
            <span className="text-[12px] font-semibold text-ink-muted">Total value delivered</span>
            <MoneyCell amount={r.totalValue} size="xl" className="!text-[40px]" />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-bold text-success">
                {r.roiMultiple.toFixed(1)}× ROI
              </span>
              <span className="text-[11.5px] text-ink-muted">vs <MoneyCell amount={r.subscriptionCost} size="sm" className="!text-[11.5px] font-semibold" /> subscription</span>
            </div>
          </GlassSurface>

          <GlassSurface tone="strong" className="flex flex-col gap-3 p-6 @5xl:col-span-8">
            <h3 className="font-display text-base font-bold text-ink">Value delivered over time</h3>
            <div className="min-h-[180px] flex-1">
              <AreaChart xLabels={[...r.labels]} height="100%" series={[{ name: 'Cumulative value ($K)', color: '#16a37b', data: [...r.series] }]} />
            </div>
          </GlassSurface>
        </section>

        {/* Breakdown */}
        <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {r.items.map((it) => {
            const Icon = ICON[it.icon];
            return (
              <GlassSurface key={it.id} tone="strong" className="flex flex-col gap-2.5 p-5">
                <div className="flex items-center justify-between">
                  <span className={cn('grid size-10 place-items-center rounded-2xl', TONE[it.icon])}><Icon className="size-[18px]" /></span>
                  {it.deltaPct > 0 ? <span className="rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success">+{it.deltaPct}%</span> : null}
                </div>
                {it.icon === 'hours' ? (
                  <span className="font-display text-2xl font-bold text-ink tabular">128 hrs</span>
                ) : (
                  <MoneyCell amount={it.value} size="xl" className="!text-2xl" />
                )}
                <span className="text-[13px] font-bold text-ink">{it.label}</span>
                <span className="text-[11.5px] text-ink-muted">{it.detail}</span>
              </GlassSurface>
            );
          })}
        </section>
      </div>
    </div>
  );
}
