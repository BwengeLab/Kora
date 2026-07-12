import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { Banknote, Cog, Download, FileSearch, FileWarning, Flag, KeyRound, Search, ShieldAlert, ShieldCheck, Sparkles, Stamp, UserCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { createAuditFinding, exportAuditEvidencePack, fetchAuditInvestigations, type AuditInvestigationsPayload } from '../../api/financeAuditViews';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, PartyAvatar, ProgressRing, cn } from '../../design-system';
import { seedControlHealth, seedMissingDocs, seedSodViolations, type AuditEvent, type AuditKind } from '../../seed/auditorHome';
import { openDoc } from '../../state/docViewerStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';

const KIND_META: Record<AuditKind, { label: string; icon: typeof Stamp; tone: string }> = {
  approval: { label: 'Approval', icon: Stamp, tone: 'bg-brand-soft text-brand-ink' },
  posting: { label: 'Posting', icon: Banknote, tone: 'bg-success-soft text-success' },
  access: { label: 'Access', icon: KeyRound, tone: 'bg-info-soft text-info' },
  config: { label: 'Config', icon: Cog, tone: 'bg-warning-soft text-warning' },
  agent: { label: 'Agent', icon: Sparkles, tone: 'bg-ai-soft text-ai' },
  consent: { label: 'Consent', icon: UserCheck, tone: 'bg-lavender-soft text-lavender' },
  audit: { label: 'Audit', icon: Flag, tone: 'bg-danger-soft text-danger' },
  claim: { label: 'Claim', icon: ShieldCheck, tone: 'bg-info-soft text-info' },
};

const UNKNOWN_KIND_META = { label: 'Event', icon: FileSearch, tone: 'bg-white/70 text-ink-soft' };

function kindMeta(kind: string) {
  return KIND_META[kind as AuditKind] ?? UNKNOWN_KIND_META;
}

