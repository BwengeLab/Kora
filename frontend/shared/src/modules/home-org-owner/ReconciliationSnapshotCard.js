import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, Info } from 'lucide-react';
import { DonutChart, GlassSurface } from '../../design-system';
import { useWorkflowStore } from '../../state/workflowStore';
const TIER_META = [
    { tier: 'auto', name: 'Auto matched', color: '#16a37b' },
    { tier: 'suggested', name: 'Suggested', color: '#8b5cf6' },
    { tier: 'review', name: 'Needs review', color: '#e89914' },
    { tier: 'duplicate', name: 'Duplicate risk', color: '#3b86ff' },
    { tier: 'suspicious', name: 'Suspicious', color: '#dc4848' },
];
export function ReconciliationSnapshotCard() {
    const reconciliations = useWorkflowStore((s) => s.reconciliations);
    const total = reconciliations.length;
    const slices = TIER_META.map(({ tier, name, color }) => {
        const value = reconciliations.filter((item) => item.tier === tier).length;
        const pct = total === 0 ? 0 : Math.round((value / total) * 100);
        return { name, value, color, pctText: `${pct}%` };
    });
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-4 p-5", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "font-display text-base font-semibold text-ink", children: "Reconciliation Snapshot" }), _jsx(Info, { className: "size-3.5 text-ink-muted" })] }), _jsxs("button", { type: "button", className: "inline-flex h-8 items-center gap-1.5 rounded-xl bg-white/70 px-3 text-xs font-semibold text-ink-soft ring-1 ring-white/80 hover:bg-white", children: ["This Month ", _jsx(ChevronDown, { className: "size-3" })] })] }), _jsxs("div", { className: "flex items-center gap-5", children: [_jsx(DonutChart, { slices: slices.map(({ name, value, color }) => ({ name, value, color })), centerLabel: total.toLocaleString(), centerSub: "Total", size: 170 }), _jsx("ul", { className: "flex flex-1 flex-col gap-3", children: slices.map((slice) => (_jsxs("li", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "size-2.5 rounded-full", style: { backgroundColor: slice.color } }), _jsx("span", { className: "flex-1 text-[13px] font-medium text-ink", children: slice.name }), _jsx("span", { className: "text-[13px] font-semibold tabular text-ink", children: slice.value.toLocaleString() }), _jsx("span", { className: "w-10 text-right text-[11px] font-medium text-ink-muted", children: slice.pctText })] }, slice.name))) })] })] }));
}
