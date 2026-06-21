import { Check, UserCheck, X } from 'lucide-react';
import { useState } from 'react';
import { GlassSurface } from '../../design-system';
import { seedAccessRequests, type AccessRequest } from '../../seed/adminHome';
import { toast } from '../../state/toastStore';

export function AccessRequestsCard() {
  const [requests, setRequests] = useState<AccessRequest[]>(seedAccessRequests);

  const resolve = (r: AccessRequest, granted: boolean) => {
    setRequests((prev) => prev.filter((x) => x.id !== r.id));
    toast({
      tone: granted ? 'success' : 'warning',
      title: granted ? 'Access granted' : 'Request denied',
      body: `${r.name} · ${r.requestedRole}`,
    });
  };

  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-xl bg-warning-soft text-warning">
          <UserCheck className="size-4" />
        </span>
        <h3 className="font-display text-base font-bold text-ink">Pending access requests</h3>
        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning tabular">{requests.length}</span>
      </header>
      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-ink">{r.name}</p>
              <p className="truncate text-[11px] text-ink-muted">{r.requestedRole}</p>
              <p className="truncate text-[10.5px] text-ink-muted">{r.reason} · {r.when}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" aria-label="Deny" title="Deny" onClick={() => resolve(r, false)} className="grid size-8 place-items-center rounded-xl bg-white/70 text-ink-muted ring-1 ring-white/70 hover:bg-danger-soft hover:text-danger">
                <X className="size-4" />
              </button>
              <button type="button" aria-label="Grant" title="Grant" onClick={() => resolve(r, true)} className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft">
                <Check className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {requests.length === 0 ? (
          <li className="grid place-items-center gap-1 py-10 text-center">
            <Check className="size-7 text-success" />
            <p className="text-[13px] font-semibold text-ink">No pending requests</p>
            <p className="text-[12px] text-ink-muted">You're all caught up.</p>
          </li>
        ) : null}
      </ul>
    </GlassSurface>
  );
}
