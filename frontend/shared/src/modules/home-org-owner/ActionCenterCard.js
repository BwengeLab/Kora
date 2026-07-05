import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { VARIANTS } from '../action-center/variant';
import { RISK_TONE, TYPE_ICON, TYPE_TONE } from '../action-center/typeMeta';
import { useWorkflowStore } from '../../state/workflowStore';
// LIVE: the owner's top-tier approvals (high-value / high-risk / dual-approval)
// pulled from the shared workflow store — updates as items are prepared/approved.
export function ActionCenterCard() {
    const approvals = useWorkflowStore((s) => s.approvals);
    const topTier = approvals.filter((a) => (a.stage === 'awaiting' || a.stage === 'partial') && VARIANTS.org_owner.includes(a));
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-3 p-5", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsx("h3", { className: "font-display text-base font-semibold text-ink", children: "Top approvals" }), _jsx("span", { className: "inline-flex items-center justify-center rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white", children: topTier.length })] }), _jsxs("ul", { className: "flex flex-col gap-2", children: [topTier.slice(0, 5).map((a) => {
                        const Icon = TYPE_ICON[a.type];
                        return (_jsx("li", { children: _jsxs(Link, { to: "/approvals", className: "group flex w-full items-center gap-3 rounded-2xl bg-white/55 p-2.5 text-left ring-1 ring-white/60 hover:bg-white", children: [_jsx("span", { className: cn('grid size-9 shrink-0 place-items-center rounded-xl', TYPE_TONE[a.type]), children: _jsx(Icon, { className: "size-[18px]" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: a.title }), _jsx("p", { className: "truncate text-[11px] text-ink-muted", children: a.subtitle })] }), _jsx("span", { className: cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', RISK_TONE[a.risk]), children: a.risk }), _jsx(ChevronRight, { className: "size-4 text-ink-muted group-hover:text-ink" })] }) }, a.id));
                    }), topTier.length === 0 ? (_jsx("li", { className: "grid place-items-center py-8 text-center text-[12px] text-ink-muted", children: "No high-stakes approvals waiting. \uD83C\uDF89" })) : null] }), _jsxs(Link, { to: "/approvals", className: "mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/65 py-2.5 text-[13px] font-semibold text-brand ring-1 ring-white/70 hover:bg-white", children: ["Go to Action Center", _jsx(ChevronRight, { className: "size-3.5" })] })] }));
}
