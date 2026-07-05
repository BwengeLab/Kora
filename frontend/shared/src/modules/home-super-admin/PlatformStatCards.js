import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUpRight, Building2, Gauge, Percent, Wallet } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { seedPlatformStats } from '../../seed/platformHome';
export function PlatformStatCards({ stats = seedPlatformStats }) {
    const s = stats;
    return (_jsxs("section", { className: "grid grid-cols-2 gap-5 @5xl:grid-cols-4", children: [_jsx(Card, { icon: _jsx(Building2, { className: "size-[18px]" }), tone: "bg-brand-soft text-brand-ink", value: String(s.activeTenants), label: "Active tenants", delta: `+${s.tenantsAddedThisMonth} this month`, good: true }), _jsx(MoneyCardItem, { stats: s }), _jsx(Card, { icon: _jsx(Gauge, { className: "size-[18px]" }), tone: "bg-success-soft text-success", value: `${s.uptimePct}%`, label: "Uptime (30d)", delta: "SLA 99.9%", good: true }), _jsx(Card, { icon: _jsx(Percent, { className: "size-[18px]" }), tone: "bg-ai-soft text-ai", value: `${s.grossMarginPct}%`, label: "Gross margin", delta: "cost vs revenue", good: true })] }));
}
function MoneyCardItem({ stats }) {
    const s = stats;
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2 p-5", children: [_jsx("span", { className: "grid size-10 place-items-center rounded-2xl bg-lavender-soft text-lavender", children: _jsx(Wallet, { className: "size-[18px]" }) }), _jsx(MoneyCell, { amount: s.mrr, size: "xl", className: "!text-[28px]" }), _jsx("span", { className: "text-[12.5px] font-semibold text-ink", children: "Monthly recurring revenue" }), _jsxs("span", { className: "inline-flex w-fit items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success", children: [_jsx(ArrowUpRight, { className: "size-3" }), " ", s.mrrGrowthPct, "% MoM"] })] }));
}
function Card({ icon, tone, value, label, delta, good }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2 p-5", children: [_jsx("span", { className: cn('grid size-10 place-items-center rounded-2xl', tone), children: icon }), _jsx("span", { className: "font-display text-3xl font-bold leading-none text-ink tabular", children: value }), _jsx("span", { className: "text-[12.5px] font-semibold text-ink", children: label }), _jsx("span", { className: cn('text-[11px] font-medium', good ? 'text-success' : 'text-ink-muted'), children: delta })] }));
}
