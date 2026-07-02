import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, ArrowRight, CheckCircle2, Download, FileText, ShieldCheck, TrendingDown, TrendingUp, UserPlus, X, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, ProgressRing, cn } from '../../design-system';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';
import { seedBusinessRisks, seedCompliance, seedControlPosture, type BusinessRisk, type ComplianceItem, type RiskSeverity } from '../../seed/ownerRisk';

const SEV_TONE: Record<RiskSeverity, string> = { low: 'bg-success-soft text-success', medium: 'bg-warning-soft text-warning', high: 'bg-danger-soft text-danger' };
type RiskStatus = 'open' | 'mitigating' | 'accepted';

// Org Owner "Audit & Risk" — a decision-oriented control & risk overview. Every
// element is actionable: open a risk to govern it (assign / mitigate / accept),
// drill a compliance gap, or inspect a sensitive action.
export function OwnerAuditRisk() {
  const [risk, setRisk] = useState<BusinessRisk | null>(null);
  const [status, setStatus] = useState<Record<string, RiskStatus>>({});

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Audit & Risk"
        subtitle={<>Your control posture, the top risks to act on, and a live trail of every sensitive action.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => toast({ tone: 'info', title: 'Exporting', body: 'Board risk pack (PDF) is being prepared.' })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink">
              <Download className="size-4" /> Board risk pack
            </button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-5"><ControlPostureCard /></div>
          <div className="@5xl:col-span-7"><ComplianceCard /></div>
        </section>
        <section className="grid grid-cols-1 items-start gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7"><TopRisksCard status={status} onOpen={setRisk} /></div>
          <div className="@5xl:col-span-5"><SensitiveActionsCard /></div>
        </section>
      </div>

      <RiskDrawer
        risk={risk}
        status={risk ? status[risk.id] ?? 'open' : 'open'}
        onClose={() => setRisk(null)}
        onAssign={(r) => { toast({ tone: 'info', title: 'Assigned', body: `${r.title} assigned to ${r.owner} with a due date.` }); }}
        onMitigate={(r) => { setStatus((s) => ({ ...s, [r.id]: 'mitigating' })); toast({ tone: 'success', title: 'Mitigation tracked', body: `${r.title} is now tracked to closure.` }); setRisk(null); }}
        onAccept={(r) => { setStatus((s) => ({ ...s, [r.id]: 'accepted' })); toast({ tone: 'warning', title: 'Risk accepted', body: `${r.title} accepted and logged with your sign-off.` }); setRisk(null); }}
      />
    </div>
  );
}

function ControlPostureCard() {
  const p = seedControlPosture;
  return (
    <GlassSurface tone="strong" className="flex h-full items-center gap-5 p-6">
      <ProgressRing value={p.controlHealth / 100} size={128} thickness={13} color="#16a37b">
        <div className="flex flex-col"><span className="font-display text-2xl font-bold text-ink tabular">{p.controlHealth}</span><span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">control</span></div>
      </ProgressRing>
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">▲ {p.controlTrend} pts vs last month</span>
        <div><span className="text-[12px] font-semibold text-ink-muted">Overall risk</span><p className="font-display text-xl font-bold text-ink">{p.riskScore}</p></div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning"><AlertTriangle className="size-3.5" /> {p.openRisks} open risks to review</span>
      </div>
    </GlassSurface>
  );
}

function ComplianceCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-xl bg-success-soft text-success"><ShieldCheck className="size-4" /></span><h3 className="font-display text-base font-bold text-ink">Compliance posture</h3></header>
      <ul className="grid grid-cols-1 gap-2 @2xl:grid-cols-2">
        {seedCompliance.map((c) => <ComplianceRow key={c.id} c={c} />)}
      </ul>
    </GlassSurface>
  );
}

function ComplianceRow({ c }: { c: ComplianceItem }) {
  const onClick = () =>
    c.ok
      ? toast({ tone: 'success', title: c.label, body: `${c.note}. Control is operating effectively.` })
      : toast({ tone: 'warning', title: c.label, body: `${c.note}. Document requests sent to Finance to close the gap.` });
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-start gap-2.5 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 transition-colors hover:bg-white">
        {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />}
        <div className="min-w-0 flex-1"><p className="text-[12.5px] font-bold text-ink">{c.label}</p><p className="text-[11px] text-ink-muted">{c.note}</p></div>
        {!c.ok ? <span className="shrink-0 rounded-lg bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger">Fix →</span> : null}
      </button>
    </li>
  );
}

