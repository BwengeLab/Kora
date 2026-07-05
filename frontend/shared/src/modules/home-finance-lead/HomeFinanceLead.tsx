import { AlertTriangle, CheckCircle2, Download, ShieldCheck, TimerReset } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { fetchFinanceLeadDashboard, type FinanceLeadDashboardPayload } from '../../api/governanceOps';
import { DateRangePill, PageHeader } from '../../app/shell';
import { KpiCard } from '../../design-system';
import type { Money } from '../../lib/money';
import { seedInsights } from '../../seed/orgOwnerHome';
import { seedCashForecast } from '../../seed/financeLeadHome';
import { seedCloseTasks } from '../../seed/financeLeadClose';
import { useSessionStore } from '../../state/sessionStore';
import { useWorkflowStore } from '../../state/workflowStore';
import { AIInsightsCard, ReconciliationSnapshotCard } from '../home-org-owner';
import { ApprovalsAwaitingCard } from './ApprovalsAwaitingCard';
import { CashForecastCard } from './CashForecastCard';
import { CloseStatusCard } from './CloseStatusCard';

interface FinanceLeadKpi {
  id: 'awaiting' | 'prepared' | 'exceptions' | 'suspicious';
  label: string;
  money?: Money;
  valueText?: string;
  delta?: {
    direction: 'up' | 'down';
    valueText: string;
    label: string;
  };
  positiveDirection?: 'up' | 'down';
}

const KPI_ICON: Record<FinanceLeadKpi['id'], ReactNode> = {
  awaiting: <ShieldCheck />,
  prepared: <CheckCircle2 />,
  exceptions: <TimerReset />,
  suspicious: <AlertTriangle />,
};

export function HomeFinanceLead() {
  const token = useSessionStore((s) => s.session?.token ?? '');
  const apiBaseUrl = getApiBaseUrl();
  const approvals = useWorkflowStore((s) => s.approvals);
  const reconciliations = useWorkflowStore((s) => s.reconciliations);
  const [dashboardData, setDashboardData] = useState<FinanceLeadDashboardPayload | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchFinanceLeadDashboard(apiBaseUrl, token, controller.signal)
      .then(setDashboardData)
      .catch(() => {
        if (!controller.signal.aborted) {
          setDashboardData(null);
        }
      });
    return () => controller.abort();
  }, [apiBaseUrl, token]);

  const pendingApprovals = approvals.filter((item) => item.stage === 'awaiting' || item.stage === 'partial');
  const preparedReconciliations = reconciliations.filter((item) => item.stage === 'prepared');
  const openReconciliations = reconciliations.filter((item) => item.stage === 'detected' || item.stage === 'reviewing');
  const suspiciousReconciliations = reconciliations.filter((item) => item.tier === 'suspicious');

  const pendingApprovalValue: Money = {
    amountMinor: pendingApprovals.reduce((sum, item) => sum + item.amount.amountMinor, 0n),
    currency: pendingApprovals[0]?.amount.currency ?? 'USD',
  };
  const preparedValue: Money = {
    amountMinor: preparedReconciliations.reduce((sum, item) => sum + item.transaction.amount.amountMinor, 0n),
    currency: preparedReconciliations[0]?.transaction.amount.currency ?? 'USD',
  };
  const exceptionValue: Money = {
    amountMinor: openReconciliations.reduce(
      (sum, item) => sum + (item.unexplainedDifference?.amountMinor ?? item.transaction.amount.amountMinor),
      0n,
    ),
    currency: openReconciliations[0]?.transaction.amount.currency ?? 'USD',
  };

  const workflowKpis: FinanceLeadKpi[] = [
    {
      id: 'awaiting',
      label: 'Awaiting approval value',
      money: pendingApprovalValue,
      delta: {
        direction: pendingApprovals.length > 0 ? 'up' : 'down',
        valueText: String(pendingApprovals.length),
        label: 'items in queue',
      },
      positiveDirection: 'down',
    },
    {
      id: 'prepared',
      label: 'Prepared to post',
      money: preparedValue,
      delta: {
        direction: preparedReconciliations.length > 0 ? 'up' : 'down',
        valueText: String(preparedReconciliations.length),
        label: 'matches prepared',
      },
      positiveDirection: 'up',
    },
    {
      id: 'exceptions',
      label: 'Open exception value',
      money: exceptionValue,
      delta: {
        direction: openReconciliations.length > 0 ? 'up' : 'down',
        valueText: String(openReconciliations.length),
        label: 'needs review',
      },
      positiveDirection: 'down',
    },
    {
      id: 'suspicious',
      label: 'Suspicious items',
      valueText: String(suspiciousReconciliations.length),
      delta: {
        direction: suspiciousReconciliations.length > 0 ? 'up' : 'down',
        valueText: String(suspiciousReconciliations.filter((item) => item.stage !== 'posted').length),
        label: 'still unresolved',
      },
      positiveDirection: 'down',
    },
  ];

  const insights = dashboardData?.insights ?? seedInsights;
  const cashForecast = dashboardData?.cashForecast ?? seedCashForecast;
  const closeTasks = dashboardData?.closeTasks ?? seedCloseTasks;

  return (
    <div className="flex flex-col">
      <PageHeader
        subtitle={
          <>
            {pendingApprovals.length} approvals need you · {openReconciliations.length} reconciliation exceptions remain under review.
          </>
        }
        right={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass transition-colors hover:bg-white hover:text-ink"
            >
              <Download className="size-4" /> Export summary
            </button>
            <DateRangePill label="May 12 - May 18, 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <section className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4">
          {workflowKpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              label={kpi.label}
              icon={KPI_ICON[kpi.id]}
              {...(kpi.money ? { money: kpi.money } : {})}
              {...(kpi.valueText ? { valueText: kpi.valueText } : {})}
              {...(kpi.delta ? { delta: kpi.delta } : {})}
              {...(kpi.positiveDirection ? { positiveDirection: kpi.positiveDirection } : {})}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7">
            <ApprovalsAwaitingCard />
          </div>
          <div className="@5xl:col-span-5">
            <AIInsightsCard insights={insights} />
          </div>
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <div className="@5xl:col-span-7">
            <CashForecastCard forecast={cashForecast} />
          </div>
          <div className="@5xl:col-span-5">
            <ReconciliationSnapshotCard />
          </div>
        </section>

        <section>
          <CloseStatusCard tasks={closeTasks} />
        </section>
      </div>
    </div>
  );
}
