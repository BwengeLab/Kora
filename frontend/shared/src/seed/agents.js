// The 10 Kora AI agents (doc 06 §4) — their live work, for the AI Agents page.
export const seedAgents = [
    { id: 'a-intake', name: 'Data Intake', icon: 'intake', status: 'running', role: 'Extracts & cleans documents into structured records', processedToday: 412, lastRun: 'now', insight: '3 files flagged for low-confidence fields', accuracyPct: 96 },
    { id: 'a-recon', name: 'Reconciliation', icon: 'recon', status: 'active', role: 'Matches money movement to business reality', processedToday: 1248, lastRun: '2m ago', insight: '236 suggested matches awaiting review', accuracyPct: 94 },
    { id: 'a-cfo', name: 'CFO', icon: 'cfo', status: 'active', role: 'Cashflow forecast, margin & anomaly detection', processedToday: 64, lastRun: '8m ago', insight: 'Projected $3.21M cash by May 31 (+23%)', accuracyPct: 91 },
    { id: 'a-rel', name: 'External Relationship', icon: 'relationship', status: 'active', role: 'Builds the relationship graph & partner risk', processedToday: 88, lastRun: '18m ago', insight: '3 contracts expiring within 30 days', accuracyPct: 92 },
    { id: 'a-contract', name: 'Contract & Obligation', icon: 'contract', status: 'idle', role: 'Extracts terms, dates, obligations & renewals', processedToday: 21, lastRun: '1h ago', insight: 'Office lease renewal needs a decision in 14 days', accuracyPct: 89 },
    { id: 'a-coll', name: 'Collections', icon: 'collections', status: 'active', role: 'Late-payer list, reminder drafts & promise-to-pay', processedToday: 47, lastRun: '12m ago', insight: '$214,890 overdue across 12 invoices', accuracyPct: 90 },
    { id: 'a-credit', name: 'Credit Passport', icon: 'credit', status: 'idle', role: 'Assembles lender-ready credit profiles', processedToday: 4, lastRun: '25m ago', insight: 'Business health score holding at 82 (Good)', accuracyPct: 93 },
    { id: 'a-supplier', name: 'Supplier & Margin', icon: 'supplier', status: 'active', role: 'Price-creep, overcharge & delivery performance', processedToday: 56, lastRun: '20m ago', insight: 'Software & subscriptions up 22% — review', accuracyPct: 88 },
    { id: 'a-sales', name: 'Sales & Growth', icon: 'sales', status: 'idle', role: 'Best/dead customers, churn & growth signals', processedToday: 12, lastRun: '40m ago', insight: 'Awaiting cleaner sales data to activate fully', accuracyPct: 84 },
    { id: 'a-audit', name: 'Audit & Compliance', icon: 'audit', status: 'active', role: 'Missing docs, SoD violations & fraud flags', processedToday: 32, lastRun: '32m ago', insight: '2 SoD violations & 4 suspicious flags raised', accuracyPct: 95 },
];
export const seedAgentStats = {
    agentsActive: 6,
    processedToday: 1984,
    suggestionsAwaiting: 250,
    avgAccuracyPct: 91,
};
