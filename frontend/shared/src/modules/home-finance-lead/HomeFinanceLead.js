import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, CheckCircle2, Download, ShieldCheck, TimerReset } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { fetchFinanceLeadDashboard } from '../../api/governanceOps';
import { DateRangePill, PageHeader } from '../../app/shell';
import { KpiCard } from '../../design-system';
import { seedInsights } from '../../seed/orgOwnerHome';
import { seedCashForecast } from '../../seed/financeLeadHome';
import { seedCloseTasks } from '../../seed/financeLeadClose';
import { useSessionStore } from '../../state/sessionStore';
import { useWorkflowStore } from '../../state/workflowStore';
import { AIInsightsCard, ReconciliationSnapshotCard } from '../home-org-owner';
import { ApprovalsAwaitingCard } from './ApprovalsAwaitingCard';
import { CashForecastCard } from './CashForecastCard';
import { CloseStatusCard } from './CloseStatusCard';
const KPI_ICON = {
    awaiting: _jsx(ShieldCheck, {}),
    prepared: _jsx(CheckCircle2, {}),
    exceptions: _jsx(TimerReset, {}),
    suspicious: _jsx(AlertTriangle, {}),
};
export function HomeFinanceLead() {
    const token = useSessionStore((s) => s.session?.token ?? '');
    const apiBaseUrl = getApiBaseUrl();
    const approvals = useWorkflowStore((s) => s.approvals);
    const reconciliations = useWorkflowStore((s) => s.reconciliations);
    const [dashboardData, setDashboardData] = useState(null);
    useEffect(() => {
        if (!token)
            return;
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
    const pendingApprovalValue = {
        amountMinor: pendingApprovals.reduce((sum, item) => sum + item.amount.amountMinor, 0n),
        currency: pendingApprovals[0]?.amount.currency ?? 'USD',
    };
    const preparedValue = {
        amountMinor: preparedReconciliations.reduce((sum, item) => sum + item.transaction.amount.amountMinor, 0n),
        currency: preparedReconciliations[0]?.transaction.amount.currency ?? 'USD',
    };
    const exceptionValue = {
        amountMinor: openReconciliations.reduce((sum, item) => sum + (item.unexplainedDifference?.amountMinor ?? item.transaction.amount.amountMinor), 0n),
        currency: openReconciliations[0]?.transaction.amount.currency ?? 'USD',
    };
    const workflowKpis = [
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
    return (_jsxs("div", { className: "flex flex-col", children: [_jsx(PageHeader, { subtitle: _jsxs(_Fragment, { children: [pendingApprovals.length, " approvals need you \u00B7 ", openReconciliations.length, " reconciliation exceptions remain under review."] }), right: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs("button", { type: "button", className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass transition-colors hover:bg-white hover:text-ink", children: [_jsx(Download, { className: "size-4" }), " Export summary"] }), _jsx(DateRangePill, { label: "May 12 - May 18, 2025" })] }) }), _jsxs("div", { className: "@container flex flex-col gap-6 px-8 pb-8", children: [_jsx("section", { className: "grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4", children: workflowKpis.map((kpi) => (_jsx(KpiCard, { label: kpi.label, icon: KPI_ICON[kpi.id], ...(kpi.money ? { money: kpi.money } : {}), ...(kpi.valueText ? { valueText: kpi.valueText } : {}), ...(kpi.delta ? { delta: kpi.delta } : {}), ...(kpi.positiveDirection ? { positiveDirection: kpi.positiveDirection } : {}) }, kpi.id))) }), _jsxs("section", { className: "grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12", children: [_jsx("div", { className: "@5xl:col-span-7", children: _jsx(ApprovalsAwaitingCard, {}) }), _jsx("div", { className: "@5xl:col-span-5", children: _jsx(AIInsightsCard, { insights: insights }) })] }), _jsxs("section", { className: "grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12", children: [_jsx("div", { className: "@5xl:col-span-7", children: _jsx(CashForecastCard, { forecast: cashForecast }) }), _jsx("div", { className: "@5xl:col-span-5", children: _jsx(ReconciliationSnapshotCard, {}) })] }), _jsx("section", { children: _jsx(CloseStatusCard, { tasks: closeTasks }) })] })] }));
}
