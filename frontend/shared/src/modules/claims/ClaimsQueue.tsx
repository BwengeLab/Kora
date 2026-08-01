import { Search } from 'lucide-react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { useClaimsStore } from '../../state/claimsStore';
import { SEVERITY_TONE, TYPE_ICON, TYPE_TONE, fraudTone } from './claimMeta';

export function ClaimsQueue({
  selectedId,
  onSelect,
  stageFilter,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  stageFilter: ClaimStage | 'all';
}) {
  const claims = useClaimsStore((s) => s.claims);
  const filtered = stageFilter === 'all' ? claims : claims.filter((c) => c.stage === stageFilter);

  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="font-display text-[16px] font-bold text-ink">Claims</h2>
        <span className="text-[11px] font-semibold text-ink-muted tabular">{filtered.length}</span>
      </header>
      <div className="px-5 pt-3">
        <div className="flex h-10 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
          <Search className="size-4 text-ink-muted" />
          <input type="search" placeholder="Search claimant, policy, claim #…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
        </div>
      </div>
      <ul className="scrollbar-thin mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
        {filtered.map((c) => (
          <ClaimRow key={c.id} claim={c} selected={c.id === selectedId} onSelect={() => onSelect(c.id)} />
        ))}
        {filtered.length === 0 ? (
          <li className="grid place-items-center py-12 text-center text-[12.5px] text-ink-muted">No claims in this stage.</li>
        ) : null}
      </ul>
    </GlassSurface>
  );
}

function ClaimRow({ claim: c, selected, onSelect }: { claim: Claim; selected: boolean; onSelect: () => void }) {
  const Icon = TYPE_ICON[c.type];
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn('flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors', selected ? 'bg-white shadow-glass-soft ring-1 ring-white/85' : 'bg-white/40 hover:bg-white/70')}
      >
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TYPE_TONE[c.type])}>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-bold text-ink">{c.claimant}</p>
            <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', SEVERITY_TONE[c.triageSeverity])}>{c.triageSeverity}</span>
          </div>
          <p className="truncate text-[11px] text-ink-muted">{c.id} · {c.policyNumber} · {c.slaText}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={cn('rounded-full px-1.5 py-0.5 text-[9.5px] font-bold', fraudTone(c.fraudScore))}>Fraud {c.fraudScore}</span>
            {c.fraudFlags.length > 0 ? <span className="text-[10px] font-medium text-danger">{c.fraudFlags.length} flag{c.fraudFlags.length > 1 ? 's' : ''}</span> : null}
          </div>
        </div>
        <MoneyCell amount={c.claimedAmount} size="sm" className="shrink-0 font-bold !text-[13px]" />
      </button>
    </li>
  );
}
