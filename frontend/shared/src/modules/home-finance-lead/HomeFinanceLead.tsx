import { Banknote, Download, Receipt, TrendingUp, Wallet2 } from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { KpiCard } from '../../design-system';
import { AIInsightsCard, ReconciliationSnapshotCard } from '../home-org-owner';
import { seedFinanceLeadKpis, type FlKpi } from '../../seed/financeLeadHome';
import { seedApprovalStats } from '../../seed/approvals';
import { ApprovalsAwaitingCard } from './ApprovalsAwaitingCard';
import { CashForecastCard } from './CashForecastCard';
import { CloseStatusCard } from './CloseStatusCard';

const KPI_ICON = {
  cash: <Banknote />,
  projected: <TrendingUp />,
  receivables: <Wallet2 />,
  payables: <Receipt />,
} satisfies Record<FlKpi['id'], React.ReactNode>;

// Finance Lead "Finance Control Center" home (doc 03). Decision-weighted:
// approvals-awaiting is the hero; the rest is the finance state.
export function HomeFinanceLead() {
  const s = seedApprovalStats;
  return (
    <div className="flex flex-col">
      <PageHeader
        subtitle={<>{s.awaitingCount} approvals need you · cash is healthy and on track.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass transition-colors hover:bg-white hover:text-ink"
            >
              <Download className="size-4" /> Export summary
            </button>
            <DateRangePill label="May 12 – May 18, 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        {/* KPI strip */}
        <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4">
          {seedFinanceLeadKpis.map((k) => (
            <KpiCard
              key={k.id}
              label={k.label}
              money={k.money}
              icon={KPI_ICON[k.id]}
              delta={k.delta}
              positiveDirection={k.positiveDirection}
            />
          ))}
        </section>

        {/* Hero: approvals + AI insights */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7">
            <ApprovalsAwaitingCard />
          </div>
          <div className="@5xl:col-span-5">
            <AIInsightsCard />
          </div>
        </section>

        {/* Cash forecast + reconciliation snapshot */}
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7">
            <CashForecastCard />
          </div>
          <div className="@5xl:col-span-5">
            <ReconciliationSnapshotCard />
          </div>
        </section>

        {/* Month-end close status */}
        <section>
          <CloseStatusCard />
        </section>
      </div>
    </div>
  );
}
