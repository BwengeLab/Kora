import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeftRight, CheckCircle2, FileText, Lock, Search, Settings2, Share2, Sparkles, } from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { openDoc } from '../../state/docViewerStore';
import { useWorkflowStore } from '../../state/workflowStore';
const KIND = {
    approval: { icon: CheckCircle2, tone: 'bg-success-soft text-success' },
    posting: { icon: ArrowLeftRight, tone: 'bg-lavender-soft text-lavender' },
    access: { icon: Lock, tone: 'bg-info-soft text-info' },
    config: { icon: Settings2, tone: 'bg-warning-soft text-warning' },
    agent: { icon: Sparkles, tone: 'bg-ai-soft text-ai' },
    consent: { icon: Share2, tone: 'bg-brand-soft text-brand-ink' },
};
export function AuditLogFeedCard() {
    const auditLog = useWorkflowStore((s) => s.auditLog);
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Audit log" }), _jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted ring-1 ring-white/70", children: [_jsx(Lock, { className: "size-3" }), " Immutable"] })] }), _jsxs("div", { className: "flex h-9 w-56 items-center gap-2 rounded-xl bg-white/70 px-3 ring-1 ring-white/70", children: [_jsx(Search, { className: "size-4 text-ink-muted" }), _jsx("input", { type: "search", placeholder: "Filter actor, action\u2026", className: "w-full bg-transparent text-[12px] text-ink placeholder:text-ink-muted focus:outline-none" })] })] }), _jsx("ol", { className: "scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5", children: auditLog.map((e, i) => {
                    const k = KIND[e.kind];
                    return (_jsxs("li", { className: "flex gap-3", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: cn('mt-1 grid size-8 shrink-0 place-items-center rounded-xl', k.tone), children: _jsx(k.icon, { className: "size-4" }) }), i < auditLog.length - 1 ? _jsx("span", { className: "my-1 w-px flex-1 bg-ink/10" }) : null] }), _jsxs("button", { type: "button", onClick: () => e.hasEvidence && openDoc({ name: `Evidence — ${e.action}.pdf`, kind: 'audit evidence', context: `${e.target} · ${e.actor}` }), className: "mb-2 flex flex-1 items-start justify-between gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-white/60", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("p", { className: "text-[13px] font-semibold text-ink", children: [e.action, " ", _jsxs("span", { className: "font-normal text-ink-muted", children: ["\u00B7 ", e.target] })] }), _jsxs("p", { className: "text-[11px] text-ink-muted", children: [e.actor, " \u00B7 ", e.role, " \u00B7 ", new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [e.amount ? _jsx(MoneyCell, { amount: e.amount, size: "sm", className: "font-bold !text-[12px]" }) : null, e.hasEvidence ? (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-0.5 text-[10px] font-bold text-brand ring-1 ring-white/70", children: [_jsx(FileText, { className: "size-3" }), " Evidence"] })) : null] })] })] }, e.id));
                }) })] }));
}
