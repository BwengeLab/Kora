import { Link } from '@tanstack/react-router';
import { ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { useWorkflowStore } from '../../state/workflowStore';
import type { Money } from '../../lib/money';
import { RISK_TONE, TYPE_ICON, TYPE_TONE } from '../action-center/typeMeta';

// The Finance Lead's #1 priority block — LIVE from the workflow store. When the
// operator prepares a match in the cockpit, it appears here automatically.
export function ApprovalsAwaitingCard() {
  const approvals = useWorkflowStore((s) => s.approvals);
  const pending = approvals.filter((a) => a.stage === 'awaiting' || a.stage === 'partial');
  const awaiting = pending.slice(0, 4);
  const totalValue: Money = {
    amountMinor: pending.reduce((acc, a) => acc + a.amount.amountMinor, 0n),
    currency: pending[0]?.amount.currency ?? 'USD',
  };
  const urgentCount = pending.filter((a) => a.urgent).length;

  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-4 p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink text-white">
              <ShieldCheck className="size-4" />
            </span>
            <h3 className="font-display text-[17px] font-bold text-ink">Approvals awaiting you</h3>
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            <span className="font-bold text-ink tabular">{pending.length}</span> items ·{' '}
            <MoneyCell amount={totalValue} size="sm" className="!text-[12.5px] font-bold" /> total
          </p>
        </div>
        {urgentCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger">
            <Clock className="size-3.5" /> {urgentCount} urgent
          </span>
        ) : null}
      </header>

      <ul className="flex min-h-0 flex-1 flex-col gap-2">
        {awaiting.map((a) => {
          const Icon = TYPE_ICON[a.type];
          return (
            <li key={a.id}>
              <Link to="/approvals" className="group flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60 transition-colors hover:bg-white">
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TYPE_TONE[a.type])}>
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-bold text-ink">{a.title}</p>
                    <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', RISK_TONE[a.risk])}>{a.risk}</span>
                  </div>
                  <p className="truncate text-[11px] text-ink-muted">{a.preparedBy.name} · {a.deadlineText}</p>
                </div>
                <MoneyCell amount={a.amount} size="sm" className="shrink-0 font-bold !text-[13px]" />
                <ArrowRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        to="/approvals"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink py-3 text-[13.5px] font-bold text-white shadow-[0_6px_18px_rgba(67,97,238,0.4)] transition-all hover:brightness-110"
      >
        Review all {pending.length} approvals <ArrowRight className="size-4" />
      </Link>
    </GlassSurface>
  );
}
