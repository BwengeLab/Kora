import { AreaChart, GlassSurface } from '../../design-system';

export function TrendsCard({ trends }: { trends: { labels: string[]; revenue: number[]; cashflow: number[] } }) {
  const t = trends;
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink">Revenue &amp; cash flow</h3>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brand" /> Revenue</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-success" /> Net cash</span>
        </div>
      </header>
      <div className="min-h-[200px] flex-1">
        <AreaChart
          xLabels={[...t.labels]}
          height="100%"
          series={[
            { name: 'Revenue ($M)', color: '#4361ee', data: [...t.revenue] },
            { name: 'Net cash ($M)', color: '#16a37b', data: [...t.cashflow] },
          ]}
        />
      </div>
      <p className="text-[12px] text-ink-muted">12-month trend · revenue up 18% YoY · positive net cash in 11 of 12 months.</p>
    </GlassSurface>
  );
}
