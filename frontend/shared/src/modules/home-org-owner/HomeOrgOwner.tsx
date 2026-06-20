import { DateRangePill, PageHeader } from '../../app/shell';
import { seedKpis } from '../../seed/orgOwnerHome';
import { AIAgentsActivityCard } from './AIAgentsActivityCard';
import { AIInsightsCard } from './AIInsightsCard';
import { ActionCenterCard } from './ActionCenterCard';
import { CashFlowCard } from './CashFlowCard';
import { CreditPassportCard } from './CreditPassportCard';
import { ExternalRelationshipsCard } from './ExternalRelationshipsCard';
import { KpiStripCard } from './KpiStripCard';
import { ReconciliationSnapshotCard } from './ReconciliationSnapshotCard';
import { RecentDocumentsCard } from './RecentDocumentsCard';

// Org Owner "Business Command Center" Home — composes the module library per
// role-ux/02-organization-owner.md §"Home". Layout mirrors the reference image:
//   • Greeting + date-range pill across the top
//   • 4 KPIs (xl: in one row)
//   • Middle row: Cash Flow (6) · AI Insights (3) · Action Center (3)
//   • Lower row: Reconciliation Snapshot (4) · External Relationships (4) · Credit Passport (4) · AI Agents (4)
//   • Recent Documents full-width
// Container queries / responsive collapse the lower rows on narrower windows.

export function HomeOrgOwner() {
  return (
    <div className="flex flex-col">
      <PageHeader
        subtitle={<>Here&apos;s your business overview for today.</>}
        right={<DateRangePill label="May 12 – May 18, 2025" />}
      />
      <div className="flex flex-col gap-6 px-8">
        {/* KPI strip */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {seedKpis.map((k) => (
            <KpiStripCard key={k.id} kpi={k} />
          ))}
        </section>

        {/* Cash Flow + AI Insights + Action Center */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <CashFlowCard />
          </div>
          <div className="xl:col-span-3">
            <AIInsightsCard />
          </div>
          <div className="xl:col-span-3">
            <ActionCenterCard />
          </div>
        </section>

        {/* Reconciliation · Relationships · Credit Passport · AI Agents */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <ReconciliationSnapshotCard />
          <ExternalRelationshipsCard />
          <CreditPassportCard />
          <AIAgentsActivityCard />
        </section>

        {/* Recent documents */}
        <section>
          <RecentDocumentsCard />
        </section>
      </div>
    </div>
  );
}
