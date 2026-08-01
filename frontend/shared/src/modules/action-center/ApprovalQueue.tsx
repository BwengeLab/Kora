import { ArrowUpDown, Clock, Lock, Search, Users } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { RISK_TONE, TYPE_ICON, TYPE_TONE } from './typeMeta';
import type { ActionVariant } from './variant';

const TABS = [
  { id: 'awaiting', label: 'Awaiting you' },
  { id: 'dual', label: 'Dual-approval' },
  { id: 'done', label: 'Done' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function matchesTab(a: ApprovalItem, tab: TabId): boolean {
  if (tab === 'awaiting') return a.stage === 'awaiting' || a.stage === 'partial';
  if (tab === 'dual') return a.requiresDualApproval;
  return a.stage === 'approved' || a.stage === 'rejected';
}

export interface ApprovalQueueProps {
  items: ApprovalItem[];
  variant: ActionVariant;
  track?: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  tab: TabId;
  onTab: (t: TabId) => void;
}

export function ApprovalQueue({ items, variant, track = false, selectedId, onSelect, tab, onTab }: ApprovalQueueProps) {
  const filtered = items.filter((a) => matchesTab(a, tab));
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="font-display text-[16px] font-bold text-ink">
          {variant === 'org_owner' ? 'Routed up to you' : track ? 'My submissions' : 'Approval queue'}
        </h2>
        <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white/60 px-3 text-[12px] font-semibold text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink">
          <ArrowUpDown className="size-3.5" /> Risk
        </button>
      </header>

      <div className="mt-3 flex gap-1 px-5">
        {TABS.map((t) => {
          const count = items.filter((a) => matchesTab(a, t.id)).length;
          const label = track && t.id === 'awaiting' ? 'Awaiting approval' : t.label;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn('relative pb-2.5 text-[13px] font-semibold transition-colors', tab === t.id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft')}
            >
              <span className="px-2">{label} <span className="tabular text-ink-muted">{count}</span></span>
              {tab === t.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
            </button>
          );
        })}
      </div>
      <div className="mx-5 border-b border-white/55" />

      <div className="px-5 pt-3">
        <div className="flex h-10 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
          <Search className="size-4 text-ink-muted" />
          <input type="search" placeholder="Search approvals…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
        </div>
      </div>

      <ul className="scrollbar-thin mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
        {filtered.map((a) => (
          <QueueRow key={a.id} item={a} selected={a.id === selectedId} onSelect={() => onSelect(a.id)} />
        ))}
        {filtered.length === 0 ? (
          <li className="grid place-items-center py-16 text-center text-[12.5px] text-ink-muted">Nothing here right now.</li>
        ) : null}
      </ul>
    </GlassSurface>
  );
}

function QueueRow({ item, selected, onSelect }: { item: ApprovalItem; selected: boolean; onSelect: () => void }) {
  const Icon = TYPE_ICON[item.type];
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn('flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors', selected ? 'bg-white shadow-glass-soft ring-1 ring-white/85' : 'bg-white/40 hover:bg-white/70')}
      >
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TYPE_TONE[item.type])}>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13.5px] font-bold text-ink">{item.title}</p>
            <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', RISK_TONE[item.risk])}>{item.risk}</span>
          </div>
          <p className="truncate text-[11.5px] text-ink-muted">{item.subtitle}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-medium text-ink-muted">
            <span className={cn('inline-flex items-center gap-1', item.urgent && 'text-danger')}>
              <Clock className="size-3" /> {item.deadlineText}
            </span>
            <span>· {item.preparedBy.name}</span>
            {item.requiresDualApproval ? (
              <span className="inline-flex items-center gap-1 text-info"><Users className="size-3" /> {item.approvals.length}/2</span>
            ) : null}
            {item.isOwnItem ? (
              <span className="inline-flex items-center gap-1 text-ink-muted"><Lock className="size-3" /> your item</span>
            ) : null}
          </div>
        </div>
        <MoneyCell amount={item.amount} size="sm" className="shrink-0 font-bold !text-[13px]" />
      </button>
    </li>
  );
}

export type { TabId };
