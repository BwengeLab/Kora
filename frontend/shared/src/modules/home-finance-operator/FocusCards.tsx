import { Link } from '@tanstack/react-router';
import { ArrowRight, FileWarning, GitBranch, Link2Off, Sparkles, type LucideIcon } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { useWorkflowStore } from '../../state/workflowStore';

interface FocusDef {
  to: string;
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tone: string;
  primary?: boolean;
}

export function FocusCards({ focus = seedOperatorFocus }: { focus?: typeof seedOperatorFocus }) {
  const recons = useWorkflowStore((s) => s.reconciliations);
  const dismissed = useWorkflowStore((s) => s.dismissedReconIds);

  // Live: exceptions still needing the operator, and AI suggestions to review.
  const openRecons = recons.filter((r) => r.stage === 'reviewing' || r.stage === 'detected');
  const exceptionsToClear = openRecons.length;
  const agentSuggestions = openRecons.filter(
    (r) => r.suggestedRecord && !dismissed.includes(r.id),
  ).length;

  const cards: FocusDef[] = [
    { to: '/reconciliation', label: 'My exceptions', value: String(exceptionsToClear), sub: 'to clear today', icon: GitBranch, tone: 'from-brand to-brand-ink text-white', primary: true },
    { to: '/transactions', label: 'Unmatched', value: String(focus.unmatchedCount), sub: 'transactions', icon: Link2Off, tone: 'bg-warning-soft text-warning' },
    { to: '/data-intake', label: 'Data-quality flags', value: String(focus.dataQualityFlags), sub: 'files need review', icon: FileWarning, tone: 'bg-danger-soft text-danger' },
    { to: '/agents', label: 'Agent suggestions', value: String(agentSuggestions), sub: 'awaiting your review', icon: Sparkles, tone: 'bg-ai-soft text-ai' },
  ];

  return (
    <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4">
      {cards.map((c) => (
        <Link key={c.to} to={c.to} className="group">
          <GlassSurface
            tone="strong"
            className={cn(
              'flex h-full flex-col gap-3 p-5 transition-transform group-hover:-translate-y-0.5',
              c.primary && 'bg-gradient-to-br from-brand/95 to-brand-ink/95 ring-1 ring-white/30',
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  'grid size-11 place-items-center rounded-2xl',
                  c.primary ? 'bg-white/20 text-white' : c.tone,
                )}
              >
                <c.icon className="size-[20px]" />
              </span>
              <ArrowRight className={cn('size-4 transition-transform group-hover:translate-x-0.5', c.primary ? 'text-white/80' : 'text-ink-muted')} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('font-display text-4xl font-bold leading-none tabular', c.primary ? 'text-white' : 'text-ink')}>
                {c.value}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={cn('text-[13.5px] font-bold', c.primary ? 'text-white' : 'text-ink')}>{c.label}</span>
              <span className={cn('text-[11.5px] font-medium', c.primary ? 'text-white/80' : 'text-ink-muted')}>{c.sub}</span>
            </div>
            {c.primary ? (
              <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-[12px] font-bold text-white">
                Continue reconciling <ArrowRight className="size-3.5" />
              </span>
            ) : null}
          </GlassSurface>
        </Link>
      ))}
    </section>
  );
}
