import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { createPlatformTenant, createSupportRequest } from '../../api/platformAdmin';
import { fetchPlatformDashboard } from '../../api/roleHomes';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { IncidentsSupportCard } from './IncidentsSupportCard';
import { PlatformStatCards } from './PlatformStatCards';
import { TenantGrowthCard } from './TenantGrowthCard';
import { TenantsTableCard } from './TenantsTableCard';
import type { TenantGrowthData, SystemHealthData, SupportQueueItem, PlatformStats, PlatformTenant } from '../../types/api';

// Super Admin "Platform Command Center" (doc 01). Operates the platform across
// tenants — health, growth, cost-vs-revenue. A separate console, not tenant finance.
export function HomeSuperAdmin() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['platform-dashboard', token],
    queryFn: ({ signal }) => fetchPlatformDashboard(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const stats = data?.stats;
  const tenantGrowth = data?.tenantGrowth;
  const systemHealth = data?.systemHealth;
  const incidents = data?.incidents;
  const supportQueue = data?.supportQueue;
  const tenants = data?.tenants;
  const [requestingTenant, setRequestingTenant] = useState<string | undefined>();

  const provisionTenant = async () => {
    if (!token) return;
    try {
      const name = `Tenant ${(tenants?.length ?? 0) + 1}`;
      await createPlatformTenant(apiBaseUrl, token, name);
      await queryClient.invalidateQueries({ queryKey: ['platform-dashboard', token] });
      await queryClient.invalidateQueries({ queryKey: ['platform-console', token] });
      toast({ tone: 'success', title: 'Provisioning started', body: `${name} was added to the platform roster.` });
    } catch (error) {
      toast({ tone: 'warning', title: 'Provisioning failed', body: error instanceof Error ? error.message : 'Could not provision tenant.' });
    }
  };

  const requestSupportAccess = async (tenant: string) => {
    if (!token) return;
    setRequestingTenant(tenant);
    try {
      await createSupportRequest(apiBaseUrl, token, tenant);
      await queryClient.invalidateQueries({ queryKey: ['platform-dashboard', token] });
      await queryClient.invalidateQueries({ queryKey: ['platform-console', token] });
      toast({ tone: 'info', title: 'Support access requested', body: `${tenant} must consent before access is granted, and every entry is logged.` });
    } catch (error) {
      toast({ tone: 'warning', title: 'Request failed', body: error instanceof Error ? error.message : 'Could not request support access.' });
    } finally {
      setRequestingTenant(undefined);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Platform Command Center"
        subtitle={<>Health, growth and margin across all tenants.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void provisionTenant()}
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
          <div className="@5xl:col-span-5"><IncidentsSupportCard {...(incidents ? { incidents } : {})} {...(supportQueue ? { supportQueue } : {})} onRequestSupport={requestSupportAccess} {...(requestingTenant ? { requestingTenant } : {})} /></div>
        </section>

        <section>
          <TenantsTableCard {...(tenants ? { tenants } : {})} />
        </section>
      </div>
    </div>
  );
}
