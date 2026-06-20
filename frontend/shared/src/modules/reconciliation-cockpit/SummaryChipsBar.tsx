import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedReconciliationSummary } from '../../seed/reconciliation';

// Top summary row — Auto / Suggested / Review / Duplicate / Suspicious +
// "Total this month". One chip per confidence tier; each colored to its tier
// (per doc 06 §5).
interface ChipDef {
  id: keyof typeof seedReconciliationSummary | 'total';
  label: string;
  sub: string;
  icon: LucideIcon;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'ai';
}

const CHIPS: ChipDef[] = [
  { id: 'auto', label: 'Auto-matched', sub: '≥ 95% confidence', icon: CheckCircle2, tone: 'success' },
  { id: 'suggested', label: 'Suggested', sub: '70–94%', icon: Sparkles, tone: 'ai' },
  { id: 'review', label: 'Review', sub: '< 70%', icon: AlertTriangle, tone: 'warning' },
  { id: 'duplicate', label: 'Duplicates', sub: 'flagged by agent', icon: Copy, tone: 'info' },
  { id: 'suspicious', label: 'Suspicious', sub: 'fraud / SoD', icon: AlertOctagon, tone: 'danger' },
];

const TONES = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  ai: 'bg-ai-soft text-ai',
} as const;

export function SummaryChipsBar() {
  return (
    <section className="grid grid-cols-2 gap-4 @2xl:grid-cols-3 @5xl:grid-cols-5">
      {CHIPS.map((c) => {
        const Icon = c.icon;
        const count = seedReconciliationSummary[c.id as keyof typeof seedReconciliationSummary];
        return (
          <GlassSurface key={c.id} tone="strong" className="flex h-full items-center gap-3 p-4">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONES[c.tone])}>
              <Icon className="size-[18px]" />
            </span>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="font-display text-2xl font-bold text-ink tabular">
                {count.toLocaleString()}
              </span>
              <span className="truncate text-[12px] font-semibold text-ink">{c.label}</span>
              <span className="truncate text-[10.5px] font-medium text-ink-muted">{c.sub}</span>
            </div>
          </GlassSurface>
        );
      })}
    </section>
  );
}
