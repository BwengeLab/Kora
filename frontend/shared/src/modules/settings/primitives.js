import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { GlassSurface, cn } from '../../design-system';
// Shared building blocks for the settings surfaces.
export function SettingsCard({ title, desc, children, action }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "p-5", children: [_jsxs("header", { className: "mb-4 flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-display text-[15px] font-bold text-ink", children: title }), desc ? _jsx("p", { className: "mt-0.5 text-[12.5px] text-ink-muted", children: desc }) : null] }), action] }), children] }));
}
export function Field({ label, value, hint, onChange }) {
    return (_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsx("input", { value: value, readOnly: !onChange, onChange: (event) => onChange?.(event.target.value), className: "h-11 rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30" }), hint ? _jsx("span", { className: "text-[11px] text-ink-muted", children: hint }) : null] }));
}
export function Toggle({ label, desc, defaultOn = false, checked, onChange }) {
    const [internal, setInternal] = useState(defaultOn);
    const on = checked ?? internal;
    return (_jsxs("button", { type: "button", onClick: () => { if (checked === undefined)
            setInternal((v) => !v); onChange?.(!on); }, className: "flex w-full items-center justify-between gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 hover:bg-white/70", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[13px] font-semibold text-ink", children: label }), desc ? _jsx("p", { className: "text-[11.5px] text-ink-muted", children: desc }) : null] }), _jsx("span", { className: cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-brand' : 'bg-ink/15'), children: _jsx("span", { className: cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5') }) })] }));
}
export function StatPill({ label, value, tone = 'text-ink' }) {
    return (_jsxs("div", { className: "rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60", children: [_jsx("span", { className: cn('block font-display text-2xl font-bold tabular', tone), children: value }), _jsx("span", { className: "text-[11px] font-semibold text-ink-muted", children: label })] }));
}
