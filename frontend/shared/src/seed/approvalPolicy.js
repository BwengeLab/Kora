// Delegation of Authority (DOA) matrix — the configurable rulebook that decides
// WHO must approve WHAT, up to which amount, for which entity. This replaces a
// hardcoded threshold so the same product fits a 5-person shop (one simple rule)
// and a multi-entity group (bands by amount, category and entity, multi-level
// chains). Mirrors how real finance orgs run approvals (4–6 levels, SoD, SOX).
export const APPROVER_ROLES = ['Finance Lead', 'Organization Owner', 'Board'];
export const RULE_CATEGORIES = ['all', 'payment', 'claim', 'payroll', 'capex', 'refund', 'renewal'];
// Sensible default policy — what most growing finance teams start with.
export const seedApprovalRules = [
    { id: 'r-routine', label: 'Routine spend', scope: 'all', category: 'all', minAmount: 0, maxAmount: 10000, approvers: ['Finance Lead'], requireEvidence: true },
    { id: 'r-standard', label: 'Standard spend', scope: 'all', category: 'all', minAmount: 10000, maxAmount: 100000, approvers: ['Finance Lead'], requireEvidence: true },
    { id: 'r-major', label: 'Major spend', scope: 'all', category: 'all', minAmount: 100000, maxAmount: null, approvers: ['Finance Lead', 'Organization Owner'], requireEvidence: true },
    { id: 'r-claims', label: 'Large claims', scope: 'all', category: 'claim', minAmount: 50000, maxAmount: null, approvers: ['Finance Lead', 'Organization Owner'], requireEvidence: true },
    { id: 'r-capex', label: 'Capital expenditure', scope: 'all', category: 'capex', minAmount: 150000, maxAmount: null, approvers: ['Finance Lead', 'Organization Owner', 'Board'], requireEvidence: true },
];
export const fmtBand = (r) => {
    const lo = `$${r.minAmount.toLocaleString()}`;
    return r.maxAmount === null ? `${lo}+` : `${lo} – $${r.maxAmount.toLocaleString()}`;
};
