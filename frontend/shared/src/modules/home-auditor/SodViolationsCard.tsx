import { ChevronRight, ShieldAlert } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedSodViolations } from '../../seed/auditorHome';

export function SodViolationsCard({ items = seedSodViolations }: { items?: typeof seedSodViolations }) {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-xl bg-danger-soft text-danger">
          <ShieldAlert className="size-4" />
        </span>
        <h3 className="font-display text-base font-bold text-ink">Segregation-of-duty violations</h3>
      </header>
      <ul className="flex flex-col gap-2">
        {items.map((v) => (
          <li key={v.id}>
            <button type="button" className="group flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-bold text-ink">{v.user}</p>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', v.severity === 'high' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning')}>
                    {v.severity}
                  </span>
                </div>
                <p className="truncate text-[11.5px] font-semibold text-ink-soft">{v.conflict}</p>
                <p className="truncate text-[11px] text-ink-muted">{v.detail}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-ink-muted group-hover:text-ink" />
            </button>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}
