import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from '@tanstack/react-router';
import { ArrowRight, FileWarning, GitBranch, Link2Off, Sparkles } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedOperatorFocus } from '../../seed/operatorHome';
import { useWorkflowStore } from '../../state/workflowStore';
export function FocusCards({ focus = seedOperatorFocus }) {
    const recons = useWorkflowStore((s) => s.reconciliations);
    const dismissed = useWorkflowStore((s) => s.dismissedReconIds);
    // Live: exceptions still needing the operator, and AI suggestions to review.
    const openRecons = recons.filter((r) => r.stage === 'reviewing' || r.stage === 'detected');
    const exceptionsToClear = openRecons.length;
    const agentSuggestions = openRecons.filter((r) => r.suggestedRecord && !dismissed.includes(r.id)).length;
    const cards = [
        { to: '/reconciliation', label: 'My exceptions', value: String(exceptionsToClear), sub: 'to clear today', icon: GitBranch, tone: 'from-brand to-brand-ink text-white', primary: true },
        { to: '/transactions', label: 'Unmatched', value: String(focus.unmatchedCount), sub: 'transactions', icon: Link2Off, tone: 'bg-warning-soft text-warning' },
        { to: '/data-intake', label: 'Data-quality flags', value: String(focus.dataQualityFlags), sub: 'files need review', icon: FileWarning, tone: 'bg-danger-soft text-danger' },
        { to: '/agents', label: 'Agent suggestions', value: String(agentSuggestions), sub: 'awaiting your review', icon: Sparkles, tone: 'bg-ai-soft text-ai' },
    ];
    return (_jsx("section", { className: "grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4", children: cards.map((c) => (_jsx(Link, { to: c.to, className: "group", children: _jsxs(GlassSurface, { tone: "strong", className: cn('flex h-full flex-col gap-3 p-5 transition-transform group-hover:-translate-y-0.5', c.primary && 'bg-gradient-to-br from-brand/95 to-brand-ink/95 ring-1 ring-white/30'), children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsx("span", { className: cn('grid size-11 place-items-center rounded-2xl', c.primary ? 'bg-white/20 text-white' : c.tone), children: _jsx(c.icon, { className: "size-[20px]" }) }), _jsx(ArrowRight, { className: cn('size-4 transition-transform group-hover:translate-x-0.5', c.primary ? 'text-white/80' : 'text-ink-muted') })] }), _jsx("div", { className: "flex items-baseline gap-2", children: _jsx("span", { className: cn('font-display text-4xl font-bold leading-none tabular', c.primary ? 'text-white' : 'text-ink'), children: c.value }) }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: cn('text-[13.5px] font-bold', c.primary ? 'text-white' : 'text-ink'), children: c.label }), _jsx("span", { className: cn('text-[11.5px] font-medium', c.primary ? 'text-white/80' : 'text-ink-muted'), children: c.sub })] }), c.primary ? (_jsxs("span", { className: "mt-1 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-[12px] font-bold text-white", children: ["Continue reconciling ", _jsx(ArrowRight, { className: "size-3.5" })] })) : null] }) }, c.to))) }));
}
