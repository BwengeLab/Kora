import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowUpRight, Ban, Check, Clock, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';
import { createPlatformTenant, createPlatformUser, createSupportRequest, fetchPlatformConsole, togglePlatformFlag } from '../../api/platformAdmin';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { useSession } from '../../auth/hooks';
import { toast } from '../../state/toastStore';
import { Dot, Metric, Panel, PlatformPage } from './primitives';
const fallbackConsole = {
    tenantMetrics: { activeTenants: '48', totalSeats: '612', mrr: '$38.4k', atRisk: '2' },
    tenants: [
        { id: 'tenant-acme', name: 'Acme Insurance', plan: 'Growth', users: 9, mrr: '$499', health: 'success', since: '2024' },
        { id: 'tenant-umoja', name: 'Umoja SACCO', plan: 'Scale', users: 24, mrr: '$1,299', health: 'success', since: '2023' },
        { id: 'tenant-bright', name: 'Bright Microfinance', plan: 'Growth', users: 12, mrr: '$499', health: 'warning', since: '2024' },
        { id: 'tenant-kigali', name: 'Kigali Logistics', plan: 'Starter', users: 4, mrr: '$149', health: 'success', since: '2025' },
        { id: 'tenant-medicare', name: 'MediCare Network', plan: 'Scale', users: 31, mrr: '$1,299', health: 'success', since: '2023' },
        { id: 'tenant-pesaplus', name: 'PesaPlus Ltd', plan: 'Starter', users: 3, mrr: '$149', health: 'danger', since: '2025' },
    ],
    planMetrics: { mrr: '$38.4k', arr: '$461k', netRevenueRetention: '118%', churn: '1.2%' },
    plans: [
        { id: 'plan-starter', name: 'Starter', price: '$149', tenants: 14, features: 'Core ledger · 5 seats' },
        { id: 'plan-growth', name: 'Growth', price: '$499', tenants: 22, features: 'AI agents · 15 seats · integrations' },
        { id: 'plan-scale', name: 'Scale', price: '$1,299', tenants: 12, features: 'Multi-entity · unlimited seats · SSO' },
    ],
    featureFlags: [
        { id: 'flag-ai-copilot', name: 'AI Copilot', desc: 'Grounded assistant across all tenants', on: true },
        { id: 'flag-claims-pack', name: 'Insurance Claims pack', desc: 'Claims Officer role + workspace', on: true },
        { id: 'flag-credit-passport', name: 'Credit Passport sharing', desc: 'External lender portals', on: true },
        { id: 'flag-momo-reconcile', name: 'Mobile money auto-reconcile', desc: 'MoMo / Airtel matching agent', on: true },
        { id: 'flag-multi-entity', name: 'Multi-entity consolidation', desc: 'Group reporting (Scale only)', on: false },
        { id: 'flag-forecasting', name: 'Experimental forecasting', desc: 'ML cash-flow projections (beta)', on: false },
    ],
    healthMetrics: { overallUptime: '99.96%', openIncidents: '1', avgLatency: '78ms', errorRate: '0.04%' },
    services: [
        { id: 'svc-gateway', name: 'API Gateway', status: 'success', uptime: '99.99%', latency: '42ms' },
        { id: 'svc-core', name: 'gRPC Core (Go)', status: 'success', uptime: '99.98%', latency: '18ms' },
        { id: 'svc-agents', name: 'AI Agents (Python)', status: 'warning', uptime: '99.81%', latency: '210ms' },
        { id: 'svc-recon', name: 'Reconciliation engine', status: 'success', uptime: '99.97%', latency: '64ms' },
        { id: 'svc-ocr', name: 'Document OCR', status: 'success', uptime: '99.95%', latency: '320ms' },
        { id: 'svc-postgres', name: 'Postgres (primary)', status: 'success', uptime: '100%', latency: '3ms' },
    ],
    activeIncident: {
        title: 'Degraded performance · AI Agents',
        detail: 'AI Agents elevated latency - investigating',
        subtext: 'Started 14:20 CAT · queue backlog draining · next update 15:00',
        badge: 'Monitoring',
    },
    usageMetrics: { apiCalls: '4.2M', aiTokens: '182M', infraCost: '$6,840', grossMargin: '82%' },
    costByService: [
        { name: 'AI inference', value: 58 },
        { name: 'Compute', value: 22 },
        { name: 'Storage', value: 11 },
        { name: 'Egress', value: 9 },
    ],
    usageTenants: [
        { tenant: 'MediCare Network', share: '31%' },
        { tenant: 'Umoja SACCO', share: '24%' },
        { tenant: 'Acme Insurance', share: '14%' },
        { tenant: 'Bright Microfinance', share: '9%' },
    ],
    platformUsers: [
        { id: 'platform-jean', name: 'Jean-Paul Kagame', email: 'super@kora.local', role: 'Platform Owner', last: 'now' },
        { id: 'platform-sandrine', name: 'Sandrine Uwera', email: 'ops@kora.local', role: 'Platform Ops', last: '2h ago' },
        { id: 'platform-david', name: 'David Mutoni', email: 'support@kora.local', role: 'Support Engineer', last: '1d ago' },
        { id: 'platform-reta', name: 'Reta Bot', email: 'ci@kora.local', role: 'Service account', last: '5m ago' },
    ],
    supportGrants: [
        { id: 'grant-bright', tenant: 'Bright Microfinance', status: 'Active', detail: '38m left', tone: 'success' },
        { id: 'grant-pesaplus', tenant: 'PesaPlus Ltd', status: 'Expired', detail: 'ended 2d ago', tone: 'warning' },
        { id: 'grant-kigali', tenant: 'Kigali Logistics', status: 'Revoked', detail: 'by tenant', tone: 'danger' },
    ],
    auditEvents: [
        { id: 'audit-1', actor: 'Sandrine Uwera', action: 'Enabled feature flag', target: 'Insurance Claims · Umoja SACCO', at: '14:42', icon: 'check', tone: 'success' },
        { id: 'audit-2', actor: 'David Mutoni', action: 'Requested support access', target: 'Bright Microfinance', at: '14:05', icon: 'activity', tone: 'info' },
        { id: 'audit-3', actor: 'super@kora.local', action: 'Onboarded tenant', target: 'Kigali Logistics', at: '11:20', icon: 'plus', tone: 'brand' },
        { id: 'audit-4', actor: 'Tenant Owner', action: 'Revoked support access', target: 'Kigali Logistics', at: '10:58', icon: 'ban', tone: 'danger' },
        { id: 'audit-5', actor: 'System', action: 'Scaled AI Agents pool', target: 'latency mitigation', at: '14:20', icon: 'arrow-up-right', tone: 'warning' },
    ],
};
function usePlatformConsole() {
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const query = useQuery({
        queryKey: ['platform-console', session?.token],
        queryFn: ({ signal }) => fetchPlatformConsole(apiBaseUrl, session.token, signal),
        enabled: Boolean(session?.token),
        staleTime: 30_000,
    });
    return { session, apiBaseUrl, data: query.data ?? fallbackConsole };
}
export function PlatformTenantsPage() {
    const queryClient = useQueryClient();
    const { session, apiBaseUrl, data } = usePlatformConsole();
    const onboard = async () => {
        if (!session?.token)
            return;
        try {
            const name = `Tenant ${data.tenants.length + 1}`;
            await createPlatformTenant(apiBaseUrl, session.token, name);
            await queryClient.invalidateQueries({ queryKey: ['platform-console'] });
            toast({ tone: 'success', title: 'Provisioning started', body: `${name} was added to the platform roster.` });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Onboarding failed', body: error instanceof Error ? error.message : 'Could not provision tenant.' });
        }
    };
    return (_jsxs(PlatformPage, { title: "Tenants", subtitle: "Every business running on Kora.", right: _jsxs("button", { type: "button", onClick: () => void onboard(), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Plus, { className: "size-4" }), " Onboard tenant"] }), children: [_jsxs("div", { className: "mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(Metric, { label: "Active tenants", value: data.tenantMetrics.activeTenants }), _jsx(Metric, { label: "Total seats", value: data.tenantMetrics.totalSeats }), _jsx(Metric, { label: "MRR", value: data.tenantMetrics.mrr, tone: "text-success" }), _jsx(Metric, { label: "At-risk", value: data.tenantMetrics.atRisk, tone: "text-danger" })] }), _jsxs(Panel, { title: "All tenants", children: [_jsxs("div", { className: "grid grid-cols-[1fr_100px_80px_100px_90px] gap-3 border-b border-white/45 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Tenant" }), _jsx("span", { children: "Plan" }), _jsx("span", { className: "text-right", children: "Users" }), _jsx("span", { className: "text-right", children: "MRR" }), _jsx("span", { className: "text-right", children: "Health" })] }), _jsx("ul", { children: data.tenants.map((tenant) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => toast({ tone: 'info', title: tenant.name, body: `${tenant.plan} plan · since ${tenant.since}` }), className: "grid w-full grid-cols-[1fr_100px_80px_100px_90px] items-center gap-3 border-b border-white/40 py-3 text-left hover:bg-white/55", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(PartyAvatar, { name: tenant.name, size: "sm" }), _jsx("span", { className: "truncate text-[13px] font-semibold text-ink", children: tenant.name })] }), _jsx("span", { className: "text-[12px] font-semibold text-ink-soft", children: tenant.plan }), _jsx("span", { className: "text-right text-[12.5px] font-semibold text-ink tabular", children: tenant.users }), _jsx("span", { className: "text-right text-[12.5px] font-bold text-ink tabular", children: tenant.mrr }), _jsxs("span", { className: "flex items-center justify-end gap-1.5 text-[11px] font-bold capitalize text-ink-soft", children: [_jsx(Dot, { tone: tenant.health }), " ", tenant.health === 'success' ? 'Healthy' : tenant.health === 'warning' ? 'Watch' : 'At risk'] })] }) }, tenant.id))) })] })] }));
}
export function PlatformPlansPage() {
    const { data } = usePlatformConsole();
    return (_jsxs(PlatformPage, { title: "Plans & Billing", subtitle: "Platform revenue and plan mix.", children: [_jsxs("div", { className: "mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(Metric, { label: "MRR", value: data.planMetrics.mrr, tone: "text-success" }), _jsx(Metric, { label: "ARR", value: data.planMetrics.arr }), _jsx(Metric, { label: "Net revenue retention", value: data.planMetrics.netRevenueRetention, tone: "text-success" }), _jsx(Metric, { label: "Churn", value: data.planMetrics.churn })] }), _jsx("div", { className: "grid grid-cols-1 gap-4 @3xl:grid-cols-3", children: data.plans.map((plan) => (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2 p-5", children: [_jsxs("span", { className: "inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-ink", children: [_jsx(Sparkles, { className: "size-3.5" }), " ", plan.name] }), _jsxs("p", { className: "font-display text-3xl font-bold text-ink", children: [plan.price, _jsx("span", { className: "text-base font-semibold text-ink-muted", children: "/mo" })] }), _jsx("p", { className: "text-[12px] text-ink-muted", children: plan.features }), _jsxs("div", { className: "mt-2 rounded-xl bg-white/55 p-2.5 text-center ring-1 ring-white/60", children: [_jsx("span", { className: "font-display text-xl font-bold text-ink tabular", children: plan.tenants }), _jsx("span", { className: "ml-1.5 text-[12px] text-ink-muted", children: "tenants" })] })] }, plan.id))) })] }));
}
export function PlatformConfigPage() {
    const queryClient = useQueryClient();
    const { session, apiBaseUrl, data } = usePlatformConsole();
    const toggleFlag = async (flagId, nextOn, name) => {
        if (!session?.token)
            return;
        try {
            await togglePlatformFlag(apiBaseUrl, session.token, flagId);
            await queryClient.invalidateQueries({ queryKey: ['platform-console'] });
            toast({ tone: nextOn ? 'success' : 'warning', title: `${name} ${nextOn ? 'enabled' : 'disabled'}`, body: 'Rollout updated across tenants.' });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Flag update failed', body: error instanceof Error ? error.message : 'Could not update feature flag.' });
        }
    };
    return (_jsx(PlatformPage, { title: "Platform Config", subtitle: "Feature flags and global defaults across all tenants.", children: _jsx(Panel, { title: "Feature flags", desc: "Roll capabilities out gradually. Tenant-level overrides apply on top.", children: _jsx("div", { className: "flex flex-col gap-2", children: data.featureFlags.map((flag) => (_jsxs("button", { type: "button", onClick: () => void toggleFlag(flag.id, !flag.on, flag.name), className: "flex w-full items-center justify-between gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 hover:bg-white/70", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[13px] font-semibold text-ink", children: flag.name }), _jsx("p", { className: "text-[11.5px] text-ink-muted", children: flag.desc })] }), _jsx("span", { className: cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', flag.on ? 'bg-brand' : 'bg-ink/15'), children: _jsx("span", { className: cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', flag.on ? 'left-[22px]' : 'left-0.5') }) })] }, flag.id))) }) }) }));
}
export function PlatformHealthPage() {
    const { data } = usePlatformConsole();
    return (_jsxs(PlatformPage, { title: "System Health", subtitle: "Live service status across the platform.", children: [_jsxs("div", { className: "mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(Metric, { label: "Overall uptime (30d)", value: data.healthMetrics.overallUptime, tone: "text-success" }), _jsx(Metric, { label: "Open incidents", value: data.healthMetrics.openIncidents, tone: "text-warning" }), _jsx(Metric, { label: "Avg latency", value: data.healthMetrics.avgLatency }), _jsx(Metric, { label: "Error rate", value: data.healthMetrics.errorRate, tone: "text-success" })] }), _jsx(Panel, { title: "Services", children: _jsx("ul", { className: "flex flex-col gap-1.5", children: data.services.map((service) => (_jsxs("li", { className: "flex items-center gap-3 rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/60", children: [_jsx(Dot, { tone: service.status }), _jsx("span", { className: "flex-1 text-[13px] font-semibold text-ink", children: service.name }), _jsxs("span", { className: "text-[12px] text-ink-muted", children: ["uptime ", _jsx("span", { className: "font-bold text-ink", children: service.uptime })] }), _jsxs("span", { className: "text-[12px] text-ink-muted", children: ["latency ", _jsx("span", { className: "font-bold text-ink", children: service.latency })] })] }, service.id))) }) }), _jsx("div", { className: "mt-4", children: _jsx(Panel, { title: "Active incident", desc: data.activeIncident.detail, children: _jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-warning-soft/50 p-4 ring-1 ring-warning/20", children: [_jsx(ShieldAlert, { className: "size-5 text-warning" }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-[13px] font-bold text-ink", children: data.activeIncident.title }), _jsx("p", { className: "text-[11.5px] text-ink-muted", children: data.activeIncident.subtext })] }), _jsx("span", { className: "rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning", children: data.activeIncident.badge })] }) }) })] }));
}
export function PlatformUsagePage() {
    const { data } = usePlatformConsole();
    return (_jsxs(PlatformPage, { title: "Usage & Cost", subtitle: "Platform consumption and unit economics.", children: [_jsxs("div", { className: "mb-5 grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(Metric, { label: "API calls (30d)", value: data.usageMetrics.apiCalls }), _jsx(Metric, { label: "AI tokens (30d)", value: data.usageMetrics.aiTokens }), _jsx(Metric, { label: "Infra cost (30d)", value: data.usageMetrics.infraCost }), _jsx(Metric, { label: "Gross margin", value: data.usageMetrics.grossMargin, tone: "text-success" })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 @3xl:grid-cols-2", children: [_jsx(Panel, { title: "Cost by service", children: data.costByService.map((slice) => (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex justify-between text-[12px]", children: [_jsx("span", { className: "font-semibold text-ink-soft", children: slice.name }), _jsxs("span", { className: "font-bold text-ink tabular", children: [slice.value, "%"] })] }), _jsx("div", { className: "mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8", children: _jsx("div", { className: "h-full rounded-full bg-brand", style: { width: `${slice.value}%` } }) })] }, slice.name))) }), _jsx(Panel, { title: "Top tenants by usage", children: _jsx("ul", { className: "flex flex-col gap-1.5", children: data.usageTenants.map((tenant) => (_jsxs("li", { className: "flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/55", children: [_jsx(PartyAvatar, { name: tenant.tenant, size: "sm" }), _jsx("span", { className: "flex-1 text-[13px] font-semibold text-ink", children: tenant.tenant }), _jsx("span", { className: "text-[12.5px] font-bold text-ink tabular", children: tenant.share })] }, tenant.tenant))) }) })] })] }));
}
export function PlatformUsersPage() {
    const queryClient = useQueryClient();
    const { session, apiBaseUrl, data } = usePlatformConsole();
    const invite = async () => {
        if (!session?.token)
            return;
        try {
            const name = `Platform User ${data.platformUsers.length + 1}`;
            await createPlatformUser(apiBaseUrl, session.token, name);
            await queryClient.invalidateQueries({ queryKey: ['platform-console'] });
            toast({ tone: 'success', title: 'Invite sent', body: `${name} now has a platform access invitation.` });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Invite failed', body: error instanceof Error ? error.message : 'Could not invite platform user.' });
        }
    };
    return (_jsx(PlatformPage, { title: "Platform Users", subtitle: "Kora staff with platform-plane access.", right: _jsxs("button", { type: "button", onClick: () => void invite(), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white", children: [_jsx(Plus, { className: "size-4" }), " Invite"] }), children: _jsx(Panel, { title: "Staff", children: _jsx("ul", { className: "flex flex-col gap-1.5", children: data.platformUsers.map((user) => (_jsxs("li", { className: "flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/55", children: [_jsx(PartyAvatar, { name: user.name, size: "md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: user.name }), _jsx("p", { className: "truncate text-[11px] text-ink-muted", children: user.email })] }), _jsx("span", { className: "text-[12px] font-semibold text-ink-soft", children: user.role }), _jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] text-ink-muted", children: [_jsx(Clock, { className: "size-3" }), " ", user.last] })] }, user.id))) }) }) }));
}
export function PlatformSupportPage() {
    const queryClient = useQueryClient();
    const { session, apiBaseUrl, data } = usePlatformConsole();
    const requestAccess = async () => {
        if (!session?.token)
            return;
        try {
            const tenant = data.tenants[0]?.name ?? 'Acme Insurance';
            await createSupportRequest(apiBaseUrl, session.token, tenant);
            await queryClient.invalidateQueries({ queryKey: ['platform-console'] });
            toast({ tone: 'info', title: 'Access requested', body: `Tenant owner approval was requested for ${tenant}.` });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Request failed', body: error instanceof Error ? error.message : 'Could not request support access.' });
        }
    };
    return (_jsxs(PlatformPage, { title: "Support Access", subtitle: "Time-boxed, audited access into a tenant - only with explicit grant.", children: [_jsx(Panel, { title: "Request tenant access", desc: "Kora never sees tenant financial data without a logged, consented grant.", action: _jsxs("button", { type: "button", onClick: () => void requestAccess(), className: "inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Plus, { className: "size-3.5" }), " Request"] }), children: _jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-info-soft/50 p-4 ring-1 ring-info/20", children: [_jsx(Activity, { className: "size-5 text-info" }), _jsx("p", { className: "text-[12.5px] text-ink", children: "All support sessions are read-scoped by default, expire automatically, and are written to both the platform and tenant audit logs." })] }) }), _jsx("div", { className: "mt-4", children: _jsx(Panel, { title: "Active & recent grants", children: _jsx("ul", { className: "flex flex-col gap-1.5", children: data.supportGrants.map((grant) => (_jsxs("li", { className: "flex items-center gap-3 rounded-xl bg-white/55 px-3.5 py-3 ring-1 ring-white/60", children: [_jsx(Dot, { tone: grant.tone }), _jsx("span", { className: "flex-1 text-[13px] font-semibold text-ink", children: grant.tenant }), _jsx("span", { className: "text-[11.5px] text-ink-muted", children: grant.detail }), _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', grant.status === 'Active' ? 'bg-success-soft text-success' : 'bg-ink/10 text-ink-muted'), children: grant.status })] }, grant.id))) }) }) })] }));
}
const iconMap = {
    check: Check,
    activity: Activity,
    plus: Plus,
    ban: Ban,
    'arrow-up-right': ArrowUpRight,
};
export function PlatformAuditPage() {
    const { data } = usePlatformConsole();
    return (_jsx(PlatformPage, { title: "Platform Audit", subtitle: "Immutable record of every platform-plane action.", children: _jsx(Panel, { title: "Activity", children: _jsx("ul", { className: "flex flex-col", children: data.auditEvents.map((event) => {
                    const Icon = iconMap[event.icon];
                    return (_jsxs("li", { className: "flex items-center gap-3 border-b border-white/40 py-3 last:border-0", children: [_jsx("span", { className: cn('grid size-9 place-items-center rounded-xl bg-white/70 ring-1 ring-white/60', toneClass(event.tone)), children: _jsx(Icon, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-[13px] font-semibold text-ink", children: event.action }), _jsxs("p", { className: "truncate text-[11.5px] text-ink-muted", children: [event.actor, " \u00B7 ", event.target] })] }), _jsx("span", { className: "font-mono text-[11.5px] text-ink-muted", children: event.at })] }, event.id));
                }) }) }) }));
}
function toneClass(tone) {
    switch (tone) {
        case 'success':
            return 'text-success';
        case 'info':
            return 'text-info';
        case 'brand':
            return 'text-brand';
        case 'danger':
            return 'text-danger';
        default:
            return 'text-warning';
    }
}
