import { CheckCircle2, FileText, Inbox, Link2, Loader2, Mail, Plus, Scan, Smartphone, Sparkles, Upload } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';
import { SOURCE_META, type IntakeDoc, type IntakeSource, type IntakeStage } from '../../seed/intake';
import { useIntakeStore } from '../../state/intakeStore';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';

const STAGE_META: Record<IntakeStage, { label: string; tone: string }> = {
  extracting: { label: 'Extracting', tone: 'bg-ai-soft text-ai' },
  'needs-review': { label: 'Needs review', tone: 'bg-warning-soft text-warning' },
  matched: { label: 'Matched', tone: 'bg-info-soft text-info' },
  posted: { label: 'Recorded', tone: 'bg-success-soft text-success' },
};

const SOURCE_ICON: Record<IntakeSource, typeof Mail> = { 'bank-feed': Link2, email: Mail, scan: Smartphone, upload: Upload };

// Data Intake — where every document enters Kora. Kora OCR-extracts the fields;
// the operator confirms, matches to a transaction, or posts a new entry. The
// front door of the evidence-first ledger.
export function DataIntakePage() {
  const docs = useIntakeStore((s) => s.docs);
  const upload = useIntakeStore((s) => s.upload);
  const [selectedId, setSelectedId] = useState<string | null>(docs.find((d) => d.stage === 'needs-review')?.id ?? docs[0]?.id ?? null);

  const selected = docs.find((d) => d.id === selectedId) ?? null;
  const pending = docs.filter((d) => d.stage === 'needs-review' || d.stage === 'extracting').length;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Data Intake"
        subtitle={<><span className="font-semibold text-ink">{pending}</span> documents waiting to be reviewed and posted. Bank feeds, email-in, scans and uploads land here.</>}
        right={
          <button type="button" onClick={() => { upload('Dropped file.pdf'); toast({ tone: 'info', title: 'Uploaded', body: 'Kora is extracting the fields…' }); }} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
            <Plus className="size-4" /> Upload document
          </button>
        }
      />
      <div className="flex min-h-0 flex-1 gap-5 px-8 pb-6">
        {/* Queue */}
        <GlassSurface tone="strong" className="flex w-[360px] shrink-0 flex-col">
          <div className="flex items-center gap-2 border-b border-white/55 px-4 py-3">
            <Inbox className="size-4 text-ink-soft" />
            <h3 className="text-[13px] font-bold text-ink">Intake queue</h3>
            <span className="ml-auto rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning">{pending} pending</span>
          </div>
          <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {docs.map((d) => {
              const Icon = SOURCE_ICON[d.source];
              return (
                <li key={d.id}>
                  <button type="button" onClick={() => setSelectedId(d.id)} className={cn('flex w-full items-start gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors', selected?.id === d.id ? 'bg-white' : 'hover:bg-white/55')}>
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white/70 text-ink-soft ring-1 ring-white/60"><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">{d.name}</p>
                      <p className="truncate text-[11px] text-ink-muted">{SOURCE_META[d.source].label} · {new Date(d.receivedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STAGE_META[d.stage].tone)}>{STAGE_META[d.stage].label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-3 gap-2 border-t border-white/55 p-3">
            {([['bank-feed', Link2], ['email', Mail], ['scan', Scan]] as const).map(([s, Icon]) => (
              <button key={s} type="button" onClick={() => toast({ tone: 'info', title: `${SOURCE_META[s].label} connected`, body: 'New documents will arrive automatically.' })} className="flex flex-col items-center gap-1 rounded-xl bg-white/55 py-2.5 text-[10.5px] font-bold text-ink-soft ring-1 ring-white/60 hover:bg-white hover:text-ink">
                <Icon className="size-4" /> {SOURCE_META[s].label}
              </button>
            ))}
          </div>
        </GlassSurface>

        {/* Detail */}
        <GlassSurface tone="strong" className="flex min-w-0 flex-1 flex-col">
          {selected ? <IntakeDetail doc={selected} /> : <div className="grid flex-1 place-items-center text-ink-muted">Select a document</div>}
        </GlassSurface>
      </div>
    </div>
  );
}

function IntakeDetail({ doc }: { doc: IntakeDoc }) {
  const match = useIntakeStore((s) => s.match);
  const post = useIntakeStore((s) => s.post);
  const extracting = doc.stage === 'extracting';
  const done = doc.stage === 'posted';

  return (
    <>
      <header className="flex items-center gap-3 border-b border-white/55 px-6 py-4">
        <span className="grid size-11 place-items-center rounded-2xl bg-danger-soft text-danger"><FileText className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold text-ink">{doc.name}</h2>
          <p className="text-[12px] text-ink-muted">{SOURCE_META[doc.source].label} · {doc.kind} · {doc.sizeText}</p>
        </div>
        <button type="button" onClick={() => openDoc({ name: doc.name, kind: doc.kind, sizeText: doc.sizeText, context: SOURCE_META[doc.source].label })} className="rounded-xl bg-white/70 px-3 py-2 text-[12px] font-bold text-brand ring-1 ring-white/70 hover:bg-white">View original</button>
      </header>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
        {extracting ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Loader2 className="size-8 animate-spin text-ai" />
            <p className="text-[14px] font-semibold text-ink">Kora is extracting fields…</p>
            <p className="text-[12px] text-ink-muted">OCR + field detection usually takes a few seconds.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-2.5 py-1 text-[11px] font-bold text-ai"><Sparkles className="size-3.5" /> Extracted by Kora</div>
            <dl className="grid grid-cols-2 gap-3">
              {doc.fields.map((fd) => (
                <div key={fd.label} className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
                  <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{fd.label}</dt>
                  <dd className="mt-0.5 text-[13.5px] font-semibold text-ink">{fd.value}</dd>
                  <ConfidenceBar value={fd.confidence} />
                </div>
              ))}
            </dl>

            {doc.suggestedMatch ? (
              <div className="mt-5 rounded-2xl bg-brand-soft/50 p-4 ring-1 ring-brand/15">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-ink">Suggested match</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <div>
                    <p className="text-[13.5px] font-bold text-ink">{doc.suggestedMatch.party}</p>
                    <p className="font-mono text-[11.5px] text-ink-muted">{doc.suggestedMatch.ref}</p>
                  </div>
                  <span className="font-display text-lg font-bold text-ink tabular">{doc.suggestedMatch.amount}</span>
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-warning-soft/50 p-3 text-[12.5px] font-medium text-warning ring-1 ring-warning/20">No confident match found — review the fields and post as a new transaction, or escalate.</p>
            )}
          </>
        )}
      </div>

      {!extracting ? (
        <footer className="flex items-center gap-2 border-t border-white/55 p-4">
          {done ? (
            <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success-soft text-[13px] font-bold text-success"><CheckCircle2 className="size-4" /> Recorded to the books</span>
          ) : (
            <>
              {doc.suggestedMatch ? (
                <button type="button" onClick={() => { match(doc.id); toast({ tone: 'success', title: 'Matched', body: `${doc.name} linked to ${doc.suggestedMatch!.ref}.` }); }} className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-[13px] font-bold ring-1 ring-white/70', doc.stage === 'matched' ? 'bg-info-soft text-info' : 'bg-white/70 text-ink hover:bg-white')}>
                  <Link2 className="size-4" /> {doc.stage === 'matched' ? 'Matched' : 'Confirm match'}
                </button>
              ) : null}
              <button type="button" onClick={() => { post(doc.id); toast({ tone: 'success', title: 'Recorded', body: `${doc.name} recorded to the books with evidence — ready for reconciliation.` }); }} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
                <CheckCircle2 className="size-4" /> Record transaction
              </button>
            </>
          )}
        </footer>
      ) : null}
    </>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = value >= 0.85 ? 'bg-success' : value >= 0.6 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/8"><div className={cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} /></div>
      <span className="text-[10px] font-bold text-ink-muted tabular">{pct}%</span>
    </div>
  );
}
