import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchOwnerDashboard } from '../../api/dashboard';
import { fetchOwnerHomeSummary } from '../../api/ownerHome';
import { seedCashFlow, seedCreditPassport, seedDocuments, seedInsights, seedKpis, seedRelationships } from '../../seed/orgOwnerHome';
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
    const kpis = data?.kpis ?? seedKpis;
    const cashFlow = data?.cashFlow ?? seedCashFlow;
    const insights = dashboardData?.insights ?? seedInsights;
    const relationships = dashboardData?.relationships ?? seedRelationships;
    const creditPassport = dashboardData?.creditPassport ?? seedCreditPassport;
    const documents = dashboardData?.documents ?? seedDocuments;
    return (_jsxs("div", { className: "flex flex-col", children: [_jsx(PageHeader, { subtitle: _jsx(_Fragment, { children: "Here's your business overview for today." }), right: _jsx(DateRangePill, { label: "May 12 - May 18, 2025" }) }), _jsxs("div", { className: "@container flex flex-col gap-6 px-8", children: [_jsx("section", { className: "grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4", children: kpis.map((kpi) => (_jsx(KpiStripCard, { kpi: kpi }, kpi.id))) }), _jsxs("section", { className: "grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12", children: [_jsx("div", { className: "@5xl:col-span-6", children: _jsx(CashFlowCard, { cashFlow: cashFlow }) }), _jsx("div", { className: "@5xl:col-span-3", children: _jsx(AIInsightsCard, { insights: insights }) }), _jsx("div", { className: "@5xl:col-span-3", children: _jsx(ActionCenterCard, {}) })] }), _jsxs("section", { className: "grid grid-cols-1 items-stretch gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4", children: [_jsx(ReconciliationSnapshotCard, {}), _jsx(ExternalRelationshipsCard, { relationships: relationships }), _jsx(CreditPassportCard, { summary: creditPassport }), _jsx(AIAgentsActivityCard, {})] }), _jsx("section", { children: _jsx(RecentDocumentsCard, { documents: documents }) })] })] }));
}
