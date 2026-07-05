// Org Owner "Ledger & Cashflow" seed — the financial position (doc 02/03).
// Cashflow + forecast, P&L, margin by segment, receivables/payables aging,
// and month-end close status.
const M = (amount, currency = 'USD') => ({
    amountMinor: BigInt(Math.round(amount * 100)),
    currency,
});
export const seedLedgerKpis = [
    { id: 'cash', label: 'Cash position', money: M(2457389), delta: { direction: 'up', valueText: '12.5%', label: 'vs last week' }, positiveDirection: 'up' },
    { id: 'netflow', label: 'Net cash flow (MTD)', money: M(458320), delta: { direction: 'up', valueText: '9.1%', label: 'MoM' }, positiveDirection: 'up' },
    { id: 'margin', label: 'Gross margin', valueText: '24.6%', delta: { direction: 'down', valueText: '2.4pp', label: 'MoM' }, positiveDirection: 'up' },
    { id: 'workingCapital', label: 'Working capital', money: M(830330), delta: { direction: 'up', valueText: '4.0%', label: 'MoM' }, positiveDirection: 'up' },
];
export const seedLedgerCashflow = {
    current: M(2457389),
    projected: M(3210000),
    labels: ['Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5', 'Wk6'],
    inflow: [3.8, 4.4, 5.1, 6.0, 6.6, 6.81],
    outflow: [2.1, 2.6, 3.0, 3.5, 3.9, 4.36],
    forecast: [null, null, null, 2.46, 2.74, 3.21],
};
export const seedPnl = [
    { label: 'Revenue', amount: M(1842120), prior: M(1552000) },
    { label: 'Cost of sales', amount: M(-1388560), prior: M(-1140000), negative: true },
    { label: 'Gross profit', amount: M(453560), prior: M(412000), emphasis: 'subtotal' },
    { label: 'Operating expenses', amount: M(-281240), prior: M(-262000), negative: true },
    { label: 'Net profit', amount: M(172320), prior: M(150000), emphasis: 'total' },
];
export const seedMarginBySegment = [
    { segment: 'Insurance — Motor', marginPct: 31, trendPts: 1.2 },
    { segment: 'Insurance — Health', marginPct: 26, trendPts: -0.6 },
    { segment: 'Insurance — Property', marginPct: 22, trendPts: -2.4 },
    { segment: 'Commissions & fees', marginPct: 41, trendPts: 0.8 },
];
export const seedReceivablesAging = [
    { bucket: 'Current', amount: M(1240000) },
    { bucket: '1–30 days', amount: M(520000) },
    { bucket: '31–60 days', amount: M(248000) },
    { bucket: '60+ days', amount: M(146890) },
];
export const seedPayablesAging = [
    { bucket: 'Current', amount: M(820000) },
    { bucket: '1–30 days', amount: M(312000) },
    { bucket: '31–60 days', amount: M(124560) },
    { bucket: '60+ days', amount: M(68000) },
];
// ── Month-end close ────────────────────────────────────────────────────────
export const seedClose = {
    period: 'May 2025',
    status: 'In progress',
    checklistDone: 7,
    checklistTotal: 10,
    openExceptions: 12,
    dueText: 'Due Jun 5',
};
