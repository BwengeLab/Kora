import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { AlertOctagon, AlertTriangle, CheckCircle2, Copy, Flame, Sparkles, TrendingUp, } from 'lucide-react';
import { GlassSurface, MoneyCell, ProgressRing, Sparkline, cn, } from '../../design-system';
const TIER_ICON = {
    auto: CheckCircle2,
    suggested: Sparkles,
    review: AlertTriangle,
    duplicate: Copy,
    suspicious: AlertOctagon,
};
const TIER_TONE = {
    auto: 'bg-success-soft text-success',
    suggested: 'bg-ai-soft text-ai',
    review: 'bg-warning-soft text-warning',
    duplicate: 'bg-info-soft text-info',
    suspicious: 'bg-danger-soft text-danger',
};
export function ReconStatsBand({ activeTier, onTier, recons }) {
    const total = recons.length;
    const reconciled = recons.filter((r) => r.stage === 'prepared' || r.stage === 'approved' || r.stage === 'posted').length;
    const remaining = total - reconciled;
    const pct = total > 0 ? reconciled / total : 0;
    const auto = recons.filter((r) => r.tier === 'auto').length;
    const autoRate = total > 0 ? auto / total : 0;
    const clearedToday = recons.filter((r) => r.stage === 'prepared' || r.stage === 'posted').length;
    const clearedSeries = [0, 1, 1, 2, 2, 3, Math.max(3, clearedToday - 1), clearedToday];
    const preparedAwaitingApproval = recons.filter((r) => r.stage === 'prepared').length;
    const tierStats = buildTierStats(recons);
    return (_jsxs("section", { className: "grid grid-cols-1 gap-5 @4xl:grid-cols-[300px_1fr_240px]", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex items-center gap-5 p-6", children: [_jsx(ProgressRing, { value: pct, size: 128, thickness: 13, color: "gradient", children: _jsxs("div", { className: "flex flex-col", children: [_jsxs("span", { className: "font-display text-2xl font-bold text-ink tabular", children: [Math.round(pct * 100), "%"] }), _jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-ink-muted", children: "reconciled" })] }) }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "Live queue progress" }), _jsxs("span", { className: "font-display text-xl font-bold text-ink tabular", children: [reconciled.toLocaleString(), _jsxs("span", { className: "text-ink-muted", children: [" / ", total.toLocaleString()] })] }), _jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning", children: [remaining, " left to clear"] }), _jsxs("span", { className: "mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted", children: [_jsx(TrendingUp, { className: "size-3.5 text-success" }), Math.round(autoRate * 100), "% auto-match rate"] })] })] }), _jsx("div", { className: "grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-5", children: tierStats.map((t) => {
                    const Icon = TIER_ICON[t.tier];
                    const active = activeTier === t.tier;
                    return (_jsxs("button", { type: "button", onClick: () => onTier(active ? 'all' : t.tier), className: cn('flex h-full flex-col gap-2 rounded-3xl border p-4 text-left transition-all', 'bg-glass-strong backdrop-blur-glass shadow-glass', active ? 'border-brand/40 ring-2 ring-brand/30' : 'border-white/65 hover:-translate-y-0.5'), children: [_jsx("span", { className: cn('grid size-9 place-items-center rounded-xl', TIER_TONE[t.tier]), children: _jsx(Icon, { className: "size-[18px]" }) }), _jsx("span", { className: "font-display text-2xl font-bold leading-none text-ink tabular", children: t.count.toLocaleString() }), _jsx("span", { className: "text-[12px] font-semibold leading-tight text-ink", children: t.label }), _jsx(MoneyCell, { amount: t.value, size: "sm", className: "!text-[12px] font-semibold text-ink-soft" }), _jsx("span", { className: "text-[10px] font-medium leading-tight text-ink-muted", children: t.sub })] }, t.tier));
                }) }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col justify-between gap-3 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "Your work today" }), _jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning", children: [_jsx(Flame, { className: "size-3" }), " live queue"] })] }), _jsxs("div", { className: "flex items-end justify-between gap-2", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "font-display text-4xl font-bold leading-none text-ink tabular", children: clearedToday }), _jsx("span", { className: "mt-1 text-[11px] font-medium text-ink-muted", children: "exceptions cleared" })] }), _jsx(Sparkline, { data: clearedSeries, color: "#16a37b", width: 96, height: 40 })] }), _jsxs("div", { className: "rounded-xl bg-white/55 px-3 py-2 text-[11px] font-medium text-ink-soft ring-1 ring-white/60", children: [_jsx("span", { className: "font-bold text-ink", children: preparedAwaitingApproval }), " prepared \u00B7 awaiting Finance Lead"] })] })] }));
}
function buildTierStats(recons) {
    const tiers = [
        { tier: 'auto', label: 'Auto-matched', sub: '>= 95% - no action needed' },
        { tier: 'suggested', label: 'Suggested', sub: '70-94% - review & prepare' },
        { tier: 'review', label: 'Needs review', sub: '< 70% - decide manually' },
        { tier: 'duplicate', label: 'Duplicates', sub: 'flagged by Kora' },
        { tier: 'suspicious', label: 'Suspicious', sub: 'fraud / control risk' },
    ];
    return tiers.map((item) => {
        const group = recons.filter((r) => r.tier === item.tier);
        const totalMinor = group.reduce((acc, r) => acc + r.transaction.amount.amountMinor, 0n);
        const currency = group[0]?.transaction.amount.currency ?? 'USD';
        return {
            ...item,
            count: group.length,
            value: { amountMinor: totalMinor, currency },
        };
    });
}
