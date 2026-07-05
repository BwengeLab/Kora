import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { PageHeader } from '../../app/shell';
import { fetchAdminDashboard } from '../../api/dashboard';
import { getApiBaseUrl } from '../../api/client';
import { seedAccessAlerts, seedAccessRequests, seedAdminStats, seedAdminUsers, seedBilling, seedPolicies } from '../../seed/adminHome';
import { useSessionStore } from '../../state/sessionStore';
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
    const { data } = useQuery({
        queryKey: ['admin-dashboard', token],
        queryFn: ({ signal }) => fetchAdminDashboard(apiBaseUrl, token, signal),
        enabled: Boolean(token),
    });
    const stats = data?.stats ?? seedAdminStats;
    const users = data?.users ?? seedAdminUsers;
    const accessRequests = data?.accessRequests ?? seedAccessRequests;
    const accessAlerts = data?.accessAlerts ?? seedAccessAlerts;
    const policies = data?.policies ?? seedPolicies;
    const billing = data?.billing ?? seedBilling;
    return (_jsxs("div", { className: "flex flex-col", children: [_jsx(PageHeader, { subtitle: _jsx(_Fragment, { children: "Your organization's setup at a glance - access, integrations and policies." }), right: _jsxs(Link, { to: "/settings/users-and-roles", className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Plus, { className: "size-4" }), " Invite user"] }) }), _jsxs("div", { className: "@container flex flex-col gap-6 px-8 pb-8", children: [_jsx(AdminStatCards, { stats: stats }), _jsxs("section", { className: "grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12", children: [_jsx("div", { className: "@5xl:col-span-7", children: _jsx(UsersAccessCard, { users: users }) }), _jsx("div", { className: "@5xl:col-span-5", children: _jsx(AccessAlertsCard, { alerts: accessAlerts }) })] }), _jsxs("section", { className: "grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12", children: [_jsx("div", { className: "@5xl:col-span-5", children: _jsx(AccessRequestsCard, { items: accessRequests }) }), _jsx("div", { className: "@5xl:col-span-7", children: _jsx(IntegrationStatusCard, {}) })] }), _jsx("section", { children: _jsx(FeatureMarketplaceCard, {}) }), _jsx("section", { children: _jsx(PolicyBillingCard, { policies: policies, billing: billing }) })] })] }));
}
