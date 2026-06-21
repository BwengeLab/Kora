import { ShieldAlert } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedAccessAlerts } from '../../seed/adminHome';

export function AccessAlertsCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-xl bg-danger-soft text-danger">
          <ShieldAlert className="size-4" />
        </span>
        <h3 className="font-display text-base font-bold text-ink">Access &amp; security alerts</h3>
      </header>
      <ul className="flex flex-col gap-2">
        {seedAccessAlerts.map((a) => (
          <li
            key={a.id}
            className={cn(
              'rounded-2xl p-3 ring-1',
              a.severity === 'high' ? 'bg-danger-soft/50 ring-danger/20' : 'bg-warning-soft/40 ring-warning/20',
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('size-2 rounded-full', a.severity === 'high' ? 'bg-danger' : 'bg-warning')} />
              <p className="text-[13px] font-bold text-ink">{a.title}</p>
            </div>
            <p className="mt-0.5 pl-4 text-[11.5px] text-ink-soft">{a.detail}</p>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}
