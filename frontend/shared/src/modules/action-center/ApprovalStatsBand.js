import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock, Flame, Layers, ShieldAlert, Users } from 'lucide-react';
import { GlassSurface, MoneyCell, Sparkline, cn } from '../../design-system';
function sum(items) {
    const total = items.reduce((acc, a) => acc + a.amount.amountMinor, 0n);
    return { amountMinor: total, currency: items[0]?.amount.currency ?? 'USD' };
}
export function ApprovalStatsBand({ variant, items }) {
    if (variant === 'org_owner')
        return _jsx(OwnerStats, { items: items });
    return _jsx(LeadStats, { items: items });
}
function LeadStats({ items }) {
    const awaiting = items.filter((a) => a.stage === 'awaiting' || a.stage === 'partial');
    const approved = items.filter((a) => a.stage === 'approved');
    const byType = [
        { type: 'payment', label: 'Payments', count: items.filter((a) => a.type === 'payment').length },
        { type: 'match', label: 'Matches', count: items.filter((a) => a.type === 'match').length },
        { type: 'posting', label: 'Postings', count: items.filter((a) => a.type === 'posting').length },
        { type: 'collection', label: 'Collections', count: items.filter((a) => a.type === 'collection').length },
        { type: 'renewal', label: 'Renewals', count: items.filter((a) => a.type === 'renewal').length },
    ];
    const approvedSeries = approved.length > 0 ? approved.map((_, index) => index + 1) : [0, 1, 1, 2, 2, 3, 3, 4];
    return (_jsxs("section", { className: "grid grid-cols-1 gap-5 @4xl:grid-cols-[340px_1fr_240px]", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col justify-between gap-3 p-6", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "Awaiting your approval" }), _jsxs("div", { children: [_jsx("span", { className: "font-display text-4xl font-bold leading-none text-ink tabular", children: awaiting.length }), _jsx("span", { className: "ml-2 text-[13px] font-semibold text-ink-muted", children: "items" })] }), _jsx(MoneyCell, { amount: sum(awaiting), size: "lg", className: "!text-xl" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Pill, { icon: _jsx(Flame, { className: "size-3" }), tone: "warning", children: [awaiting.filter((a) => a.urgent).length, " urgent"] }), _jsxs(Pill, { icon: _jsx(ShieldAlert, { className: "size-3" }), tone: "danger", children: [awaiting.filter((a) => a.risk === 'high').length, " high-risk"] }), _jsxs(Pill, { icon: _jsx(Users, { className: "size-3" }), tone: "info", children: [awaiting.filter((a) => a.requiresDualApproval).length, " dual-approval"] })] })] }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-3 p-6", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "By type" }), _jsx("div", { className: "grid flex-1 grid-cols-2 gap-3 @2xl:grid-cols-5", children: byType.map((t) => (_jsxs("div", { className: "flex flex-col justify-center rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("span", { className: "font-display text-2xl font-bold text-ink tabular", children: t.count }), _jsx("span", { className: "text-[11.5px] font-semibold text-ink-soft", children: t.label })] }, t.type))) })] }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col justify-between gap-3 p-6", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "Approved today" }), _jsxs("div", { className: "flex items-end justify-between gap-2", children: [_jsx("span", { className: "font-display text-4xl font-bold leading-none text-ink tabular", children: approved.length }), _jsx(Sparkline, { data: approvedSeries, color: "#16a37b", width: 88, height: 40 })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-[12px]", children: [_jsx(Clock, { className: "size-3.5 text-ink-muted" }), _jsx(MoneyCell, { amount: sum(approved), size: "sm", className: "!text-[12.5px] font-semibold" }), _jsx("span", { className: "text-ink-muted", children: "released" })] })] })] }));
}
function OwnerStats({ items }) {
    const awaiting = items.filter((a) => a.stage === 'awaiting' || a.stage === 'partial');
    const valueAtStake = sum(awaiting);
    const highRisk = items.filter((a) => a.risk === 'high').length;
    const dual = items.filter((a) => a.requiresDualApproval).length;
    return (_jsxs("section", { className: "grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4", children: [_jsx(StatCard, { label: "Awaiting your sign-off", value: String(awaiting.length), icon: _jsx(Layers, { className: "size-[18px]" }), tone: "bg-brand-soft text-brand-ink" }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col justify-center gap-1 p-5", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "Value at stake" }), _jsx(MoneyCell, { amount: valueAtStake, size: "xl", className: "!text-[28px]" })] }), _jsx(StatCard, { label: "High-risk decisions", value: String(highRisk), icon: _jsx(ShieldAlert, { className: "size-[18px]" }), tone: "bg-danger-soft text-danger" }), _jsx(StatCard, { label: "Need your 2nd signature", value: String(dual), icon: _jsx(Users, { className: "size-[18px]" }), tone: "bg-info-soft text-info" })] }));
}
function StatCard({ label, value, icon, tone }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2 p-5", children: [_jsx("span", { className: cn('grid size-10 place-items-center rounded-2xl', tone), children: icon }), _jsx("span", { className: "font-display text-4xl font-bold leading-none text-ink tabular", children: value }), _jsx("span", { className: "text-[12.5px] font-semibold text-ink-soft", children: label })] }));
}
function Pill({ icon, tone, children }) {
    const toneClass = { warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger', info: 'bg-info-soft text-info' }[tone];
    return _jsxs("span", { className: cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', toneClass), children: [icon, children] });
}
