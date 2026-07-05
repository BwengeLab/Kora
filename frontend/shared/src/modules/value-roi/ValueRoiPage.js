import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock, Copy, Download, HandCoins, ShieldAlert, TrendingUp, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchRoiSummary } from '../../api/roi';
import { AreaChart, GlassSurface, MoneyCell, cn } from '../../design-system';
import { seedRoi } from '../../seed/ownerExtra';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
const ICON = {
    recovered: HandCoins,
    duplicates: Copy,
    unsupported: ShieldAlert,
    hours: Clock,
    leakage: TrendingUp,
    credit: Wallet,
};
const TONE = {
    recovered: 'bg-success-soft text-success',
    duplicates: 'bg-info-soft text-info',
    unsupported: 'bg-warning-soft text-warning',
    hours: 'bg-ai-soft text-ai',
    leakage: 'bg-brand-soft text-brand-ink',
    credit: 'bg-lavender-soft text-lavender',
};
// Org Owner "Value / ROI" — proves Kora's worth (doc §Value/ROI).
export function ValueRoiPage() {
    const apiBaseUrl = getApiBaseUrl();
    const token = useSessionStore((s) => s.session?.token ?? '');
    const { data } = useQuery({
        queryKey: ['roi-summary', token],
        queryFn: ({ signal }) => fetchRoiSummary(apiBaseUrl, token, signal),
        enabled: Boolean(token),
    });
    const r = data ?? { ...seedRoi, hoursSaved: 128 };
    return (_jsxs("div", { className: "flex flex-col", children: [_jsx(PageHeader, { title: "Value / ROI", subtitle: _jsx(_Fragment, { children: "The money Kora makes and saves you \u2014 recovered, protected, and freed up." }), right: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs("button", { type: "button", onClick: () => toast({ tone: 'info', title: 'Exporting', body: 'ROI summary (PDF) is being prepared.' }), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink", children: [_jsx(Download, { className: "size-4" }), " Export"] }), _jsx(DateRangePill, { label: "Last 6 months" })] }) }), _jsxs("div", { className: "@container flex flex-col gap-6 px-8 pb-8", children: [_jsxs("section", { className: "grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col justify-center gap-2 p-7 @5xl:col-span-4", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "Total value delivered" }), _jsx(MoneyCell, { amount: r.totalValue, size: "xl", className: "!text-[40px]" }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-bold text-success", children: [r.roiMultiple.toFixed(1), "\u00D7 ROI"] }), _jsxs("span", { className: "text-[11.5px] text-ink-muted", children: ["vs ", _jsx(MoneyCell, { amount: r.subscriptionCost, size: "sm", className: "!text-[11.5px] font-semibold" }), " subscription"] })] })] }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-3 p-6 @5xl:col-span-8", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Value delivered over time" }), _jsx("div", { className: "min-h-[180px] flex-1", children: _jsx(AreaChart, { xLabels: [...r.labels], height: "100%", series: [{ name: 'Cumulative value ($K)', color: '#16a37b', data: [...r.series] }] }) })] })] }), _jsx("section", { className: "grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3", children: r.items.map((it) => {
                            const Icon = ICON[it.icon];
                            return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: cn('grid size-10 place-items-center rounded-2xl', TONE[it.icon]), children: _jsx(Icon, { className: "size-[18px]" }) }), it.deltaPct > 0 ? _jsxs("span", { className: "rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success", children: ["+", it.deltaPct, "%"] }) : null] }), it.icon === 'hours' ? (_jsxs("span", { className: "font-display text-2xl font-bold text-ink tabular", children: [r.hoursSaved, " hrs"] })) : (_jsx(MoneyCell, { amount: it.value, size: "xl", className: "!text-2xl" })), _jsx("span", { className: "text-[13px] font-bold text-ink", children: it.label }), _jsx("span", { className: "text-[11.5px] text-ink-muted", children: it.detail })] }, it.id));
                        }) })] })] }));
}
