// Reconciliation cockpit seed data. Shapes mirror what the Reconciliation
// service (Go) + Reconciliation agent (Py) will return over gRPC. Every
// reconciliation carries its confidence tier, the agent's reason, a per-field
// delta breakdown, the supporting evidence, and an audit history — so the
// operator prepares a match with full proof, never a silent guess. (Doc 06 §5.)
const M = (amount, currency = 'USD') => ({
    amountMinor: BigInt(Math.round(amount * 100)),
    currency,
});
// ─── Helpers ───────────────────────────────────────────────────────────────
function txn(id, source, date, amount, counterparty, reference, direction = 'outflow') {
    return reference !== undefined
        ? { id, source, date, amount, counterparty, reference, direction }
        : { id, source, date, amount, counterparty, direction };
}
function rec(id, type, date, amount, partyName, reference) {
    return { id, type, date, amount, partyName, reference };
}
const agentDetected = (at) => ({
    id: `h-${at}`,
    at,
    actor: 'Reconciliation Agent',
    actorRole: 'Kora AI',
    kind: 'agent',
    action: 'Detected and scored this transaction',
});
// ─── Seed ──────────────────────────────────────────────────────────────────
export const seedReconciliations = [
    {
        id: 'r-1',
        stage: 'reviewing',
        transaction: txn('t-1', 'HSBC', '2025-05-14', M(45600), 'ACME Supplies', 'ACME-INV-10356'),
        suggestedRecord: rec('inv-1', 'invoice', '2025-05-13', M(45600), 'ACME Supplies Ltd.', 'INV-10356'),
        confidence: 91,
        tier: 'suggested',
        reason: 'The amount and party match exactly, the reference is 87% similar (ACME-INV-10356 ↔ INV-10356), and the dates are one day apart — a normal settlement gap.',
        ageText: '2h ago',
        deltas: [
            { field: 'amount', status: 'match', bankValue: '$45,600.00', recordValue: '$45,600.00' },
            { field: 'reference', status: 'near', bankValue: 'ACME-INV-10356', recordValue: 'INV-10356', note: '87% similar' },
            { field: 'date', status: 'near', bankValue: 'May 14', recordValue: 'May 13', note: '−1 day' },
            { field: 'party', status: 'match', bankValue: 'ACME Supplies', recordValue: 'ACME Supplies Ltd.' },
        ],
        evidence: [
            { id: 'e-1', name: 'HSBC Statement — May 2025.pdf', kind: 'statement', sizeText: '2.4 MB', pageRef: 'p.3, line 14' },
            { id: 'e-2', name: 'Invoice INV-10356.pdf', kind: 'invoice', sizeText: '320 KB' },
        ],
        history: [
            agentDetected('2025-05-14T09:12:00Z'),
            { id: 'h-1b', at: '2025-05-14T09:12:01Z', actor: 'System', actorRole: 'Kora', kind: 'system', action: 'Routed to Suggested queue (91% confidence)' },
        ],
    },
    {
        id: 'r-2',
        stage: 'reviewing',
        transaction: txn('t-2', 'BK', '2025-05-15', M(12480), 'Kigali Office Park', 'RENT-MAY'),
        suggestedRecord: rec('bill-1', 'bill', '2025-05-01', M(12480), 'Kigali Office Park Ltd.', 'OL-2025-05'),
        confidence: 78,
        tier: 'suggested',
        reason: 'The amount matches a recurring monthly rent. References differ but the 2-week gap to the bill date is normal for this lease, and the party matches.',
        ageText: '4h ago',
        deltas: [
            { field: 'amount', status: 'match', bankValue: '$12,480.00', recordValue: '$12,480.00' },
            { field: 'reference', status: 'diff', bankValue: 'RENT-MAY', recordValue: 'OL-2025-05' },
            { field: 'date', status: 'near', bankValue: 'May 15', recordValue: 'May 1', note: 'recurring' },
            { field: 'party', status: 'match', bankValue: 'Kigali Office Park', recordValue: 'Kigali Office Park Ltd.' },
        ],
        evidence: [
            { id: 'e-3', name: 'BK Statement — May 2025.pdf', kind: 'statement', sizeText: '1.8 MB', pageRef: 'p.1, line 7' },
            { id: 'e-4', name: 'Office Lease 2025.pdf', kind: 'contract', sizeText: '850 KB' },
        ],
        history: [agentDetected('2025-05-15T08:02:00Z')],
    },
    {
        id: 'r-3',
        stage: 'detected',
        transaction: txn('t-3', 'MTN MoMo', '2025-05-15', M(820), 'J. Habimana', 'CLAIM-08812', 'outflow'),
        suggestedRecord: rec('exp-1', 'expense', '2025-05-15', M(820), 'Jean Habimana', 'CL-08812'),
        confidence: 96,
        tier: 'auto',
        reason: 'Amount, date and party match exactly; reference is 94% similar. Auto-matched with high confidence.',
        ageText: '5h ago',
        deltas: [
            { field: 'amount', status: 'match', bankValue: '$820.00', recordValue: '$820.00' },
            { field: 'reference', status: 'near', bankValue: 'CLAIM-08812', recordValue: 'CL-08812', note: '94%' },
            { field: 'date', status: 'match', bankValue: 'May 15', recordValue: 'May 15' },
            { field: 'party', status: 'match', bankValue: 'J. Habimana', recordValue: 'Jean Habimana' },
        ],
        evidence: [{ id: 'e-5', name: 'MoMo Statement — May.csv', kind: 'statement', sizeText: '64 KB' }],
        history: [agentDetected('2025-05-15T07:40:00Z')],
    },
    {
        id: 'r-4',
        stage: 'reviewing',
        transaction: txn('t-4', 'I&M Bank', '2025-05-15', M(8760), 'PT IMPORTS', undefined),
        suggestedRecord: rec('po-1', 'po', '2025-05-08', M(8500), 'PT Imports', 'PO-2025-441'),
        confidence: 58,
        tier: 'review',
        reason: 'The amount is $260 higher than the purchase order and there is no reference on the bank side. The party is similar but this needs a human to confirm the overcharge or a partial delivery.',
        ageText: '1h ago',
        deltas: [
            { field: 'amount', status: 'diff', bankValue: '$8,760.00', recordValue: '$8,500.00', note: '+$260' },
            { field: 'reference', status: 'diff', bankValue: '—', recordValue: 'PO-2025-441' },
            { field: 'date', status: 'near', bankValue: 'May 15', recordValue: 'May 8', note: '+7 days' },
            { field: 'party', status: 'near', bankValue: 'PT IMPORTS', recordValue: 'PT Imports' },
        ],
        evidence: [
            { id: 'e-6', name: 'I&M Statement — May.pdf', kind: 'statement', sizeText: '1.1 MB', pageRef: 'p.2, line 3' },
            { id: 'e-7', name: 'PO-2025-441.pdf', kind: 'po', sizeText: '210 KB' },
        ],
        history: [
            agentDetected('2025-05-15T11:20:00Z'),
            { id: 'h-4b', at: '2025-05-15T11:20:01Z', actor: 'System', actorRole: 'Kora', kind: 'system', action: 'Flagged: unexplained difference of $260' },
        ],
        unexplainedDifference: M(260),
    },
    {
        id: 'r-5',
        stage: 'detected',
        transaction: txn('t-5', 'HSBC', '2025-05-14', M(45600), 'ACME Supplies', 'ACME-INV-10356'),
        confidence: 99,
        tier: 'duplicate',
        reason: 'Identical to transaction r-1 — same amount, reference and counterparty, posted within 60 seconds.',
        ageText: '2h ago',
        deltas: [],
        evidence: [{ id: 'e-8', name: 'HSBC Statement — May 2025.pdf', kind: 'statement', sizeText: '2.4 MB', pageRef: 'p.3, line 15' }],
        history: [agentDetected('2025-05-14T09:13:00Z')],
        duplicateOf: 'r-1',
    },
    {
        id: 'r-6',
        stage: 'detected',
        transaction: txn('t-6', 'BK', '2025-05-12', M(15400), 'OFFSHORE LTD', undefined),
        confidence: 22,
        tier: 'suspicious',
        reason: 'Unknown counterparty with no contract or PO on file, large round amount, posted outside business hours. Recommend escalation to the Audit agent.',
        ageText: '3d ago',
        deltas: [],
        evidence: [{ id: 'e-9', name: 'BK Statement — May 2025.pdf', kind: 'statement', sizeText: '1.8 MB', pageRef: 'p.4, line 22' }],
        history: [
            agentDetected('2025-05-12T22:41:00Z'),
            { id: 'h-6b', at: '2025-05-12T22:41:02Z', actor: 'Audit Agent', actorRole: 'Kora AI', kind: 'agent', action: 'Raised suspicious-activity flag' },
        ],
    },
    {
        id: 'r-7',
        stage: 'reviewing',
        transaction: txn('t-7', 'Airtel Money', '2025-05-15', M(420), 'M. Iradukunda', 'PREMIUM-7741', 'inflow'),
        suggestedRecord: rec('inv-2', 'invoice', '2025-05-15', M(420), 'Marie Iradukunda', 'PREM-7741'),
        confidence: 88,
        tier: 'suggested',
        reason: 'A premium payment in. Amount, party and date all match; the reference is the policy ID (88% similar).',
        ageText: '6h ago',
        deltas: [
            { field: 'amount', status: 'match', bankValue: '$420.00', recordValue: '$420.00' },
            { field: 'reference', status: 'near', bankValue: 'PREMIUM-7741', recordValue: 'PREM-7741', note: '88%' },
            { field: 'date', status: 'match', bankValue: 'May 15', recordValue: 'May 15' },
            { field: 'party', status: 'match', bankValue: 'M. Iradukunda', recordValue: 'Marie Iradukunda' },
        ],
        evidence: [{ id: 'e-10', name: 'Airtel Statement — May.csv', kind: 'statement', sizeText: '48 KB' }],
        history: [agentDetected('2025-05-15T06:30:00Z')],
    },
    {
        id: 'r-8',
        stage: 'prepared',
        transaction: txn('t-8', 'HSBC', '2025-05-13', M(2240), 'CLOUD SERVICES INC', 'SUB-Q2'),
        suggestedRecord: rec('exp-2', 'expense', '2025-05-13', M(2240), 'Cloud Services Inc', 'SUB-Q2-2025'),
        confidence: 94,
        tier: 'suggested',
        reason: 'Quarterly software subscription. Amount and date match exactly; party and reference align with last quarter.',
        ageText: 'Prepared 20m ago',
        deltas: [
            { field: 'amount', status: 'match', bankValue: '$2,240.00', recordValue: '$2,240.00' },
            { field: 'reference', status: 'near', bankValue: 'SUB-Q2', recordValue: 'SUB-Q2-2025', note: '90%' },
            { field: 'date', status: 'match', bankValue: 'May 13', recordValue: 'May 13' },
            { field: 'party', status: 'match', bankValue: 'CLOUD SERVICES INC', recordValue: 'Cloud Services Inc' },
        ],
        evidence: [{ id: 'e-11', name: 'HSBC Statement — May 2025.pdf', kind: 'statement', sizeText: '2.4 MB', pageRef: 'p.2, line 9' }],
        history: [
            agentDetected('2025-05-13T10:00:00Z'),
            { id: 'h-8b', at: '2025-05-15T16:40:00Z', actor: 'Diane Uwase', actorRole: 'Finance Operator', kind: 'user', action: 'Prepared match · awaiting Finance Lead approval' },
        ],
    },
    {
        id: 'r-9',
        stage: 'reviewing',
        transaction: txn('t-9', 'BK', '2025-05-14', M(3920), 'Vendor 7741', undefined),
        confidence: 41,
        tier: 'review',
        reason: 'No matching invoice or PO found in the last 60 days. A document is likely missing — request it before matching.',
        ageText: '1d ago',
        deltas: [],
        evidence: [{ id: 'e-12', name: 'BK Statement — May 2025.pdf', kind: 'statement', sizeText: '1.8 MB', pageRef: 'p.3, line 1' }],
        history: [agentDetected('2025-05-14T13:05:00Z')],
    },
    {
        id: 'r-10',
        stage: 'reviewing',
        transaction: txn('t-10', 'MTN MoMo', '2025-05-13', M(180), 'D. Uwase', 'TRAVEL-MAY', 'outflow'),
        suggestedRecord: rec('exp-3', 'expense', '2025-05-12', M(180), 'Diane Uwase', 'EXP-TRAV-2205'),
        confidence: 82,
        tier: 'suggested',
        reason: 'A travel reimbursement. Amount and party match; one day apart. References use different schemes but are consistent.',
        ageText: '1d ago',
        deltas: [
            { field: 'amount', status: 'match', bankValue: '$180.00', recordValue: '$180.00' },
            { field: 'reference', status: 'diff', bankValue: 'TRAVEL-MAY', recordValue: 'EXP-TRAV-2205' },
            { field: 'date', status: 'near', bankValue: 'May 13', recordValue: 'May 12', note: '−1 day' },
            { field: 'party', status: 'match', bankValue: 'D. Uwase', recordValue: 'Diane Uwase' },
        ],
        evidence: [{ id: 'e-13', name: 'Travel receipt.jpg', kind: 'receipt', sizeText: '1.2 MB' }],
        history: [agentDetected('2025-05-13T15:00:00Z')],
    },
];
// ─── Period & throughput stats (for the cockpit stats band) ────────────────
export const seedReconciliationStats = {
    period: 'May 2025',
    total: 1264,
    reconciled: 1094,
    remaining: 170,
    autoMatchRate: 0.846,
    clearedToday: 18,
    clearedTodaySeries: [4, 6, 5, 9, 12, 14, 16, 18],
    preparedAwaitingApproval: 32,
    unexplainedTotal: M(214890.3),
};
export const seedTierStats = [
    { tier: 'auto', label: 'Auto-matched', sub: '≥ 95% — no action needed', count: 842, value: M(3120400) },
    { tier: 'suggested', label: 'Suggested', sub: '70–94% — review & prepare', count: 236, value: M(1240880) },
    { tier: 'review', label: 'Needs review', sub: '< 70% — decide manually', count: 170, value: M(840220) },
    { tier: 'duplicate', label: 'Duplicates', sub: 'flagged by Kora', count: 12, value: M(91200) },
    { tier: 'suspicious', label: 'Suspicious', sub: 'fraud / control risk', count: 4, value: M(15400) },
];
