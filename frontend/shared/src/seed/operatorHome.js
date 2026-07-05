// Finance Operator "My Work" home seed — what needs the operator today.
// Shapes mirror the queues/agents the gateway will expose. (Doc 04 §Home.)
const M = (amount, currency = 'USD') => ({
    amountMinor: BigInt(Math.round(amount * 100)),
    currency,
});
// ─── Focus counts ("needs me now") ─────────────────────────────────────────
export const seedOperatorFocus = {
    exceptionsToClear: 47,
    unmatchedCount: 23,
    unmatchedValue: M(312540),
    dataQualityFlags: 6,
    agentSuggestions: 14,
};
// ─── Throughput ────────────────────────────────────────────────────────────
export const seedOperatorThroughput = {
    clearedToday: 18,
    clearedMonth: 1248,
    dailyGoal: 30,
    streakDays: 6,
    weekLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekSeries: [22, 26, 19, 31, 28, 8, 18],
};
// ─── Resume where I left off ───────────────────────────────────────────────
export const seedResume = {
    reconId: 'r-4',
    party: 'PT Imports',
    amount: M(8760),
    tier: 'review',
    confidence: 58,
    note: '$260 over PO — needs your decision',
};
export const seedOperatorTasks = [
    { id: 'tk-1', title: 'Resolve unmatched HSBC batch', context: '23 transactions · May 14', status: 'assigned', deadlineText: 'Due today', urgent: true },
    { id: 'tk-2', title: 'Request invoice from PT Imports', context: 'PO-2025-441 · $260 over', status: 'awaiting_info', deadlineText: 'Waiting 1d', urgent: false },
    { id: 'tk-3', title: 'Fix column mapping — Airtel CSV', context: 'Data-quality flag · 3 fields', status: 'returned', deadlineText: 'Returned by Kora', urgent: true },
    { id: 'tk-4', title: 'Cloud Services subscription match', context: 'SUB-Q2 · prepared', status: 'prepared', deadlineText: 'Awaiting Finance Lead', urgent: false },
    { id: 'tk-5', title: 'Prepare travel reimbursement', context: 'D. Uwase · $180', status: 'assigned', deadlineText: 'Due in 2d', urgent: false },
];
export const seedAgentSuggestions = [
    { id: 'sg-1', reconId: 'r-1', party: 'ACME Supplies', amount: M(45600), confidence: 91, agent: 'Reconciliation', summary: 'Matches invoice INV-10356' },
    { id: 'sg-2', reconId: 'r-8', party: 'Cloud Services Inc', amount: M(2240), confidence: 94, agent: 'Reconciliation', summary: 'Quarterly subscription SUB-Q2' },
    { id: 'sg-3', reconId: 'r-7', party: 'Marie Iradukunda', amount: M(420), confidence: 88, agent: 'Reconciliation', summary: 'Premium payment · policy PREM-7741' },
    { id: 'sg-4', reconId: 'r-2', party: 'Kigali Office Park', amount: M(12480), confidence: 78, agent: 'Reconciliation', summary: 'Recurring rent · lease OL-2025-05' },
];
export const seedIntakeBatches = [
    { id: 'b-1', name: 'HSBC Statement — May.pdf', source: 'HSBC', records: 412, status: 'processed', flags: 0, when: '1h ago' },
    { id: 'b-2', name: 'Airtel Money — May.csv', source: 'Airtel', records: 88, status: 'needs_review', flags: 3, when: '2h ago' },
    { id: 'b-3', name: 'EBM invoices — week 20.xlsx', source: 'EBM/RRA', records: 156, status: 'processing', flags: 0, when: '12m ago' },
    { id: 'b-4', name: 'MoMo claims — May.csv', source: 'MTN MoMo', records: 64, status: 'needs_review', flags: 3, when: '3h ago' },
];
