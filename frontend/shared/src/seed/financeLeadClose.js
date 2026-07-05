// Finance Lead "Controls & Close" seed — the operational control surface: the
// month-end close checklist, evidence gaps to chase, and control checks. This is
// the Lead running finance, distinct from the Owner's board-level risk register.
export const seedCloseTasks = [
    { id: 'ct-1', label: 'Reconcile all bank & MoMo accounts', area: 'Bank', owner: 'Diane Uwase', done: true },
    { id: 'ct-2', label: 'Match premium receipts to policies', area: 'Revenue', owner: 'Diane Uwase', done: true },
    { id: 'ct-3', label: 'Post payroll journal (May)', area: 'Payroll', owner: 'Eric Habimana', done: true },
    { id: 'ct-4', label: 'Accrue outstanding supplier invoices', area: 'Accruals', owner: 'Diane Uwase', done: false, note: '3 invoices pending evidence' },
    { id: 'ct-5', label: 'Reconcile claims paid vs reserves', area: 'Claims', owner: 'Grace Ishimwe', done: false },
    { id: 'ct-6', label: 'Compute & post VAT / PAYE', area: 'Tax', owner: 'Eric Habimana', done: false, blocked: true, note: 'Blocked: awaiting RRA confirmation' },
    { id: 'ct-7', label: 'Clear suspense & unreconciled items', area: 'Bank', owner: 'Diane Uwase', done: false, note: '1 suspicious transfer to resolve' },
    { id: 'ct-8', label: 'Reconcile reinsurance cessions', area: 'Revenue', owner: 'Eric Habimana', done: true },
    { id: 'ct-9', label: 'Review intercompany balances', area: 'Accruals', owner: 'Eric Habimana', done: true },
    { id: 'ct-10', label: 'Prepare management P&L', area: 'Reporting', owner: 'Eric Habimana', done: false },
    { id: 'ct-11', label: 'Lock the period', area: 'Reporting', owner: 'Eric Habimana', done: false, blocked: true, note: 'Locks once all tasks complete' },
];
export const seedEvidenceGaps = [
    { id: 'eg-1', reference: 'SUB-Q2-2025', party: 'Cloud Services Inc', amount: '$2,240', age: '12d' },
    { id: 'eg-2', reference: 'TH-INV-2241', party: 'TechHub Rwanda', amount: '$9,800', age: '1d' },
    { id: 'eg-3', reference: 'COMM-2025-05', party: 'Agent network', amount: '$14,200', age: '0d' },
];
export const seedControlChecks = [
    { id: 'cc-1', label: 'Segregation of duties', ok: true, detail: 'Preparer ≠ approver on every posting this period' },
    { id: 'cc-2', label: 'Dual approval over $100K', ok: true, detail: '2 items routed for dual approval, both signed' },
    { id: 'cc-3', label: 'Evidence on every posting', ok: false, detail: '3 postings missing supporting documents' },
    { id: 'cc-4', label: 'Approvals within policy limit', ok: true, detail: 'No limit breaches' },
    { id: 'cc-5', label: 'Bank recs complete', ok: false, detail: '1 account has unreconciled items' },
];
