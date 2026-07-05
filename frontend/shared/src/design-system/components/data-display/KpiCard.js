import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { GlassSurface } from '../glass/GlassSurface';
import { cn } from '../../utils/cn';
import { MoneyCell } from './MoneyCell';
export function KpiCard({ label, money, valueText, icon, delta, positiveDirection = 'up', className, }) {
    const isGood = delta ? delta.direction === positiveDirection : null;
    const ArrowIcon = delta?.direction === 'up' ? ArrowUpRight : ArrowDownRight;
    return (_jsxs(GlassSurface, { className: cn('flex flex-col gap-3 p-5', className), children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("span", { className: "text-sm font-medium text-ink-soft", children: label }), icon ? (_jsx("span", { className: "grid size-9 place-items-center rounded-xl bg-white/60 text-ink-soft [&>svg]:size-[18px]", children: icon })) : null] }), _jsxs("div", { className: "flex items-baseline gap-2", children: [money ? _jsx(MoneyCell, { amount: money, size: "xl" }) : null, valueText ? _jsx("span", { className: "font-display text-3xl font-semibold tracking-tight tabular", children: valueText }) : null] }), delta ? (_jsxs("div", { className: "flex items-center gap-1.5 text-xs", children: [_jsxs("span", { className: cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold', isGood ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'), children: [_jsx(ArrowIcon, { className: "size-3" }), _jsx("span", { className: "tabular", children: delta.valueText })] }), delta.label ? _jsx("span", { className: "text-ink-muted", children: delta.label }) : null] })) : null] }));
}
