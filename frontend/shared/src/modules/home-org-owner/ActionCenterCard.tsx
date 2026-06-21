import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { VARIANTS } from '../action-center/variant';
import { RISK_TONE, TYPE_ICON, TYPE_TONE } from '../action-center/typeMeta';
import { useWorkflowStore } from '../../state/workflowStore';

// LIVE: the owner's top-tier approvals (high-value / high-risk / dual-approval)
// pulled from the shared workflow store — updates as items are prepared/approved.
export function ActionCenterCard() {
  const approvals = useWorkflowStore((s) => s.approvals);
  const topTier = approvals.filter(
    (a) => (a.stage === 'awaiting' || a.stage === 'partial') && VARIANTS.org_owner.includes(a),
  );

  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-5">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">Top approvals</h3>
        <span className="inline-flex items-center justify-center rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white">
          {topTier.length}
        </span>
      </header>
      <ul className="flex flex-col gap-2">
        {topTier.slice(0, 5).map((a) => {
          const Icon = TYPE_ICON[a.type];
          return (
            <li key={a.id}>
              <Link
                to="/approvals"
                className="group flex w-full items-center gap-3 rounded-2xl bg-white/55 p-2.5 text-left ring-1 ring-white/60 hover:bg-white"
              >
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TYPE_TONE[a.type])}>
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{a.title}</p>
                  <p className="truncate text-[11px] text-ink-muted">{a.subtitle}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', RISK_TONE[a.risk])}>{a.risk}</span>
                <ChevronRight className="size-4 text-ink-muted group-hover:text-ink" />
              </Link>
            </li>
          );
        })}
        {topTier.length === 0 ? (
          <li className="grid place-items-center py-8 text-center text-[12px] text-ink-muted">
            No high-stakes approvals waiting. 🎉
          </li>
        ) : null}
      </ul>
      <Link
        to="/approvals"
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/65 py-2.5 text-[13px] font-semibold text-brand ring-1 ring-white/70 hover:bg-white"
      >
        Go to Action Center
        <ChevronRight className="size-3.5" />
      </Link>
    </GlassSurface>
  );
}
