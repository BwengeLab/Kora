import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertOctagon, ArrowDownRight, ArrowUpRight, LineChart, Sparkles, TrendingDown, TrendingUp, } from 'lucide-react';
import { GlassSurface, Sparkline, cn } from '../../design-system';
const ICON_MAP = {
    forecast: LineChart,
    overdue: AlertOctagon,
    rising: TrendingUp,
    margin: TrendingDown,
};
const TONE_MAP = {
    forecast: 'bg-success-soft text-success',
    overdue: 'bg-warning-soft text-warning',
    rising: 'bg-ai-soft text-ai',
    margin: 'bg-info-soft text-info',
};
export function AIInsightsCard({ insights }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-3 p-5", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white", children: _jsx(Sparkles, { className: "size-3.5" }) }), _jsx("h3", { className: "font-display text-base font-semibold text-ink", children: "AI Insights" })] }), _jsx(ViewAll, {})] }), _jsx("ul", { className: "flex flex-col gap-2.5", children: insights.map((insight) => (_jsx(InsightRow, { insight: insight }, insight.id))) })] }));
}
function InsightRow({ insight }) {
    const Icon = ICON_MAP[insight.iconKey];
    const ArrowIcon = insight.delta.direction === 'up' ? ArrowUpRight : ArrowDownRight;
    const isUp = insight.delta.direction === 'up';
    return (_jsxs("li", { className: "flex items-center gap-3 rounded-2xl bg-white/60 p-3 ring-1 ring-white/70", children: [_jsx("span", { className: cn('grid size-9 shrink-0 place-items-center rounded-xl', TONE_MAP[insight.iconKey]), children: _jsx(Icon, { className: "size-[18px]" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: insight.title }), _jsx("p", { className: "truncate text-[11px] text-ink-muted", children: insight.subtitle }), _jsxs("div", { className: "mt-1 flex items-baseline gap-2", children: [_jsx("span", { className: "font-display text-base font-bold text-ink tabular", children: insight.primaryValue }), _jsxs("span", { className: cn('inline-flex items-center gap-0.5 text-[11px] font-bold', isUp ? 'text-success' : 'text-warning'), children: [_jsx(ArrowIcon, { className: "size-3" }), _jsx("span", { className: "tabular", children: insight.delta.valueText }), _jsx("span", { className: "font-medium text-ink-muted", children: insight.delta.label })] })] })] }), _jsx(Sparkline, { data: insight.spark, color: insight.sparkColor, width: 64, height: 28 })] }));
}
function ViewAll() {
    return (_jsx("button", { type: "button", className: "text-xs font-semibold text-brand hover:text-brand-ink", children: "View all" }));
}
