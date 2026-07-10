import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchAdminDashboard, resolveAdminAccessRequest } from '../../api/dashboard';
import { seedAccessAlerts, seedAccessRequests, seedAdminStats, seedAdminUsers, seedBilling, seedPolicies, type AccessRequest } from '../../seed/adminHome';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { AccessAlertsCard } from './AccessAlertsCard';
import { AccessRequestsCard } from './AccessRequestsCard';
import { AdminStatCards } from './AdminStatCards';
import { FeatureMarketplaceCard } from './FeatureMarketplaceCard';
import { IntegrationStatusCard } from './IntegrationStatusCard';
import { PolicyBillingCard } from './PolicyBillingCard';
import { UsersAccessCard } from './UsersAccessCard';

export function HomeOrgAdmin() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const [resolvingID, setResolvingID] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['admin-dashboard', token],
    queryFn: ({ signal }) => fetchAdminDashboard(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ requestID, action }: { requestID: string; action: 'grant' | 'deny' }) =>
      resolveAdminAccessRequest(apiBaseUrl, token, requestID, action),
    onSuccess: (payload) => {
      queryClient.setQueryData(['admin-dashboard', token], payload);
    },
  });

  const stats = data?.stats ?? seedAdminStats;
  const users = data?.users ?? seedAdminUsers;
  const accessRequests = data?.accessRequests ?? seedAccessRequests;
  const accessAlerts = data?.accessAlerts ?? seedAccessAlerts;
  const policies = data?.policies ?? seedPolicies;
  const billing = data?.billing ?? seedBilling;

  async function handleResolve(request: AccessRequest, action: 'grant' | 'deny') {
    setResolvingID(request.id);
    try {
      await resolveMutation.mutateAsync({ requestID: request.id, action });
      toast({
        tone: action === 'grant' ? 'success' : 'warning',
        title: action === 'grant' ? 'Access granted' : 'Request denied',
        body: `${request.name} · ${request.requestedRole}`,
      });
    } catch (error) {
      toast({
        tone: 'danger',
        title: 'Access update failed',
        body: error instanceof Error ? error.message : 'Could not resolve this access request.',
      });
    } finally {
      setResolvingID(null);
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        subtitle={<>Your organization&apos;s setup at a glance - access, integrations and policies.</>}
        right={
          <Link to="/settings/users-and-roles" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
            <Plus className="size-4" /> Invite user
          </Link>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <AdminStatCards stats={stats} />

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7"><UsersAccessCard users={users} /></div>
          <div className="@5xl:col-span-5"><AccessAlertsCard alerts={accessAlerts} /></div>
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-5">
            <AccessRequestsCard items={accessRequests} busyID={resolvingID} onResolve={handleResolve} />
          </div>
          <div className="@5xl:col-span-7"><IntegrationStatusCard /></div>
        </section>

        <section>
          <FeatureMarketplaceCard />
        </section>

        <section>
          <PolicyBillingCard policies={policies} billing={billing} />
        </section>
      </div>
    </div>
  );
}
