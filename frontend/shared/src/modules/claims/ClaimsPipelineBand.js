import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock, FileSearch, Layers, ShieldAlert, TrendingDown } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { CLAIM_STAGES } from '../../seed/claims';
import { useClaimsStore } from '../../state/claimsStore';
export function ClaimsPipelineBand({ activeStage, onStage, stats }) {
    const claims = useClaimsStore((s) => s.claims);
    // live snapshot counts from the queue, blended with the larger period totals
    const liveCount = (stage) => claims.filter((c) => c.stage === stage).length;
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("section", { className: "grid grid-cols-2 gap-4 @2xl:grid-cols-3 @5xl:grid-cols-5", children: [_jsx(Kpi, { icon: _jsx(Layers, { className: "size-[18px]" }), tone: "bg-brand-soft text-brand-ink", value: String(stats.openClaims), label: "Open claims" }), _jsx(KpiMoney, { icon: _jsx(FileSearch, { className: "size-[18px]" }), tone: "bg-ai-soft text-ai", money: stats.totalReserves, label: "Total reserves" }), _jsx(Kpi, { icon: _jsx(Clock, { className: "size-[18px]" }), tone: "bg-info-soft text-info", value: `${stats.avgCycleDays}d`, label: "Avg cycle time" }), _jsx(Kpi, { icon: _jsx(ShieldAlert, { className: "size-[18px]" }), tone: "bg-danger-soft text-danger", value: String(stats.fraudFlagged), label: "Fraud flagged" }), _jsx(KpiMoney, { icon: _jsx(TrendingDown, { className: "size-[18px]" }), tone: "bg-success-soft text-success", money: stats.leakagePrevented, label: "Leakage prevented" })] }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-wrap items-stretch gap-2 p-3", children: [_jsx(StageChip, { label: "All", count: claims.length, active: activeStage === 'all', onClick: () => onStage('all') }), CLAIM_STAGES.map((st, i) => (_jsxs("div", { className: "flex items-center gap-2", children: [i > 0 ? _jsx("span", { className: "text-ink-muted", children: "\u2192" }) : null, _jsx(StageChip, { label: st.label, count: st.id === 'closed' ? stats.pipeline.closed : liveCount(st.id), active: activeStage === st.id, onClick: () => onStage(st.id) })] }, st.id)))] })] }));
}
function StageChip({ label, count, active, onClick }) {
    return (_jsxs("button", { type: "button", onClick: onClick, className: cn('flex min-w-[88px] flex-col items-center rounded-2xl px-3 py-2 transition-colors', active ? 'bg-brand text-white shadow-glass-soft' : 'bg-white/55 text-ink-soft ring-1 ring-white/60 hover:bg-white'), children: [_jsx("span", { className: "font-display text-xl font-bold leading-none tabular", children: count }), _jsx("span", { className: "text-[11px] font-semibold", children: label })] }));
}
function Kpi({ icon, tone, value, label }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-1.5 p-4", children: [_jsx("span", { className: cn('grid size-9 place-items-center rounded-xl', tone), children: icon }), _jsx("span", { className: "font-display text-2xl font-bold leading-none text-ink tabular", children: value }), _jsx("span", { className: "text-[11.5px] font-semibold text-ink-soft", children: label })] }));
}
function KpiMoney({ icon, tone, money, label }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-1.5 p-4", children: [_jsx("span", { className: cn('grid size-9 place-items-center rounded-xl', tone), children: icon }), _jsx(MoneyCell, { amount: money, size: "lg", className: "!text-xl" }), _jsx("span", { className: "text-[11.5px] font-semibold text-ink-soft", children: label })] }));
}