function TopRisksCard({ status, onOpen }: { status: Record<string, RiskStatus>; onOpen: (r: BusinessRisk) => void }) {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center justify-between"><h3 className="font-display text-base font-bold text-ink">Top risks to act on</h3><span className="text-xs font-semibold text-ink-muted">{seedBusinessRisks.length}</span></header>
      <ul className="flex flex-col gap-2.5">
        {seedBusinessRisks.map((r) => {
          const st = status[r.id] ?? 'open';
          const Trend = r.trend === 'up' ? TrendingUp : r.trend === 'down' ? TrendingDown : null;
          return (
            <li key={r.id}>
              <button type="button" onClick={() => onOpen(r)} className="w-full rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 transition-colors hover:bg-white">
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', SEV_TONE[r.severity])}>{r.severity}</span>
                  <p className="flex-1 truncate text-[13.5px] font-bold text-ink">{r.title}</p>
                  {st !== 'open' ? <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', st === 'accepted' ? 'bg-ink/10 text-ink-muted' : 'bg-info-soft text-info')}>{st}</span> : null}
                  {Trend ? <Trend className={cn('size-3.5', r.trend === 'up' ? 'text-danger' : 'text-success')} /> : null}
                  <span className="text-[10.5px] font-semibold text-ink-muted">{r.category}</span>
                </div>
                <p className="mt-1 text-[12px] text-ink-soft">{r.detail}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-brand"><ArrowRight className="size-3.5" /> {r.recommendation}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </GlassSurface>
  );
}

function SensitiveActionsCard() {
  const auditLog = useWorkflowStore((s) => s.auditLog);
  const all = useMemo(() => auditLog.filter((e) => e.kind === 'approval' || e.kind === 'posting' || e.kind === 'config' || e.kind === 'consent'), [auditLog]);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? all : all.slice(0, 7);
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-3 p-6">
      <header className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink">Sensitive actions</h3>
        {all.length > 7 ? <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs font-semibold text-brand hover:text-brand-ink">{expanded ? 'Show fewer' : `Show all ${all.length}`}</button> : null}
      </header>
      <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {shown.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => toast({ tone: 'info', title: e.action, body: `${e.actor} · ${e.role} · ${e.target ?? ''} · ${new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` })} className="flex w-full items-start gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 transition-colors hover:bg-white">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-ink/5 text-ink-soft"><ShieldCheck className="size-3.5" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-ink">{e.action}</p><p className="truncate text-[11px] text-ink-muted">{e.actor} · {e.role} · {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p></div>
              {e.amount ? <MoneyCell amount={e.amount} size="sm" className="shrink-0 font-bold !text-[12px]" /> : null}
            </button>
          </li>
        ))}
        {shown.length === 0 ? <li className="grid place-items-center py-10 text-[12.5px] text-ink-muted">No sensitive actions yet.</li> : null}
      </ul>
    </GlassSurface>
  );
}

function RiskDrawer({ risk, status, onClose, onAssign, onMitigate, onAccept }: { risk: BusinessRisk | null; status: RiskStatus; onClose: () => void; onAssign: (r: BusinessRisk) => void; onMitigate: (r: BusinessRisk) => void; onAccept: (r: BusinessRisk) => void }) {
  const r = risk;
  return (
    <Dialog.Root open={r !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          {r ? (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className={cn('grid size-11 place-items-center rounded-2xl', SEV_TONE[r.severity])}><AlertTriangle className="size-5" /></span>
                  <div><Dialog.Title className="font-display text-[15px] font-bold text-ink">{r.title}</Dialog.Title><p className="text-[11.5px] text-ink-muted">{r.category} risk</p></div>
                </div>
                <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
              </header>
              <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', SEV_TONE[r.severity])}>{r.severity} severity</span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-soft ring-1 ring-white/60">Likelihood: {r.likelihood}</span>
                  {status !== 'open' ? <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', status === 'accepted' ? 'bg-ink/10 text-ink-muted' : 'bg-info-soft text-info')}>{status}</span> : null}
                </div>
                <GlassSurface noBlur tone="subtle" className="bg-white/60 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">What's happening</p><p className="mt-1 text-[13.5px] text-ink">{r.detail}</p></GlassSurface>
                <div className="rounded-2xl bg-brand-soft/50 p-4 ring-1 ring-brand/15"><p className="text-[11px] font-bold uppercase tracking-wider text-brand-ink">Recommended action</p><p className="mt-1 text-[13px] font-semibold text-ink">{r.recommendation}</p></div>
                <dl className="grid grid-cols-2 gap-3">
                  <Meta label="Potential impact" value={r.impact} />
                  <Meta label="Risk owner" value={r.owner} />
                </dl>
                <button type="button" onClick={() => openDoc({ name: r.evidenceName, kind: 'report', sizeText: '—', context: r.title })} className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"><FileText className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-ink">{r.evidenceName}</p><p className="text-[11px] text-ink-muted">Supporting analysis</p></div>
                  <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70">View</span>
                </button>
              </div>
              <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                <button type="button" onClick={() => onAccept(r)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white">Accept risk</button>
                <button type="button" onClick={() => onAssign(r)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink ring-1 ring-white/70 hover:bg-white"><UserPlus className="size-4" /> Assign</button>
                <button type="button" onClick={() => onMitigate(r)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">Track mitigation</button>
              </footer>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{label}</dt><dd className="text-[13px] font-semibold text-ink">{value}</dd></div>;
}
