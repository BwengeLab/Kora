import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ListChecks, Search, X } from 'lucide-react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
const TIER_LABEL = {
    auto: 'Auto',
    suggested: 'Suggested',
    review: 'Review',
    duplicate: 'Duplicate',
    suspicious: 'Suspicious',
};
const TIER_TONE = {
    auto: 'bg-success-soft text-success',
    suggested: 'bg-ai-soft text-ai',
    review: 'bg-warning-soft text-warning',
    duplicate: 'bg-info-soft text-info',
    suspicious: 'bg-danger-soft text-danger',
};
const TABS = [
    { id: 'to_review', label: 'To review' },
    { id: 'prepared', label: 'Prepared' },
    { id: 'all', label: 'All' },
];
function matchesTab(r, tab) {
    if (tab === 'all')
        return true;
    if (tab === 'prepared')
        return r.stage === 'prepared';
    // to_review = anything the operator still has to act on
    return r.stage === 'reviewing' || r.stage === 'detected';
}
export function ExceptionQueue(props) {
    const { recons, selectedId, onSelect, tierFilter, tab, onTab, selectMode, onToggleSelectMode, checked, onToggleCheck, onClearChecks } = props;
    const filtered = recons.filter((r) => matchesTab(r, tab) && (tierFilter === 'all' || r.tier === tierFilter));
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col", children: [_jsxs("header", { className: "flex items-center justify-between gap-3 px-5 pt-5", children: [_jsx("h2", { className: "font-display text-[16px] font-bold text-ink", children: "Exception queue" }), _jsxs("button", { type: "button", onClick: onToggleSelectMode, className: cn('inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition-colors', selectMode ? 'bg-brand text-white' : 'bg-white/60 text-ink-soft ring-1 ring-white/70 hover:bg-white'), children: [_jsx(ListChecks, { className: "size-4" }), selectMode ? 'Done' : 'Select'] })] }), _jsx("div", { className: "mt-3 flex gap-1 px-5", children: TABS.map((t) => {
                    const count = recons.filter((r) => matchesTab(r, t.id)).length;
                    return (_jsxs("button", { type: "button", onClick: () => onTab(t.id), className: cn('relative pb-2.5 text-[13px] font-semibold transition-colors', tab === t.id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'), children: [_jsxs("span", { className: "px-2", children: [t.label, " ", _jsx("span", { className: "tabular text-ink-muted", children: count })] }), tab === t.id ? _jsx("span", { className: "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" }) : null] }, t.id));
                }) }), _jsx("div", { className: "mx-5 border-b border-white/55" }), _jsx("div", { className: "px-5 pt-3", children: _jsxs("div", { className: "flex h-10 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70", children: [_jsx(Search, { className: "size-4 text-ink-muted" }), _jsx("input", { type: "search", placeholder: "Search party, amount, reference\u2026", className: "w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" })] }) }), _jsxs("ul", { className: "scrollbar-thin mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3", children: [filtered.map((r) => (_jsx(ExceptionRow, { recon: r, selected: r.id === selectedId, onSelect: () => onSelect(r.id), selectMode: selectMode, checked: checked.has(r.id), onToggleCheck: () => onToggleCheck(r.id) }, r.id))), filtered.length === 0 ? (_jsxs("li", { className: "grid place-items-center gap-2 py-16 text-center", children: [_jsx(CheckCircle2, { className: "size-8 text-success" }), _jsx("p", { className: "text-[13px] font-semibold text-ink", children: "All caught up" }), _jsx("p", { className: "text-[12px] text-ink-muted", children: "No exceptions match this view." })] })) : null] }), selectMode && checked.size > 0 ? (_jsxs("footer", { className: "flex items-center justify-between gap-3 border-t border-white/55 bg-white/55 px-4 py-3", children: [_jsxs("span", { className: "text-[12.5px] font-bold text-ink", children: [_jsx("span", { className: "tabular", children: checked.size }), " selected"] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsxs("button", { type: "button", className: "inline-flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3 text-[12px] font-bold text-white shadow-glass-soft", children: [_jsx(CheckCircle2, { className: "size-3.5" }), " Prepare all"] }), _jsx("button", { type: "button", onClick: onClearChecks, className: "grid size-8 place-items-center rounded-xl text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] })] })) : null] }));
}
function ExceptionRow({ recon, selected, onSelect, selectMode, checked, onToggleCheck, }) {
    const t = recon.transaction;
    const ArrowIcon = t.direction === 'inflow' ? ArrowDownLeft : ArrowUpRight;
    return (_jsx("li", { children: _jsxs("div", { className: cn('group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors', selected
                ? 'bg-white shadow-glass-soft ring-1 ring-white/85'
                : 'bg-white/40 hover:bg-white/70'), children: [selectMode ? (_jsx("button", { type: "button", onClick: onToggleCheck, "aria-label": checked ? 'Deselect' : 'Select', className: cn('grid size-5 shrink-0 place-items-center rounded-md border transition-colors', checked ? 'border-brand bg-brand text-white' : 'border-ink/25 bg-white/70'), children: checked ? _jsx(CheckCircle2, { className: "size-4" }) : null })) : null, _jsxs("button", { type: "button", onClick: onSelect, className: "flex min-w-0 flex-1 items-center gap-3 text-left", children: [_jsx(PartyAvatar, { name: t.counterparty, size: "md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "truncate text-[13.5px] font-bold text-ink", children: t.counterparty }), _jsx("span", { className: cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', TIER_TONE[recon.tier]), children: TIER_LABEL[recon.tier] })] }), _jsxs("p", { className: "truncate text-[11.5px] text-ink-muted", children: [t.source, " \u00B7 ", t.reference ?? 'no ref', " \u00B7 ", recon.ageText] }), _jsxs("div", { className: "mt-1.5 flex items-center gap-2", children: [_jsx("div", { className: "h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8", children: _jsx("div", { className: cn('h-full rounded-full', recon.confidence >= 95 ? 'bg-success' : recon.confidence >= 70 ? 'bg-ai' : 'bg-warning'), style: { width: `${recon.confidence}%` } }) }), _jsxs("span", { className: "w-9 shrink-0 text-right text-[10.5px] font-bold tabular text-ink-soft", children: [recon.confidence, "%"] })] })] }), _jsx("div", { className: "flex shrink-0 flex-col items-end", children: _jsxs("span", { className: "inline-flex items-center gap-0.5", children: [_jsx(ArrowIcon, { className: cn('size-3.5', t.direction === 'inflow' ? 'text-success' : 'text-ink-muted') }), _jsx(MoneyCell, { amount: t.amount, size: "sm", className: "font-bold !text-[13px]" })] }) })] })] }) }));
}
