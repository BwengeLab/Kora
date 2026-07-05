import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AreaChart, GlassSurface } from '../../design-system';
export function TrendsCard({ trends }) {
    const t = trends;
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-4 p-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Revenue & cash flow" }), _jsxs("div", { className: "flex items-center gap-3 text-[11px] font-semibold text-ink-muted", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: "h-0.5 w-4 rounded bg-brand" }), " Revenue"] }), _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: "h-0.5 w-4 rounded bg-success" }), " Net cash"] })] })] }), _jsx("div", { className: "min-h-[200px] flex-1", children: _jsx(AreaChart, { xLabels: [...t.labels], height: "100%", series: [
                        { name: 'Revenue ($M)', color: '#4361ee', data: [...t.revenue] },
                        { name: 'Net cash ($M)', color: '#16a37b', data: [...t.cashflow] },
                    ] }) }), _jsx("p", { className: "text-[12px] text-ink-muted", children: "12-month trend \u00B7 revenue up 18% YoY \u00B7 positive net cash in 11 of 12 months." })] }));
}
