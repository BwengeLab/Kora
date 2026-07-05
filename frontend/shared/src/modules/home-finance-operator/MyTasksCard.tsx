import { Link } from '@tanstack/react-router';
import { Clock, type LucideIcon, MailQuestion, PenLine, RotateCcw, Send } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedOperatorTasks, type TaskStatus } from '../../seed/operatorHome';

const STATUS: Record<TaskStatus, { label: string; icon: LucideIcon; tone: string }> = {
  assigned: { label: 'Assigned', icon: PenLine, tone: 'bg-brand-soft text-brand-ink' },
  awaiting_info: { label: 'Awaiting info', icon: MailQuestion, tone: 'bg-warning-soft text-warning' },
  prepared: { label: 'Prepared', icon: Send, tone: 'bg-success-soft text-success' },
  returned: { label: 'Returned', icon: RotateCcw, tone: 'bg-danger-soft text-danger' },
};

export function MyTasksCard({ tasks = seedOperatorTasks }: { tasks?: typeof seedOperatorTasks }) {
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-3 p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-ink">My tasks</h3>
        <Link to="/approvals" className="text-xs font-semibold text-brand hover:text-brand-ink">
          View all
        </Link>
      </header>
      <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {tasks.map((t) => {
          const s = STATUS[t.status];
          return (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', s.tone)}>
                <s.icon className="size-[16px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">{t.title}</p>
                <p className="truncate text-[11px] text-ink-muted">{t.context}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={cn('rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', s.tone)}>
                  {s.label}
                </span>
                <span className={cn('inline-flex items-center gap-1 text-[10.5px] font-medium', t.urgent ? 'text-danger' : 'text-ink-muted')}>
                  <Clock className="size-3" /> {t.deadlineText}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </GlassSurface>
  );
}
