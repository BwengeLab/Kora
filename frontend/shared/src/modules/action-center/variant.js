export const VARIANTS = {
    // The preparer's tracker: items THEY prepared and routed up, with live status.
    // They prepare and propose; approval is someone else's signature.
    finance_operator: {
        title: 'My Tasks',
        subtitle: 'What you prepared and routed for approval — track its status here. You prepare & propose; an approver signs.',
        includes: (a) => a.preparedBy.role === 'Finance Operator',
        track: true,
    },
    finance_lead: {
        title: 'Action Center',
        subtitle: 'Approve what Kora and your team prepared. You decide · the system executes & logs every action.',
        includes: () => true,
    },
    org_owner: {
        title: 'Top Approvals',
        subtitle: 'The highest-value and high-risk decisions routed up to you for final sign-off.',
        includes: (a) => {
            const topTier = a.risk === 'high' || a.requiresDualApproval || !a.withinLimit;
            if (!topTier)
                return false;
            // Owner approves LAST: a dual-approval item only reaches them once the
            // first approver (e.g. Finance Lead) has signed. Items still awaiting
            // their first approval are not the owner's to act on yet — but already
            // approved/rejected items stay visible (the "Done" tab).
            if (a.requiresDualApproval && a.stage === 'awaiting' && a.approvals.length === 0)
                return false;
            return true;
        },
    },
};
// Why an item reached the owner's desk — shown as a badge in the owner view.
export function routedUpReason(a) {
    if (a.requiresDualApproval)
        return 'Dual approval — your signature required';
    if (!a.withinLimit)
        return 'Over Finance Lead limit';
    if (a.risk === 'high')
        return 'High-risk — escalated to you';
    return null;
}
