import { useQuery } from '@tanstack/react-query';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchOwnerDashboard } from '../../api/dashboard';
import { fetchOwnerHomeSummary } from '../../api/ownerHome';
import { useSessionStore } from '../../state/sessionStore';
import { AIAgentsActivityCard } from './AIAgentsActivityCard';
import { AIInsightsCard } from './AIInsightsCard';
import { ActionCenterCard } from './ActionCenterCard';
import { CashFlowCard } from './CashFlowCard';
import { CreditPassportCard } from './CreditPassportCard';
import { ExternalRelationshipsCard } from './ExternalRelationshipsCard';
import { KpiStripCard } from './KpiStripCard';
import { ReconciliationSnapshotCard } from './ReconciliationSnapshotCard';
import { RecentDocumentsCard } from './RecentDocumentsCard';

export function HomeOrgOwner() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const { data } = useQuery({
    queryKey: ['owner-home-summary', token],
    queryFn: ({ signal }) => fetchOwnerHomeSummary(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const { data: dashboardData } = useQuery({
    queryKey: ['owner-dashboard', token],
    queryFn: ({ signal }) => fetchOwnerDashboard(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const kpis = data?.kpis ?? [];
  const cashFlow = data?.cashFlow ?? [];
  const insights = dashboardData?.insights ?? [];
  const relationships = dashboardData?.relationships ?? [];
  const creditPassport = dashboardData?.creditPassport ?? {};
  const documents = dashboardData?.documents ?? [];

  return (
    <div className="flex flex-col">
      <PageHeader
        subtitle={<>Here&apos;s your business overview for today.</>}
        right={<DateRangePill label="May 12 - May 18, 2025" />}
      />
      <div className="@container flex flex-col gap-6 px-8">
        <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiStripCard key={kpi.id} kpi={kpi} />
          ))}
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-6">
            <CashFlowCard cashFlow={cashFlow} />
          </div>
          <div className="@5xl:col-span-3">
            <AIInsightsCard insights={insights} />
          </div>
          <div className="@5xl:col-span-3">
            <ActionCenterCard />
          </div>
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4">
          <ReconciliationSnapshotCard />
          <ExternalRelationshipsCard relationships={relationships} />
          <CreditPassportCard summary={creditPassport} />
          <AIAgentsActivityCard />
        </section>

        <section>
          <RecentDocumentsCard documents={documents} />
        </section>
      </div>
    </div>
  );
}
