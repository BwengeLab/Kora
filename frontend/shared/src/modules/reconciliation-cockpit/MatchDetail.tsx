import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  AlertOctagon,
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Forward,
  Link2,
  Lock,
  MoreHorizontal,
  Scissors,
  Sparkles,
  SkipForward,
  UserPlus,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import type {
  BankTransaction,
  BusinessRecord,
  EvidenceDoc,
  FieldDelta,
  HistoryEvent,
  Reconciliation,
} from '../../seed/reconciliation';
import { StageStepper } from './StageStepper';

type DetailTab = 'details' | 'evidence' | 'history' | 'notes';

export interface MatchDetailProps {
  recons: Reconciliation[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPrepare: (id: string) => void;
  onReject: (id: string) => void;
}

export function MatchDetail({ recons, selectedId, onSelect, onPrepare, onReject }: MatchDetailProps) {
  const recon = useMemo(() => recons.find((r) => r.id === selectedId) ?? recons[0]!, [recons, selectedId]);
  const [tab, setTab] = useState<DetailTab>('details');

  const idx = recons.findIndex((r) => r.id === recon.id);
  const prev = recons[idx - 1];
  const next = recons[idx + 1];

  const tierLabel =
    recon.tier === 'auto' ? 'High-confidence match' :
    recon.tier === 'suggested' ? 'Suggested match' :
    recon.tier === 'review' ? 'Needs your review' :
    recon.tier === 'duplicate' ? 'Likely duplicate' : 'Suspicious — needs escalation';

  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col">
      {/* Header: title + queue nav */}
      <header className="flex items-center justify-between gap-4 px-7 pt-6">
        <div className="flex items-center gap-3">
          <PartyAvatar name={recon.transaction.counterparty} size="lg" />
          <div className="flex flex-col">
            <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
              {recon.transaction.counterparty}
            </h2>
            <p className="text-[12.5px] text-ink-muted">
              {recon.transaction.source} ·{' '}
              {new Date(recon.transaction.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {' · '}{recon.ageText}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <QueueNavButton label="Previous" disabled={!prev} onClick={() => prev && onSelect(prev.id)}>
            <ChevronLeft className="size-4" />
          </QueueNavButton>
          <span className="px-1 text-[12px] font-semibold tabular text-ink-muted">
            {idx + 1} / {recons.length}
          </span>
          <QueueNavButton label="Next" disabled={!next} onClick={() => next && onSelect(next.id)}>
            <ChevronRight className="size-4" />
          </QueueNavButton>
        </div>
      </header>

      {/* Lifecycle stepper */}
      <div className="px-7 pt-5">
        <StageStepper current={recon.stage} />
      </div>

      {/* Scrollable body */}
      <div className="scrollbar-thin mt-5 flex-1 overflow-y-auto px-7">
        {/* Plain-language confidence headline */}
        <ConfidenceHeadline confidence={recon.confidence} tierLabel={tierLabel} record={recon.suggestedRecord} party={recon.transaction.counterparty} />

        {/* Side-by-side */}
        <div className="mt-5 grid grid-cols-1 items-stretch gap-4 @3xl:grid-cols-[1fr_auto_1fr]">
          <SidePane title="Money in / out" badge={recon.transaction.source} badgeTone="neutral">
            <MoneyCell amount={recon.transaction.amount} size="xl" />
            <PartyLine name={recon.transaction.counterparty} />
            <KVGrid
              rows={[
                ['Date', new Date(recon.transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })],
                ['Reference', recon.transaction.reference ?? '—'],
                ['Direction', recon.transaction.direction === 'inflow' ? 'Money in' : 'Money out'],
              ]}
            />
          </SidePane>

          <div className="grid place-items-center">
            <span
              className={cn(
                'grid size-11 place-items-center rounded-2xl text-white shadow-glass-soft',
                recon.suggestedRecord ? 'bg-gradient-to-br from-brand to-ai' : 'bg-ink/20',
              )}
            >
              <ArrowLeftRight className="size-5" />
            </span>
          </div>

          {recon.suggestedRecord ? (
            <SidePane title="Business record" badge={recon.suggestedRecord.type} badgeTone="brand">
              <MoneyCell amount={recon.suggestedRecord.amount} size="xl" />
              <PartyLine name={recon.suggestedRecord.partyName} />
              <KVGrid
                rows={[
                  ['Date', new Date(recon.suggestedRecord.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })],
                  ['Reference', recon.suggestedRecord.reference],
                  ['Type', recon.suggestedRecord.type.toUpperCase()],
                ]}
              />
            </SidePane>
          ) : (
            <NoMatchPane reason={recon.reason} />
          )}
        </div>

        {/* Agent reasoning */}
        <section className="mt-5 rounded-3xl bg-gradient-to-br from-ai-soft/80 to-white/40 p-5 ring-1 ring-ai/15">
          <header className="mb-2 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white">
              <Sparkles className="size-4" />
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wider text-ai">Why Kora matched these</span>
          </header>
          <p className="text-[14px] leading-relaxed text-ink">{recon.reason}</p>
          {recon.unexplainedDifference ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-1.5 text-[12px] font-bold text-warning">
              Unexplained difference: <MoneyCell amount={recon.unexplainedDifference} size="sm" className="!text-[12px]" />
            </div>
          ) : null}
          {recon.duplicateOf ? (
            <button
              type="button"
              onClick={() => onSelect(recon.duplicateOf!)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-info-soft px-3 py-1.5 text-[12px] font-bold text-info"
            >
              <Copy className="size-3.5" /> Duplicate of {recon.duplicateOf} — open original
            </button>
          ) : null}
        </section>

        {/* Disclosure tabs */}
        <div className="mt-6 flex gap-1 border-b border-white/55">
          {([
            ['details', 'Match details'],
            ['evidence', `Evidence (${recon.evidence.length})`],
            ['history', `History (${recon.history.length})`],
            ['notes', 'Notes'],
          ] as [DetailTab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'relative px-3 pb-2.5 text-[13px] font-semibold transition-colors',
                tab === id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft',
              )}
            >
              {label}
              {tab === id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
            </button>
          ))}
        </div>

