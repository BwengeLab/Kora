import { ChevronRight } from 'lucide-react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { seedPlatformTenants, type TenantStatus } from '../../seed/platformHome';

const STATUS_TONE: Record<TenantStatus, string> = {
  active: 'bg-success-soft text-success',
  trial: 'bg-warning-soft text-warning',
  suspended: 'bg-danger-soft text-danger',
};

export function TenantsTableCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-3 p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-ink">Tenants</h3>
        <button type="button" className="text-xs font-semibold text-brand hover:text-brand-ink">View all 142</button>
      </header>
      <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {seedPlatformTenants.map((t) => (
          <li key={t.id}>
            <button type="button" className="group flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
              <PartyAvatar name={t.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-bold text-ink">{t.name}</p>
                  <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', STATUS_TONE[t.status])}>{t.status}</span>
                </div>
                <p className="truncate text-[11px] text-ink-muted">{t.plan} · {t.vertical}</p>
              </div>
              {/* health */}
              <div className="hidden w-24 flex-col gap-1 @2xl:flex">
                <span className="text-[10px] font-medium text-ink-muted">Health {t.healthScore}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink/8">
                  <div className={cn('h-full rounded-full', t.healthScore >= 85 ? 'bg-success' : t.healthScore >= 60 ? 'bg-warning' : 'bg-danger')} style={{ width: `${t.healthScore}%` }} />
                </div>
              </div>
              <MoneyCell amount={t.mrr} size="sm" className="w-20 shrink-0 text-right font-bold !text-[12.5px]" />
              <ChevronRight className="size-4 shrink-0 text-ink-muted group-hover:text-ink" />
            </button>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}