export function AuditInvestigations() {
  const token = useSessionStore((s) => s.session?.token ?? '');
  const apiBaseUrl = getApiBaseUrl();
  const workflowAuditLog = useWorkflowStore((s) => s.auditLog);
  const [data, setData] = useState<AuditInvestigationsPayload | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<AuditKind | 'all'>('all');
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const exportMutation = useMutation({
    mutationFn: () => exportAuditEvidencePack(apiBaseUrl, token),
    onSuccess: (blob) => {
      downloadFile(blob, 'kora-audit-evidence-pack.pdf');
      toast({ tone: 'success', title: 'Evidence pack downloaded', body: 'The pack was generated from current audit and workflow records.' });
    },
    onError: (error: Error) => {
      toast({ tone: 'warning', title: 'Evidence pack failed', body: error.message });
    },
  });
  const findingMutation = useMutation({
    mutationFn: (eventID: string) => createAuditFinding(apiBaseUrl, token, eventID),
    onSuccess: (payload) => {
      setData(payload);
      setSelected(null);
      toast({ tone: 'info', title: 'Finding raised', body: 'The follow-up finding was logged on the audit trail.' });
    },
    onError: (error: Error) => {
      toast({ tone: 'warning', title: 'Finding failed', body: error.message });
    },
  });

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchAuditInvestigations(apiBaseUrl, token, controller.signal)
      .then(setData)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          toast({ tone: 'warning', title: 'Audit view unavailable', body: error instanceof Error ? error.message : 'Could not load audit investigations.' });
        }
      });
    return () => controller.abort();
  }, [apiBaseUrl, token]);

  const auditLog = data?.auditLog ?? (workflowAuditLog as AuditEvent[]);
  const controlHealth = data?.controlHealth ?? seedControlHealth;
  const riskStats = data?.riskStats ?? { riskFlags: 11, sodViolations: seedSodViolations.length, suspicious: 4, missingDocs: seedMissingDocs.length };
  const sodViolations = data?.sodViolations ?? seedSodViolations;
  const missingDocs = data?.missingDocs ?? seedMissingDocs;

  const trail = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return auditLog
      .filter((event) => (kind === 'all' ? true : event.kind === kind))
      .filter((event) => normalized === '' ? true : [event.actor, event.action, event.target, event.role].some((value) => value.toLowerCase().includes(normalized)));
  }, [auditLog, query, kind]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Audit & Investigations"
        subtitle="Read-only by design - trace every sensitive action, test controls and verify evidence. You change nothing."
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-70"><Download className="size-4" /> {exportMutation.isPending ? 'Preparing...' : 'Evidence pack'}</button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="Events logged" value={String(auditLog.length)} tone="text-ink" icon={<FileSearch className="size-4" />} active={kind === 'all'} onClick={() => setKind('all')} />
          <Stat label="SoD violations" value={String(riskStats.sodViolations)} tone="text-danger" icon={<ShieldAlert className="size-4" />} />
          <Stat label="Suspicious / referred" value={String(riskStats.suspicious)} tone="text-warning" icon={<Flag className="size-4" />} onClick={() => setKind('agent')} active={kind === 'agent'} />
          <Stat label="Missing evidence" value={String(riskStats.missingDocs)} tone="text-warning" icon={<FileWarning className="size-4" />} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]">
          <GlassSurface tone="strong" className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-white/55 p-4">
              <div className="flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
                <Search className="size-4 text-ink-muted" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search actor, action, target..." className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>
              <select value={kind} onChange={(event) => setKind(event.target.value as AuditKind | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
                <option value="all">All kinds</option>
                {Object.entries(KIND_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 border-b border-white/45 px-4 py-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted"><ShieldCheck className="size-3.5 text-success" /> Immutable · append-only</span>
            </div>
            <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {trail.map((event) => {
                const meta = kindMeta(event.kind);
                return (
                  <li key={event.id}>
                    <button type="button" onClick={() => setSelected(event)} className="flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
                      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', meta.tone)}><meta.icon className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">{event.action}</p>
                        <p className="truncate text-[11px] text-ink-muted">{event.actor} · {event.role} · {event.target}</p>
                      </div>
                      {event.hasEvidence ? <span className="shrink-0 rounded-md bg-success-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-success">evidence</span> : <span className="shrink-0 rounded-md bg-danger-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">no doc</span>}
                      {event.amount ? <MoneyCell amount={event.amount} size="sm" className="shrink-0 font-bold !text-[12px]" /> : null}
                      <span className="shrink-0 text-[10.5px] tabular text-ink-muted">{new Date(event.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    </button>
                  </li>
                );
              })}
              {trail.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No events match.</li> : null}
            </ul>
          </GlassSurface>

          <div className="flex min-h-0 flex-col gap-4">
            <GlassSurface tone="strong" className="flex items-center gap-4 p-4">
              <ProgressRing value={controlHealth.score / 100} size={84} thickness={9} color="#16a37b">
                <span className="font-display text-lg font-bold text-ink tabular">{controlHealth.score}</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-ink">Control health</p>
                <p className="text-[11px] text-success">▲ {controlHealth.trendPts} pts vs last month</p>
              </div>
            </GlassSurface>
            <GlassSurface tone="strong" className="flex flex-col gap-2 p-4">
              <header className="flex items-center gap-1.5"><ShieldAlert className="size-3.5 text-danger" /><h4 className="text-[12px] font-bold text-ink">SoD violations</h4></header>
              {sodViolations.map((violation) => (
                <button key={violation.id} type="button" onClick={() => toast({ tone: 'warning', title: violation.conflict, body: `${violation.user} (${violation.role}) · ${violation.detail}` })} className="rounded-xl bg-white/55 p-2.5 text-left ring-1 ring-white/60 hover:bg-white">
                  <div className="flex items-center gap-1.5"><span className={cn('rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase', violation.severity === 'high' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning')}>{violation.severity}</span><p className="truncate text-[11.5px] font-bold text-ink">{violation.user}</p></div>
                  <p className="mt-0.5 text-[10.5px] text-ink-muted">{violation.conflict}</p>
                </button>
              ))}
            </GlassSurface>
            <GlassSurface tone="strong" className="flex min-h-0 flex-col gap-2 p-4">
              <header className="flex items-center gap-1.5"><FileWarning className="size-3.5 text-warning" /><h4 className="text-[12px] font-bold text-ink">Missing evidence</h4></header>
              <ul className="scrollbar-thin flex min-h-0 flex-col gap-1.5 overflow-y-auto">
                {missingDocs.map((doc) => (
                  <li key={doc.id} className="rounded-xl bg-white/55 p-2.5 ring-1 ring-white/60">
                    <div className="flex items-center justify-between gap-2"><p className="truncate text-[11.5px] font-bold text-ink">{doc.party}</p><MoneyCell amount={doc.amount} size="sm" className="!text-[11px] font-bold" /></div>
                    <p className="text-[10.5px] text-ink-muted">{doc.missing} · {doc.reference} · {doc.ageText}</p>
                  </li>
                ))}
              </ul>
            </GlassSurface>
          </div>
        </div>
      </div>

      <EventDrawer event={selected} onClose={() => setSelected(null)} onRaiseFinding={(eventID) => findingMutation.mutate(eventID)} busy={findingMutation.isPending} />
    </div>
  );
}

function downloadFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function EventDrawer({ event, onClose, onRaiseFinding, busy = false }: { event: AuditEvent | null; onClose: () => void; onRaiseFinding: (eventID: string) => void; busy?: boolean }) {
  if (!event) return <Dialog.Root open={false} onOpenChange={() => onClose()}><span /></Dialog.Root>;
  const meta = kindMeta(event.kind);
  return (
    <Dialog.Root open={event !== null} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(440px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={cn('grid size-11 place-items-center rounded-2xl', meta.tone)}><meta.icon className="size-5" /></span>
              <div><Dialog.Title className="font-display text-[15px] font-bold text-ink">{event.action}</Dialog.Title><p className="text-[11.5px] text-ink-muted">{meta.label} · {new Date(event.at).toLocaleString('en-US', { weekday: 'short', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p></div>
            </div>
            <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
          </header>
          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
            <div className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
              <PartyAvatar name={event.actor} size="md" />
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold text-ink">{event.actor}</p><p className="text-[11px] text-ink-muted">{event.role}</p></div>
            </div>
            <GlassSurface noBlur tone="subtle" className="bg-white/60 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Target</p><p className="mt-1 text-[13.5px] font-semibold text-ink">{event.target}</p></GlassSurface>
            {event.amount ? <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60"><p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Amount</p><MoneyCell amount={event.amount} size="lg" className="!text-xl font-bold text-ink" /></div> : null}
            {event.hasEvidence ? (
              <button type="button" onClick={() => openDoc({ name: `${event.target.split(' · ')[0]} — evidence.pdf`, kind: 'statement', sizeText: '—', context: event.action })} className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-soft text-success"><ShieldCheck className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="text-[12.5px] font-semibold text-ink">Supporting evidence</p><p className="text-[11px] text-ink-muted">Attached & verified</p></div>
                <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70">View</span>
              </button>
            ) : (
              <p className="rounded-2xl bg-danger-soft/40 p-3 text-[12px] font-medium text-danger ring-1 ring-danger/15">No supporting document attached - control gap worth a finding.</p>
            )}
          </div>
          <footer className="border-t border-white/55 p-4">
            <button type="button" disabled={busy} onClick={() => onRaiseFinding(event.id)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"><Flag className="size-4" /> {busy ? 'Saving...' : 'Raise finding'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Stat({ label, value, tone, icon, active, onClick }: { label: string; value: string; tone: string; icon: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <GlassSurface tone="strong" className={cn('p-3.5', active && onClick && 'ring-2 ring-brand/40')}>
      <button type="button" onClick={onClick} disabled={!onClick} className={cn('flex w-full items-center gap-3 text-left', onClick && 'cursor-pointer')}>
        <span className={cn('grid size-10 place-items-center rounded-xl bg-white/70 ring-1 ring-white/60', tone)}>{icon}</span>
        <div><span className={cn('block font-display text-2xl font-bold tabular leading-none', tone)}>{value}</span><span className="text-[11px] font-semibold text-ink-muted">{label}</span></div>
      </button>
    </GlassSurface>
  );
}
