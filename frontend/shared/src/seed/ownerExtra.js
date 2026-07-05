// Seed for the remaining Org Owner pages: Value/ROI, Reports, Relationships,
// Collections. (Reconciliation oversight reuses the reconciliation seeds.)
const M = (amount, currency = 'USD') => ({
    amountMinor: BigInt(Math.round(amount * 100)),
    currency,
});
export const seedRoi = {
    totalValue: M(384970),
    subscriptionCost: M(48000),
    roiMultiple: 8.0,
    series: [42, 58, 71, 96, 128, 161],
    labels: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
    items: [
        { id: 'r1', label: 'Money recovered', value: M(86400), icon: 'recovered', detail: 'Unpaid invoices collected via agent reminders', deltaPct: 22 },
        { id: 'r2', label: 'Duplicate payments avoided', value: M(45600), icon: 'duplicates', detail: 'Caught by the reconciliation engine', deltaPct: 12 },
        { id: 'r3', label: 'Unsupported spend caught', value: M(12480), icon: 'unsupported', detail: 'Missing-document & approval flags', deltaPct: 8 },
        { id: 'r4', label: 'Leakage prevented (claims)', value: M(86400), icon: 'leakage', detail: 'Fraud scoring + SIU referrals', deltaPct: 31 },
        { id: 'r5', label: 'Credit access improved', value: M(140000), icon: 'credit', detail: 'Lender-ready Credit Passport facility', deltaPct: 0 },
        { id: 'r6', label: 'Finance hours saved', value: M(0), icon: 'hours', detail: '128 hours this month', deltaPct: 18 },
    ],
};
export const seedReports = [
    { id: 'rep-1', name: 'CEO weekly summary', kind: 'executive', lastGenerated: '2h ago', schedule: 'Weekly · Mon' },
    { id: 'rep-2', name: 'Board pack — May 2025', kind: 'board', lastGenerated: '1d ago', schedule: 'Monthly' },
    { id: 'rep-3', name: 'Exception & control report', kind: 'exception', lastGenerated: '4h ago', schedule: 'Daily' },
    { id: 'rep-4', name: 'Collections & aging', kind: 'collections', lastGenerated: '3h ago', schedule: 'Weekly' },
    { id: 'rep-5', name: 'Supplier & margin review', kind: 'supplier', lastGenerated: '2d ago', schedule: 'Monthly' },
    { id: 'rep-6', name: 'Credit Passport export', kind: 'credit', lastGenerated: '25m ago', schedule: 'On demand' },
    { id: 'rep-7', name: 'Auditor evidence pack', kind: 'audit', lastGenerated: '1d ago', schedule: 'On demand' },
];
export const seedRelationshipStats = { customers: 248, suppliers: 186, partners: 42, contracts: 78, renewalsDue: 9 };
export const seedParties = [
    { id: 'p1', name: 'BK Insurance Brokers', type: 'partner', moneyIn: M(212000), moneyOut: M(18000), openInvoices: 2, risk: 'low', contracts: 3, contact: 'Jean Bizimana', email: 'finance@bkbrokers.rw', phone: '+250 788 110 220', since: '2021',
        activity: [{ date: '2025-05-07', text: 'Commission settlement', amount: M(18600), dir: 'out' }, { date: '2025-05-02', text: 'New business placement', amount: M(96000), dir: 'in' }, { date: '2025-04-28', text: 'Quarterly reconciliation signed' }], balance: M(28600), terms: 'Net 30', creditLimit: M(100000), overdue: false },
    { id: 'p2', name: 'ACME Supplies Ltd.', type: 'supplier', moneyIn: M(0), moneyOut: M(184000), openInvoices: 4, risk: 'medium', contracts: 2, contact: 'Claudine Mukamana', email: 'ar@acmesupplies.rw', phone: '+250 788 330 441', since: '2022',
        activity: [{ date: '2025-05-10', text: 'Invoice INV-10356 received', amount: M(45600), dir: 'out' }, { date: '2025-05-17', text: 'Hardware delivery', amount: M(9800), dir: 'out' }, { date: '2025-05-01', text: 'Price list updated' }], balance: M(-45600), terms: 'Net 15', creditLimit: M(60000), overdue: false },
    { id: 'p3', name: 'Kigali Corporate Group', type: 'customer', moneyIn: M(486000), moneyOut: M(0), openInvoices: 6, risk: 'low', contracts: 5, contact: 'Eric Nshuti', email: 'finance@kcg.rw', phone: '+250 788 550 660', since: '2019',
        activity: [{ date: '2025-05-02', text: 'Annual fleet premium', amount: M(186000), dir: 'in' }, { date: '2025-05-12', text: 'Fleet renewal premium', amount: M(96000), dir: 'in' }, { date: '2025-04-30', text: 'Reminder sent — INV-10198' }], balance: M(36400), terms: 'Net 30', creditLimit: M(500000), overdue: true },
    { id: 'p4', name: 'PT Imports', type: 'supplier', moneyIn: M(0), moneyOut: M(96400), openInvoices: 3, risk: 'high', contracts: 1, contact: 'Patrick Tuyishime', email: 'accounts@ptimports.rw', phone: '+250 788 770 880', since: '2023',
        activity: [{ date: '2025-05-15', text: 'Payment $260 over PO — flagged', amount: M(8760), dir: 'out' }, { date: '2025-05-18', text: 'Promised settlement by Friday' }, { date: '2025-05-10', text: 'Overdue invoice INV-10221 chased' }], balance: M(48600), terms: 'Net 30', creditLimit: M(60000), overdue: true },
    { id: 'p5', name: 'MediCare Network', type: 'partner', moneyIn: M(58000), moneyOut: M(312000), openInvoices: 5, risk: 'medium', contracts: 4, contact: 'Dr. Alice Keza', email: 'billing@medicare.rw', phone: '+250 788 220 330', since: '2020',
        activity: [{ date: '2025-05-08', text: 'Corporate health premium', amount: M(58000), dir: 'in' }, { date: '2025-05-09', text: 'Claim settlement to provider', amount: M(8200), dir: 'out' }, { date: '2025-05-05', text: 'Tariff schedule reviewed' }], balance: M(28900), terms: 'Net 45', creditLimit: M(700000), overdue: true },
    { id: 'p6', name: 'Umoja SACCO', type: 'customer', moneyIn: M(124000), moneyOut: M(0), openInvoices: 1, risk: 'low', contracts: 2, contact: 'Grace Uwase', email: 'finance@umoja.rw', phone: '+250 788 990 100', since: '2021',
        activity: [{ date: '2025-05-04', text: 'Group health premium', amount: M(64000), dir: 'in' }, { date: '2025-05-16', text: 'Installment received', amount: M(31000), dir: 'in' }, { date: '2025-04-22', text: 'Member list updated' }], balance: M(53590), terms: 'Net 30', creditLimit: M(200000), overdue: true },
    { id: 'p7', name: 'Gikondo Industrial', type: 'customer', moneyIn: M(74000), moneyOut: M(0), openInvoices: 2, risk: 'low', contracts: 1, contact: 'Samuel Habiyo', email: 'ap@gikondo.rw', phone: '+250 788 445 556', since: '2024',
        activity: [{ date: '2025-05-18', text: 'Public liability premium', amount: M(74000), dir: 'in' }, { date: '2025-05-01', text: 'Cover extended to new site' }], balance: M(12400), terms: 'Net 30', creditLimit: M(150000), overdue: false },
    { id: 'p8', name: 'Cloud Services Inc', type: 'supplier', moneyIn: M(0), moneyOut: M(26880), openInvoices: 1, risk: 'low', contracts: 1, contact: 'Support Desk', email: 'billing@cloudservices.com', phone: '+1 415 555 0110', since: '2022',
        activity: [{ date: '2025-05-06', text: 'Quarterly subscription', amount: M(2240), dir: 'out' }, { date: '2025-05-18', text: 'Renewal due in 22 days' }], balance: M(-2240), terms: 'Net 15', creditLimit: M(30000), overdue: false },
];
export const seedRenewals = [
    { id: 'rn1', party: 'Kigali Office Park', contract: 'Office lease', dueText: 'in 14 days', value: M(149760) },
    { id: 'rn2', party: 'Cloud Services Inc', contract: 'Software subscription', dueText: 'in 22 days', value: M(8960) },
    { id: 'rn3', party: 'BK Insurance Brokers', contract: 'Brokerage agreement', dueText: 'in 30 days', value: M(0) },
];
export const seedCollectionsStats = {
    totalOverdue: M(214890),
    overdueCount: 12,
    avgDaysOverdue: 41,
    promisesToPay: 4,
};
export const seedOverdue = [
    { id: 'o1', customer: 'PT Imports', invoice: 'INV-10221', amount: M(48600), daysOverdue: 62, risk: 'high', reminderDrafted: true, contact: 'Patrick Tuyishime', email: 'accounts@ptimports.rw', lastContact: '2025-05-15', reminderCount: 2 },
    { id: 'o2', customer: 'Kigali Corporate Group', invoice: 'INV-10198', amount: M(36400), daysOverdue: 48, risk: 'medium', reminderDrafted: true, contact: 'Eric Nshuti', email: 'finance@kcg.rw', lastContact: '2025-05-12', reminderCount: 1 },
    { id: 'o3', customer: 'MediCare Network', invoice: 'INV-10240', amount: M(28900), daysOverdue: 35, risk: 'medium', reminderDrafted: false, contact: 'Dr. Alice Keza', email: 'billing@medicare.rw', lastContact: '2025-04-30', reminderCount: 0 },
    { id: 'o4', customer: 'Vendor 7741', invoice: 'INV-10255', amount: M(19200), daysOverdue: 31, risk: 'high', reminderDrafted: true, contact: 'AR Desk', email: 'ar@vendor7741.rw', lastContact: '2025-05-16', reminderCount: 3 },
    { id: 'o5', customer: 'Bright Schools Grp', invoice: 'INV-10260', amount: M(15800), daysOverdue: 22, risk: 'low', reminderDrafted: false, contact: 'Joan Mukandayisenga', email: 'bursar@brightschools.rw', lastContact: '2025-05-10', reminderCount: 0 },
    { id: 'o6', customer: 'Gikondo Industrial', invoice: 'INV-10272', amount: M(12400), daysOverdue: 14, risk: 'low', reminderDrafted: false, contact: 'Samuel Habiyo', email: 'ap@gikondo.rw', lastContact: '2025-05-08', reminderCount: 0 },
    { id: 'o7', customer: 'Umoja SACCO', invoice: 'INV-10231', amount: M(53590), daysOverdue: 95, risk: 'high', reminderDrafted: true, contact: 'Grace Uwase', email: 'finance@umoja.rw', lastContact: '2025-05-14', reminderCount: 4 },
];
