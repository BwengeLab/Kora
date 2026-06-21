import { Link } from '@tanstack/react-router';
import { CheckCircle2, FileWarning, Loader, type LucideIcon, Upload } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedIntakeBatches, type BatchStatus } from '../../seed/operatorHome';

const STATUS: Record<BatchStatus, { label: string; icon: LucideIcon; tone: string }> = {
  processed: { label: 'Processed', icon: CheckCircle2, tone: 'text-success' },
  processing: { label: 'Processing', icon: Loader, tone: 'text-info' },
  needs_review: { label: 'Needs review', icon: FileWarning, tone: 'text-warning' },
};

export function DataIntakeCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-3 p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-ink">Data intake</h3>
        <Link to="/data-intake" className="text-xs font-semibold text-brand hover:text-brand-ink">
          Open
        </Link>
      </header>

      {/* Drag-drop quick upload */}
      <button
        type="button"
        className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-brand/40 bg-white/40 p-4 text-left text-brand transition-colors hover:bg-white/70"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Upload className="size-5" />
        </span>
        <div>
          <p className="text-[13px] font-bold">Quick upload</p>
          <p className="text-[11px] font-medium text-ink-muted">
            Drag &amp; drop a statement, invoice or receipt — or <span className="underline">browse</span>
          </p>
        </div>
      </button>

      {/* Recent batches */}
      <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {seedIntakeBatches.map((b) => {
          const s = STATUS[b.status];
          return (
            <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl bg-white/80', s.tone)}>
                <s.icon className="size-[16px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">{b.name}</p>
                <p className="truncate text-[11px] text-ink-muted">
                  {b.source} · {b.records} records · {b.when}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={cn('text-[10.5px] font-bold', s.tone)}>{s.label}</span>
                {b.flags > 0 ? (
                  <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[9.5px] font-bold text-danger">
                    {b.flags} flags
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </GlassSurface>
  );
}