        <div className="py-4 pb-6">
          {tab === 'details' ? <MatchDetailsTab deltas={recon.deltas} /> : null}
          {tab === 'evidence' ? <EvidenceTab docs={recon.evidence} /> : null}
          {tab === 'history' ? <HistoryTab events={recon.history} /> : null}
          {tab === 'notes' ? <NotesTab /> : null}
        </div>
      </div>

      {/* Action bar — clear hierarchy */}
      <ActionBar recon={recon} onPrepare={() => onPrepare(recon.id)} onReject={() => onReject(recon.id)} />
    </GlassSurface>
  );
}

// ─── Confidence headline ─────────────────────────────────────────────────────
function ConfidenceHeadline({
  confidence,
  tierLabel,
  record,
  party,
}: {
  confidence: number;
  tierLabel: string;
  record: BusinessRecord | undefined;
  party: string;
}) {
  const tone = confidence >= 95 ? 'success' : confidence >= 70 ? 'ai' : 'warning';
  const toneClasses = {
    success: 'from-success-soft/80 text-success',
    ai: 'from-ai-soft/80 text-ai',
    warning: 'from-warning-soft/80 text-warning',
  }[tone];
  return (
    <div className={cn('flex items-center gap-4 rounded-3xl bg-gradient-to-r to-white/30 p-5 ring-1 ring-white/50', toneClasses)}>
      <div className="flex flex-col items-center">
        <span className="font-display text-4xl font-bold leading-none tabular">{confidence}%</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">{tierLabel.split(' ')[0]}</span>
      </div>
      <div className="h-10 w-px bg-current/20" />
      <p className="text-[14px] font-medium leading-snug text-ink">
        <span className="font-bold">{tierLabel}.</span>{' '}
        {record
          ? `Kora is ${confidence}% sure this ${party} payment matches ${record.reference}.`
          : `Kora could not find a matching record — review the evidence and decide.`}
      </p>
    </div>
  );
}

