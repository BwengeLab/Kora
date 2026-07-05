import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader, Plug, XCircle, type LucideIcon } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';
import { fetchIntegrationStatuses, type IntegrationStatusItem } from '../../api/integrations';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';
import { seedIntegrations, type IntegrationStatus } from '../../seed/adminHome';

const STATUS: Record<IntegrationStatus, { label: string; icon: LucideIcon; tone: string }> = {
  connected: { label: 'Connected', icon: CheckCircle2, tone: 'text-success' },
  syncing: { label: 'Syncing', icon: Loader, tone: 'text-info' },
  error: { label: 'Error', icon: XCircle, tone: 'text-danger' },
  disconnected: { label: 'Disconnected', icon: Plug, tone: 'text-ink-muted' },
};

export function IntegrationStatusCard() {
  const session = useSession();
  const { data } = useQuery({
    queryKey: ['integrations', 'status', session?.tenant.id],
    queryFn: ({ signal }) => fetchIntegrationStatuses(getApiBaseUrl(), session!.token, signal),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });
  const items = data ?? seedIntegrations.map<IntegrationStatusItem>((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    status: item.status,
    lastSync: item.lastSync,
    connected: item.status === 'connected' || item.status === 'syncing',
  }));
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-ink">Integrations</h3>
        <Link to="/settings/integrations" className="text-xs font-semibold text-brand hover:text-brand-ink">Manage</Link>
      </header>
      <ul className="grid grid-cols-1 gap-2 @2xl:grid-cols-2">
        {items.map((it) => {
          const s = STATUS[it.status];
          return (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl bg-white/80', s.tone)}>
                <s.icon className="size-[16px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">{it.name}</p>
                <p className="truncate text-[11px] text-ink-muted">{it.category} · {it.lastSync}</p>
              </div>
              <span className={cn('shrink-0 text-[10.5px] font-bold', s.tone)}>{s.label}</span>
            </li>
          );
        })}
      </ul>
    </GlassSurface>
  );
}
