import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RefreshCw } from 'lucide-react';
import { GaugeChart, GlassSurface, cn } from '../../design-system';
const RATING_TONE = {
    Strong: 'text-success',
    Good: 'text-success',
    Fair: 'text-warning',
    Low: 'text-danger',
};
export function ScoreCard({ passport, subScores, }) {
    const p = passport;
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-4 p-6 @2xl:flex-row @2xl:items-center", children: [_jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx(GaugeChart, { value: p.score, size: 196, color: "#16a37b", centerValue: p.score, centerLabel: p.label }), _jsxs("span", { className: "rounded-full bg-success-soft px-3 py-1 text-[12px] font-bold text-success", children: ["Band ", p.band, " \u00B7 Business Health"] }), _jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted", children: [_jsx(RefreshCw, { className: "size-3" }), " Updated ", p.updated] })] }), _jsx("div", { className: "flex flex-1 flex-col gap-3", children: subScores.map((s) => (_jsxs("button", { type: "button", className: "group flex flex-col gap-1.5 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 hover:bg-white", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[13px] font-bold text-ink", children: s.label }), _jsxs("span", { className: cn('text-[12px] font-bold', RATING_TONE[s.rating]), children: [s.rating, " \u00B7 ", s.value] })] }), _jsx("div", { className: "h-1.5 overflow-hidden rounded-full bg-ink/8", children: _jsx("div", { className: cn('h-full rounded-full', s.value >= 85 ? 'bg-success' : s.value >= 70 ? 'bg-ai' : 'bg-warning'), style: { width: `${s.value}%` } }) }), _jsx("span", { className: "text-[11px] text-ink-muted", children: s.evidence })] }, s.id))) })] }));
}
