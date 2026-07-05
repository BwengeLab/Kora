import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation } from '@tanstack/react-query';
import { Keyboard, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { workflowReconciliationAction } from '../../api/workflow';
import { useSession } from '../../auth/hooks';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';
import { ExceptionQueue } from './ExceptionQueue';
import { MatchDetail } from './MatchDetail';
import { ReconStatsBand } from './ReconStatsBand';
// The Reconciliation Cockpit (v2) — a guided decision workspace, now wired to
// the shared workflow store: "Prepare match" creates an approval that flows to
// the Finance Lead's Action Center.
export function ReconciliationCockpit() {
    const recons = useWorkflowStore((s) => s.reconciliations);
    const hydrate = useWorkflowStore((s) => s.hydrate);
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const mutation = useMutation({
        mutationFn: ({ id, action }) => workflowReconciliationAction(apiBaseUrl, session.token, id, action),
        onSuccess: (response) => hydrate(response.snapshot),
    });
    const [selectedId, setSelectedId] = useState(recons[0]?.id ?? '');
    const [tierFilter, setTierFilter] = useState('all');
    const [tab, setTab] = useState('to_review');
    const [selectMode, setSelectMode] = useState(false);
    const [checked, setChecked] = useState(new Set());
    const toggleCheck = (id) => setChecked((prev) => {
        const nextSet = new Set(prev);
        if (nextSet.has(id))
            nextSet.delete(id);
        else
            nextSet.add(id);
        return nextSet;
    });
    const handlePrepare = async (id) => {
        const recon = recons.find((r) => r.id === id);
        try {
            await mutation.mutateAsync({ id, action: 'prepare' });
            toast({
                tone: 'success',
                title: 'Match prepared',
                body: `${recon?.transaction.counterparty ?? 'Match'} sent to Finance Lead for approval.`,
            });
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Prepare failed', body: error instanceof Error ? error.message : 'Could not prepare match.' });
        }
    };
    const handleReject = async (id) => {
        try {
            await mutation.mutateAsync({ id, action: 'reject' });
            toast({ tone: 'warning', title: 'Match rejected', body: 'Returned to the review queue.' });
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Reject failed', body: error instanceof Error ? error.message : 'Could not reject match.' });
        }
    };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Reconciliation Cockpit", subtitle: _jsx(_Fragment, { children: "Match money to reality. Kora prepares \u00B7 you review & prepare \u00B7 Finance Lead approves." }), right: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs("button", { type: "button", className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass transition-colors hover:bg-white hover:text-ink", children: [_jsx(Keyboard, { className: "size-4" }), " Shortcuts"] }), _jsxs("button", { type: "button", className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass transition-colors hover:bg-white hover:text-ink", children: [_jsx(RefreshCw, { className: "size-4" }), " Re-run agent"] }), _jsx(DateRangePill, { label: "May 12 \u2013 May 18, 2025" })] }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-5 px-8", children: [_jsx(ReconStatsBand, { activeTier: tierFilter, onTier: setTierFilter, recons: recons }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-5 pb-6 @5xl:grid-cols-[400px_1fr]", children: [_jsx(ExceptionQueue, { recons: recons, selectedId: selectedId, onSelect: setSelectedId, tierFilter: tierFilter, tab: tab, onTab: setTab, selectMode: selectMode, onToggleSelectMode: () => {
                                    setSelectMode((v) => !v);
                                    setChecked(new Set());
                                }, checked: checked, onToggleCheck: toggleCheck, onClearChecks: () => setChecked(new Set()) }), _jsx(MatchDetail, { recons: recons, selectedId: selectedId, onSelect: setSelectedId, onPrepare: handlePrepare, onReject: handleReject })] })] })] }));
}
