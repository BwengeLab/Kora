import { Check, Lock, User } from 'lucide-react';
import { cn } from '../../design-system';

// The approval chain: Prepared → Your approval → (2nd approval) → Executed.
// Visualizes dual-approval progress and the SoD lock when you prepared the item.
export function ApprovalChain({ item }: { item: ApprovalItem }) {
  const steps: { key: string; label: string; owner: string; state: 'done' | 'current' | 'locked' | 'future' }[] = [];

  // 1. Prepared
  steps.push({
    key: 'prepared',
    label: 'Prepared',
    owner: `${item.preparedBy.name}`,
    state: 'done',
  });

  // existing approvals (e.g. owner approved 1 of 2)
  item.approvals.forEach((a, i) =>
    steps.push({ key: `appr-${i}`, label: 'Approved', owner: a.name, state: 'done' }),
  );

  // 2. Your approval — locked if you prepared it (SoD)
  steps.push({
    key: 'you',
    label: item.isOwnItem ? 'Your approval' : 'Your approval',
    owner: item.isOwnItem ? 'Blocked — you prepared this' : 'You',
    state: item.isOwnItem ? 'locked' : 'current',
  });

  // 3. second approver if dual and not yet satisfied
  if (item.requiresDualApproval && item.approvals.length === 0) {
    steps.push({ key: 'second', label: '2nd approval', owner: 'Another approver', state: 'future' });
  }

  // 4. executed
  steps.push({ key: 'posted', label: 'Executed & posted', owner: 'System · audited', state: 'future' });

  return (
    <ol className="flex items-center gap-1">
      {steps.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-center gap-1">
          <div
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2',
              s.state === 'current' && 'border-brand/30 bg-brand-soft/70 ring-1 ring-brand/20',
              s.state === 'done' && 'border-success/20 bg-success-soft/50',
              s.state === 'locked' && 'border-danger/25 bg-danger-soft/40',
              s.state === 'future' && 'border-white/60 bg-white/35',
            )}
          >
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-lg',
                s.state === 'done' && 'bg-success text-white',
                s.state === 'current' && 'bg-brand text-white',
                s.state === 'locked' && 'bg-danger text-white',
                s.state === 'future' && 'bg-white/70 text-ink-muted',
              )}
            >
              {s.state === 'done' ? <Check className="size-4" /> : s.state === 'locked' ? <Lock className="size-3.5" /> : <User className="size-3.5" />}
            </span>
            <div className="flex min-w-0 flex-col leading-tight">
              <span
                className={cn(
                  'truncate text-[12.5px] font-bold',
                  s.state === 'current' ? 'text-brand-ink' : s.state === 'done' ? 'text-success' : s.state === 'locked' ? 'text-danger' : 'text-ink-soft',
                )}
              >
                {s.label}
              </span>
              <span className="truncate text-[10.5px] font-medium text-ink-muted">{s.owner}</span>
            </div>
          </div>
          {i < steps.length - 1 ? <span className={cn('h-0.5 w-3 shrink-0 rounded-full', s.state === 'done' ? 'bg-success/40' : 'bg-ink/10')} /> : null}
        </li>
      ))}
    </ol>
  );
}
