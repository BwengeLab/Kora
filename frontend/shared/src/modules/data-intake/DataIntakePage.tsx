import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, Inbox, Link2, Loader2, Mail, Plus, Scan, Smartphone, Sparkles, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { connectIntakeSource, fetchIntakeDocs, fetchIntakeSources, matchIntakeDoc, postIntakeDoc, uploadIntakeDoc } from '../../api/intake';
import { GlassSurface, cn } from '../../design-system';
import { openDoc } from '../../state/docViewerStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';

const STAGE_META: Record<IntakeStage, { label: string; tone: string }> = {
  extracting: { label: 'Extracting', tone: 'bg-ai-soft text-ai' },
  'needs-review': { label: 'Needs review', tone: 'bg-warning-soft text-warning' },
  matched: { label: 'Matched', tone: 'bg-info-soft text-info' },
  posted: { label: 'Recorded', tone: 'bg-success-soft text-success' },
};

const SOURCE_ICON: Record<IntakeSource, typeof Mail> = { 'bank-feed': Link2, email: Mail, scan: Smartphone, upload: Upload };

export function DataIntakePage() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data } = useQuery({
    queryKey: ['intake-docs', token],
    queryFn: ({ signal }) => fetchIntakeDocs(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const { data: sourceStatus = {} } = useQuery({
    queryKey: ['intake-sources', token],
    queryFn: ({ signal }) => fetchIntakeSources(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const docs = data ?? seedIntake;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!docs.some((d) => d.id === selectedId)) {
      setSelectedId(docs.find((d) => d.stage === 'needs-review')?.id ?? docs[0]?.id ?? null);
    }
  }, [docs, selectedId]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadIntakeDoc(apiBaseUrl, token, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['intake-docs', token] });
      toast({ tone: 'info', title: 'Uploaded', body: 'Kora is extracting the fields...' });
    },
    onError: (error: Error) => toast({ tone: 'danger', title: 'Upload failed', body: error.message }),
  });
  const sourceMutation = useMutation({
    mutationFn: (source: string) => connectIntakeSource(apiBaseUrl, token, source),
    onSuccess: (_, source) => {
      void queryClient.invalidateQueries({ queryKey: ['intake-sources', token] });
      toast({ tone: 'success', title: `${SOURCE_META[source as IntakeSource].label} connected`, body: 'The source is now registered and audited.' });
    },
    onError: (error: Error) => toast({ tone: 'danger', title: 'Connection failed', body: error.message }),
  });

  const selected = docs.find((d) => d.id === selectedId) ?? null;
  const pending = docs.filter((d) => d.stage === 'needs-review' || d.stage === 'extracting').length;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Data Intake"
        subtitle={<><span className="font-semibold text-ink">{pending}</span> documents waiting to be reviewed and posted. Bank feeds, email-in, scans and uploads land here.</>}
        right={
          <>
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
              <Plus className="size-4" /> Upload document
            </button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 gap-5 px-8 pb-6">
        <GlassSurface tone="strong" className="flex w-[360px] shrink-0 flex-col">
          <div className="flex items-center gap-2 border-b border-white/55 px-4 py-3">
            <Inbox className="size-4 text-ink-soft" />
            <h3 className="text-[13px] font-bold text-ink">Intake queue</h3>
            <span className="ml-auto rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning">{pending} pending</span>
          </div>
          <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {docs.map((doc) => {
              const Icon = SOURCE_ICON[doc.source];
              return (
                <li key={doc.id}>
                  <button type="button" onClick={() => setSelectedId(doc.id)} className={cn('flex w-full items-start gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors', selected?.id === doc.id ? 'bg-white' : 'hover:bg-white/55')}>
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white/70 text-ink-soft ring-1 ring-white/60"><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">{doc.name}</p>
                      <p className="truncate text-[11px] text-ink-muted">{SOURCE_META[doc.source].label} · {new Date(doc.receivedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STAGE_META[doc.stage].tone)}>{STAGE_META[doc.stage].label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-3 gap-2 border-t border-white/55 p-3">
            {([['bank-feed', Link2], ['email', Mail], ['scan', Scan]] as const).map(([source, Icon]) => (
              <button key={source} type="button" onClick={() => sourceMutation.mutate(source)} disabled={sourceMutation.isPending} className="flex flex-col items-center gap-1 rounded-xl bg-white/55 py-2.5 text-[10.5px] font-bold text-ink-soft ring-1 ring-white/60 hover:bg-white hover:text-ink disabled:opacity-60">
                <Icon className="size-4" /> {sourceStatus[source] ? `${SOURCE_META[source].label} connected` : SOURCE_META[source].label}
              </button>
            ))}
          </div>
        </GlassSurface>

        <GlassSurface tone="strong" className="flex min-w-0 flex-1 flex-col">
          {selected ? <IntakeDetail doc={selected} /> : <div className="grid flex-1 place-items-center text-ink-muted">Select a document</div>}
        </GlassSurface>
      </div>
    </div>
  );
}

function IntakeDetail({ doc }: { doc: IntakeDoc }) {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const matchMutation = useMutation({
    mutationFn: () => matchIntakeDoc(apiBaseUrl, token, doc.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['intake-docs', token] });
      toast({ tone: 'success', title: 'Matched', body: `${doc.name} linked to ${doc.suggestedMatch?.ref ?? 'the selected record'}.` });
    },
    onError: (error: Error) => toast({ tone: 'danger', title: 'Match failed', body: error.message }),
  });
  const postMutation = useMutation({
    mutationFn: () => postIntakeDoc(apiBaseUrl, token, doc.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['intake-docs', token] });
      toast({ tone: 'success', title: 'Recorded', body: `${doc.name} recorded to the books with evidence - ready for reconciliation.` });
    },
    onError: (error: Error) => toast({ tone: 'danger', title: 'Record failed', body: error.message }),
  });
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
            <p className="text-[14px] font-semibold text-ink">Kora is extracting fields...</p>
            <p className="text-[12px] text-ink-muted">OCR + field detection usually takes a few seconds.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-2.5 py-1 text-[11px] font-bold text-ai"><Sparkles className="size-3.5" /> Extracted by Kora</div>
            <dl className="grid grid-cols-2 gap-3">
              {doc.fields.map((field) => (
                <div key={field.label} className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
                  <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{field.label}</dt>
                  <dd className="mt-0.5 text-[13.5px] font-semibold text-ink">{field.value}</dd>
                  <ConfidenceBar value={field.confidence} />
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
              <p className="mt-5 rounded-2xl bg-warning-soft/50 p-3 text-[12.5px] font-medium text-warning ring-1 ring-warning/20">No confident match found - review the fields and post as a new transaction, or escalate.</p>
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
                <button type="button" onClick={() => matchMutation.mutate()} className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-[13px] font-bold ring-1 ring-white/70', doc.stage === 'matched' ? 'bg-info-soft text-info' : 'bg-white/70 text-ink hover:bg-white')}>
                  <Link2 className="size-4" /> {doc.stage === 'matched' ? 'Matched' : 'Confirm match'}
                </button>
              ) : null}
              <button type="button" onClick={() => postMutation.mutate()} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
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
