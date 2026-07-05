import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchPlatformDashboard } from '../../api/roleHomes';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { IncidentsSupportCard } from './IncidentsSupportCard';
import { PlatformStatCards } from './PlatformStatCards';
import { TenantGrowthCard } from './TenantGrowthCard';
import { TenantsTableCard } from './TenantsTableCard';

// Super Admin "Platform Command Center" (doc 01). Operates the platform across
// tenants — health, growth, cost-vs-revenue. A separate console, not tenant finance.
export function HomeSuperAdmin() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const { data } = useQuery({
    queryKey: ['platform-dashboard', token],
    queryFn: ({ signal }) => fetchPlatformDashboard(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const stats = data?.stats ?? undefined;
  const tenantGrowth = data?.tenantGrowth ?? undefined;
  const systemHealth = data?.systemHealth ?? undefined;
  const incidents = data?.incidents ?? undefined;
  const supportQueue = data?.supportQueue ?? undefined;
  const tenants = data?.tenants ?? undefined;
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Platform Command Center"
        subtitle={<>Health, growth and margin across all tenants.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => toast({ tone: 'success', title: 'Provisioning started', body: 'New tenant workspace is being created.' })}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"
            >
              <Plus className="size-4" /> Provision tenant
            </button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <PlatformStatCards {...(stats ? { stats } : {})} />

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7"><TenantGrowthCard {...(tenantGrowth ? { tenantGrowth } : {})} {...(systemHealth ? { systemHealth } : {})} /></div>
          <div className="@5xl:col-span-5"><IncidentsSupportCard {...(incidents ? { incidents } : {})} {...(supportQueue ? { supportQueue } : {})} /></div>
        </section>

        <section>
          <TenantsTableCard {...(tenants ? { tenants } : {})} />
        </section>
      </div>
    </div>
  );
}
