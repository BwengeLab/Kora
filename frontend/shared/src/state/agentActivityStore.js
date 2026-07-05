import { create } from 'zustand';
import { seedBills, matchStatus } from '../seed/payables';
import { seedOverdue } from '../seed/ownerExtra';
import { useWorkflowStore } from './workflowStore';
let seq = 0;
const ev = (agentId, agentName, action, detail, tone, link) => ({
    id: `ae-${Date.now()}-${seq++}`,
    agentId,
    agentName,
    at: Date.now(),
    action,
    detail,
    tone,
    ...(link ? { link } : {}),
});
// What each agent actually DOES when it runs. Returns the events to log + the
// number of items it processed. Some mutate live stores (observable elsewhere).
const RUNNERS = {
    'a-recon': () => {
        const moved = useWorkflowStore.getState().agentSuggestMatches(2);
        const events = moved > 0
            ? [ev('a-recon', 'Reconciliation', `Suggested ${moved} new match${moved > 1 ? 'es' : ''}`, 'Moved detected bank items into review for the team to approve.', 'ai', { label: 'View reconciliation', to: '/reconciliation' })]
            : [ev('a-recon', 'Reconciliation', 'Swept the bank feed', 'No new unmatched items — everything is already suggested or matched.', 'success', { label: 'View reconciliation', to: '/reconciliation' })];
        return { events, processed: 18 + moved };
    },
    'a-coll': () => {
        const overdue = seedOverdue.length;
        const value = seedOverdue.reduce((a, o) => a + Number(o.amount.amountMinor) / 100, 0);
        return {
            events: [ev('a-coll', 'Collections', `Drafted ${overdue} reminders`, `$${value.toLocaleString()} overdue across ${overdue} invoices — tone-matched reminders ready for approval.`, 'warning', { label: 'Open collections', to: '/collections' })],
            processed: overdue,
        };
    },
    'a-supplier': () => {
        const variances = seedBills.filter((b) => matchStatus(b) === 'price-variance');
        return {
            events: [ev('a-supplier', 'Supplier & Margin', `Checked ${seedBills.length} bills`, variances.length ? `Flagged ${variances.length} price variance — ${variances[0].vendor} invoice exceeds its PO.` : 'No price creep detected this run.', variances.length ? 'danger' : 'success', { label: 'Open payables', to: '/payables' })],
            processed: seedBills.length,
        };
    },
    'a-audit': () => ({
        events: [
            ev('a-audit', 'Audit & Compliance', 'Flagged suspicious transfer', '$15,400 to OFFSHORE LTD — no contract on file. Referred for review.', 'danger', { label: 'Open audit', to: '/audit' }),
            ev('a-audit', 'Audit & Compliance', '2 SoD checks passed', 'No preparer approved their own item this period.', 'success'),
        ],
        processed: 32,
    }),
    'a-cfo': () => ({
        events: [ev('a-cfo', 'CFO', 'Refreshed the forecast', 'Projected $3.21M cash by month-end (+23%). Net positive across all entities.', 'ai', { label: 'Open cash flow', to: '/ledger' })],
        processed: 12,
    }),
    'a-intake': () => ({
        events: [ev('a-intake', 'Data Intake', 'Processed the inbox', '6 documents extracted; 1 low-confidence field needs a human check.', 'info', { label: 'Open data intake', to: '/data-intake' })],
        processed: 6,
    }),
    'a-credit': () => ({
        events: [ev('a-credit', 'Credit Passport', 'Recomputed the score', 'Business health score holding at 82 (Good) — lender-ready.', 'success')],
        processed: 1,
    }),
    'a-rel': () => ({
        events: [ev('a-rel', 'External Relationship', 'Updated the relationship graph', '3 contracts expiring within 30 days; PT Imports risk raised to high.', 'warning', { label: 'Open relationships', to: '/relationships' })],
        processed: 8,
    }),
};
const genericRun = (id) => ({
    events: [ev(id, 'Agent', 'Run complete', 'Scanned its data and found nothing new to action.', 'info')],
    processed: 4,
});
export const useAgentActivityStore = create((set, get) => ({
    activity: [],
    runningId: null,
    processed: {},
    lastRun: {},
    run: (agentId) => {
        if (get().runningId)
            return;
        set({ runningId: agentId });
        // Simulate the agent working, then commit its real effects + log.
        setTimeout(() => {
            const runner = RUNNERS[agentId] ?? (() => genericRun(agentId));
            const { events, processed } = runner();
            set((s) => ({
                runningId: null,
                activity: [...events, ...s.activity].slice(0, 40),
                processed: { ...s.processed, [agentId]: (s.processed[agentId] ?? 0) + processed },
                lastRun: { ...s.lastRun, [agentId]: Date.now() },
            }));
        }, 850);
    },
    runAll: () => {
        const ids = Object.keys(RUNNERS);
        ids.forEach((id, i) => setTimeout(() => get().run(id), i * 350));
    },
}));
export const timeAgo = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5)
        return 'just now';
    if (s < 60)
        return `${s}s ago`;
    if (s < 3600)
        return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
};
