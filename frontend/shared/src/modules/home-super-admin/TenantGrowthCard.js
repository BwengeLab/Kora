import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity, Gauge, Timer, Zap } from 'lucide-react';
import { AreaChart, GlassSurface, MoneyCell } from '../../design-system';
import { seedSystemHealth, seedTenantGrowth } from '../../seed/platformHome';
export function TenantGrowthCard({ tenantGrowth = seedTenantGrowth, systemHealth = seedSystemHealth, }) {
    const g = tenantGrowth;
    const h = systemHealth;
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-4 p-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Tenant growth" }), _jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "last 6 months" })] }), _jsx("div", { className: "min-h-[150px] flex-1", children: _jsx(AreaChart, { xLabels: [...g.labels], height: "100%", series: [{ name: 'Tenants', color: '#4361ee', data: [...g.series] }] }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3 @2xl:grid-cols-4", children: [_jsx(Health, { icon: _jsx(Gauge, { className: "size-4" }), value: `${h.uptimePct}%`, label: "Uptime" }), _jsx(Health, { icon: _jsx(Activity, { className: "size-4" }), value: `${h.errorRatePct}%`, label: "Error rate" }), _jsx(Health, { icon: _jsx(Timer, { className: "size-4" }), value: `${h.p95LatencyMs}ms`, label: "p95 latency" }), _jsx(Health, { icon: _jsx(Zap, { className: "size-4" }), value: h.requestsPerSec.toLocaleString(), label: "req/sec" })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-2xl bg-white/55 px-4 py-2.5 ring-1 ring-white/60", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "Model spend today" }), _jsx(MoneyCell, { amount: h.modelSpendToday, size: "sm", className: "ml-auto font-bold !text-[13px]" })] })] }));
}
function Health({ icon, value, label }) {
    return (_jsxs("div", { className: "flex flex-col gap-1 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-lg bg-white/80 text-ink-soft", children: icon }), _jsx("span", { className: "font-display text-lg font-bold text-ink tabular", children: value }), _jsx("span", { className: "text-[10.5px] font-medium text-ink-muted", children: label })] }));
}
