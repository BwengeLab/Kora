import { AlertTriangle, ArrowRight, CheckCircle2, Download, ShieldCheck, XCircle } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, ProgressRing, cn } from '../../design-system';
import { useWorkflowStore } from '../../state/workflowStore';
import { toast } from '../../state/toastStore';
import {
  seedBusinessRisks,
  seedCompliance,
  seedControlPosture,
  type RiskSeverity,
} from '../../seed/ownerRisk';

const SEV_TONE: Record<RiskSeverity, string> = {
  low: 'bg-success-soft text-success',
  medium: 'bg-warning-soft text-warning',
  high: 'bg-danger-soft text-danger',
};

// Org Owner "Audit & Risk" — a decision-oriented control & risk overview.
export function OwnerAuditRisk() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Audit & Risk"
        subtitle={<>Your control posture, the top risks to act on, and a live trail of every sensitive action.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => toast({ tone: 'info', title: 'Exporting', body: 'Board risk pack (PDF) is being prepared.' })}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink"
            >
              <Download className="size-4" /> Board risk pack
            </button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        {/* Control posture + compliance */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-5"><ControlPostureCard /></div>
          <div className="@5xl:col-span-7"><ComplianceCard /></div>
        </section>

        {/* Top risks + sensitive actions */}
        <section className="grid grid-cols-1 items-start gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7"><TopRisksCard /></div>
          <div className="@5xl:col-span-5"><SensitiveActionsCard /></div>
        </section>
      </div>
    </div>
  );
}

function ControlPostureCard() {
  const p = seedControlPosture;
  return (
    <GlassSurface tone="strong" className="flex h-full items-center gap-5 p-6">
      <ProgressRing value={p.controlHealth / 100} size={128} thickness={13} color="#16a37b">
        <div className="flex flex-col">
          <span className="font-display text-2xl font-bold text-ink tabular">{p.controlHealth}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">control</span>
        </div>
      </ProgressRing>
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success">▲ {p.controlTrend} pts vs last month</span>
        <div>
          <span className="text-[12px] font-semibold text-ink-muted">Overall risk</span>
          <p className="font-display text-xl font-bold text-ink">{p.riskScore}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning">
          <AlertTriangle className="size-3.5" /> {p.openRisks} open risks to review
        </span>
      </div>
    </GlassSurface>
  );
}

function ComplianceCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-xl bg-success-soft text-success"><ShieldCheck className="size-4" /></span>
        <h3 className="font-display text-base font-bold text-ink">Compliance posture</h3>
      </header>
      <ul className="grid grid-cols-1 gap-2 @2xl:grid-cols-2">
        {seedCompliance.map((c) => (
          <li key={c.id} className="flex items-start gap-2.5 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
            {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />}
            <div>
              <p className="text-[12.5px] font-bold text-ink">{c.label}</p>
              <p className="text-[11px] text-ink-muted">{c.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}

function TopRisksCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink">Top risks to act on</h3>
        <span className="text-xs font-semibold text-ink-muted">{seedBusinessRisks.length}</span>
      </header>
      <ul className="flex flex-col gap-2.5">
        {seedBusinessRisks.map((r) => (
          <li key={r.id} className="rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
            <div className="flex items-center gap-2">
              <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', SEV_TONE[r.severity])}>{r.severity}</span>
              <p className="flex-1 truncate text-[13.5px] font-bold text-ink">{r.title}</p>
              <span className="text-[10.5px] font-semibold text-ink-muted">{r.category}</span>
            </div>
            <p className="mt-1 text-[12px] text-ink-soft">{r.detail}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-brand">
              <ArrowRight className="size-3.5" /> {r.recommendation}
            </p>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}

function SensitiveActionsCard() {
  const auditLog = useWorkflowStore((s) => s.auditLog);
  const sensitive = auditLog.filter((e) => e.kind === 'approval' || e.kind === 'posting' || e.kind === 'config' || e.kind === 'consent').slice(0, 8);
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-3 p-6">
      <header className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink">Sensitive actions</h3>
        <Link to="/audit" className="text-xs font-semibold text-brand hover:text-brand-ink">Full audit log</Link>
      </header>
      <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {sensitive.map((e) => (
          <li key={e.id} className="flex items-start gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-ink/5 text-ink-soft"><ShieldCheck className="size-3.5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-ink">{e.action}</p>
              <p className="truncate text-[11px] text-ink-muted">{e.actor} · {e.role} · {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
            </div>
            {e.amount ? <MoneyCell amount={e.amount} size="sm" className="shrink-0 font-bold !text-[12px]" /> : null}
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}
