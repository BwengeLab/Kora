import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Check, FileText, Search, Send, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { workflowReconciliationAction } from '../../api/workflow';
import { ConfidenceChip, GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { useSession } from '../../auth/hooks';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';
const TIER_TONE = {
    auto: 'bg-success-soft text-success',
    suggested: 'bg-lavender-soft text-lavender',
    review: 'bg-warning-soft text-warning',
    duplicate: 'bg-info-soft text-info',
    suspicious: 'bg-danger-soft text-danger',
};
const TIER_LABEL = { auto: 'Auto', suggested: 'Suggested', review: 'Needs review', duplicate: 'Duplicate', suspicious: 'Suspicious' };
const DELTA_TONE = { match: 'text-success', near: 'text-warning', diff: 'text-danger' };
// Finance Lead "Reconciliation" — the REVIEW & APPROVE control room. The operator
// prepares matches; the Lead inspects the match quality (field-by-field deltas +
// evidence) and approves them to post, or sends them back. Distinct from the
// owner's high-level assurance and from the broad Action Center queue.
export function FinanceLeadReconciliation() {
    const recons = useWorkflowStore((s) => s.reconciliations);
    const hydrate = useWorkflowStore((s) => s.hydrate);
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const mutation = useMutation({
        mutationFn: ({ id, action }) => workflowReconciliationAction(apiBaseUrl, session.token, id, action),
        onSuccess: (response) => hydrate(response.snapshot),
    });
    const [query, setQuery] = useState('');
    const [tier, setTier] = useState('all');
    const [selectedId, setSelectedId] = useState(null);
    const queue = useMemo(() => {
        const q = query.trim().toLowerCase();
        return recons
            .filter((r) => r.stage !== 'posted')
            .filter((r) => (tier === 'all' ? true : r.tier === tier))
            .filter((r) => (q === '' ? true : [r.transaction.counterparty, r.transaction.reference ?? '', r.suggestedRecord?.reference ?? ''].some((s) => s.toLowerCase().includes(q))))
            .sort((a, b) => a.confidence - b.confidence);
    }, [recons, query, tier]);
    const selected = recons.find((r) => r.id === selectedId) ?? null;
    const counts = useMemo(() => ({
        prepared: recons.filter((r) => r.stage === 'prepared').length,
        review: recons.filter((r) => r.tier === 'review' && r.stage !== 'posted').length,
        suggested: recons.filter((r) => r.tier === 'suggested' && r.stage !== 'posted').length,
        suspicious: recons.filter((r) => r.tier === 'suspicious' && r.stage !== 'posted').length,
    }), [recons]);
    const tierStats = useMemo(() => ['auto', 'suggested', 'review', 'duplicate', 'suspicious'].map((value) => ({
        tier: value,
        label: TIER_LABEL[value],
        count: recons.filter((r) => r.tier === value && r.stage !== 'posted').length,
    })), [recons]);
    const approve = async (r) => {
        try {
            await mutation.mutateAsync({ id: r.id, action: 'approve' });
            toast({ tone: 'success', title: 'Match approved & posted', body: `${r.transaction.counterparty} reconciled and written to the audit log.` });
            setSelectedId(null);
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Approve failed', body: error instanceof Error ? error.message : 'Could not approve match.' });
        }
    };
    const sendBack = async (r) => {
        try {
            await mutation.mutateAsync({ id: r.id, action: 'reject' });
            toast({ tone: 'warning', title: 'Sent back', body: `${r.transaction.counterparty} returned to the operator to re-prepare.` });
            setSelectedId(null);
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Send back failed', body: error instanceof Error ? error.message : 'Could not return match.' });
        }
    };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Reconciliation", subtitle: "Review the matches Kora and your team prepared \u2014 inspect the deltas and evidence, then approve to post or send back.", right: _jsx(DateRangePill, { label: "May 2025" }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(Stat, { label: "Prepared \u2014 to approve", value: counts.prepared, tone: "text-success", active: tier === 'all' }), _jsx(Stat, { label: "Needs review", value: counts.review, tone: "text-warning", active: tier === 'review', onClick: () => setTier(tier === 'review' ? 'all' : 'review') }), _jsx(Stat, { label: "Suggested", value: counts.suggested, tone: "text-lavender", active: tier === 'suggested', onClick: () => setTier(tier === 'suggested' ? 'all' : 'suggested') }), _jsx(Stat, { label: "Suspicious", value: counts.suspicious, tone: "text-danger", active: tier === 'suspicious', onClick: () => setTier(tier === 'suspicious' ? 'all' : 'suspicious') })] }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_280px]", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex min-h-0 flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-white/55 p-4", children: [_jsxs("div", { className: "flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70", children: [_jsx(Search, { className: "size-4 text-ink-muted" }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), type: "search", placeholder: "Search party or reference\u2026", className: "w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" })] }), _jsxs("select", { value: tier, onChange: (e) => setTier(e.target.value), className: "h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none", children: [_jsx("option", { value: "all", children: "All tiers" }), ['suggested', 'review', 'duplicate', 'suspicious'].map((t) => _jsx("option", { value: t, children: TIER_LABEL[t] }, t))] })] }), _jsxs("ul", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto", children: [queue.map((r) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setSelectedId(r.id), className: "flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55", children: [_jsx(PartyAvatar, { name: r.transaction.counterparty, size: "md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: r.transaction.counterparty }), _jsx("span", { className: cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', TIER_TONE[r.tier]), children: TIER_LABEL[r.tier] }), r.stage === 'prepared' ? _jsx("span", { className: "shrink-0 rounded-full bg-success-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-success", children: "ready" }) : null] }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [r.transaction.source, " \u00B7 ", r.suggestedRecord?.reference ?? r.transaction.reference ?? 'no ref', " \u00B7 ", r.ageText] })] }), _jsx(ConfidenceChip, { score: r.confidence }), _jsx(MoneyCell, { amount: r.transaction.amount, size: "sm", className: "shrink-0 font-bold !text-[13px]" })] }) }, r.id))), queue.length === 0 ? _jsx("li", { className: "grid place-items-center py-16 text-[13px] text-ink-muted", children: "Nothing to review \u2014 all caught up. \uD83C\uDF89" }) : null] })] }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 p-4", children: [_jsx("h4", { className: "text-[12px] font-bold text-ink", children: "By tier" }), tierStats.map((t) => (_jsxs("button", { type: "button", onClick: () => setTier(t.tier === 'auto' ? 'all' : t.tier), className: "flex items-center justify-between rounded-xl bg-white/55 p-2.5 text-left ring-1 ring-white/60 hover:bg-white", children: [_jsxs("span", { className: "inline-flex items-center gap-2 text-[11.5px] font-semibold text-ink", children: [_jsx("span", { className: cn('size-2 rounded-full', TIER_TONE[t.tier]) }), t.label] }), _jsx("span", { className: "text-[11.5px] font-bold tabular text-ink-soft", children: t.count.toLocaleString() })] }, t.tier)))] }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15", children: [_jsxs("header", { className: "flex items-center gap-1.5", children: [_jsx(Sparkles, { className: "size-3.5 text-ai" }), _jsx("h4", { className: "text-[12px] font-bold text-ink", children: "Reconciliation agent" })] }), _jsxs("button", { type: "button", onClick: () => setTier('suspicious'), className: "rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white", children: [_jsxs("span", { className: "font-bold text-danger", children: [counts.suspicious, " suspicious ", counts.suspicious === 1 ? 'match' : 'matches'] }), " need your decision before posting. ", _jsx("span", { className: "font-semibold text-brand", children: "Review \u2192" })] })] })] })] })] }), _jsx(MatchDrawer, { recon: selected, onClose: () => setSelectedId(null), onApprove: approve, onSendBack: sendBack })] }));
}
function MatchDrawer({ recon: r, onClose, onApprove, onSendBack }) {
    return (_jsx(Dialog.Root, { open: r !== null, onOpenChange: (o) => !o && onClose(), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsx(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(500px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: r ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(PartyAvatar, { name: r.transaction.counterparty, size: "lg" }), _jsxs("div", { children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: r.transaction.counterparty }), _jsxs("p", { className: "text-[11.5px] text-ink-muted", children: [r.transaction.source, " \u00B7 ", r.ageText] })] })] }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-ink-muted", children: "Amount" }), _jsx(MoneyCell, { amount: r.transaction.amount, size: "xl", className: "!text-3xl font-bold text-ink" })] }), _jsx(ConfidenceChip, { score: r.confidence })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { className: "rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wider text-ink-muted", children: "Bank" }), _jsx("p", { className: "text-[12.5px] font-bold text-ink", children: r.transaction.source }), _jsx("p", { className: "font-mono text-[11px] text-ink-soft", children: r.transaction.reference ?? '—' })] }), _jsxs("div", { className: "rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wider text-ink-muted", children: "Record" }), _jsx("p", { className: "text-[12.5px] font-bold text-ink", children: r.suggestedRecord ? r.suggestedRecord.partyName : 'No match' }), _jsx("p", { className: "font-mono text-[11px] text-ink-soft", children: r.suggestedRecord?.reference ?? '—' })] })] }), r.deltas.length > 0 ? (_jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Field comparison" }), _jsx("ul", { className: "overflow-hidden rounded-2xl ring-1 ring-white/60", children: r.deltas.map((d) => (_jsxs("li", { className: "grid grid-cols-[80px_1fr_1fr] items-center gap-2 border-b border-white/45 bg-white/40 px-3 py-2 text-[11.5px] last:border-0", children: [_jsx("span", { className: "font-bold capitalize text-ink-muted", children: d.field }), _jsx("span", { className: "truncate text-ink-soft", children: d.bankValue }), _jsxs("span", { className: cn('truncate text-right font-semibold', DELTA_TONE[d.status]), children: [d.recordValue, d.status !== 'match' ? ' ⚠' : ' ✓'] })] }, d.field))) })] })) : null, _jsxs(GlassSurface, { noBlur: true, tone: "subtle", className: "bg-ai-soft/40 p-3.5 ring-1 ring-ai/15", children: [_jsxs("p", { className: "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ai", children: [_jsx(Sparkles, { className: "size-3.5" }), " Agent read"] }), _jsx("p", { className: "mt-1 text-[12.5px] text-ink", children: r.reason })] }), r.evidence.length > 0 ? (_jsxs("div", { children: [_jsx("p", { className: "mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Evidence" }), _jsx("ul", { className: "flex flex-col gap-2", children: r.evidence.map((d) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => openDoc({ name: d.name, kind: d.kind, sizeText: d.sizeText, ...(d.pageRef ? { context: d.pageRef } : {}) }), className: "flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger", children: _jsx(FileText, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12.5px] font-semibold text-ink", children: d.name }), _jsxs("p", { className: "text-[11px] text-ink-muted", children: [d.kind, d.pageRef ? ` · ${d.pageRef}` : ''] })] }), _jsx("span", { className: "rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70", children: "View" })] }) }, d.id))) })] })) : null] }), _jsxs("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: [_jsxs("button", { type: "button", onClick: () => onSendBack(r), className: "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-danger ring-1 ring-white/70 hover:bg-white", children: [_jsx(Send, { className: "size-4" }), " Send back"] }), _jsxs("button", { type: "button", onClick: () => onApprove(r), className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Check, { className: "size-4" }), " Approve & post ", _jsx(ArrowRight, { className: "size-4" })] })] })] })) : null })] }) }));
}
function Stat({ label, value, tone, active, onClick }) {
    return (_jsx(GlassSurface, { tone: "strong", className: cn('p-3.5', active && onClick && 'ring-2 ring-brand/40'), children: _jsxs("button", { type: "button", onClick: onClick, disabled: !onClick, className: cn('flex w-full flex-col gap-0.5 text-left', onClick && 'cursor-pointer'), children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsx("span", { className: cn('font-display text-2xl font-bold tabular', tone), children: value }), onClick ? _jsx("span", { className: "text-[10.5px] font-semibold text-brand", children: active ? 'Filtered · clear' : 'Filter' }) : _jsx("span", { className: "text-[10.5px] font-semibold text-ink-muted", children: "awaiting you" })] }) }));
}
