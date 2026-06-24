import { Clock, FileText, Lock, Plus, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';

const GRANTED = [
  { scope: 'Credit Passport', desc: 'Score, limits, repayment behaviour', expires: 'Oct 2, 2025', active: true },
  { scope: 'Financial statements', desc: 'P&L, balance sheet, cash flow', expires: 'Oct 2, 2025', active: true },
  { scope: 'Bank statements', desc: 'Verified bank-feed history', expires: 'Oct 2, 2025', active: true },
];
const REQUESTABLE = [
  { scope: 'Transaction detail', desc: 'Line-level movements for deeper diligence' },
  { scope: 'Contracts register', desc: 'Obligations and committed spend' },
];

// The external collaborator's (lender's) view of their consent-scoped access to a
// business's data — what they can see, until when, and how to request more. Every
// grant is given by the business and is revocable.
export function PortalAccessPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Access & Requests" subtitle={<>Your access to <span className="font-semibold text-ink">Acme Insurance Ltd.</span> — consent-scoped, time-boxed and revocable by them at any time.</>} />
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-8 pb-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <GlassSurface tone="strong" className="flex items-center gap-4 bg-gradient-to-br from-success-soft/50 to-white/40 p-5 ring-1 ring-success/15">
            <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success"><ShieldCheck className="size-6" /></span>
            <div className="flex-1"><p className="text-[14px] font-bold text-ink">Access granted · expires Oct 2, 2025</p><p className="text-[12.5px] text-ink-muted">Granted by Aline Mukamana for working-capital underwriting.</p></div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-bold text-success"><Clock className="size-3.5" /> 137 days left</span>
          </GlassSurface>

          <GlassSurface tone="strong" className="p-5">
            <h3 className="mb-3 font-display text-[15px] font-bold text-ink">What you can access</h3>
            <ul className="flex flex-col gap-2">
              {GRANTED.map((g) => (
                <li key={g.scope} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand-ink"><FileText className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-ink">{g.scope}</p><p className="text-[11.5px] text-ink-muted">{g.desc}</p></div>
                  <span className="text-[11.5px] text-ink-muted">until {g.expires}</span>
                  <button type="button" onClick={() => openDoc({ name: `${g.scope}.pdf`, kind: 'statement', sizeText: '—', context: 'Acme Insurance Ltd.' })} className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-white/70 hover:bg-white">Open</button>
                </li>
              ))}
            </ul>
          </GlassSurface>

          <GlassSurface tone="strong" className="p-5">
            <h3 className="mb-1 font-display text-[15px] font-bold text-ink">Request more access</h3>
            <p className="mb-3 text-[12.5px] text-ink-muted">The business reviews every request before granting. You&apos;ll be notified of their decision.</p>
            <ul className="flex flex-col gap-2">
              {REQUESTABLE.map((r) => (
                <li key={r.scope} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
                  <span className="grid size-9 place-items-center rounded-xl bg-white/80 text-ink-muted ring-1 ring-white/60"><Lock className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-ink">{r.scope}</p><p className="text-[11.5px] text-ink-muted">{r.desc}</p></div>
                  <button type="button" onClick={() => toast({ tone: 'info', title: 'Request sent', body: `Acme Insurance will review your request for ${r.scope}.` })} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3 py-1.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-3.5" /> Request</button>
                </li>
              ))}
            </ul>
          </GlassSurface>

          <GlassSurface tone="strong" className="p-5">
            <h3 className="mb-3 font-display text-[15px] font-bold text-ink">Your access activity</h3>
            <ul className="flex flex-col">
              {[['Viewed Credit Passport', 'May 16, 2025 · 14:20'], ['Downloaded financial statements', 'May 12, 2025 · 09:05'], ['Access granted', 'Apr 2, 2025 · 11:00']].map(([a, t]) => (
                <li key={a} className="flex items-center gap-3 border-b border-white/40 py-2.5 last:border-0">
                  <span className={cn('size-2 rounded-full bg-brand')} />
                  <span className="flex-1 text-[12.5px] font-semibold text-ink">{a}</span>
                  <span className="text-[11.5px] text-ink-muted">{t}</span>
                </li>
              ))}
            </ul>
          </GlassSurface>
        </div>
      </div>
    </div>
  );
}
