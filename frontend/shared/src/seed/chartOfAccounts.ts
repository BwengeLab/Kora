// The Chart of Accounts — the backbone of double-entry bookkeeping. Every
// journal line posts to one of these. Generic enough for any enterprise, with
// a few insurance lines (premium/claims/reinsurance) that a sector pack would
// add; an NGO/government build would swap in fund/grant accounts the same way.

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  normal: NormalBalance;
}

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; normal: NormalBalance; statement: 'BS' | 'PL' }> = {
  asset: { label: 'Assets', normal: 'debit', statement: 'BS' },
  liability: { label: 'Liabilities', normal: 'credit', statement: 'BS' },
  equity: { label: 'Equity', normal: 'credit', statement: 'BS' },
  revenue: { label: 'Revenue', normal: 'credit', statement: 'PL' },
  expense: { label: 'Expenses', normal: 'debit', statement: 'PL' },
};

export const seedChartOfAccounts: Account[] = [
  // Assets (1xxx)
  { code: '1010', name: 'Bank — Bank of Kigali', type: 'asset', normal: 'debit' },
  { code: '1020', name: 'Bank — HSBC', type: 'asset', normal: 'debit' },
  { code: '1030', name: 'Bank — I&M', type: 'asset', normal: 'debit' },
  { code: '1040', name: 'Mobile Money — MTN', type: 'asset', normal: 'debit' },
  { code: '1050', name: 'Mobile Money — Airtel', type: 'asset', normal: 'debit' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', normal: 'debit' },
  { code: '1200', name: 'Prepaid Expenses', type: 'asset', normal: 'debit' },
  { code: '1500', name: 'Property & Equipment', type: 'asset', normal: 'debit' },
  // Liabilities (2xxx)
  { code: '2000', name: 'Accounts Payable', type: 'liability', normal: 'credit' },
  { code: '2100', name: 'Accrued Liabilities', type: 'liability', normal: 'credit' },
  { code: '2200', name: 'Taxes Payable (PAYE/VAT)', type: 'liability', normal: 'credit' },
  { code: '2300', name: 'Unearned Premium', type: 'liability', normal: 'credit' },
  { code: '2400', name: 'Claims Reserve', type: 'liability', normal: 'credit' },
  { code: '2500', name: 'Loans Payable', type: 'liability', normal: 'credit' },
  // Equity (3xxx)
  { code: '3000', name: 'Share Capital', type: 'equity', normal: 'credit' },
  { code: '3100', name: 'Retained Earnings', type: 'equity', normal: 'credit' },
  // Revenue (4xxx)
  { code: '4000', name: 'Premium Revenue', type: 'revenue', normal: 'credit' },
  { code: '4100', name: 'Fee Income', type: 'revenue', normal: 'credit' },
  { code: '4200', name: 'Reinsurance Recoveries', type: 'revenue', normal: 'credit' },
  // Expenses (5xxx)
  { code: '5000', name: 'Claims Expense', type: 'expense', normal: 'debit' },
  { code: '5100', name: 'Commission Expense', type: 'expense', normal: 'debit' },
  { code: '5200', name: 'Salaries & Wages', type: 'expense', normal: 'debit' },
  { code: '5300', name: 'Rent', type: 'expense', normal: 'debit' },
  { code: '5400', name: 'Software & Subscriptions', type: 'expense', normal: 'debit' },
  { code: '5500', name: 'Reinsurance Premium', type: 'expense', normal: 'debit' },
  { code: '5600', name: 'Tax Expense', type: 'expense', normal: 'debit' },
  { code: '5700', name: 'Office & Supplies', type: 'expense', normal: 'debit' },
];

export const accountByCode = (code: string): Account | undefined => seedChartOfAccounts.find((a) => a.code === code);
