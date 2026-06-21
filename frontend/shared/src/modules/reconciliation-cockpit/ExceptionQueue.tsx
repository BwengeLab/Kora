import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ListChecks, Search, X } from 'lucide-react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import type { Reconciliation, ReconciliationTier } from '../../seed/reconciliation';

const TIER_LABEL: Record<ReconciliationTier, string> = {
  auto: 'Auto',
  suggested: 'Suggested',
  review: 'Review',
  duplicate: 'Duplicate',
  suspicious: 'Suspicious',
};
const TIER_TONE: Record<ReconciliationTier, string> = {
  auto: 'bg-success-soft text-success',
  suggested: 'bg-ai-soft text-ai',
  review: 'bg-warning-soft text-warning',
  duplicate: 'bg-info-soft text-info',
  suspicious: 'bg-danger-soft text-danger',
};

const TABS = [
  { id: 'to_review', label: 'To review' },
  { id: 'prepared', label: 'Prepared' },
  { id: 'all', label: 'All' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export interface ExceptionQueueProps {
  recons: Reconciliation[];
  selectedId: string;
  onSelect: (id: string) => void;
  tierFilter: ReconciliationTier | 'all';
  tab: TabId;
  onTab: (t: TabId) => void;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  checked: Set<string>;
  onToggleCheck: (id: string) => void;
  onClearChecks: () => void;
}

function matchesTab(r: Reconciliation, tab: TabId): boolean {
  if (tab === 'all') return true;
  if (tab === 'prepared') return r.stage === 'prepared';
  // to_review = anything the operator still has to act on
  return r.stage === 'reviewing' || r.stage === 'detected';
}

export function ExceptionQueue(props: ExceptionQueueProps) {
  const { recons, selectedId, onSelect, tierFilter, tab, onTab, selectMode, onToggleSelectMode, checked, onToggleCheck, onClearChecks } = props;

  const filtered = recons.filter(
    (r) => matchesTab(r, tab) && (tierFilter === 'all' || r.tier === tierFilter),
  );

  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="font-display text-[16px] font-bold text-ink">Exception queue</h2>
        <button
          type="button"
          onClick={onToggleSelectMode}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition-colors',
            selectMode ? 'bg-brand text-white' : 'bg-white/60 text-ink-soft ring-1 ring-white/70 hover:bg-white',
          )}
        >
          <ListChecks className="size-4" />
          {selectMode ? 'Done' : 'Select'}
        </button>
      </header>

      {/* Tabs */}
      <div className="mt-3 flex gap-1 px-5">
        {TABS.map((t) => {
          const count = recons.filter((r) => matchesTab(r, t.id)).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                'relative pb-2.5 text-[13px] font-semibold transition-colors',
                tab === t.id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft',
              )}
            >
              <span className="px-2">
                {t.label} <span className="tabular text-ink-muted">{count}</span>
              </span>
              {tab === t.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
            </button>
          );
        })}
      </div>
      <div className="mx-5 border-b border-white/55" />

      {/* Search */}
      <div className="px-5 pt-3">
        <div className="flex h-10 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
          <Search className="size-4 text-ink-muted" />
          <input
            type="search"
            placeholder="Search party, amount, reference…"
            className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <ul className="scrollbar-thin mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
        {filtered.map((r) => (
          <ExceptionRow
            key={r.id}
            recon={r}
            selected={r.id === selectedId}
            onSelect={() => onSelect(r.id)}
            selectMode={selectMode}
            checked={checked.has(r.id)}
            onToggleCheck={() => onToggleCheck(r.id)}
          />
        ))}
        {filtered.length === 0 ? (
          <li className="grid place-items-center gap-2 py-16 text-center">
            <CheckCircle2 className="size-8 text-success" />
            <p className="text-[13px] font-semibold text-ink">All caught up</p>
            <p className="text-[12px] text-ink-muted">No exceptions match this view.</p>
          </li>
        ) : null}
      </ul>

      {/* Bulk action bar */}
      {selectMode && checked.size > 0 ? (
        <footer className="flex items-center justify-between gap-3 border-t border-white/55 bg-white/55 px-4 py-3">
          <span className="text-[12.5px] font-bold text-ink">
            <span className="tabular">{checked.size}</span> selected
          </span>
          <div className="flex items-center gap-1.5">
            <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3 text-[12px] font-bold text-white shadow-glass-soft">
              <CheckCircle2 className="size-3.5" /> Prepare all
            </button>
            <button type="button" onClick={onClearChecks} className="grid size-8 place-items-center rounded-xl text-ink-muted hover:bg-white/70 hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
        </footer>
      ) : null}
    </GlassSurface>
  );
}

function ExceptionRow({
  recon,
  selected,
  onSelect,
  selectMode,
  checked,
  onToggleCheck,
}: {
  recon: Reconciliation;
  selected: boolean;
  onSelect: () => void;
  selectMode: boolean;
  checked: boolean;
  onToggleCheck: () => void;
}) {
  const t = recon.transaction;
  const ArrowIcon = t.direction === 'inflow' ? ArrowDownLeft : ArrowUpRight;
  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors',
          selected
            ? 'bg-white shadow-glass-soft ring-1 ring-white/85'
            : 'bg-white/40 hover:bg-white/70',
        )}
      >
        {selectMode ? (
          <button
            type="button"
            onClick={onToggleCheck}
            aria-label={checked ? 'Deselect' : 'Select'}
            className={cn(
              'grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
              checked ? 'border-brand bg-brand text-white' : 'border-ink/25 bg-white/70',
            )}
          >
            {checked ? <CheckCircle2 className="size-4" /> : null}
          </button>
        ) : null}

        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <PartyAvatar name={t.counterparty} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13.5px] font-bold text-ink">{t.counterparty}</p>
              <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', TIER_TONE[recon.tier])}>
                {TIER_LABEL[recon.tier]}
              </span>
            </div>
            <p className="truncate text-[11.5px] text-ink-muted">
              {t.source} · {t.reference ?? 'no ref'} · {recon.ageText}
            </p>
            {/* confidence bar */}
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8">
                <div
                  className={cn(
                    'h-full rounded-full',
                    recon.confidence >= 95 ? 'bg-success' : recon.confidence >= 70 ? 'bg-ai' : 'bg-warning',
                  )}
                  style={{ width: `${recon.confidence}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-[10.5px] font-bold tabular text-ink-soft">{recon.confidence}%</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="inline-flex items-center gap-0.5">
              <ArrowIcon className={cn('size-3.5', t.direction === 'inflow' ? 'text-success' : 'text-ink-muted')} />
              <MoneyCell amount={t.amount} size="sm" className="font-bold !text-[13px]" />
            </span>
          </div>
        </button>
      </div>
    </li>
  );
}

export type { TabId };
