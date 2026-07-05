// Contracts register — policies, vendor agreements, leases and partner contracts.
// Each carries value, term, renewal status and evidence so the Finance Lead can
// manage renewals and the Auditor can verify obligations.
const M = (amount, currency = 'USD') => ({ amountMinor: BigInt(Math.round(amount * 100)), currency });
export const CONTRACT_TYPE_META = {
    policy: { label: 'Policy', tone: 'bg-brand-soft text-brand-ink' },
    vendor: { label: 'Vendor', tone: 'bg-info-soft text-info' },
    lease: { label: 'Lease', tone: 'bg-warning-soft text-warning' },
    partner: { label: 'Partner', tone: 'bg-lavender-soft text-lavender' },
    reinsurance: { label: 'Reinsurance', tone: 'bg-success-soft text-success' },
    service: { label: 'Service', tone: 'bg-ai-soft text-ai' },
};
export const CONTRACT_STATUS_META = {
    active: { label: 'Active', tone: 'bg-success-soft text-success' },
    'renewal-due': { label: 'Renewal due', tone: 'bg-warning-soft text-warning' },
    expiring: { label: 'Expiring', tone: 'bg-danger-soft text-danger' },
    expired: { label: 'Expired', tone: 'bg-ink/10 text-ink-muted' },
    draft: { label: 'Draft', tone: 'bg-info-soft text-info' },
};
export const seedContracts = [
    { id: 'ct-1', title: 'Office lease — Kigali Office Park', counterparty: 'Kigali Office Park Ltd.', type: 'lease', status: 'renewal-due', value: M(149760), startDate: '2024-06-01', endDate: '2025-06-05', autoRenew: false, owner: 'Eric Habimana', reference: 'OL-2025-05', terms: '12-month lease, rent unchanged from prior term, 90-day notice to terminate.', evidenceName: 'Office Lease 2025.pdf' },
    { id: 'ct-2', title: 'Reinsurance treaty — Swiss Re', counterparty: 'Swiss Re', type: 'reinsurance', status: 'active', value: M(820000), startDate: '2025-01-01', endDate: '2025-12-31', autoRenew: true, owner: 'Aline Mukamana', reference: 'RI-TREATY-2025', terms: 'Quota-share 40% on motor and health books; quarterly cession statements.', evidenceName: 'Reinsurance treaty 2025.pdf' },
    { id: 'ct-3', title: 'Core systems SaaS', counterparty: 'Cloud Services Inc', type: 'service', status: 'active', value: M(26880), startDate: '2024-09-01', endDate: '2025-08-31', autoRenew: true, owner: 'Eric Habimana', reference: 'SUB-CORE-2024', terms: 'Annual subscription, 5,000 policy seats, 99.9% SLA.', evidenceName: 'SaaS agreement.pdf' },
    { id: 'ct-4', title: 'Broker agreement — BK Insurance', counterparty: 'BK Insurance Brokers', type: 'partner', status: 'active', value: M(223200), startDate: '2025-01-01', endDate: '2026-12-31', autoRenew: false, owner: 'Aline Mukamana', reference: 'BRK-2025-01', terms: '15% commission on new business; quarterly reconciliation of placements.', evidenceName: 'Broker agreement.pdf' },
    { id: 'ct-5', title: 'Group health scheme — MediCare', counterparty: 'MediCare Network', type: 'policy', status: 'active', value: M(696000), startDate: '2025-02-01', endDate: '2026-01-31', autoRenew: false, owner: 'Eric Habimana', reference: 'POL-HLT-2210', terms: 'Corporate health cover for 320 lives; monthly premium installments.', evidenceName: 'Policy POL-HLT-2210.pdf' },
    { id: 'ct-6', title: 'Equipment finance — Bank of Kigali', counterparty: 'Bank of Kigali', type: 'vendor', status: 'active', value: M(268800), startDate: '2024-03-01', endDate: '2027-02-28', autoRenew: false, owner: 'Aline Mukamana', reference: 'LN-2024-0099', terms: '36-month equipment finance at 14% APR; monthly installments.', evidenceName: 'Loan schedule.pdf' },
    { id: 'ct-7', title: 'Cleaning & facilities', counterparty: 'CleanCo Rwanda', type: 'service', status: 'expiring', value: M(14400), startDate: '2024-07-01', endDate: '2025-05-31', autoRenew: false, owner: 'Eric Habimana', reference: 'SVC-FAC-2024', terms: 'Monthly facilities service; expires end of month.', evidenceName: 'Facilities contract.pdf' },
    { id: 'ct-8', title: 'BI & analytics platform', counterparty: 'DataViz Co', type: 'service', status: 'draft', value: M(22320), startDate: '2025-06-01', endDate: '2026-05-31', autoRenew: true, owner: 'Eric Habimana', reference: 'DV-2025-DRAFT', terms: 'Pending signature — reporting & analytics subscription.', evidenceName: 'DataViz draft.pdf' },
];
