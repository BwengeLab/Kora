import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUpRight, Building2, CalendarClock, FileText, Handshake, Users, } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
const ICON_MAP = {
    customers: Users,
    suppliers: Building2,
    partners: Handshake,
    contracts: FileText,
    renewals: CalendarClock,
};
const TONE_MAP = {
    success: 'text-success',
    warning: 'text-warning',
    neutral: 'text-ink-muted',
};
export function ExternalRelationshipsCard({ relationships }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-3 p-5", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsx("h3", { className: "font-display text-base font-semibold text-ink", children: "External Relationships" }), _jsx("button", { type: "button", className: "text-xs font-semibold text-brand hover:text-brand-ink", children: "View all" })] }), _jsx("ul", { className: "flex flex-col", children: relationships.map((row) => {
                    const Icon = ICON_MAP[row.iconKey];
                    return (_jsxs("li", { className: "flex items-center gap-3 border-b border-white/50 py-2.5 last:border-b-0", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-white/80 text-ink-soft", children: _jsx(Icon, { className: "size-[16px]" }) }), _jsx("span", { className: "flex-1 text-[13px] font-semibold text-ink", children: row.label }), _jsx("span", { className: "w-12 text-right text-[13px] font-bold text-ink tabular", children: row.count }), _jsxs("span", { className: cn('inline-flex w-32 items-center justify-end gap-1 text-[11px] font-semibold', TONE_MAP[row.trendTone]), children: [row.trendTone === 'success' ? _jsx(ArrowUpRight, { className: "size-3" }) : null, _jsx("span", { children: row.trendText })] })] }, row.id));
                }) })] }));
}
