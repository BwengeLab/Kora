// Org Owner "Business Command Center" Home — seed data shaped per the
// modules listed in role-ux/02-organization-owner.md §"Home". Numbers and
// names are fabricated for the demo; field shapes will match the gateway
// types once those land.
const M = (amount, currency = 'USD') => ({
    amountMinor: BigInt(Math.round(amount * 100)),
    currency,
});
export const seedKpis = [
    { id: 'cash', label: 'Total Cash Position', money: M(2457389), trend: { direction: 'up', valueText: '12.5%', label: 'vs last week' }, positiveDirection: 'up', iconTone: 'brand' },
    { id: 'revenue', label: 'Revenue (MTD)', money: M(1842120.5), trend: { direction: 'up', valueText: '18.7%', label: 'vs last month' }, positiveDirection: 'up', iconTone: 'lavender' },
    { id: 'receivables', label: 'Outstanding Receivables', money: M(2154890.3), trend: { direction: 'up', valueText: '15.3%', label: 'vs last month' }, positiveDirection: 'down', iconTone: 'success' },
    { id: 'payables', label: 'Upcoming Payables', money: M(1324560.4), trend: { direction: 'down', valueText: '6.2%', label: 'vs last month' }, positiveDirection: 'down', iconTone: 'warning' },
];
// ─── Cash flow chart ────────────────────────────────────────────────────────
export const seedCashFlow = {
    netPosition: M(2457389),
    inflow: M(6812430),
    outflow: M(-4355041),
    net: M(2457389),
    xLabels: ['May 12', 'May 13', 'May 14', 'May 15', 'May 16', 'May 17', 'May 18'],
    series: [
        { name: 'Cash Inflow', color: '#4361ee', data: [3.8, 4.4, 5.1, 6.0, 6.6, 6.8, 6.81] },
        { name: 'Cash Outflow', color: '#9a8ce8', data: [2.1, 2.6, 3.0, 3.5, 3.9, 4.2, 4.36] },
        { name: 'Net Cash Flow', color: '#16a37b', data: [1.7, 1.8, 2.1, 2.5, 2.7, 2.6, 2.45] },
    ],
};
export const seedInsights = [
    {
        id: 'cash-forecast',
        iconKey: 'forecast',
        title: 'Cash flow forecast',
        subtitle: 'Projected cash position on May 31, 2025',
        primaryValue: '$3.21M',
        delta: { direction: 'up', valueText: '23%', label: 'vs Apr 30' },
        sparkColor: '#16a37b',
        spark: [10, 12, 11, 14, 17, 19, 22, 26],
    },
    {
        id: 'overdue',
        iconKey: 'overdue',
        title: 'Overdue invoices',
        subtitle: '12 invoices overdue > 30 days',
        primaryValue: '$214,890',
        delta: { direction: 'down', valueText: '8%', label: 'vs last week' },
        sparkColor: '#e89914',
        spark: [22, 24, 23, 22, 20, 21, 19, 18],
    },
    {
        id: 'rising-expense',
        iconKey: 'rising',
        title: 'Rising expense category',
        subtitle: 'Software & Subscriptions up 22%',
        primaryValue: '$48,560',
        delta: { direction: 'up', valueText: '22%', label: 'vs last month' },
        sparkColor: '#8b5cf6',
        spark: [6, 7, 9, 10, 12, 14, 15, 17],
    },
    {
        id: 'margin',
        iconKey: 'margin',
        title: 'Margin pressure',
        subtitle: 'Gross margin down 2.4%',
        primaryValue: '24.6%',
        delta: { direction: 'down', valueText: '2.4pp', label: 'vs last month' },
        sparkColor: '#4361ee',
        spark: [29, 28, 27, 27, 26, 25, 25, 24],
    },
];
export const seedActions = [
    { id: 'a1', iconKey: 'recon', title: 'Review 23 unmatched transactions', subtitle: 'Bank statement · HSBC · 2h ago', tone: 'neutral' },
    { id: 'a2', iconKey: 'approve', title: 'Approve payment to Supplier A', subtitle: '$45,600.00 · Invoice INV-10356', tone: 'info' },
    { id: 'a3', iconKey: 'collect', title: 'Follow up 8 overdue invoices', subtitle: 'Total $214,890.30 · Oldest 48 days', tone: 'warning' },
    { id: 'a4', iconKey: 'contract', title: 'Contract renewal: Office Lease', subtitle: 'Expires in 14 days · Action required', tone: 'warning' },
    { id: 'a5', iconKey: 'flag', title: 'Review flagged transaction', subtitle: 'Amount: $8,760.00 · High risk', tone: 'danger' },
];
export const seedActionCount = 12;
// ─── Reconciliation snapshot ───────────────────────────────────────────────
export const seedReconciliation = {
    total: 1248,
    slices: [
        { name: 'Matched', value: 842, color: '#4361ee', pctText: '67%' },
        { name: 'Unmatched', value: 236, color: '#9a8ce8', pctText: '19%' },
        { name: 'Pending Review', value: 170, color: '#16a37b', pctText: '14%' },
    ],
};
export const seedRelationships = [
    { id: 'cust', iconKey: 'customers', label: 'Customers', count: 248, trendText: '12 this month', trendTone: 'success' },
    { id: 'sup', iconKey: 'suppliers', label: 'Suppliers', count: 186, trendText: '5 this month', trendTone: 'success' },
    { id: 'part', iconKey: 'partners', label: 'Partners', count: 42, trendText: '—', trendTone: 'neutral' },
    { id: 'con', iconKey: 'contracts', label: 'Contracts', count: 78, trendText: '3 expiring soon', trendTone: 'warning' },
    { id: 'ren', iconKey: 'renewals', label: 'Renewals', count: 9, trendText: 'Due in 30 days', trendTone: 'warning' },
];
// ─── Credit Passport ───────────────────────────────────────────────────────
export const seedCreditPassport = {
    score: 82,
    label: 'Good',
    caption: 'Business Health Score',
    updated: 'May 18, 2025',
    factors: [
        { name: 'Payment Behavior', rating: 'Good' },
        { name: 'Financial Strength', rating: 'Good' },
        { name: 'Risk Profile', rating: 'Low' },
        { name: 'Credit Readiness', rating: 'Strong' },
    ],
};
export const seedAgents = [
    { id: 'ag1', name: 'Reconciliation Agent', status: 'Completed', when: '2m ago' },
    { id: 'ag2', name: 'CFO Agent', status: 'Completed', when: '5m ago' },
    { id: 'ag3', name: 'Collections Agent', status: 'In Progress', when: '12m ago' },
    { id: 'ag4', name: 'Relationship Agent', status: 'Completed', when: '18m ago' },
    { id: 'ag5', name: 'Credit Passport Agent', status: 'Completed', when: '25m ago' },
    { id: 'ag6', name: 'Audit Agent', status: 'Completed', when: '32m ago' },
];
export const seedDocuments = [
    { id: 'd1', name: 'Bank Statement – May 2025', ext: 'PDF', size: '2.4 MB', when: '1h ago' },
    { id: 'd2', name: 'Invoice INV-10356', ext: 'PDF', size: '320 KB', when: '2h ago' },
    { id: 'd3', name: 'Q2 Forecast.xlsx', ext: 'XLSX', size: '1.2 MB', when: '3h ago' },
    { id: 'd4', name: 'Supplier Agreement.pdf', ext: 'PDF', size: '850 KB', when: '5h ago' },
    { id: 'd5', name: 'Audit Report – April 2025', ext: 'PDF', size: '1.6 MB', when: '1d ago' },
];
