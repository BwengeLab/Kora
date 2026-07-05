import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Check, Sparkles, X } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';
import { workflowReconciliationAction } from '../../api/workflow';
import { ConfidenceChip, GlassSurface, MoneyCell, PartyAvatar } from '../../design-system';
import { useSession } from '../../auth/hooks';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';
// LIVE agent suggestions — reconciliations the agent matched that still need
// the operator. Accept prepares the match (creates an approval for the Finance
// Lead); Dismiss removes it from the list. Both give feedback.
export function AgentSuggestionsCard() {
    const recons = useWorkflowStore((s) => s.reconciliations);
    const dismissed = useWorkflowStore((s) => s.dismissedReconIds);
    const hydrate = useWorkflowStore((s) => s.hydrate);
    const session = useSession();
    const navigate = useNavigate();
    const apiBaseUrl = getApiBaseUrl();
    const mutation = useMutation({
        mutationFn: ({ id, action }) => workflowReconciliationAction(apiBaseUrl, session.token, id, action),
        onSuccess: (response) => hydrate(response.snapshot),
    });
    const suggestions = recons.filter((r) => r.suggestedRecord && (r.stage === 'reviewing' || r.stage === 'detected') && !dismissed.includes(r.id));
    const accept = async (id, party) => {
        try {
            await mutation.mutateAsync({ id, action: 'prepare' });
            toast({ tone: 'success', title: 'Match prepared', body: `${party} sent to Finance Lead for approval.` });
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Prepare failed', body: error instanceof Error ? error.message : 'Could not prepare match.' });
        }
    };
    const dismiss = async (id) => {
        try {
            await mutation.mutateAsync({ id, action: 'dismiss' });
            toast({ tone: 'info', title: 'Suggestion dismissed', body: 'Removed from your review list.' });
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Dismiss failed', body: error instanceof Error ? error.message : 'Could not dismiss suggestion.' });
        }
    };
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white", children: _jsx(Sparkles, { className: "size-4" }) }), _jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Agent suggestions" }), _jsx("span", { className: "rounded-full bg-ai-soft px-2 py-0.5 text-[11px] font-bold text-ai tabular", children: suggestions.length })] }), _jsx(Link, { to: "/agents", className: "text-xs font-semibold text-brand hover:text-brand-ink", children: "View all" })] }), _jsxs("ul", { className: "scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5", children: [suggestions.map((r) => (_jsxs("li", { className: "flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsxs("button", { type: "button", onClick: () => navigate({ to: '/reconciliation' }), className: "flex min-w-0 flex-1 items-center gap-3 text-left", children: [_jsx(PartyAvatar, { name: r.transaction.counterparty, size: "md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: r.transaction.counterparty }), _jsx(ConfidenceChip, { score: r.confidence })] }), _jsx("p", { className: "truncate text-[11px] text-ink-muted", children: r.suggestedRecord ? `Matches ${r.suggestedRecord.reference}` : r.reason })] }), _jsx(MoneyCell, { amount: r.transaction.amount, size: "sm", className: "shrink-0 font-bold !text-[12.5px]" })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [_jsx("button", { type: "button", "aria-label": "Dismiss", title: "Dismiss", onClick: () => void dismiss(r.id), className: "grid size-8 place-items-center rounded-xl bg-white/70 text-ink-muted ring-1 ring-white/70 transition-colors hover:bg-danger-soft hover:text-danger", children: _jsx(X, { className: "size-4" }) }), _jsx("button", { type: "button", "aria-label": "Accept and prepare", title: "Accept & prepare", onClick: () => void accept(r.id, r.transaction.counterparty), className: "grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft transition-transform hover:-translate-y-0.5", children: _jsx(Check, { className: "size-4" }) })] })] }, r.id))), suggestions.length === 0 ? (_jsxs("li", { className: "grid place-items-center gap-1 py-12 text-center", children: [_jsx(Check, { className: "size-7 text-success" }), _jsx("p", { className: "text-[13px] font-semibold text-ink", children: "All suggestions reviewed" }), _jsx("p", { className: "text-[12px] text-ink-muted", children: "Nothing waiting on you right now." })] })) : null] })] }));
}
