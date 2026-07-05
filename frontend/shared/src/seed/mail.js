// In-app mailbox seed. Users link their work email; agent-drafted messages
// (collections reminders, document requests) and business correspondence land
// here, so users never leave Kora to communicate.
export const seedMail = [
    {
        id: 'm-1', folder: 'inbox', fromName: 'PT Imports — Accounts', fromEmail: 'accounts@ptimports.rw',
        toName: 'You', toEmail: 'cfo@acme.local', subject: 'Re: Overdue invoice INV-10221',
        preview: 'Apologies for the delay — we expect to settle by Friday…',
        body: 'Hello,\n\nApologies for the delay on INV-10221. We have a cash-flow gap this week but expect to settle the full $48,600 by Friday.\n\nCould you confirm the bank details?\n\nRegards,\nPT Imports Accounts',
        date: '2025-05-18T09:12:00Z', read: false, starred: true, label: 'collections',
    },
    {
        id: 'm-2', folder: 'inbox', fromName: 'Kora Audit Agent', fromEmail: 'agents@kora.app',
        toName: 'You', toEmail: 'cfo@acme.local', subject: 'Weekly control summary — 2 SoD flags',
        preview: 'Your weekly audit summary is ready. 2 segregation-of-duty flags…',
        body: 'Your weekly audit summary:\n\n• 2 segregation-of-duty flags (1 high)\n• 4 suspicious transactions, 1 referred to SIU\n• 9 entries missing supporting documents\n\nReview them in Audit & Risk.',
        date: '2025-05-18T07:30:00Z', read: false, starred: false, label: 'audit', agentDrafted: true,
    },
    {
        id: 'm-3', folder: 'inbox', fromName: 'Bank of Kigali', fromEmail: 'statements@bk.rw',
        toName: 'You', toEmail: 'cfo@acme.local', subject: 'May statement available',
        preview: 'Your May 2025 account statement is ready to download…',
        body: 'Your May 2025 statement for account ****7781 is now available. 412 transactions this period.',
        date: '2025-05-17T18:00:00Z', read: true, starred: false, label: 'general',
    },
    {
        id: 'm-4', folder: 'inbox', fromName: 'King Faisal Hospital', fromEmail: 'billing@kfh.rw',
        toName: 'You', toEmail: 'claims@acme.local', subject: 'Claim CLM-2025-00408 — invoice',
        preview: 'Please find attached the invoice for the inpatient claim…',
        body: 'Attached is the invoice for claim CLM-2025-00408 (appendectomy). Total $8,600, network tariff applied.',
        date: '2025-05-17T11:20:00Z', read: true, starred: false, label: 'claims',
    },
    {
        id: 'm-5', folder: 'sent', fromName: 'You', fromEmail: 'cfo@acme.local',
        toName: 'Kigali Corporate Group', toEmail: 'finance@kcg.rw', subject: 'Payment reminder — INV-10198',
        preview: 'A friendly reminder that invoice INV-10198 ($36,400) is now…',
        body: 'Dear Kigali Corporate Group,\n\nA friendly reminder that invoice INV-10198 for $36,400 is now 48 days overdue. We value our partnership and would appreciate settlement at your earliest convenience.\n\nKind regards,\nFinance, Acme Insurance',
        date: '2025-05-17T14:05:00Z', read: true, starred: false, label: 'collections', agentDrafted: true,
    },
    {
        id: 'm-6', folder: 'sent', fromName: 'You', fromEmail: 'cfo@acme.local',
        toName: 'Vendor 7741', toEmail: 'ar@vendor7741.rw', subject: 'Document request — INV-10255',
        preview: 'We could not locate a PO or contract for this payment…',
        body: 'Hello,\n\nWe could not locate a matching purchase order or contract for invoice INV-10255 ($19,200). Could you provide supporting documentation so we can complete reconciliation?\n\nThank you.',
        date: '2025-05-16T16:40:00Z', read: true, starred: false, label: 'general',
    },
];
export const MAIL_PROVIDERS = [
    { id: 'gmail', name: 'Gmail / Google Workspace' },
    { id: 'outlook', name: 'Outlook / Microsoft 365' },
    { id: 'imap', name: 'Other (IMAP/SMTP)' },
];
// Each user has their OWN mailbox — never shared. This generates a personalized
// inbox/sent seed for a given user, lightly flavoured by their role so it feels
// like their real work. Keyed by email in the mail store.
export function seedMailFor(email, name, role) {
    const r = role.toLowerCase();
    const base = [
        {
            id: `${email}-i1`, folder: 'inbox', fromName: 'PT Imports — Accounts', fromEmail: 'accounts@ptimports.rw',
            toName: name, toEmail: email, subject: 'Re: Overdue invoice INV-10221',
            preview: 'Apologies for the delay — we expect to settle by Friday…',
            body: `Hello ${name.split(' ')[0]},\n\nApologies for the delay on INV-10221. We have a cash-flow gap this week but expect to settle the full $48,600 by Friday.\n\nCould you confirm the bank details?\n\nRegards,\nPT Imports Accounts`,
            date: '2025-05-18T09:12:00Z', read: false, starred: true, label: 'collections',
        },
        {
            id: `${email}-i2`, folder: 'inbox', fromName: 'Bank of Kigali', fromEmail: 'statements@bk.rw',
            toName: name, toEmail: email, subject: 'May statement available',
            preview: 'Your May 2025 account statement is ready to download…',
            body: 'Your May 2025 statement for account ****7781 is now available. 412 transactions this period.',
            date: '2025-05-17T18:00:00Z', read: true, starred: false, label: 'general',
        },
        {
            id: `${email}-s1`, folder: 'sent', fromName: name, fromEmail: email,
            toName: 'Kigali Corporate Group', toEmail: 'finance@kcg.rw', subject: 'Payment reminder — INV-10198',
            preview: 'A friendly reminder that invoice INV-10198 ($36,400) is now…',
            body: `Dear Kigali Corporate Group,\n\nA friendly reminder that invoice INV-10198 for $36,400 is now 48 days overdue. We value our partnership and would appreciate settlement at your earliest convenience.\n\nKind regards,\n${name}`,
            date: '2025-05-17T14:05:00Z', read: true, starred: false, label: 'collections', agentDrafted: true,
        },
    ];
    // A role-flavoured message so each inbox feels personal to the job.
    const flavour = r.includes('audit')
        ? { id: `${email}-i3`, folder: 'inbox', fromName: 'Kora Audit Agent', fromEmail: 'agents@kora.app', toName: name, toEmail: email, subject: 'Weekly control summary — 2 SoD flags', preview: 'Your weekly audit summary is ready…', body: 'Your weekly audit summary:\n\n• 2 segregation-of-duty flags (1 high)\n• 4 suspicious transactions, 1 referred to SIU\n• 9 entries missing supporting documents\n\nReview them in Audit & Risk.', date: '2025-05-18T07:30:00Z', read: false, starred: false, label: 'audit', agentDrafted: true }
        : r.includes('claim')
            ? { id: `${email}-i3`, folder: 'inbox', fromName: 'King Faisal Hospital', fromEmail: 'billing@kfh.rw', toName: name, toEmail: email, subject: 'Claim CLM-2025-00408 — invoice', preview: 'Please find attached the invoice for the inpatient claim…', body: 'Attached is the invoice for claim CLM-2025-00408 (appendectomy). Total $8,600, network tariff applied.', date: '2025-05-17T11:20:00Z', read: false, starred: false, label: 'claims' }
            : r.includes('operator')
                ? { id: `${email}-i3`, folder: 'inbox', fromName: 'ACME Supplies', fromEmail: 'ar@acmesupplies.rw', toName: name, toEmail: email, subject: 'Invoice INV-10356 attached', preview: 'Invoice for your records — payment due May 25…', body: 'Hello,\n\nPlease find invoice INV-10356 for $45,600 attached. Payment terms net-15, due May 25.\n\nThank you.', date: '2025-05-18T08:40:00Z', read: false, starred: false, label: 'general' }
                : { id: `${email}-i3`, folder: 'inbox', fromName: 'Kora CFO Agent', fromEmail: 'agents@kora.app', toName: name, toEmail: email, subject: 'Your daily brief — 7 approvals waiting', preview: 'Good morning. Here is what needs you today…', body: `Good morning ${name.split(' ')[0]},\n\n• 7 approvals awaiting your decision\n• Cash position healthy at $4.46M\n• 1 suspicious transfer flagged for review\n\nOpen your Action Center to act.`, date: '2025-05-18T06:45:00Z', read: false, starred: false, label: 'approval', agentDrafted: true };
    return [base[0], flavour, base[1], base[2]];
}
