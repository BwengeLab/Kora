import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Building2, Database, Plug, ReceiptText, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';
const TABS = [
    { to: '/settings/org', label: 'Organization', icon: Building2 },
    { to: '/settings/users-and-roles', label: 'Users & Roles', icon: Users },
    { to: '/settings/rules-and-policies', label: 'Rules & Policies', icon: ShieldCheck },
    { to: '/settings/integrations', label: 'Integrations', icon: Plug },
    { to: '/settings/billing', label: 'Billing', icon: ReceiptText },
    { to: '/settings/data', label: 'Data & Retention', icon: Database },
];
// Admin Console shell — a left sub-nav over the six settings surfaces, with the
// active page rendered in the Outlet. Org Admin manages the org here; it has no
// financial authority (that lives with Finance Lead / Owner).
export function SettingsLayout() {
    const path = useRouterState({ select: (s) => s.location.pathname });
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Settings", subtitle: "Manage your organization, people, policies, integrations and billing." }), _jsxs("div", { className: "flex min-h-0 flex-1 gap-5 px-8 pb-6", children: [_jsx(GlassSurface, { tone: "strong", className: "flex w-[220px] shrink-0 flex-col gap-1 p-3", children: TABS.map((t) => {
                            const active = path === t.to || (path === '/settings' && t.to === '/settings/org');
                            return (_jsxs(Link, { to: t.to, className: cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors', active ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-soft hover:bg-white/55 hover:text-ink'), children: [_jsx(t.icon, { className: "size-[18px]" }), " ", t.label] }, t.to));
                        }) }), _jsx("div", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1", children: _jsx(Outlet, {}) })] })] }));
}
