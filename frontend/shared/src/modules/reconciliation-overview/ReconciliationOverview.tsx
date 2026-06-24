import { Link } from '@tanstack/react-router';
import { ArrowRight, GitBranch } from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { ConfidenceChip, DonutChart, GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { seedTierStats } from '../../seed/reconciliation';
import { useWorkflowStore } from '../../state/workflowStore';

// Org Owner "Reconciliation" — an OVERSIGHT view (distinct from the operator's
// cockpit). Status snapshot + recent exceptions, with drill-into-the-cockpit.
export function ReconciliationOverview() {
  const recons = useWorkflowStore((s) => s.reconciliations);
  const open = recons.filter((r) => r.stage === 'reviewing' || r.stage === 'detected');

  const matched = seedTierStats.find((t) => t.tier === 'auto')?.count ?? 0;
  const totalAll = seedTierStats.reduce((a, t) => a + t.count, 0);
  const autoRate = Math.round((matched / totalAll) * 100);

  const slices = seedTierStats.map((t) => ({
    name: t.label,
    value: t.count,
    color:
      t.tier === 'auto' ? '#16a37b' : t.tier === 'suggested' ? '#8b5cf6' : t.tier === 'review' ? '#e89914' : t.tier === 'duplicate' ? '#3b86ff' : '#dc4848',
  }));

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Reconciliation"
        subtitle={<>Oversight of how money is matched to reality — status, exceptions and the auto-match rate.</>}
        right={
          <div className="flex items-center gap-2.5">
            <Link to="/reconciliation" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
              Open cockpit <ArrowRight className="size-4" />
            </Link>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          {/* Status donut */}
          <GlassSurface tone="strong" className="flex items-center gap-6 p-6 @5xl:col-span-5">
            <DonutChart slices={slices} centerLabel={totalAll.toLocaleString()} centerSub="Total" size={180} />
            <ul className="flex flex-1 flex-col gap-2.5">
              {seedTierStats.map((t, i) => (
                <li key={t.tier} className="flex items-center gap-2.5">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: slices[i]!.color }} />
                  <span className="flex-1 text-[12.5px] font-medium text-ink">{t.label}</span>
                  <span className="text-[12.5px] font-bold tabular text-ink">{t.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </GlassSurface>

          {/* Auto-match rate + value */}
          <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:col-span-7">
            <GlassSurface tone="strong" className="flex flex-col justify-center gap-2 p-6">
              <span className="text-[12px] font-semibold text-ink-muted">Auto-match rate</span>
              <span className="font-display text-5xl font-bold text-ink tabular">{autoRate}%</span>
              <span className="text-[11.5px] text-ink-muted">Reconciled with no human touch</span>
            </GlassSurface>
            <GlassSurface tone="strong" className="flex flex-col justify-center gap-2 p-6">
              <span className="text-[12px] font-semibold text-ink-muted">Needs attention</span>
              <span className="font-display text-5xl font-bold text-warning tabular">{open.length}</span>
              <span className="text-[11.5px] text-ink-muted">Exceptions awaiting review</span>
            </GlassSurface>
          </div>
        </section>

        {/* Recent exceptions */}
        <GlassSurface tone="strong" className="flex flex-col gap-3 p-6">
          <header className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">Recent exceptions</h3>
            <Link to="/reconciliation" className="text-xs font-semibold text-brand hover:text-brand-ink">View all</Link>
          </header>
          <ul className="flex flex-col gap-1.5">
            {open.slice(0, 6).map((r) => (
              <li key={r.id}>
                <Link to="/reconciliation" className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60 hover:bg-white">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ai-soft text-ai"><GitBranch className="size-4" /></span>
                  <PartyAvatar name={r.transaction.counterparty} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">{r.transaction.counterparty}</p>
                    <p className="truncate text-[11px] text-ink-muted">{r.transaction.source} · {r.transaction.reference ?? 'no ref'}</p>
                  </div>
                  <ConfidenceChip score={r.confidence} />
                  <MoneyCell amount={r.transaction.amount} size="sm" className={cn('shrink-0 font-bold !text-[13px]')} />
                </Link>
              </li>
            ))}
          </ul>
        </GlassSurface>
      </div>
    </div>
  );
}
