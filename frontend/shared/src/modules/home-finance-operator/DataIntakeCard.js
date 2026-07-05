import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from '@tanstack/react-router';
import { CheckCircle2, FileWarning, Loader, Upload } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedIntakeBatches } from '../../seed/operatorHome';
const STATUS = {
    processed: { label: 'Processed', icon: CheckCircle2, tone: 'text-success' },
    processing: { label: 'Processing', icon: Loader, tone: 'text-info' },
    needs_review: { label: 'Needs review', icon: FileWarning, tone: 'text-warning' },
};
export function DataIntakeCard({ batches = seedIntakeBatches }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Data intake" }), _jsx(Link, { to: "/data-intake", className: "text-xs font-semibold text-brand hover:text-brand-ink", children: "Open" })] }), _jsxs("button", { type: "button", className: "flex items-center gap-3 rounded-2xl border-2 border-dashed border-brand/40 bg-white/40 p-4 text-left text-brand transition-colors hover:bg-white/70", children: [_jsx("span", { className: "grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand", children: _jsx(Upload, { className: "size-5" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[13px] font-bold", children: "Quick upload" }), _jsxs("p", { className: "text-[11px] font-medium text-ink-muted", children: ["Drag & drop a statement, invoice or receipt \u2014 or ", _jsx("span", { className: "underline", children: "browse" })] })] })] }), _jsx("ul", { className: "scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5", children: batches.map((b) => {
                    const s = STATUS[b.status];
                    return (_jsxs("li", { className: "flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("span", { className: cn('grid size-9 shrink-0 place-items-center rounded-xl bg-white/80', s.tone), children: _jsx(s.icon, { className: "size-[16px]" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: b.name }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [b.source, " \u00B7 ", b.records, " records \u00B7 ", b.when] })] }), _jsxs("div", { className: "flex shrink-0 flex-col items-end gap-1", children: [_jsx("span", { className: cn('text-[10.5px] font-bold', s.tone), children: s.label }), b.flags > 0 ? (_jsxs("span", { className: "rounded-full bg-danger-soft px-2 py-0.5 text-[9.5px] font-bold text-danger", children: [b.flags, " flags"] })) : null] })] }, b.id));
                }) })] }));
}
