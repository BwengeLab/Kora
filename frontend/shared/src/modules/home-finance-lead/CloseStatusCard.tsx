import { Link } from '@tanstack/react-router';
import { CheckCircle2, Lock, XCircle } from 'lucide-react';
import { GlassSurface, ProgressRing, cn } from '../../design-system';

export function CloseStatusCard({ tasks = [] }: { tasks?: CloseTask[] }) {
  const done = tasks.filter((task) => task.done).length;
  const blocked = tasks.filter((task) => task.blocked).length;
  const pct = done / tasks.length;
  const next = tasks.filter((task) => !task.done).slice(0, 4);

  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-ink">May month-end close</h3>
        <Link to="/audit" className="text-xs font-semibold text-brand hover:text-brand-ink">Open Controls &amp; Close</Link>
      </header>
      <div className="flex items-center gap-5">
        <ProgressRing value={pct} size={104} thickness={11} color="#4361ee">
          <div className="flex flex-col"><span className="font-display text-xl font-bold text-ink tabular">{done}/{tasks.length}</span><span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-muted">tasks</span></div>
        </ProgressRing>
        <div className="flex-1">
          <p className="font-display text-2xl font-bold text-ink">{Math.round(pct * 100)}%</p>
          <p className="text-[12px] text-ink-muted">{tasks.length - done} remaining · {blocked} blocked · due in 3 days</p>
          <span className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', blocked > 0 ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success')}><Lock className="size-3.5" /> {blocked > 0 ? 'Resolve blockers to lock' : 'On track to lock'}</span>
        </div>
      </div>
      <ul className="grid flex-1 grid-cols-1 gap-2 @2xl:grid-cols-2">
        {next.map((task) => (
          <li key={task.id} className="flex items-center gap-2.5 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
            {task.blocked ? <XCircle className="size-4 shrink-0 text-danger" /> : <CheckCircle2 className="size-4 shrink-0 text-ink-muted" />}
            <div className="min-w-0"><p className="truncate text-[12.5px] font-semibold text-ink">{task.label}</p><p className="truncate text-[10.5px] text-ink-muted">{task.owner}</p></div>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}
