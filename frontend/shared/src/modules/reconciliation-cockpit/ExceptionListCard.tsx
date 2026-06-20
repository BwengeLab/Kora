import { ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import { ConfidenceChip, GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import {
  seedReconciliations,
  type Reconciliation,
  type ReconciliationTier,
} from '../../seed/reconciliation';

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

export interface ExceptionListCardProps {
  selectedId: string;
  onSelect: (id: string) => void;
  tierFilter: ReconciliationTier | 'all';
  onTierFilter: (t: ReconciliationTier | 'all') => void;
}

const TIER_FILTERS: { id: ReconciliationTier | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'suggested', label: 'Suggested' },
  { id: 'review', label: 'Review' },
  { id: 'duplicate', label: 'Duplicates' },
  { id: 'suspicious', label: 'Suspicious' },
];

export function ExceptionListCard({ selectedId, onSelect, tierFilter, onTierFilter }: ExceptionListCardProps) {
  const filtered = tierFilter === 'all' ? seedReconciliations : seedReconciliations.filter((r) => r.tier === tierFilter);
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-3 p-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-1">
        <h3 className="font-display text-[15px] font-semibold text-ink">Exceptions</h3>
        <span className="text-[11px] font-semibold text-ink-muted tabular">
          {filtered.length} of {seedReconciliations.length}
        </span>
      </header>

      {/* Search */}
      <div className="flex h-9 items-center gap-2 rounded-xl bg-white/70 px-3 ring-1 ring-white/70">
        <Search className="size-4 text-ink-muted" />
        <input
          type="search"
          placeholder="Search party, amount, reference…"
          className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>

      {/* Tier filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {TIER_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onTierFilter(f.id)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
              tierFilter === f.id
                ? 'bg-brand text-white shadow-glass-soft'
                : 'bg-white/55 text-ink-soft hover:bg-white/80 hover:text-ink',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {filtered.map((r) => (
          <ExceptionRow
            key={r.id}
            recon={r}
            selected={r.id === selectedId}
            onSelect={() => onSelect(r.id)}
          />
        ))}
        {filtered.length === 0 ? (
          <li className="grid place-items-center py-12 text-center text-[12px] text-ink-muted">
            No exceptions in this tier.
          </li>
        ) : null}
      </ul>
    </GlassSurface>
  );
}

function ExceptionRow({ recon, selected, onSelect }: { recon: Reconciliation; selected: boolean; onSelect: () => void }) {
  const t = recon.transaction;
  const ArrowIcon = t.direction === 'inflow' ? ArrowDownLeft : ArrowUpRight;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors',
          selected
            ? 'bg-white text-ink shadow-glass-soft ring-1 ring-white/85'
            : 'bg-white/40 text-ink-soft hover:bg-white/70 hover:text-ink',
        )}
      >
        <PartyAvatar name={t.counterparty} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-ink">{t.counterparty}</p>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide',
                TIER_TONE[recon.tier],
              )}
            >
              {TIER_LABEL[recon.tier]}
            </span>
          </div>
          <p className="truncate text-[11px] text-ink-muted">
            {t.source} · {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {t.reference ? ` · ${t.reference}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-0.5">
            <ArrowIcon
              className={cn(
                'size-3',
                t.direction === 'inflow' ? 'text-success' : 'text-ink-muted',
              )}
            />
            <MoneyCell amount={t.amount} size="sm" className="font-semibold !text-[12.5px]" />
          </span>
          <ConfidenceChip score={recon.confidence} className="!text-[9.5px] !leading-3" />
        </div>
      </button>
    </li>
  );
}
