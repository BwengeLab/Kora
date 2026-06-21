import { CalendarClock, Check, FileText, Plus, ShieldCheck } from 'lucide-react';
import { GlassSurface } from '../../design-system';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';
import { seedEvidencePack, seedGrant } from '../../seed/portalHome';

export function EvidenceScopeCard() {
  const g = seedGrant;
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-xl bg-brand-soft text-brand-ink"><FileText className="size-4" /></span>
        <h3 className="font-display text-base font-bold text-ink">Evidence pack</h3>
      </header>

      <ul className="flex flex-col gap-2">
        {seedEvidencePack.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => openDoc({ name: e.docName, kind: 'evidence', context: `${e.factor} · ${e.detail}` })}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"><FileText className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-ink">{e.factor} · {e.docName}</p>
                <p className="truncate text-[11px] text-ink-muted">{e.detail}</p>
              </div>
              <span className="shrink-0 rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70">View</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Scope + expiry */}
      <div className="mt-auto rounded-2xl bg-white/55 p-4 ring-1 ring-white/60">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-warning" />
          <span className="text-[13px] font-bold text-ink">Access expires in {g.expiresInDays} days</span>
        </div>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {g.dataCategories.map((c) => (
            <li key={c} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10.5px] font-semibold text-ink-soft ring-1 ring-white/70">
              <Check className="size-3 text-success" /> {c}
            </li>
          ))}
        </ul>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
          <ShieldCheck className="size-3.5" /> {g.scopeNote}
        </p>
        <button
          type="button"
          onClick={() => toast({ tone: 'info', title: 'Request sent', body: 'Acme Insurance will review your request for additional scope.' })}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-1.5 text-[11.5px] font-bold text-brand ring-1 ring-white/70 hover:bg-white"
        >
          <Plus className="size-3.5" /> Request more access
        </button>
      </div>
    </GlassSurface>
  );
}
