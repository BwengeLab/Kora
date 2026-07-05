import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUpDown, Clock, Lock, Search, Users } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { RISK_TONE, TYPE_ICON, TYPE_TONE } from './typeMeta';
const TABS = [
    { id: 'awaiting', label: 'Awaiting you' },
    { id: 'dual', label: 'Dual-approval' },
    { id: 'done', label: 'Done' },
];
function matchesTab(a, tab) {
    if (tab === 'awaiting')
        return a.stage === 'awaiting' || a.stage === 'partial';
    if (tab === 'dual')
        return a.requiresDualApproval;
    return a.stage === 'approved' || a.stage === 'rejected';
}
export function ApprovalQueue({ items, variant, track = false, selectedId, onSelect, tab, onTab }) {
    const filtered = items.filter((a) => matchesTab(a, tab));
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col", children: [_jsxs("header", { className: "flex items-center justify-between gap-3 px-5 pt-5", children: [_jsx("h2", { className: "font-display text-[16px] font-bold text-ink", children: variant === 'org_owner' ? 'Routed up to you' : track ? 'My submissions' : 'Approval queue' }), _jsxs("button", { type: "button", className: "inline-flex h-8 items-center gap-1.5 rounded-xl bg-white/60 px-3 text-[12px] font-semibold text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink", children: [_jsx(ArrowUpDown, { className: "size-3.5" }), " Risk"] })] }), _jsx("div", { className: "mt-3 flex gap-1 px-5", children: TABS.map((t) => {
                    const count = items.filter((a) => matchesTab(a, t.id)).length;
                    const label = track && t.id === 'awaiting' ? 'Awaiting approval' : t.label;
                    return (_jsxs("button", { type: "button", onClick: () => onTab(t.id), className: cn('relative pb-2.5 text-[13px] font-semibold transition-colors', tab === t.id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'), children: [_jsxs("span", { className: "px-2", children: [label, " ", _jsx("span", { className: "tabular text-ink-muted", children: count })] }), tab === t.id ? _jsx("span", { className: "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" }) : null] }, t.id));
                }) }), _jsx("div", { className: "mx-5 border-b border-white/55" }), _jsx("div", { className: "px-5 pt-3", children: _jsxs("div", { className: "flex h-10 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70", children: [_jsx(Search, { className: "size-4 text-ink-muted" }), _jsx("input", { type: "search", placeholder: "Search approvals\u2026", className: "w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" })] }) }), _jsxs("ul", { className: "scrollbar-thin mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3", children: [filtered.map((a) => (_jsx(QueueRow, { item: a, selected: a.id === selectedId, onSelect: () => onSelect(a.id) }, a.id))), filtered.length === 0 ? (_jsx("li", { className: "grid place-items-center py-16 text-center text-[12.5px] text-ink-muted", children: "Nothing here right now." })) : null] })] }));
}
function QueueRow({ item, selected, onSelect }) {
    const Icon = TYPE_ICON[item.type];
    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: onSelect, className: cn('flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors', selected ? 'bg-white shadow-glass-soft ring-1 ring-white/85' : 'bg-white/40 hover:bg-white/70'), children: [_jsx("span", { className: cn('grid size-10 shrink-0 place-items-center rounded-xl', TYPE_TONE[item.type]), children: _jsx(Icon, { className: "size-[18px]" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "truncate text-[13.5px] font-bold text-ink", children: item.title }), _jsx("span", { className: cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', RISK_TONE[item.risk]), children: item.risk })] }), _jsx("p", { className: "truncate text-[11.5px] text-ink-muted", children: item.subtitle }), _jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-medium text-ink-muted", children: [_jsxs("span", { className: cn('inline-flex items-center gap-1', item.urgent && 'text-danger'), children: [_jsx(Clock, { className: "size-3" }), " ", item.deadlineText] }), _jsxs("span", { children: ["\u00B7 ", item.preparedBy.name] }), item.requiresDualApproval ? (_jsxs("span", { className: "inline-flex items-center gap-1 text-info", children: [_jsx(Users, { className: "size-3" }), " ", item.approvals.length, "/2"] })) : null, item.isOwnItem ? (_jsxs("span", { className: "inline-flex items-center gap-1 text-ink-muted", children: [_jsx(Lock, { className: "size-3" }), " your item"] })) : null] })] }), _jsx(MoneyCell, { amount: item.amount, size: "sm", className: "shrink-0 font-bold !text-[13px]" })] }) }));
}
