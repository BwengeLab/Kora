// Consent ledger — every data-sharing consent the business has granted: who can
// see what, for how long, and under which legal basis. Sharing the Credit
// Passport, opening books to a lender, or letting a partner pull statements all
// run through here. The Finance Lead grants/revokes; the Auditor reviews the log.
export const SCOPE_LABEL = {
    'credit-passport': 'Credit Passport',
    'bank-statements': 'Bank statements',
    financials: 'Financial statements',
    transactions: 'Transactions',
    contracts: 'Contracts',
    identity: 'Business identity',
};
export const CONSENT_STATUS_META = {
    active: { label: 'Active', tone: 'bg-success-soft text-success' },
    pending: { label: 'Pending', tone: 'bg-warning-soft text-warning' },
    revoked: { label: 'Revoked', tone: 'bg-danger-soft text-danger' },
    expired: { label: 'Expired', tone: 'bg-ink/10 text-ink-muted' },
};
export const seedConsents = [
    { id: 'cs-1', grantee: 'Bank of Kigali — SME Lending', granteeType: 'lender', purpose: 'Working-capital facility underwriting', scopes: ['credit-passport', 'financials', 'bank-statements'], status: 'active', basis: 'Explicit consent · loan application', grantedBy: 'Aline Mukamana', grantedAt: '2025-04-02', expiresAt: '2025-10-02', lastAccessed: '2025-05-16' },
    { id: 'cs-2', grantee: 'I&M Bank — Trade Finance', granteeType: 'lender', purpose: 'Invoice-financing eligibility check', scopes: ['credit-passport', 'transactions'], status: 'active', basis: 'Explicit consent · facility request', grantedBy: 'Eric Habimana', grantedAt: '2025-05-01', expiresAt: '2025-08-01', lastAccessed: '2025-05-12' },
    { id: 'cs-3', grantee: 'TransUnion Africa', granteeType: 'bureau', purpose: 'Credit-bureau reporting & scoring', scopes: ['credit-passport', 'identity'], status: 'active', basis: 'Legitimate interest · bureau agreement', grantedBy: 'Aline Mukamana', grantedAt: '2025-01-15', expiresAt: '2026-01-15', lastAccessed: '2025-05-10' },
    { id: 'cs-4', grantee: 'Deloitte Rwanda — External Audit', granteeType: 'auditor', purpose: 'Annual statutory audit FY2024', scopes: ['financials', 'transactions', 'contracts'], status: 'active', basis: 'Statutory obligation', grantedBy: 'Aline Mukamana', grantedAt: '2025-02-01', expiresAt: '2025-07-31', lastAccessed: '2025-05-17' },
    { id: 'cs-5', grantee: 'Equity Bank — Overdraft', granteeType: 'lender', purpose: 'Overdraft renewal assessment', scopes: ['credit-passport', 'bank-statements'], status: 'pending', basis: 'Awaiting authorisation', grantedBy: 'Eric Habimana', grantedAt: '2025-05-17', expiresAt: '2025-11-17' },
    { id: 'cs-6', grantee: 'AgriPartners Co-op', granteeType: 'partner', purpose: 'Supplier-network data exchange', scopes: ['identity', 'contracts'], status: 'revoked', basis: 'Consent withdrawn', grantedBy: 'Aline Mukamana', grantedAt: '2024-09-10', expiresAt: '2025-09-10', lastAccessed: '2025-03-01' },
    { id: 'cs-7', grantee: 'BNR — Central Bank Reporting', granteeType: 'regulator', purpose: 'Prudential returns submission', scopes: ['financials'], status: 'active', basis: 'Regulatory requirement', grantedBy: 'Aline Mukamana', grantedAt: '2025-01-01', expiresAt: '2025-12-31', lastAccessed: '2025-05-15' },
    { id: 'cs-8', grantee: 'Old Mutual — Reinsurance', granteeType: 'partner', purpose: 'Reinsurance treaty data sharing', scopes: ['transactions', 'contracts'], status: 'expired', basis: 'Treaty period ended', grantedBy: 'Eric Habimana', grantedAt: '2024-01-01', expiresAt: '2025-01-01', lastAccessed: '2024-12-20' },
];
