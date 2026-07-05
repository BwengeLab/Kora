import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader, Plug, XCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';
import { fetchIntegrationStatuses } from '../../api/integrations';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';
import { seedIntegrations } from '../../seed/adminHome';
const STATUS = {
    connected: { label: 'Connected', icon: CheckCircle2, tone: 'text-success' },
    syncing: { label: 'Syncing', icon: Loader, tone: 'text-info' },
    error: { label: 'Error', icon: XCircle, tone: 'text-danger' },
    disconnected: { label: 'Disconnected', icon: Plug, tone: 'text-ink-muted' },
};
export function IntegrationStatusCard() {
    const session = useSession();
    const { data } = useQuery({
        queryKey: ['integrations', 'status', session?.tenant.id],
        queryFn: ({ signal }) => fetchIntegrationStatuses(getApiBaseUrl(), session.token, signal),
        enabled: Boolean(session?.token),
        staleTime: 30_000,
    });
    const items = data ?? seedIntegrations.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        status: item.status,
        lastSync: item.lastSync,
        connected: item.status === 'connected' || item.status === 'syncing',
    }));
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Integrations" }), _jsx(Link, { to: "/settings/integrations", className: "text-xs font-semibold text-brand hover:text-brand-ink", children: "Manage" })] }), _jsx("ul", { className: "grid grid-cols-1 gap-2 @2xl:grid-cols-2", children: items.map((it) => {
                    const s = STATUS[it.status];
                    return (_jsxs("li", { className: "flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("span", { className: cn('grid size-9 shrink-0 place-items-center rounded-xl bg-white/80', s.tone), children: _jsx(s.icon, { className: "size-[16px]" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: it.name }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [it.category, " \u00B7 ", it.lastSync] })] }), _jsx("span", { className: cn('shrink-0 text-[10.5px] font-bold', s.tone), children: s.label })] }, it.id));
                }) })] }));
}
