import { AlertTriangle, LifeBuoy, Lock } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedIncidents, seedSupportQueue } from '../../seed/platformHome';
import { toast } from '../../state/toastStore';

export function IncidentsSupportCard({
  incidents = seedIncidents,
  supportQueue = seedSupportQueue,
}: {
  incidents?: typeof seedIncidents;
  supportQueue?: typeof seedSupportQueue;
}) {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      {/* Incidents */}
      <div>
        <header className="mb-2 flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-xl bg-warning-soft text-warning"><AlertTriangle className="size-4" /></span>
          <h3 className="font-display text-base font-bold text-ink">Open incidents</h3>
        </header>
        <ul className="flex flex-col gap-2">
          {incidents.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
              <span className={cn('size-2 shrink-0 rounded-full', i.severity === 'critical' ? 'bg-danger' : i.severity === 'major' ? 'bg-warning' : 'bg-info')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-ink">{i.title}</p>
                <p className="truncate text-[11px] text-ink-muted">{i.severity} · {i.when}</p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', i.status === 'open' ? 'bg-danger-soft text-danger' : i.status === 'monitoring' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success')}>
                {i.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Support access — the trust discipline */}
      <div className="mt-auto">
        <header className="mb-2 flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-xl bg-info-soft text-info"><LifeBuoy className="size-4" /></span>
          <h3 className="font-display text-base font-bold text-ink">Support access</h3>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-ink-muted ring-1 ring-white/70">
            <Lock className="size-3" /> consented & audited
          </span>
        </header>
        <ul className="flex flex-col gap-2">
          {supportQueue.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-ink">{r.tenant}</p>
                <p className="truncate text-[11px] text-ink-muted">{r.reason} · {r.when}</p>
              </div>
              {r.status === 'requested' ? (
                <button
                  type="button"
                  onClick={() => toast({ tone: 'info', title: 'Support access requested', body: `${r.tenant} must consent before access is granted — and every entry is logged.` })}
                  className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase text-white"
                >
                  Request consent
                </button>
              ) : (
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', 'bg-success-soft text-success')}>
                  {r.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </GlassSurface>
  );
}