// ─── Side panes ──────────────────────────────────────────────────────────────
function SidePane({
  title,
  badge,
  badgeTone,
  children,
}: {
  title: string;
  badge: string;
  badgeTone: 'neutral' | 'brand';
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-3xl bg-white/55 p-5 ring-1 ring-white/65">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{title}</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
            badgeTone === 'brand' ? 'bg-brand-soft text-brand-ink' : 'bg-white/80 text-ink-soft ring-1 ring-white/80',
          )}
        >
          {badge}
        </span>
      </div>
      {children}
    </article>
  );
}

function PartyLine({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <PartyAvatar name={name} size="sm" />
      <span className="text-[13px] font-semibold text-ink">{name}</span>
    </div>
  );
}

function KVGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[10px] uppercase tracking-wider text-ink-muted">{k}</dt>
          <dd className="truncate font-mono text-[12.5px] font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function NoMatchPane({ reason }: { reason: string }) {
  return (
    <article className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-white/70 bg-white/30 p-6 text-center">
      <span className="grid size-11 place-items-center rounded-2xl bg-warning-soft text-warning">
        <FileText className="size-5" />
      </span>
      <p className="font-display text-[15px] font-bold text-ink">No matching record</p>
      <p className="text-[12px] leading-snug text-ink-muted">{reason}</p>
    </article>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
function MatchDetailsTab({ deltas }: { deltas: FieldDelta[] }) {
  if (deltas.length === 0) {
    return <p className="text-[13px] text-ink-muted">No field comparison available for this item.</p>;
  }
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-white/60">
      <div className="grid grid-cols-[90px_1fr_1fr_96px] gap-3 bg-white/55 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
        <span>Field</span>
        <span>Money side</span>
        <span>Business side</span>
        <span className="text-right">Result</span>
      </div>
      <ul>
        {deltas.map((d, i) => {
          const tone = d.status === 'match' ? 'text-success' : d.status === 'near' ? 'text-warning' : 'text-danger';
          const Icon = d.status === 'match' ? Check : d.status === 'near' ? ArrowLeftRight : X;
          return (
            <li
              key={i}
              className={cn('grid grid-cols-[90px_1fr_1fr_96px] items-center gap-3 px-4 py-2.5 text-[12.5px]', i > 0 && 'border-t border-white/55', i % 2 ? 'bg-white/25' : 'bg-white/40')}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{d.field}</span>
              <span className="truncate font-mono text-ink">{d.bankValue}</span>
              <span className="truncate font-mono text-ink">{d.recordValue}</span>
              <span className={cn('inline-flex items-center justify-end gap-1 text-[11.5px] font-bold', tone)}>
                <Icon className="size-3.5" /> {d.note ?? d.status}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EvidenceTab({ docs }: { docs: EvidenceDoc[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 @2xl:grid-cols-2">
      {docs.map((d) => (
        <li key={d.id}>
          <button type="button" className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/65 hover:bg-white">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{d.name}</p>
              <p className="truncate text-[11px] text-ink-muted">
                {d.kind} · {d.sizeText}
                {d.pageRef ? ` · ${d.pageRef}` : ''}
              </p>
            </div>
            <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-white/80">View</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function HistoryTab({ events }: { events: HistoryEvent[] }) {
  return (
    <ol className="flex flex-col gap-0">
      {events.map((e, i) => (
        <li key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'mt-0.5 grid size-7 place-items-center rounded-full text-white',
                e.kind === 'agent' ? 'bg-gradient-to-br from-ai to-brand' : e.kind === 'user' ? 'bg-brand' : 'bg-ink/40',
              )}
            >
              {e.kind === 'agent' ? <Sparkles className="size-3.5" /> : <Check className="size-3.5" />}
            </span>
            {i < events.length - 1 ? <span className="my-1 w-px flex-1 bg-ink/10" /> : null}
          </div>
          <div className="pb-4">
            <p className="text-[13px] font-semibold text-ink">{e.action}</p>
            <p className="text-[11.5px] text-ink-muted">
              {e.actor} · {e.actorRole} ·{' '}
              {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function NotesTab() {
  return (
    <div className="flex flex-col gap-3">
      <textarea
        rows={3}
        placeholder="Add a note for the Finance Lead or Auditor… (e.g. why you're preparing this match)"
        className="w-full resize-none rounded-2xl bg-white/60 p-3.5 text-[13px] text-ink placeholder:text-ink-muted ring-1 ring-white/65 focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button type="button" className="self-end rounded-xl bg-white/70 px-4 py-2 text-[12.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink">
        Add note
      </button>
    </div>
  );
}

// ─── Action bar ────────────────────────────────────────────────────────────
function ActionBar({ recon, onPrepare, onReject }: { recon: Reconciliation; onPrepare: () => void; onReject: () => void }) {
  const isPrepared = recon.stage === 'prepared' || recon.stage === 'approved' || recon.stage === 'posted';
  return (
    <footer className="border-t border-white/55 bg-white/45 px-7 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* What's NOT yours — boundary clarity */}
        <span className="inline-flex items-center gap-2 rounded-xl bg-white/55 px-3 py-2 text-[12px] font-semibold text-ink-muted ring-1 ring-white/60">
          <Lock className="size-3.5" /> Approve &amp; post · Finance Lead
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {/* More actions menu */}
          <MoreActionsMenu />

          {/* Secondary */}
          <button
            type="button"
            onClick={onReject}
            disabled={isPrepared}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[13.5px] font-bold text-danger ring-1 ring-danger/25 transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="size-4" /> Reject
          </button>

          {/* Primary */}
          <button
            type="button"
            onClick={onPrepare}
            disabled={isPrepared}
            className={cn(
              'inline-flex h-11 items-center gap-2.5 rounded-2xl px-5 text-[14px] font-bold text-white shadow-[0_8px_22px_rgba(67,97,238,0.45)] transition-all hover:brightness-110 disabled:cursor-default disabled:shadow-none',
              isPrepared ? 'bg-success' : 'bg-gradient-to-br from-brand to-brand-ink',
            )}
          >
            <Check className="size-[18px]" />
            <span className="flex flex-col items-start leading-none">
              <span>{isPrepared ? 'Prepared ✓' : 'Prepare match'}</span>
              <span className="text-[10px] font-medium text-white/85">
                {isPrepared ? 'sent to Finance Lead' : '→ Finance Lead approves'}
              </span>
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}

function MoreActionsMenu() {
  const items: { label: string; icon: typeof Scissors; tone?: 'danger' | 'info' }[] = [
    { label: 'Split / partial match', icon: Scissors },
    { label: 'Manual match', icon: Link2 },
    { label: 'Request document', icon: FileText },
    { label: 'Mark as duplicate', icon: Copy, tone: 'info' },
    { label: 'Mark suspicious', icon: AlertOctagon, tone: 'danger' },
    { label: 'Assign to teammate', icon: UserPlus },
    { label: 'Escalate', icon: Forward },
  ];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/65 px-4 text-[13.5px] font-bold text-ink-soft ring-1 ring-white/70 transition-colors hover:bg-white hover:text-ink">
          <MoreHorizontal className="size-4" /> More <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="end"
          sideOffset={8}
          className="z-50 flex w-60 flex-col gap-0.5 rounded-2xl border border-glass-border-strong bg-glass-strong p-1.5 shadow-glass-lg backdrop-blur-glass-lg"
        >
          {items.map((it) => (
            <DropdownMenu.Item
              key={it.label}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold outline-none transition-colors',
                it.tone === 'danger' ? 'text-danger hover:bg-danger-soft' : it.tone === 'info' ? 'text-info hover:bg-info-soft' : 'text-ink-soft hover:bg-white/80 hover:text-ink',
              )}
            >
              <it.icon className="size-4" /> {it.label}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-ink-soft outline-none hover:bg-white/80 hover:text-ink">
            <SkipForward className="size-4" /> Skip for now
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function QueueNavButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-xl bg-white/60 text-ink-soft ring-1 ring-white/70 transition-colors hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
