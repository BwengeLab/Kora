import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Copy,
  FileQuestion,
  Forward,
  Link2,
  Minus,
  ShieldQuestion,
  Sparkles,
  Split,
  UserCog,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  ConfidenceChip,
  GlassSurface,
  MoneyCell,
  PartyAvatar,
  cn,
} from '../../design-system';
import {
  type BankTransaction,
  type BusinessRecord,
  type FieldDelta,
  type Reconciliation,
  seedReconciliations,
} from '../../seed/reconciliation';

// The right-side detail panel: side-by-side bank vs business record, per-field
// deltas, confidence + reason, match-type selector, and the action row.
// Operator PREPARES (Accept Match / Reject / etc.) — never posts to ledger.
// Final approval lives with Finance Lead.

export function MatchWorkspaceCard({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const recon = useMemo(() => seedReconciliations.find((r) => r.id === selectedId)!, [selectedId]);
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 border-b border-white/50 px-6 py-4">
        <div className="flex flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Match workspace
          </p>
          <h3 className="font-display text-[18px] font-semibold text-ink">
            {recon.transaction.counterparty}
          </h3>
          <p className="text-[12px] text-ink-muted">
            {recon.transaction.source} ·{' '}
            {new Date(recon.transaction.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <ConfidenceChip score={recon.confidence} />
      </header>

      {/* Body */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
        {/* Side-by-side */}
        <div className="grid grid-cols-1 items-stretch gap-4 @3xl:grid-cols-[1fr_auto_1fr]">
          <BankSide txn={recon.transaction} />
          <div className="grid place-items-center text-ink-muted [&>svg]:size-5">
            <ArrowRight />
          </div>
          {recon.suggestedRecord ? (
            <BusinessSide record={recon.suggestedRecord} />
          ) : (
            <NoMatchSide tier={recon.tier} reason={recon.reason} />
          )}
        </div>

        {/* Deltas */}
        {recon.deltas.length > 0 ? (
          <section className="mt-6">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Match details
            </h4>
            <ul className="overflow-hidden rounded-2xl bg-white/40 ring-1 ring-white/60">
              {recon.deltas.map((d, i) => (
                <DeltaRow key={i} delta={d} divide={i > 0} />
              ))}
            </ul>
          </section>
        ) : null}

        {/* Agent reason */}
        <section className="mt-5 rounded-2xl bg-ai-soft/60 p-4 ring-1 ring-ai/15">
          <header className="mb-1.5 flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-ai to-brand text-white">
              <Sparkles className="size-3.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ai">
              Reconciliation agent
            </span>
          </header>
          <p className="text-[13px] leading-relaxed text-ink">{recon.reason}</p>
          {recon.unexplainedDifference ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-warning-soft px-2 py-1 text-[11px] font-semibold text-warning">
              <FileQuestion className="size-3.5" /> Unexplained difference:{' '}
              <MoneyCell amount={recon.unexplainedDifference} size="sm" className="!text-[11px]" />
            </p>
          ) : null}
          {recon.duplicateOf ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-info-soft px-2 py-1 text-[11px] font-semibold text-info">
              <Copy className="size-3.5" /> Duplicate of{' '}
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => onSelect(recon.duplicateOf!)}
              >
                {recon.duplicateOf}
              </button>
            </p>
          ) : null}
        </section>

        {/* Match-type selector */}
        <section className="mt-5">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Match type
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(['1:1', '1:many', 'many:many', 'partial', 'timing'] as const).map((t, i) => (
              <button
                key={t}
                type="button"
                className={cn(
                  'rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors',
                  i === 0
                    ? 'border-brand/30 bg-brand text-white shadow-glass-soft'
                    : 'border-white/70 bg-white/55 text-ink-soft hover:bg-white/80 hover:text-ink',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Action bar */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/50 bg-white/40 px-6 py-3.5">
        <p className="flex items-center gap-2 text-[11px] font-medium text-ink-muted">
          <ShieldQuestion className="size-3.5" />
          You <span className="font-bold text-ink">prepare</span> the match — Finance Lead approves.
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <SecondaryAction label="Request doc" icon={FileQuestion} />
          <SecondaryAction label="Mark duplicate" icon={Copy} tone="info" />
          <SecondaryAction label="Mark suspicious" icon={AlertOctagon} tone="danger" />
          <SecondaryAction label="Split" icon={Split} />
          <SecondaryAction label="Manual" icon={Link2} />
          <SecondaryAction label="Assign" icon={UserCog} />
          <SecondaryAction label="Escalate" icon={Forward} />
          <PrimaryAction label="Reject" icon={X} variant="reject" />
          <PrimaryAction label="Accept match" icon={CheckCircle2} variant="accept" />
        </div>
      </footer>
    </GlassSurface>
  );
}

// ─── Side panes ────────────────────────────────────────────────────────────
function BankSide({ txn }: { txn: BankTransaction }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-white/55 p-4 ring-1 ring-white/65">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Money side</span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-ink-soft ring-1 ring-white/80">
          {txn.source}
        </span>
      </div>
      <MoneyCell amount={txn.amount} size="xl" />
      <div className="flex items-center gap-2.5">
        <PartyAvatar name={txn.counterparty} size="sm" />
        <span className="text-[12.5px] font-semibold text-ink">{txn.counterparty}</span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-[11.5px]">
        <KV label="Date" value={new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
        <KV label="Reference" value={txn.reference ?? '—'} />
        <KV label="Direction" value={txn.direction === 'inflow' ? 'Money in' : 'Money out'} />
      </dl>
    </article>
  );
}

function BusinessSide({ record }: { record: BusinessRecord }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-white/55 p-4 ring-1 ring-white/65">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Business side</span>
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase text-brand-ink">
          {record.type}
        </span>
      </div>
      <MoneyCell amount={record.amount} size="xl" />
      <div className="flex items-center gap-2.5">
        <PartyAvatar name={record.partyName} size="sm" />
        <span className="text-[12.5px] font-semibold text-ink">{record.partyName}</span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-[11.5px]">
        <KV label="Date" value={new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
        <KV label="Reference" value={record.reference} />
      </dl>
    </article>
  );
}

function NoMatchSide({ tier, reason }: { tier: string; reason: string }) {
  return (
    <article className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/70 bg-white/30 p-6 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-warning-soft text-warning">
        <FileQuestion className="size-5" />
      </span>
      <p className="font-display text-sm font-semibold text-ink">No matching record found</p>
      <p className="text-[11.5px] text-ink-muted">{reason}</p>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
        {tier}
      </span>
    </article>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="font-mono text-[12px] font-medium text-ink truncate">{value}</dd>
    </div>
  );
}

// ─── Deltas ────────────────────────────────────────────────────────────────
function DeltaRow({ delta, divide }: { delta: FieldDelta; divide: boolean }) {
  const tone =
    delta.status === 'match'
      ? 'text-success'
      : delta.status === 'near'
        ? 'text-warning'
        : 'text-danger';
  const Icon = delta.status === 'match' ? CheckCircle2 : delta.status === 'near' ? Minus : X;
  return (
    <li
      className={cn(
        'grid grid-cols-[88px_1fr_1fr_88px] items-center gap-3 px-3 py-2 text-[12px]',
        divide && 'border-t border-white/60',
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {delta.field}
      </span>
      <span className="truncate font-mono text-ink">{delta.bankValue}</span>
      <span className="truncate font-mono text-ink">{delta.recordValue}</span>
      <span className={cn('inline-flex items-center justify-end gap-1 text-[11px] font-semibold', tone)}>
        <Icon className="size-3.5" />
        {delta.note ?? delta.status}
      </span>
    </li>
  );
}

// ─── Actions ───────────────────────────────────────────────────────────────
function SecondaryAction({ label, icon: Icon, tone = 'neutral' }: { label: string; icon: typeof Copy; tone?: 'neutral' | 'info' | 'danger' }) {
  const toneClass =
    tone === 'info'
      ? 'text-info hover:bg-info-soft'
      : tone === 'danger'
        ? 'text-danger hover:bg-danger-soft'
        : 'text-ink-soft hover:bg-white/90 hover:text-ink';
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-xl bg-white/55 px-2.5 text-[11.5px] font-semibold transition-colors',
        toneClass,
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function PrimaryAction({ label, icon: Icon, variant }: { label: string; icon: typeof CheckCircle2; variant: 'accept' | 'reject' }) {
  const cls =
    variant === 'accept'
      ? 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-[0_6px_18px_rgba(67,97,238,0.45)] hover:brightness-110'
      : 'bg-white text-danger ring-1 ring-danger/30 hover:bg-danger-soft';
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-[12.5px] font-bold transition-all',
        cls,
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
