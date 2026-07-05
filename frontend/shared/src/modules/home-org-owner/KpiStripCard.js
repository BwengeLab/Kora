import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDownRight, ArrowUpRight, Receipt, TrendingUp, Wallet, Wallet2 } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
// 4 KPI cards across the top. Designed to mirror the reference: large bold
// number on the left, colored icon-tile on the right, delta chip below.
export function KpiStripCard({ kpi }) {
    const Icon = iconFor(kpi.id);
    const isGood = kpi.trend.direction === kpi.positiveDirection;
    const ArrowIcon = kpi.trend.direction === 'up' ? ArrowUpRight : ArrowDownRight;
    const toneClass = ICON_TONES[kpi.iconTone];
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full items-start justify-between gap-4 p-5", children: [_jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-2", children: [_jsx("span", { className: "text-[13px] font-semibold text-ink-soft", children: kpi.label }), _jsx(MoneyCell, { amount: kpi.money, size: "xl" }), _jsxs("div", { className: "flex items-center gap-1.5 text-[12px]", children: [_jsxs("span", { className: cn('inline-flex items-center gap-0.5 font-bold', isGood ? 'text-success' : 'text-danger'), children: [_jsx(ArrowIcon, { className: "size-3.5" }), _jsx("span", { className: "tabular", children: kpi.trend.valueText })] }), _jsx("span", { className: "text-ink-muted", children: kpi.trend.label })] })] }), _jsx("span", { className: cn('grid size-14 shrink-0 place-items-center rounded-2xl shadow-glass-inner', toneClass), children: _jsx(Icon, { className: "size-6" }) })] }));
}
const ICON_TONES = {
    brand: 'bg-gradient-to-br from-brand-soft via-white/70 to-brand-soft/50 text-brand ring-1 ring-white/80',
    lavender: 'bg-gradient-to-br from-lavender-soft via-white/70 to-lavender-soft/50 text-lavender ring-1 ring-white/80',
    success: 'bg-gradient-to-br from-success-soft via-white/70 to-success-soft/50 text-success ring-1 ring-white/80',
    warning: 'bg-gradient-to-br from-warning-soft via-white/70 to-warning-soft/50 text-warning ring-1 ring-white/80',
};
function iconFor(id) {
    switch (id) {
        case 'cash':
            return Wallet;
        case 'revenue':
            return TrendingUp;
        case 'receivables':
            return Wallet2;
        case 'payables':
            return Receipt;
    }
}
