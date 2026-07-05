import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Popover from '@radix-ui/react-popover';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, Calculator, Check, CheckCircle2, ChevronDown, GitBranch, Layers, Mail, Search, Settings as SettingsIcon, ShieldAlert, Sparkles, } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';
import { seedEntities } from '../../seed/entities';
import { useCopilotStore } from '../../state/copilotStore';
import { useEntityStore } from '../../state/entityStore';
import { useUnreadCount } from '../../state/mailStore';
import { useToolsStore } from '../../state/toolsStore';
import { useWorkflowStore } from '../../state/workflowStore';
// Slim top bar: centered search, then a working Copilot button + a live
// Notifications popover + Settings, plus the tenant chip.
export function TopBar() {
    const session = useSession();
    const toggleCopilot = useCopilotStore((s) => s.toggle);
    const openTools = useToolsStore((s) => s.open);
    const unread = useUnreadCount();
    return (_jsxs("header", { className: "flex items-center gap-3 px-8 pt-6 pb-2", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex h-12 flex-1 items-center gap-3 px-5 py-0", children: [_jsx(Search, { className: "size-[18px] text-ink-muted" }), _jsx("input", { type: "search", placeholder: "Search anything\u2026", className: "w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none" }), _jsxs("kbd", { className: "inline-flex shrink-0 items-center gap-1 rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-muted ring-1 ring-white/80", children: [_jsx("span", { children: "\u2318" }), "K"] })] }), _jsx("button", { type: "button", "aria-label": "Tools", title: "Tools & calculators", onClick: openTools, className: circleClass, children: _jsx(Calculator, { className: "size-[18px]" }) }), _jsxs(CircleLink, { to: "/mail", label: "Mail", children: [_jsx(Mail, { className: "size-[18px]" }), unread > 0 ? (_jsx("span", { className: "absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white ring-2 ring-white", children: unread })) : null] }), _jsx("button", { type: "button", "aria-label": "Kora copilot", title: "Kora copilot", onClick: toggleCopilot, className: circleClass, children: _jsx(Sparkles, { className: "size-[18px]" }) }), _jsx(NotificationsBell, {}), _jsx(CircleLink, { to: "/account", label: "Account & preferences", children: _jsx(SettingsIcon, { className: "size-[18px]" }) }), session ? _jsx(EntitySwitcher, { tenantName: session.tenant.name }) : null] }));
}
const circleClass = cn('relative grid size-12 place-items-center rounded-2xl', 'bg-glass-strong border border-glass-border-strong backdrop-blur-glass text-ink-soft shadow-glass', 'hover:text-ink hover:bg-white transition-colors');
// Live notifications, derived from the workflow store.
function NotificationsBell() {
    const approvals = useWorkflowStore((s) => s.approvals);
    const recons = useWorkflowStore((s) => s.reconciliations);
    const auditLog = useWorkflowStore((s) => s.auditLog);
    const pending = approvals.filter((a) => a.stage === 'awaiting' || a.stage === 'partial');
    const suspicious = recons.filter((r) => r.tier === 'suspicious' && r.stage !== 'posted');
    const recent = auditLog.slice(0, 3);
    const notes = [];
    if (pending.length > 0)
        notes.push({ id: 'n-appr', tone: 'info', icon: _jsx(GitBranch, { className: "size-4" }), title: `${pending.length} approvals awaiting`, sub: 'Routed to your Action Center' });
    if (suspicious.length > 0)
        notes.push({ id: 'n-susp', tone: 'danger', icon: _jsx(ShieldAlert, { className: "size-4" }), title: `${suspicious.length} suspicious flagged`, sub: 'Review with the Audit agent' });
    recent.forEach((e) => notes.push({ id: e.id, tone: 'success', icon: _jsx(CheckCircle2, { className: "size-4" }), title: e.action, sub: `${e.actor} · ${e.target}` }));
    const count = pending.length + suspicious.length;
    const toneClass = { info: 'bg-info-soft text-info', danger: 'bg-danger-soft text-danger', success: 'bg-success-soft text-success' };
    return (_jsxs(Popover.Root, { children: [_jsx(Popover.Trigger, { asChild: true, children: _jsxs("button", { type: "button", "aria-label": "Notifications", title: "Notifications", className: circleClass, children: [_jsx(Bell, { className: "size-[18px]" }), count > 0 ? (_jsx("span", { className: "absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white", children: count })) : null] }) }), _jsx(Popover.Portal, { children: _jsxs(Popover.Content, { align: "end", sideOffset: 10, className: "z-50 w-[340px] rounded-3xl border border-glass-border-strong bg-glass-strong p-2 shadow-glass-lg backdrop-blur-glass-lg", children: [_jsx("p", { className: "px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Notifications" }), _jsxs("ul", { className: "flex max-h-[60vh] flex-col gap-1 overflow-y-auto", children: [notes.map((n) => (_jsxs("li", { className: "flex items-start gap-3 rounded-2xl p-3 hover:bg-white/60", children: [_jsx("span", { className: cn('grid size-8 shrink-0 place-items-center rounded-xl', toneClass[n.tone]), children: n.icon }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: n.title }), _jsx("p", { className: "truncate text-[11px] text-ink-muted", children: n.sub })] })] }, n.id))), notes.length === 0 ? (_jsx("li", { className: "px-3 py-8 text-center text-[12.5px] text-ink-muted", children: "You're all caught up \uD83C\uDF89" })) : null] })] }) })] }));
}
// Entity switcher — the multi-entity context for the whole app. Small businesses
// stay on "All entities" and never think about it; groups switch between
// subsidiaries and the consolidated view.
function EntitySwitcher({ tenantName }) {
    const scope = useEntityStore((s) => s.scope);
    const setScope = useEntityStore((s) => s.setScope);
    const active = scope === 'all' ? null : seedEntities.find((e) => e.id === scope) ?? null;
    const choose = (s) => setScope(s);
    return (_jsxs(DropdownMenu.Root, { children: [_jsx(DropdownMenu.Trigger, { asChild: true, children: _jsxs("button", { type: "button", className: "flex h-12 items-center gap-2.5 rounded-2xl border border-glass-border-strong bg-glass-strong pl-3 pr-3.5 backdrop-blur-glass transition-colors hover:bg-white", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-lg bg-brand-soft text-brand-ink", children: active ? _jsx("span", { className: "text-[14px] leading-none", children: active.flag }) : _jsx(Layers, { className: "size-[14px]" }) }), _jsxs("span", { className: "flex flex-col items-start leading-tight", children: [_jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-ink-muted", children: tenantName }), _jsx("span", { className: "text-[13px] font-bold text-ink", children: active ? active.short : 'All entities' })] }), _jsx(ChevronDown, { className: "size-3.5 text-ink-muted" })] }) }), _jsx(DropdownMenu.Portal, { children: _jsxs(DropdownMenu.Content, { align: "end", sideOffset: 10, className: "z-50 w-[300px] rounded-3xl border border-glass-border-strong bg-glass-strong p-2 shadow-glass-lg backdrop-blur-glass-lg", children: [_jsx("p", { className: "px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Entity context" }), _jsxs(DropdownMenu.Item, { onSelect: () => choose('all'), className: "flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 outline-none hover:bg-white/70", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink", children: _jsx(Layers, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-[13px] font-bold text-ink", children: "All entities" }), _jsx("p", { className: "text-[11px] text-ink-muted", children: "Consolidated group view" })] }), scope === 'all' ? _jsx(Check, { className: "size-4 text-brand" }) : null] }), _jsx("div", { className: "my-1 mx-2 border-t border-white/55" }), seedEntities.map((e) => (_jsxs(DropdownMenu.Item, { onSelect: () => choose(e.id), className: "flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 outline-none hover:bg-white/70", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-white/70 text-[16px] leading-none ring-1 ring-white/60", children: e.flag }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: e.name }), e.base ? _jsx("span", { className: "rounded-full bg-success-soft px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-success", children: "base" }) : null] }), _jsxs("p", { className: "text-[11px] capitalize text-ink-muted", children: [e.country, " \u00B7 ", e.kind, " \u00B7 ", e.currency] })] }), scope === e.id ? _jsx(Check, { className: "size-4 text-brand" }) : null] }, e.id)))] }) })] }));
}
function CircleLink({ to, label, children }) {
    return (_jsx(Link, { to: to, "aria-label": label, title: label, className: circleClass, children: children }));
}
