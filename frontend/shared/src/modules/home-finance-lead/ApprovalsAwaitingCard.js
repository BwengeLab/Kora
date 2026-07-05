import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from '@tanstack/react-router';
import { ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { useWorkflowStore } from '../../state/workflowStore';
import { RISK_TONE, TYPE_ICON, TYPE_TONE } from '../action-center/typeMeta';
// The Finance Lead's #1 priority block — LIVE from the workflow store. When the
// operator prepares a match in the cockpit, it appears here automatically.
export function ApprovalsAwaitingCard() {
    const approvals = useWorkflowStore((s) => s.approvals);
    const pending = approvals.filter((a) => a.stage === 'awaiting' || a.stage === 'partial');
    const awaiting = pending.slice(0, 4);
    const totalValue = {
        amountMinor: pending.reduce((acc, a) => acc + a.amount.amountMinor, 0n),
        currency: pending[0]?.amount.currency ?? 'USD',
    };
    const urgentCount = pending.filter((a) => a.urgent).length;
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col gap-4 p-6", children: [_jsxs("header", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink text-white", children: _jsx(ShieldCheck, { className: "size-4" }) }), _jsx("h3", { className: "font-display text-[17px] font-bold text-ink", children: "Approvals awaiting you" })] }), _jsxs("p", { className: "mt-0.5 text-[12.5px] text-ink-muted", children: [_jsx("span", { className: "font-bold text-ink tabular", children: pending.length }), " items \u00B7", ' ', _jsx(MoneyCell, { amount: totalValue, size: "sm", className: "!text-[12.5px] font-bold" }), " total"] })] }), urgentCount > 0 ? (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger", children: [_jsx(Clock, { className: "size-3.5" }), " ", urgentCount, " urgent"] })) : null] }), _jsx("ul", { className: "flex min-h-0 flex-1 flex-col gap-2", children: awaiting.map((a) => {
                    const Icon = TYPE_ICON[a.type];
                    return (_jsx("li", { children: _jsxs(Link, { to: "/approvals", className: "group flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60 transition-colors hover:bg-white", children: [_jsx("span", { className: cn('grid size-10 shrink-0 place-items-center rounded-xl', TYPE_TONE[a.type]), children: _jsx(Icon, { className: "size-[18px]" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: a.title }), _jsx("span", { className: cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', RISK_TONE[a.risk]), children: a.risk })] }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [a.preparedBy.name, " \u00B7 ", a.deadlineText] })] }), _jsx(MoneyCell, { amount: a.amount, size: "sm", className: "shrink-0 font-bold !text-[13px]" }), _jsx(ArrowRight, { className: "size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" })] }) }, a.id));
                }) }), _jsxs(Link, { to: "/approvals", className: "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink py-3 text-[13.5px] font-bold text-white shadow-[0_6px_18px_rgba(67,97,238,0.4)] transition-all hover:brightness-110", children: ["Review all ", pending.length, " approvals ", _jsx(ArrowRight, { className: "size-4" })] })] }));
}
