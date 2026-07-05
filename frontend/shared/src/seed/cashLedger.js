// The cash-movement ledger — EVERY cash movement in the business, with its
// purpose (the "why"). This is the working data behind the Cash Flow page.
// Shaped like the Business Event Ledger the backend will expose.
const M = (amount, currency = 'USD') => ({
    amountMinor: BigInt(Math.round(amount * 100)),
    currency,
});
export const CATEGORY_META = {
    premium: { label: 'Premium', tone: 'bg-success-soft text-success', defaultDir: 'in' },
    claim: { label: 'Claim payout', tone: 'bg-danger-soft text-danger', defaultDir: 'out' },
    commission: { label: 'Commission', tone: 'bg-warning-soft text-warning', defaultDir: 'out' },
    payroll: { label: 'Payroll', tone: 'bg-lavender-soft text-lavender', defaultDir: 'out' },
    supplier: { label: 'Supplier', tone: 'bg-info-soft text-info', defaultDir: 'out' },
    rent: { label: 'Rent', tone: 'bg-warning-soft text-warning', defaultDir: 'out' },
    software: { label: 'Software', tone: 'bg-ai-soft text-ai', defaultDir: 'out' },
    tax: { label: 'Tax', tone: 'bg-danger-soft text-danger', defaultDir: 'out' },
    loan: { label: 'Loan', tone: 'bg-brand-soft text-brand-ink', defaultDir: 'out' },
    refund: { label: 'Refund', tone: 'bg-info-soft text-info', defaultDir: 'out' },
    fee: { label: 'Fee income', tone: 'bg-success-soft text-success', defaultDir: 'in' },
    reinsurance: { label: 'Reinsurance', tone: 'bg-brand-soft text-brand-ink', defaultDir: 'in' },
};
export const ACCOUNTS = ['HSBC', 'BK', 'I&M', 'MTN MoMo', 'Airtel'];
export const OPENING_BALANCE = M(1980000);
const ev = (id, name, kind, sizeText) => ({ id, name, kind, sizeText });
// A month of real movements (May 2025). Mix of inflows and outflows, every one
// with a category, account, reference, reconciliation status and purpose.
const RAW_MOVEMENTS = [
    { id: 'cm-01', date: '2025-05-02', description: 'Premium — Kigali Corporate Group', counterparty: 'Kigali Corporate Group', category: 'premium', purpose: 'Annual motor fleet policy premium', account: 'BK', direction: 'in', amount: M(186000), reference: 'PRM-2025-0421', reconciled: true, linked: { kind: 'policy', ref: 'POL-MOT-7781' }, evidence: [ev('e1', 'Premium advice.pdf', 'invoice', '120 KB')] },
    { id: 'cm-02', date: '2025-05-02', description: 'Reinsurance recovery — Swiss Re', counterparty: 'Swiss Re', category: 'reinsurance', purpose: 'Recovery on prior-period large claim', account: 'HSBC', direction: 'in', amount: M(42000), reference: 'RI-2025-118', reconciled: true, evidence: [ev('e2', 'Reinsurance statement.pdf', 'statement', '210 KB')] },
    { id: 'cm-03', date: '2025-05-03', description: 'Office lease — Kigali Office Park', counterparty: 'Kigali Office Park Ltd.', category: 'rent', purpose: 'May office rent', account: 'BK', direction: 'out', amount: M(12480), reference: 'RENT-MAY', reconciled: true, linked: { kind: 'contract', ref: 'OL-2025-05' }, evidence: [ev('e3', 'Office Lease 2025.pdf', 'contract', '850 KB')] },
    { id: 'cm-04', date: '2025-05-04', description: 'Premium — Umoja SACCO', counterparty: 'Umoja SACCO', category: 'premium', purpose: 'Group health cover premium', account: 'MTN MoMo', direction: 'in', amount: M(64000), reference: 'PRM-2025-0433', reconciled: true, evidence: [] },
    { id: 'cm-05', date: '2025-05-05', description: 'Claim payout — windshield (Diane Ingabire)', counterparty: 'Diane Ingabire', category: 'claim', purpose: 'Motor windshield replacement settlement', account: 'MTN MoMo', direction: 'out', amount: M(380), reference: 'CLM-2025-00355', reconciled: true, linked: { kind: 'claim', ref: 'CLM-2025-00355' }, evidence: [ev('e4', 'Repair invoice.pdf', 'invoice', '110 KB')] },
    { id: 'cm-06', date: '2025-05-06', description: 'Software — Cloud Services Inc', counterparty: 'Cloud Services Inc', category: 'software', purpose: 'Quarterly SaaS subscription (core systems)', account: 'HSBC', direction: 'out', amount: M(2240), reference: 'SUB-Q2', reconciled: false, linked: { kind: 'bill', ref: 'SUB-Q2-2025' }, evidence: [ev('e5', 'Subscription invoice.pdf', 'invoice', '90 KB')] },
    { id: 'cm-07', date: '2025-05-07', description: 'Commission — BK Insurance Brokers', counterparty: 'BK Insurance Brokers', category: 'commission', purpose: 'Broker commission on Q2 new business', account: 'BK', direction: 'out', amount: M(18600), reference: 'COMM-2025-Q2', reconciled: true, evidence: [ev('e6', 'Commission statement.xlsx', 'invoice', '140 KB')] },
    { id: 'cm-08', date: '2025-05-08', description: 'Premium — MediCare Network', counterparty: 'MediCare Network', category: 'premium', purpose: 'Corporate health scheme premium', account: 'I&M', direction: 'in', amount: M(58000), reference: 'PRM-2025-0440', reconciled: true, evidence: [] },
    { id: 'cm-09', date: '2025-05-09', description: 'Claim payout — appendectomy (Aline Uwimana)', counterparty: 'King Faisal Hospital', category: 'claim', purpose: 'Inpatient surgery settlement to provider', account: 'I&M', direction: 'out', amount: M(8200), reference: 'CLM-2025-00408', reconciled: false, linked: { kind: 'claim', ref: 'CLM-2025-00408' }, evidence: [ev('e7', 'Hospital invoice.pdf', 'invoice', '610 KB')] },
    { id: 'cm-10', date: '2025-05-10', description: 'Supplier — ACME Supplies', counterparty: 'ACME Supplies Ltd.', category: 'supplier', purpose: 'Office equipment & stationery', account: 'HSBC', direction: 'out', amount: M(45600), reference: 'ACME-INV-10356', reconciled: false, linked: { kind: 'invoice', ref: 'INV-10356' }, evidence: [ev('e8', 'Invoice INV-10356.pdf', 'invoice', '320 KB')] },
    { id: 'cm-11', date: '2025-05-12', description: 'Premium — corporate motor fleet renewal', counterparty: 'Acme Logistics', category: 'premium', purpose: 'Fleet policy renewal premium', account: 'BK', direction: 'in', amount: M(96000), reference: 'PRM-2025-0451', reconciled: true, evidence: [] },
    { id: 'cm-12', date: '2025-05-12', description: 'Suspicious transfer — OFFSHORE LTD', counterparty: 'OFFSHORE LTD', category: 'supplier', purpose: 'Unrecognised — flagged, no contract on file', account: 'BK', direction: 'out', amount: M(15400), reference: '—', reconciled: false, evidence: [] },
    { id: 'cm-13', date: '2025-05-13', description: 'Premium — premium top-up (M. Iradukunda)', counterparty: 'Marie Iradukunda', category: 'premium', purpose: 'Individual policy top-up', account: 'Airtel', direction: 'in', amount: M(420), reference: 'PREM-7741', reconciled: true, evidence: [] },
    { id: 'cm-14', date: '2025-05-13', description: 'Travel reimbursement (D. Uwase)', counterparty: 'Diane Uwase', category: 'payroll', purpose: 'Staff travel reimbursement', account: 'MTN MoMo', direction: 'out', amount: M(180), reference: 'EXP-TRAV-2205', reconciled: true, evidence: [ev('e9', 'Travel receipt.jpg', 'receipt', '1.2 MB')] },
    { id: 'cm-15', date: '2025-05-14', description: 'Claim — motor collision (J-P Niyonzima)', counterparty: 'Kigali Auto Garage', category: 'claim', purpose: 'Motor repair settlement to garage', account: 'BK', direction: 'out', amount: M(2200), reference: 'CLM-2025-00412', reconciled: false, linked: { kind: 'claim', ref: 'CLM-2025-00412' }, evidence: [ev('e10', 'Repair quote.pdf', 'invoice', '180 KB')] },
    { id: 'cm-16', date: '2025-05-15', description: 'Payroll — May salaries', counterparty: 'Staff payroll', category: 'payroll', purpose: 'Monthly staff salaries (42 employees)', account: 'HSBC', direction: 'out', amount: M(128400), reference: 'PAY-2025-05', reconciled: true, linked: { kind: 'payroll', ref: 'PAY-2025-05' }, evidence: [ev('e11', 'Payroll run.xlsx', 'invoice', '88 KB')] },
    { id: 'cm-17', date: '2025-05-15', description: 'Tax remittance — RRA (PAYE + VAT)', counterparty: 'Rwanda Revenue Authority', category: 'tax', purpose: 'PAYE and VAT for April', account: 'BK', direction: 'out', amount: M(38600), reference: 'RRA-2025-04', reconciled: true, evidence: [ev('e12', 'RRA receipt.pdf', 'statement', '60 KB')] },
    { id: 'cm-18', date: '2025-05-15', description: 'Fee income — policy admin fees', counterparty: 'Various policyholders', category: 'fee', purpose: 'Policy administration & endorsement fees', account: 'BK', direction: 'in', amount: M(8400), reference: 'FEE-2025-05', reconciled: true, evidence: [] },
    { id: 'cm-19', date: '2025-05-16', description: 'Premium — health scheme installment', counterparty: 'Bright Schools Group', category: 'premium', purpose: 'Group health premium installment', account: 'MTN MoMo', direction: 'in', amount: M(31000), reference: 'PRM-2025-0460', reconciled: false, evidence: [] },
    { id: 'cm-20', date: '2025-05-16', description: 'Loan repayment — equipment finance', counterparty: 'Bank of Kigali', category: 'loan', purpose: 'Monthly equipment-finance installment', account: 'BK', direction: 'out', amount: M(22400), reference: 'LN-2024-0099', reconciled: true, evidence: [ev('e13', 'Loan schedule.pdf', 'contract', '140 KB')] },
    { id: 'cm-21', date: '2025-05-17', description: 'Premium refund — cancelled policy', counterparty: 'P. Habiyaremye', category: 'refund', purpose: 'Pro-rata refund on cancelled motor policy', account: 'Airtel', direction: 'out', amount: M(640), reference: 'RFD-2025-021', reconciled: true, evidence: [] },
    { id: 'cm-22', date: '2025-05-17', description: 'Supplier — IT hardware', counterparty: 'TechHub Rwanda', category: 'supplier', purpose: 'Laptops for claims team', account: 'HSBC', direction: 'out', amount: M(9800), reference: 'TH-INV-2241', reconciled: false, evidence: [ev('e14', 'Hardware invoice.pdf', 'invoice', '120 KB')] },
    { id: 'cm-23', date: '2025-05-18', description: 'Premium — corporate liability', counterparty: 'Gikondo Industrial', category: 'premium', purpose: 'Public liability cover premium', account: 'I&M', direction: 'in', amount: M(74000), reference: 'PRM-2025-0471', reconciled: true, evidence: [] },
    { id: 'cm-24', date: '2025-05-18', description: 'Commission — agent network payout', counterparty: 'Agent network', category: 'commission', purpose: 'Monthly tied-agent commissions', account: 'MTN MoMo', direction: 'out', amount: M(14200), reference: 'COMM-2025-05', reconciled: false, evidence: [] },
    { id: 'cm-25', date: '2025-05-18', description: 'Software — analytics platform', counterparty: 'DataViz Co', category: 'software', purpose: 'BI & reporting subscription', account: 'HSBC', direction: 'out', amount: M(1860), reference: 'DV-2025-05', reconciled: false, evidence: [] },
];
// Distribute movements across the group's entities — most in Rwanda (the base
// entity), the rest across Kenya and Uganda — so the entity switcher shows real,
// different books per subsidiary and a consolidated "All entities" view.
const ENTITY_BY_INDEX = [
    'ent-rw', 'ent-rw', 'ent-rw', 'ent-ke', 'ent-rw', 'ent-rw', 'ent-rw', 'ent-ke', 'ent-ke', 'ent-rw',
    'ent-ug', 'ent-rw', 'ent-ug', 'ent-rw', 'ent-rw', 'ent-rw', 'ent-rw', 'ent-ke', 'ent-ug', 'ent-rw',
    'ent-rw', 'ent-ug', 'ent-ke', 'ent-ug', 'ent-rw',
];
export const seedCashMovements = RAW_MOVEMENTS.map((m, i) => ({ ...m, entity: ENTITY_BY_INDEX[i] ?? 'ent-rw' }));
