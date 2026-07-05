// Journal entries — the heart of double-entry bookkeeping. Every entry has lines
// whose debits equal credits; the sum of all entries therefore keeps the trial
// balance in balance. Lines carry dimensions (entity, cost center) so the books
// can be sliced by subsidiary or department.
const d = (n) => BigInt(Math.round(n * 100));
const dr = (account, amount, costCenter) => ({ account, debit: d(amount), credit: 0n, ...(costCenter ? { costCenter } : {}) });
const cr = (account, amount, costCenter) => ({ account, debit: 0n, credit: d(amount), ...(costCenter ? { costCenter } : {}) });
export const seedJournals = [
    {
        id: 'je-open', date: '2025-05-01', ref: 'OB-2025-05', memo: 'Opening balances — May 2025', source: 'opening', status: 'posted', entity: 'ent-rw',
        lines: [
            dr('1010', 1200000), dr('1020', 600000), dr('1040', 180000), dr('1100', 214890), dr('1500', 450000),
            cr('3000', 1500000), cr('3100', 544890), cr('2500', 268800), cr('2000', 45600), cr('2400', 285600),
        ],
    },
    { id: 'je-01', date: '2025-05-02', ref: 'JE-0421', memo: 'Premium — Kigali Corporate Group', source: 'AR', status: 'posted', entity: 'ent-rw', lines: [dr('1010', 186000), cr('4000', 186000, 'cc-uw')] },
    { id: 'je-02', date: '2025-05-04', ref: 'JE-0433', memo: 'Group health premium — Umoja SACCO (MoMo)', source: 'AR', status: 'posted', entity: 'ent-rw', lines: [dr('1040', 64000), cr('4000', 64000, 'cc-uw')] },
    { id: 'je-03', date: '2025-05-02', ref: 'JE-RI-118', memo: 'Reinsurance recovery — Swiss Re', source: 'bank', status: 'posted', entity: 'ent-rw', lines: [dr('1020', 42000), cr('4200', 42000)] },
    { id: 'je-04', date: '2025-05-09', ref: 'CLM-00408', memo: 'Claim settlement — King Faisal Hospital', source: 'claims', status: 'posted', entity: 'ent-rw', lines: [dr('5000', 8200, 'cc-claims'), cr('1030', 8200)] },
    { id: 'je-05', date: '2025-05-15', ref: 'PAY-2025-05', memo: 'Payroll — May salaries (42 staff)', source: 'payroll', status: 'posted', entity: 'ent-rw', lines: [dr('5200', 128400, 'cc-ops'), cr('1020', 128400)] },
    { id: 'je-06', date: '2025-05-07', ref: 'COMM-Q2', memo: 'Broker commission — BK Insurance Brokers', source: 'AP', status: 'posted', entity: 'ent-rw', lines: [dr('5100', 18600, 'cc-sales'), cr('1010', 18600)] },
    { id: 'je-07', date: '2025-05-10', ref: 'ACME-10356', memo: 'Supplier invoice — ACME Supplies', source: 'AP', status: 'posted', entity: 'ent-rw', lines: [dr('5700', 45600, 'cc-ops'), cr('2000', 45600)] },
    { id: 'je-08', date: '2025-05-16', ref: 'PAY-ACME', memo: 'Payment to ACME Supplies', source: 'AP', status: 'posted', entity: 'ent-rw', lines: [dr('2000', 45600), cr('1020', 45600)] },
    { id: 'je-09', date: '2025-05-03', ref: 'RENT-MAY', memo: 'Office rent — Kigali Office Park', source: 'AP', status: 'posted', entity: 'ent-rw', lines: [dr('5300', 12480, 'cc-fin'), cr('1010', 12480)] },
    { id: 'je-10', date: '2025-05-15', ref: 'RRA-2025-04', memo: 'PAYE & VAT accrual — April', source: 'tax', status: 'posted', entity: 'ent-rw', lines: [dr('5600', 38600, 'cc-fin'), cr('2200', 38600)] },
    { id: 'je-11', date: '2025-05-08', ref: 'JE-KE-0440', memo: 'Corporate health premium — MediCare (Kenya)', source: 'AR', status: 'posted', entity: 'ent-ke', lines: [dr('1030', 58000), cr('4000', 58000, 'cc-uw')] },
    { id: 'je-12', date: '2025-05-14', ref: 'CLM-KE-00412', memo: 'Motor claim settlement (Kenya)', source: 'claims', status: 'posted', entity: 'ent-ke', lines: [dr('5000', 2200, 'cc-claims'), cr('1030', 2200)] },
    { id: 'je-13', date: '2025-05-18', ref: 'COMM-UG-05', memo: 'Agent commissions (Uganda)', source: 'AP', status: 'posted', entity: 'ent-ug', lines: [dr('5100', 14200, 'cc-sales'), cr('1040', 14200)] },
    { id: 'je-14', date: '2025-05-06', ref: 'SUB-Q2', memo: 'Core systems subscription — Cloud Services', source: 'AP', status: 'posted', entity: 'ent-rw', lines: [dr('5400', 2240, 'cc-ops'), cr('1020', 2240)] },
    // A draft entry — not yet posted, so excluded from the trial balance until approved.
    { id: 'je-draft', date: '2025-05-18', ref: 'DV-2025-05', memo: 'Analytics platform subscription (draft)', source: 'AP', status: 'draft', entity: 'ent-rw', lines: [dr('5400', 1860, 'cc-ops'), cr('2000', 1860)] },
];
