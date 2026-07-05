import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  FileText,
  Handshake,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import type { RelationshipRowSeed } from '../../seed/orgOwnerHome';

const ICON_MAP: Record<RelationshipRowSeed['iconKey'], LucideIcon> = {
  customers: Users,
  suppliers: Building2,
  partners: Handshake,
  contracts: FileText,
  renewals: CalendarClock,
};

const TONE_MAP: Record<RelationshipRowSeed['trendTone'], string> = {
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-ink-muted',
};

export function ExternalRelationshipsCard({ relationships }: { relationships: RelationshipRowSeed[] }) {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-5">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">External Relationships</h3>
        <button type="button" className="text-xs font-semibold text-brand hover:text-brand-ink">
          View all
        </button>
      </header>
      <ul className="flex flex-col">
        {relationships.map((row) => {
          const Icon = ICON_MAP[row.iconKey];
          return (
            <li key={row.id} className="flex items-center gap-3 border-b border-white/50 py-2.5 last:border-b-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/80 text-ink-soft">
                <Icon className="size-[16px]" />
              </span>
              <span className="flex-1 text-[13px] font-semibold text-ink">{row.label}</span>
              <span className="w-12 text-right text-[13px] font-bold text-ink tabular">{row.count}</span>
              <span className={cn('inline-flex w-32 items-center justify-end gap-1 text-[11px] font-semibold', TONE_MAP[row.trendTone])}>
                {row.trendTone === 'success' ? <ArrowUpRight className="size-3" /> : null}
                <span>{row.trendText}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </GlassSurface>
  );
}
