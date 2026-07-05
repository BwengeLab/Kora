// External Collaborator "Shared Portal" — a lender's Credit Passport view
// (doc 07). The proof that few permissions still = a premium experience.
// Read-only, consent-scoped, time-boxed.
const M = (amount, currency = 'USD') => ({
    amountMinor: BigInt(Math.round(amount * 100)),
    currency,
});
export const seedPassport = {
    tenant: 'Acme Insurance Ltd.',
    score: 82,
    label: 'Good',
    band: 'A−',
    updated: 'May 18, 2025',
    sharedBy: 'Eric Habimana · Finance Lead',
};
export const seedSubScores = [
    { id: 's1', label: 'Payment behavior', value: 88, rating: 'Good', evidence: '94% on-time over 12 months · avg 3-day delay' },
    { id: 's2', label: 'Financial strength', value: 84, rating: 'Good', evidence: 'Revenue +18% YoY · positive net cash 11/12 months' },
    { id: 's3', label: 'Risk profile', value: 79, rating: 'Fair', evidence: 'Moderate customer concentration · low dispute rate' },
    { id: 's4', label: 'Credit readiness', value: 86, rating: 'Strong', evidence: 'Audited books · full evidence trail · 0 unresolved flags' },
];
// ─── Trends ────────────────────────────────────────────────────────────────
export const seedPassportTrends = {
    labels: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
    revenue: [1.42, 1.51, 1.58, 1.66, 1.74, 1.84],
    cashflow: [0.34, 0.41, 0.38, 0.52, 0.49, 0.58],
};
// ─── Affordability ─────────────────────────────────────────────────────────
export const seedAffordability = {
    maxFacility: M(680000),
    monthlyCapacity: M(58000),
    termMonths: 24,
    assumptions: [
        'Based on 12-month average net operating cash flow',
        'Debt-service coverage ratio held at 1.4×',
        'Existing obligations of $1.32M payables deducted',
        'Seasonal dip (Dec–Jan) factored at 0.8×',
    ],
};
export const seedEvidencePack = [
    { id: 'ev-1', factor: 'Revenue', docName: 'Audited P&L 2024.pdf', detail: 'Independently verified' },
    { id: 'ev-2', factor: 'Cash flow', docName: 'Bank statements (12 mo).pdf', detail: 'HSBC · BK · reconciled' },
    { id: 'ev-3', factor: 'Payment behavior', docName: 'Payables ledger.xlsx', detail: '94% on-time' },
    { id: 'ev-4', factor: 'Obligations', docName: 'Debt schedule.pdf', detail: 'Current as of May 18' },
];
// ─── Access grant ──────────────────────────────────────────────────────────
export const seedGrant = {
    expiresInDays: 23,
    dataCategories: ['Credit score & sub-scores', 'Revenue & cash-flow trends', 'Affordability estimate', 'Evidence pack'],
    scopeNote: 'Read-only · consent-scoped · revocable at any time by Acme Insurance.',
};
