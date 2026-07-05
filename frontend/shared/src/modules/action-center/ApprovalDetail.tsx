import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Forward,
  Info,
  MessageSquareWarning,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import { ArrowUpFromLine } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { useSession } from '../../auth/hooks';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';
import type { ApprovalItem } from '../../seed/approvals';
import type { EvidenceDoc, HistoryEvent } from '../../seed/reconciliation';
import { approvalBlockReason, type ApproveResult } from '../../state/workflowStore';
import { ApprovalChain } from './ApprovalChain';
import { RISK_LABEL, RISK_TONE, TYPE_ICON, TYPE_TONE } from './typeMeta';
import { routedUpReason, type ActionVariant } from './variant';

type Tab = 'summary' | 'evidence' | 'history';

export function ApprovalDetail({
  items,
  variant,
  track = false,
  selectedId,
  onSelect,
  onApprove,
  onReject,
  onAction,
}: {
  items: ApprovalItem[];
  variant: ActionVariant;
  track?: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
  onAction: (id: string, action: 'withdraw' | 'nudge' | 'resubmit' | 'request-info' | 'reassign' | 'escalate') => void | Promise<void>;
}) {
  const item = useMemo(() => items.find((a) => a.id === selectedId) ?? items[0]!, [items, selectedId]);
  const [tab, setTab] = useState<Tab>('summary');
  const Icon = TYPE_ICON[item.type];
  const session = useSession();
  const actorRole = session?.roles[0]?.name ?? '';
  const actorName = session?.user.displayName ?? '';

  const idx = items.findIndex((a) => a.id === item.id);
  const prev = items[idx - 1];
  const next = items[idx + 1];
  const ownerReason = variant === 'org_owner' ? routedUpReason(item) : null;

  const done = item.stage === 'approved' || item.stage === 'rejected';
  const block = approvalBlockReason(item, actorRole, actorName); // null = allowed
  const canApprove = !done && block === null;

  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-7 pt-6">
        <div className="flex items-center gap-3">
          <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', TYPE_TONE[item.type])}>
            <Icon className="size-6" />
          </span>
          <div className="flex flex-col">
            <h2 className="font-display text-[20px] font-bold leading-tight text-ink">{item.title}</h2>
            <p className="text-[12.5px] text-ink-muted">{item.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <NavBtn label="Previous" disabled={!prev} onClick={() => prev && onSelect(prev.id)}><ChevronLeft className="size-4" /></NavBtn>
          <span className="px-1 text-[12px] font-semibold tabular text-ink-muted">{idx + 1} / {items.length}</span>
          <NavBtn label="Next" disabled={!next} onClick={() => next && onSelect(next.id)}><ChevronRight className="size-4" /></NavBtn>
        </div>
      </header>

      {/* Amount + risk strip */}
      <div className="mx-7 mt-4 flex items-center justify-between gap-4 rounded-3xl bg-white/55 px-5 py-4 ring-1 ring-white/60">
        <div className="flex flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Amount</span>
          <MoneyCell amount={item.amount} size="xl" />
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold', RISK_TONE[item.risk])}>
            {RISK_LABEL[item.risk]}
          </span>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold', item.urgent ? 'bg-danger-soft text-danger' : 'bg-white/70 text-ink-soft ring-1 ring-white/70')}>
            {item.deadlineText}
          </span>
        </div>
      </div>

      {/* Why this reached the owner (owner variant only) */}
      {ownerReason ? (
        <div className="mx-7 mt-4 flex items-center gap-2.5 rounded-2xl bg-brand-soft/70 px-4 py-2.5 ring-1 ring-brand/15">
          <ArrowUpFromLine className="size-4 shrink-0 text-brand-ink" />
          <span className="text-[12.5px] font-bold text-brand-ink">Routed up to you · {ownerReason}</span>
        </div>
      ) : null}

      {/* Approval chain */}
      <div className="px-7 pt-5">
        <ApprovalChain item={item} />
      </div>

      {/* Body */}
      <div className="scrollbar-thin mt-5 flex-1 overflow-y-auto px-7">
        {/* Policy check + SoD guard — or, for the preparer, a tracking note */}
        {track ? <TrackNote /> : <PolicyCheck item={item} block={block} />}

        {/* Agent recommendation */}
        {item.agentRecommendation ? (
          <section className="mt-4 rounded-3xl bg-gradient-to-br from-ai-soft/80 to-white/40 p-5 ring-1 ring-ai/15">
            <header className="mb-2 flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white">
                <Sparkles className="size-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-ai">Kora's recommendation</span>
            </header>
            <p className="text-[14px] leading-relaxed text-ink">{item.agentRecommendation}</p>
          </section>
        ) : null}

        {/* Tabs */}
        <div className="mt-6 flex gap-1 border-b border-white/55">
          {([
            ['summary', 'Summary'],
            ['evidence', `Evidence (${item.evidence.length})`],
            ['history', `History (${item.history.length})`],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn('relative px-3 pb-2.5 text-[13px] font-semibold transition-colors', tab === id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft')}
            >
              {label}
              {tab === id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
            </button>
          ))}
        </div>

        <div className="py-4 pb-6">
          {tab === 'summary' ? <SummaryTab item={item} /> : null}
          {tab === 'evidence' ? <EvidenceTab docs={item.evidence} context={item.title} /> : null}
          {tab === 'history' ? <HistoryTab events={item.history} /> : null}
        </div>
      </div>

      {/* Action bar — preparer tracks status; approver acts */}
      {track ? <TrackBar item={item} onAction={onAction} /> : <ActionBar item={item} canApprove={canApprove} done={done} block={block} onApprove={() => onApprove(item.id)} onReject={() => onReject(item.id)} onAction={onAction} />}
    </GlassSurface>
  );
}

// The preparer (Finance Operator) cannot approve — they prepared it. This note
// replaces the approver's policy/SoD panel.
function TrackNote() {
  return (
    <div className="mt-1 flex items-start gap-3 rounded-3xl bg-info-soft/60 p-4 ring-1 ring-info/20">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" />
      <div>
        <p className="text-[13.5px] font-bold text-info">You prepared this — it&apos;s with the approver</p>
        <p className="text-[12.5px] text-ink-soft">You prepare &amp; propose; a Finance Lead signs off. You can&apos;t approve your own work (segregation of duties). Track its status below.</p>
      </div>
    </div>
  );
}

// Status + light follow-up actions for the preparer — never approve/reject.
function TrackBar({ item, onAction }: { item: ApprovalItem; onAction: (id: string, action: 'withdraw' | 'nudge' | 'resubmit') => void | Promise<void> }) {
  const status =
    item.stage === 'approved' ? { label: 'Approved & posted', tone: 'bg-success-soft text-success' }
    : item.stage === 'rejected' ? { label: 'Sent back to you', tone: 'bg-danger-soft text-danger' }
    : item.stage === 'partial' ? { label: 'Approved 1 of 2 · awaiting final', tone: 'bg-info-soft text-info' }
    : { label: 'Awaiting Finance Lead', tone: 'bg-warning-soft text-warning' };
  const pending = item.stage === 'awaiting' || item.stage === 'partial';
  return (
    <footer className="border-t border-white/55 bg-white/45 px-7 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={cn('inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-bold', status.tone)}><Clock className="size-3.5" /> {status.label}</span>
        <div className="flex items-center gap-2">
          {pending ? (
            <>
              <button type="button" onClick={() => void onAction(item.id, 'withdraw')} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[13.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white/80">Withdraw</button>
              <button type="button" onClick={() => void onAction(item.id, 'nudge')} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 text-[13.5px] font-bold text-white shadow-glass-soft hover:brightness-110"><Forward className="size-4" /> Nudge approver</button>
            </>
          ) : item.stage === 'rejected' ? (
            <button type="button" onClick={() => void onAction(item.id, 'resubmit')} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 text-[13.5px] font-bold text-white shadow-glass-soft hover:brightness-110">Fix &amp; resubmit</button>
          ) : (
            <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-success-soft px-5 text-[14px] font-bold text-success"><Check className="size-[18px]" /> Done</span>
          )}
        </div>
      </div>
    </footer>
  );
}

// ─── Policy / SoD ────────────────────────────────────────────────────────
function PolicyCheck({ item, block }: { item: ApprovalItem; block: ApproveResult }) {
  if (block === 'sod' || item.isOwnItem) {
    return (
      <div className="mt-1 flex items-start gap-3 rounded-3xl bg-danger-soft/60 p-4 ring-1 ring-danger/20">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-danger" />
        <div>
          <p className="text-[13.5px] font-bold text-danger">Segregation of duties — you can't approve this</p>
          <p className="text-[12.5px] text-ink-soft">You prepared this item, so another approver must sign off. You can reassign or request a colleague to approve.</p>
        </div>
      </div>
    );
  }
  if (block === 'needs-first') {
    return (
      <div className="mt-1 flex items-start gap-3 rounded-3xl bg-warning-soft/60 p-4 ring-1 ring-warning/20">
        <Info className="mt-0.5 size-5 shrink-0 text-warning" />
        <div>
          <p className="text-[13.5px] font-bold text-warning">You approve last — waiting for the first approval</p>
          <p className="text-[12.5px] text-ink-soft">As Organization Owner you give the final signature on dual-approval items. This one still needs its first approval (Finance Lead) before it reaches you.</p>
        </div>
      </div>
    );
  }
  if (block === 'duplicate') {
    return (
      <div className="mt-1 flex items-start gap-3 rounded-3xl bg-info-soft/60 p-4 ring-1 ring-info/20">
        <Info className="mt-0.5 size-5 shrink-0 text-info" />
        <div>
          <p className="text-[13.5px] font-bold text-info">You already approved this</p>
          <p className="text-[12.5px] text-ink-soft">A second, different approver is required to complete it.</p>
        </div>
      </div>
    );
  }
  if (!item.withinLimit) {
    return (
      <div className="mt-1 flex items-start gap-3 rounded-3xl bg-info-soft/60 p-4 ring-1 ring-info/20">
        <Info className="mt-0.5 size-5 shrink-0 text-info" />
        <div>
          <p className="text-[13.5px] font-bold text-info">Over your approval limit — dual approval required</p>
          <p className="text-[12.5px] text-ink-soft">
            This exceeds your{' '}
            <MoneyCell amount={item.policyLimit} size="sm" className="!text-[12.5px] font-bold" /> limit.
            {item.approvals.length > 0
              ? ` ${item.approvals[0]!.name} approved (1 of 2) — your approval completes it.`
              : ' Two approvers are required before it executes.'}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-1 flex items-center gap-3 rounded-3xl bg-success-soft/60 p-4 ring-1 ring-success/20">
      <ShieldCheck className="size-5 shrink-0 text-success" />
      <p className="text-[13.5px] font-semibold text-success">
        Within your approval limit (<MoneyCell amount={item.policyLimit} size="sm" className="!text-[13px] font-bold" />). You can approve this on your own.
      </p>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────
function SummaryTab({ item }: { item: ApprovalItem }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 @2xl:grid-cols-3">
      <KV label="Type" value={item.type[0]!.toUpperCase() + item.type.slice(1)} />
      <KV label="Prepared by" value={`${item.preparedBy.name} · ${item.preparedBy.role}`} />
      <KV label="Prepared" value={new Date(item.preparedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} />
      {item.confidence !== undefined ? <KV label="Match confidence" value={`${item.confidence}%`} /> : null}
      <KV label="Deadline" value={item.deadlineText} />
      <KV label="Approvals so far" value={item.requiresDualApproval ? `${item.approvals.length} of 2` : '1 required'} />
    </dl>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[13.5px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

function EvidenceTab({ docs, context }: { docs: EvidenceDoc[]; context: string }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 @2xl:grid-cols-2">
      {docs.map((d) => (
        <li key={d.id}>
          <button
            type="button"
            onClick={() => openDoc({ name: d.name, kind: d.kind, sizeText: d.sizeText, pageRef: d.pageRef, context })}
            className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/65 hover:bg-white"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{d.name}</p>
              <p className="truncate text-[11px] text-ink-muted">{d.kind} · {d.sizeText}{d.pageRef ? ` · ${d.pageRef}` : ''}</p>
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
            <span className={cn('mt-0.5 grid size-7 place-items-center rounded-full text-white', e.kind === 'agent' ? 'bg-gradient-to-br from-ai to-brand' : e.kind === 'user' ? 'bg-brand' : 'bg-ink/40')}>
              {e.kind === 'agent' ? <Sparkles className="size-3.5" /> : <Check className="size-3.5" />}
            </span>
            {i < events.length - 1 ? <span className="my-1 w-px flex-1 bg-ink/10" /> : null}
          </div>
          <div className="pb-4">
            <p className="text-[13px] font-semibold text-ink">{e.action}</p>
            <p className="text-[11.5px] text-ink-muted">{e.actor} · {e.actorRole} · {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Action bar ────────────────────────────────────────────────────────────
function ActionBar({ item, canApprove, done, block, onApprove, onReject, onAction }: { item: ApprovalItem; canApprove: boolean; done: boolean; block: ApproveResult; onApprove: () => void | Promise<void>; onReject: () => void | Promise<void>; onAction: (id: string, action: 'request-info' | 'reassign' | 'escalate') => void | Promise<void> }) {
  const approveLabel = item.requiresDualApproval
    ? item.approvals.length === 0
      ? 'Approve (1 of 2)'
      : 'Approve & post (final)'
    : 'Approve & post';
  const blockedSub =
    block === 'needs-first'
      ? 'waiting for first approval'
      : block === 'duplicate'
        ? 'you already approved'
        : 'segregation of duties';
  const statusLabel = item.stage === 'approved' ? 'Approved ✓' : item.stage === 'rejected' ? 'Rejected' : null;
  return (
    <footer className="border-t border-white/55 bg-white/45 px-7 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-xl bg-white/55 px-3 py-2 text-[12px] font-semibold text-ink-muted ring-1 ring-white/60">
          <ShieldCheck className="size-3.5" /> Every decision is logged to the audit trail
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {done ? (
            <span className={cn('inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-[14px] font-bold', item.stage === 'approved' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
              <Check className="size-[18px]" /> {statusLabel}
            </span>
          ) : (
            <>
              <MoreMenu approvalID={item.id} onAction={onAction} />
              <button type="button" onClick={() => void onReject()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[13.5px] font-bold text-danger ring-1 ring-danger/25 transition-colors hover:bg-danger-soft">
                <X className="size-4" /> Reject
              </button>
              <button
                type="button"
                disabled={!canApprove}
                onClick={() => void onApprove()}
                className={cn(
                  'inline-flex h-11 items-center gap-2.5 rounded-2xl px-5 text-[14px] font-bold transition-all',
                  canApprove
                    ? 'bg-gradient-to-br from-success to-[#0e7a5b] text-white shadow-[0_8px_22px_rgba(22,163,123,0.45)] hover:brightness-110'
                    : 'cursor-not-allowed bg-ink/15 text-ink-muted',
                )}
              >
                <Check className="size-[18px]" />
                <span className="flex flex-col items-start leading-none">
                  <span>{canApprove ? approveLabel : 'Approval blocked'}</span>
                  <span className={cn('text-[10px] font-medium', canApprove ? 'text-white/85' : 'text-ink-muted')}>
                    {canApprove ? 'executes + writes to audit log' : blockedSub}
                  </span>
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}

function MoreMenu({ approvalID, onAction }: { approvalID: string; onAction: (id: string, action: 'request-info' | 'reassign' | 'escalate') => void | Promise<void> }) {
  const items = [
    { label: 'Request more info', icon: MessageSquareWarning, action: 'request-info' as const },
    { label: 'Reassign approver', icon: UserPlus, action: 'reassign' as const },
    { label: 'Escalate to Owner', icon: Forward, action: 'escalate' as const },
  ];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/65 px-4 text-[13.5px] font-bold text-ink-soft ring-1 ring-white/70 transition-colors hover:bg-white hover:text-ink">
          <MoreHorizontal className="size-4" /> More <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="top" align="end" sideOffset={8} className="z-50 flex w-56 flex-col gap-0.5 rounded-2xl border border-glass-border-strong bg-glass-strong p-1.5 shadow-glass-lg backdrop-blur-glass-lg">
          {items.map((it) => (
            <DropdownMenu.Item key={it.label} onSelect={() => void onAction(approvalID, it.action)} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-ink-soft outline-none transition-colors hover:bg-white/80 hover:text-ink">
              <it.icon className="size-4" /> {it.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function NavBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-9 place-items-center rounded-xl bg-white/60 text-ink-soft ring-1 ring-white/70 transition-colors hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}
