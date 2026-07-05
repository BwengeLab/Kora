import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Plug, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
export function AdminStatCards({ stats }) {
    const cards = [
        { label: 'Active users', value: String(stats.activeUsers), sub: `${stats.customRoles} custom roles`, icon: Users, tone: 'bg-brand-soft text-brand-ink' },
        { label: 'Pending requests', value: String(stats.pendingRequests), sub: 'awaiting your action', icon: UserCheck, tone: 'bg-warning-soft text-warning' },
        { label: 'Integrations', value: `${stats.integrationsConnected}/${stats.integrationsTotal}`, sub: 'connected', icon: Plug, tone: 'bg-success-soft text-success' },
        { label: 'Active policies', value: String(stats.activePolicies), sub: 'versioned & audited', icon: ShieldCheck, tone: 'bg-ai-soft text-ai' },
    ];
    return (_jsx("section", { className: "grid grid-cols-2 gap-5 @5xl:grid-cols-4", children: cards.map((card) => (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2 p-5", children: [_jsx("span", { className: cn('grid size-10 place-items-center rounded-2xl', card.tone), children: _jsx(card.icon, { className: "size-[18px]" }) }), _jsx("span", { className: "font-display text-3xl font-bold leading-none text-ink tabular", children: card.value }), _jsx("span", { className: "text-[12.5px] font-semibold text-ink", children: card.label }), _jsx("span", { className: "text-[10.5px] font-medium text-ink-muted", children: card.sub })] }, card.label))) }));
}
