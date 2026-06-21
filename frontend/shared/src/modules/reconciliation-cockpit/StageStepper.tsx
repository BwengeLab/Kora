import { Check, Lock } from 'lucide-react';
import { cn } from '../../design-system';
import type { ReconStage } from '../../seed/reconciliation';

// The lifecycle stepper — the single element that removes all "am I allowed
// to do this?" confusion. Operator owns Review + Prepare; the locked steps
// (with a 🔒 and "Finance Lead") belong to someone else.

interface StepDef {
  stage: ReconStage;
  label: string;
  owner: string;
  ownedByOperator: boolean;
}

const STEPS: StepDef[] = [
  { stage: 'detected', label: 'Detected', owner: 'Kora AI', ownedByOperator: false },
  { stage: 'reviewing', label: 'Review', owner: 'You', ownedByOperator: true },
  { stage: 'prepared', label: 'Prepare', owner: 'You', ownedByOperator: true },
  { stage: 'approved', label: 'Approve', owner: 'Finance Lead', ownedByOperator: false },
  { stage: 'posted', label: 'Post to ledger', owner: 'Finance Lead', ownedByOperator: false },
];

const ORDER: ReconStage[] = ['detected', 'reviewing', 'prepared', 'approved', 'posted'];

export function StageStepper({ current }: { current: ReconStage }) {
  const currentIdx = ORDER.indexOf(current);

  return (
    <ol className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const idx = ORDER.indexOf(step.stage);
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;
        const lockedForOperator = !step.ownedByOperator && isFuture;

        return (
          <li key={step.stage} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2 transition-colors',
                isCurrent && 'border-brand/30 bg-brand-soft/70 ring-1 ring-brand/20',
                isDone && 'border-success/20 bg-success-soft/50',
                isFuture && 'border-white/60 bg-white/35',
              )}
            >
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-lg text-[12px] font-bold',
                  isDone && 'bg-success text-white',
                  isCurrent && 'bg-brand text-white',
                  isFuture && (lockedForOperator ? 'bg-white/70 text-ink-muted' : 'bg-white/70 text-ink-soft'),
                )}
              >
                {isDone ? <Check className="size-4" /> : lockedForOperator ? <Lock className="size-3.5" /> : i + 1}
              </span>
              <div className="flex min-w-0 flex-col leading-tight">
                <span
                  className={cn(
                    'truncate text-[12.5px] font-bold',
                    isCurrent ? 'text-brand-ink' : isDone ? 'text-success' : 'text-ink-soft',
                  )}
                >
                  {step.label}
                </span>
                <span className="truncate text-[10.5px] font-medium text-ink-muted">
                  {isCurrent ? `You are here · ${step.owner}` : step.owner}
                </span>
              </div>
            </div>
            {i < STEPS.length - 1 ? (
              <span className={cn('h-0.5 w-3 shrink-0 rounded-full', isDone ? 'bg-success/40' : 'bg-ink/10')} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
