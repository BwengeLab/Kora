// The Data Intake queue — documents arriving from bank feeds, email-in, mobile
// scans and uploads. Kora OCR-extracts the fields; the operator confirms and
// either matches to an existing transaction or posts a new one.
export const SOURCE_META = {
    'bank-feed': { label: 'Bank feed' },
    email: { label: 'Email-in' },
    scan: { label: 'Mobile scan' },
    upload: { label: 'Upload' },
};
const f = (label, value, confidence) => ({ label, value, confidence });
export const seedIntake = [
    {
        id: 'doc-1', name: 'ACME Supplies INV-10356.pdf', kind: 'invoice', source: 'email', receivedAt: '2025-05-18T09:12:00Z', stage: 'needs-review', sizeText: '320 KB',
        fields: [f('Supplier', 'ACME Supplies Ltd.', 0.98), f('Amount', 'USD 45,600.00', 0.96), f('Invoice date', '2025-05-10', 0.93), f('Due date', '2025-05-25', 0.9), f('Category', 'Supplier', 0.72)],
        suggestedMatch: { ref: 'ACME-INV-10356', party: 'ACME Supplies Ltd.', amount: 'USD 45,600.00' },
    },
    {
        id: 'doc-2', name: 'BK statement May wk3.csv', kind: 'statement', source: 'bank-feed', receivedAt: '2025-05-18T06:00:00Z', stage: 'needs-review', sizeText: '44 KB',
        fields: [f('Account', 'BK · ****4471', 0.99), f('Lines', '38 transactions', 0.99), f('Period', '2025-05-12 → 2025-05-18', 0.97), f('Unmatched', '6 lines', 0.88)],
        suggestedMatch: undefined,
    },
    {
        id: 'doc-3', name: 'Hospital invoice CLM-00408.pdf', kind: 'invoice', source: 'upload', receivedAt: '2025-05-17T15:40:00Z', stage: 'matched', sizeText: '610 KB',
        fields: [f('Provider', 'King Faisal Hospital', 0.97), f('Amount', 'USD 8,200.00', 0.95), f('Claim ref', 'CLM-2025-00408', 0.94), f('Category', 'Claim payout', 0.91)],
        suggestedMatch: { ref: 'CLM-2025-00408', party: 'King Faisal Hospital', amount: 'USD 8,200.00' },
    },
    {
        id: 'doc-4', name: 'Travel receipt D.Uwase.jpg', kind: 'receipt', source: 'scan', receivedAt: '2025-05-17T11:05:00Z', stage: 'posted', sizeText: '1.2 MB',
        fields: [f('Payee', 'Diane Uwase', 0.92), f('Amount', 'USD 180.00', 0.9), f('Date', '2025-05-13', 0.88), f('Category', 'Travel reimbursement', 0.8)],
        suggestedMatch: { ref: 'EXP-TRAV-2205', party: 'Diane Uwase', amount: 'USD 180.00' },
    },
    {
        id: 'doc-5', name: 'Subscription invoice SUB-Q2.pdf', kind: 'invoice', source: 'email', receivedAt: '2025-05-18T08:30:00Z', stage: 'extracting', sizeText: '90 KB',
        fields: [f('Supplier', 'Cloud Services Inc', 0.6), f('Amount', '…', 0.0)],
        suggestedMatch: undefined,
    },
    {
        id: 'doc-6', name: 'Offshore transfer advice.pdf', kind: 'statement', source: 'upload', receivedAt: '2025-05-12T14:22:00Z', stage: 'needs-review', sizeText: '70 KB',
        fields: [f('Beneficiary', 'OFFSHORE LTD', 0.95), f('Amount', 'USD 15,400.00', 0.93), f('Reference', '— none —', 0.4), f('Contract', 'Not found', 0.2)],
        suggestedMatch: undefined,
    },
];
