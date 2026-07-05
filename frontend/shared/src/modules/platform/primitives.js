import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';
// Shared chrome for the platform surfaces.
export function PlatformPage({ title, subtitle, right, children }) {
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: title, subtitle: subtitle, right: right }), _jsx("div", { className: "@container scrollbar-thin min-h-0 flex-1 overflow-y-auto px-8 pb-8", children: children })] }));
}
export function Metric({ label, value, delta, tone = 'text-ink' }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "p-4", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsx("p", { className: cn('font-display text-2xl font-bold tabular', tone), children: value }), delta ? _jsx("span", { className: "text-[11.5px] font-semibold text-success", children: delta }) : null] }));
}
export function Panel({ title, desc, children, action }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "p-5", children: [_jsxs("header", { className: "mb-4 flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-display text-[15px] font-bold text-ink", children: title }), desc ? _jsx("p", { className: "mt-0.5 text-[12.5px] text-ink-muted", children: desc }) : null] }), action] }), children] }));
}
export function Dot({ tone }) {
    return _jsx("span", { className: cn('inline-block size-2 rounded-full', tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-danger') });
}
