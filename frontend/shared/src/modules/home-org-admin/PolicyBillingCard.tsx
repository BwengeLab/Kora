import { Link } from '@tanstack/react-router';
import { CreditCard, SlidersHorizontal } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import type { PolicyVersion } from '../../seed/adminHome';

export function PolicyBillingCard({ policies, billing }: { policies: PolicyVersion[]; billing: { plan: string; seats: number; seatsIncluded: number; usagePct: number; renews: string } }) {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-xl bg-ai-soft text-ai">
            <SlidersHorizontal className="size-4" />
          </span>
          <h3 className="font-display text-base font-bold text-ink">Policies &amp; billing</h3>
        </div>
        <Link to="/settings/rules-and-policies" className="text-xs font-semibold text-brand hover:text-brand-ink">Edit</Link>
      </header>

      <ul className="flex flex-col">
        {policies.map((policy, index) => (
          <li key={policy.id} className={cn('flex items-center gap-3 py-2', index > 0 && 'border-t border-white/55')}>
            <span className="flex-1 truncate text-[12.5px] font-semibold text-ink">{policy.name}</span>
            <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-ink-soft ring-1 ring-white/70">{policy.version}</span>
            <span className="w-28 truncate text-right text-[10.5px] text-ink-muted">{policy.updatedBy} · {policy.when}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto rounded-2xl bg-white/55 p-4 ring-1 ring-white/60">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[13px] font-bold text-ink">
            <CreditCard className="size-4 text-brand" /> {billing.plan} plan
          </span>
          <span className="text-[11.5px] font-medium text-ink-muted">Renews {billing.renews}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/8">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-ai" style={{ width: `${billing.usagePct * 100}%` }} />
          </div>
          <span className="text-[11.5px] font-bold tabular text-ink-soft">{billing.seats}/{billing.seatsIncluded} seats</span>
        </div>
      </div>
    </GlassSurface>
  );
}
