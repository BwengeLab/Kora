// Super Admin "Platform Command Center" home seed (doc 01). Operates the Kora
// PLATFORM across tenants — health, growth, cost-vs-revenue. NOT tenant finance.
const M = (amount, currency = 'USD') => ({
    amountMinor: BigInt(Math.round(amount * 100)),
    currency,
});
export const seedPlatformStats = {
    activeTenants: 142,
    tenantsAddedThisMonth: 12,
    suspendedTenants: 3,
    mrr: M(48200),
    mrrGrowthPct: 18,
    uptimePct: 99.98,
    grossMarginPct: 72,
};
export const seedTenantGrowth = {
    labels: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
    series: [86, 98, 109, 121, 130, 142],
};
export const seedSystemHealth = {
    uptimePct: 99.98,
    errorRatePct: 0.04,
    p95LatencyMs: 142,
    requestsPerSec: 1840,
    modelSpendToday: M(312.4),
};
export const seedPlatformTenants = [
    { id: 'tn-1', name: 'Acme Insurance', plan: 'Enterprise', status: 'active', mrr: M(4200), healthScore: 96, costRevenueRatio: 0.28, vertical: 'Insurance' },
    { id: 'tn-2', name: 'Umoja SACCO', plan: 'Growth', status: 'active', mrr: M(1800), healthScore: 91, costRevenueRatio: 0.34, vertical: 'SACCO/MFI' },
    { id: 'tn-3', name: 'Kigali Logistics', plan: 'Growth', status: 'active', mrr: M(1500), healthScore: 88, costRevenueRatio: 0.41, vertical: 'Logistics' },
    { id: 'tn-4', name: 'Bright Schools Grp', plan: 'Starter', status: 'trial', mrr: M(0), healthScore: 72, costRevenueRatio: 0.0, vertical: 'Education' },
    { id: 'tn-5', name: 'MediCare Clinics', plan: 'Enterprise', status: 'active', mrr: M(3600), healthScore: 94, costRevenueRatio: 0.31, vertical: 'Healthcare' },
    { id: 'tn-6', name: 'Old Trade Co.', plan: 'Growth', status: 'suspended', mrr: M(0), healthScore: 38, costRevenueRatio: 0.92, vertical: 'Distribution' },
];
export const seedIncidents = [
    { id: 'inc-1', title: 'QuickBooks connector elevated errors', severity: 'minor', status: 'monitoring', when: '2h ago' },
    { id: 'inc-2', title: 'Doc-AI latency spike (p95 ↑)', severity: 'major', status: 'open', when: '40m ago' },
];
export const seedSupportQueue = [
    { id: 'sr-1', tenant: 'Umoja SACCO', requester: 'support@kora', reason: 'Import mapping help', status: 'requested', when: '15m ago' },
    { id: 'sr-2', tenant: 'MediCare Clinics', requester: 'support@kora', reason: 'Reconciliation question', status: 'active', when: 'expires 38m' },
];
