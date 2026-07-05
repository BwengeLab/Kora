import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { workflowApprovalAction } from '../../api/workflow';
import { useSession } from '../../auth/hooks';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';
import { ApprovalDetail } from './ApprovalDetail';
import { ApprovalQueue } from './ApprovalQueue';
import { ApprovalStatsBand } from './ApprovalStatsBand';
import { VARIANTS } from './variant';
// The approval control point. `variant` scopes it per role (lead = full queue,
// owner = top-tier). Wired to the shared workflow store: items prepared in the
// Reconciliation Cockpit appear here, and Approve/Reject mutate live state.
export function ActionCenter({ variant = 'finance_lead' }) {
    const cfg = VARIANTS[variant];
    const allApprovals = useWorkflowStore((s) => s.approvals);
    const hydrate = useWorkflowStore((s) => s.hydrate);
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const actor = { name: session?.user.displayName ?? 'Approver', role: session?.roles[0]?.name ?? 'Finance Lead' };
    const mutation = useMutation({
        mutationFn: ({ approvalID, action }) => workflowApprovalAction(apiBaseUrl, session.token, approvalID, action),
        onSuccess: (response) => {
            hydrate(response.snapshot);
        },
    });
    const items = useMemo(() => allApprovals.filter(cfg.includes), [allApprovals, cfg]);
    const [selectedId, setSelectedId] = useState(items[0]?.id ?? '');
    const [tab, setTab] = useState('awaiting');
    const handleApprove = async (id) => {
        const item = allApprovals.find((a) => a.id === id);
        const name = item?.title ?? 'Item';
        let result = null;
        try {
            result = (await mutation.mutateAsync({ approvalID: id, action: 'approve' })).result;
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Approval failed', body: error instanceof Error ? error.message : 'Could not approve item.' });
            return;
        }
        switch (result) {
            case 'approved':
                toast({ tone: 'success', title: 'Approved & posted', body: `${name} executed and written to the audit log.` });
                break;
            case 'partial':
                toast({ tone: 'info', title: 'Approved (1 of 2)', body: `${name} now needs a second, different approver.` });
                break;
            case 'sod':
                toast({ tone: 'danger', title: "Can't approve your own item", body: 'Segregation of duties — another approver must sign off.' });
                break;
            case 'duplicate':
                toast({ tone: 'warning', title: 'You already approved this', body: 'A second, different approver is required.' });
                break;
            case 'needs-first':
                toast({ tone: 'warning', title: 'You approve last', body: 'This dual-approval item still needs its first approval (Finance Lead).' });
                break;
            default:
                break;
        }
    };
    const handleReject = async (id) => {
        const item = allApprovals.find((a) => a.id === id);
        try {
            await mutation.mutateAsync({ approvalID: id, action: 'reject' });
            toast({ tone: 'danger', title: 'Rejected', body: `${item?.title ?? 'Item'} sent back with your reason.` });
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Reject failed', body: error instanceof Error ? error.message : 'Could not reject item.' });
        }
    };
    const handleAuxAction = async (id, action) => {
        try {
            const response = await mutation.mutateAsync({ approvalID: id, action });
            switch (action) {
                case 'withdraw':
                    toast({ tone: 'warning', title: 'Withdrawn', body: `${items.find((entry) => entry.id === id)?.title ?? 'Item'} pulled back to your drafts to revise.` });
                    break;
                case 'nudge':
                    toast({ tone: 'info', title: 'Reminder sent', body: 'Nudged the approver to review your submission.' });
                    break;
                case 'resubmit':
                    toast({ tone: 'info', title: 'Reopened', body: `${items.find((entry) => entry.id === id)?.title ?? 'Item'} reopened to fix and resubmit.` });
                    break;
                case 'request-info':
                    toast({ tone: 'info', title: 'Info requested', body: 'Asked the preparer for more context and evidence.' });
                    break;
                case 'reassign':
                    toast({ tone: 'info', title: 'Reassigned', body: 'Approval ownership was reassigned and logged.' });
                    break;
                case 'escalate':
                    toast({ tone: 'warning', title: 'Escalated to Owner', body: 'This item now requires top-level sign-off.' });
                    break;
                default:
                    toast({ tone: 'info', title: 'Updated', body: response.result });
            }
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not update approval.' });
        }
    };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: cfg.title, subtitle: cfg.subtitle, right: _jsx(DateRangePill, { label: "May 12 \u2013 May 18, 2025" }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-5 px-8", children: [_jsx(ApprovalStatsBand, { variant: variant, items: items }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-5 pb-6 @5xl:grid-cols-[400px_1fr]", children: [_jsx(ApprovalQueue, { items: items, variant: variant, track: !!cfg.track, selectedId: selectedId, onSelect: setSelectedId, tab: tab, onTab: setTab }), _jsx(ApprovalDetail, { items: items, variant: variant, track: !!cfg.track, selectedId: selectedId, onSelect: setSelectedId, onApprove: handleApprove, onReject: handleReject, onAction: handleAuxAction })] })] })] }));
}
