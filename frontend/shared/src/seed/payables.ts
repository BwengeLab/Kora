// Accounts Payable / Procure-to-Pay — vendor bills with their PO and goods-receipt
// for 3-way matching. Approving a bill posts the liability to the GL (DR expense/
// asset, CR Accounts Payable); paying it posts DR AP, CR cash. This is the most
// common daily finance workflow in any enterprise.

import type { EntityId } from './entities';

export type BillStatus = 'draft' | 'approved' | 'paid';
export type MatchStatus = 'matched' | 'price-variance' | 'no-po';

export interface Bill {
  id: string;
  vendor: string;
  ref: string; // invoice ref
  amount: number; // USD major
  account: string; // CoA expense/asset code to debit
  costCenter: string;
  poAmount: number | null; // null = no PO (e.g. lease, utility)
  receiptAmount: number | null; // goods-receipt note amount; null = service (no GRN)
  dueDate: string;
  entity: EntityId;
  status: BillStatus;
  evidenceName: string;
}

export function matchStatus(b: Bill): MatchStatus {
  if (b.poAmount === null) return 'no-po';
  if (b.poAmount !== b.amount) return 'price-variance';
  if (b.receiptAmount !== null && b.receiptAmount !== b.amount) return 'price-variance';
  return 'matched';
}

export const seedBills: Bill[] = [
  { id: 'bill-1', vendor: 'ACME Supplies Ltd.', ref: 'INV-10356', amount: 45600, account: '5700', costCenter: 'cc-ops', poAmount: 45600, receiptAmount: 45600, dueDate: '2025-05-25', entity: 'ent-rw', status: 'draft', evidenceName: 'Invoice INV-10356.pdf' },
  { id: 'bill-2', vendor: 'Cloud Services Inc', ref: 'SUB-Q3', amount: 2240, account: '5400', costCenter: 'cc-ops', poAmount: 2240, receiptAmount: null, dueDate: '2025-05-28', entity: 'ent-rw', status: 'draft', evidenceName: 'Subscription invoice.pdf' },
  { id: 'bill-3', vendor: 'TechHub Rwanda', ref: 'TH-INV-2241', amount: 9800, account: '1500', costCenter: 'cc-ops', poAmount: 9800, receiptAmount: 9800, dueDate: '2025-06-01', entity: 'ent-rw', status: 'draft', evidenceName: 'Hardware invoice.pdf' },
  { id: 'bill-4', vendor: 'PT Imports', ref: 'PT-0441', amount: 8760, account: '5700', costCenter: 'cc-ops', poAmount: 8500, receiptAmount: 8500, dueDate: '2025-05-22', entity: 'ent-rw', status: 'draft', evidenceName: 'PO-2025-441.pdf' },
  { id: 'bill-5', vendor: 'DataViz Co', ref: 'DV-2025-05', amount: 1860, account: '5400', costCenter: 'cc-ops', poAmount: null, receiptAmount: null, dueDate: '2025-06-03', entity: 'ent-rw', status: 'draft', evidenceName: 'DataViz invoice.pdf' },
  { id: 'bill-6', vendor: 'CleanCo Rwanda', ref: 'SVC-MAY', amount: 1200, account: '5700', costCenter: 'cc-fin', poAmount: null, receiptAmount: null, dueDate: '2025-05-20', entity: 'ent-rw', status: 'approved', evidenceName: 'Facilities invoice.pdf' },
  { id: 'bill-7', vendor: 'Bank of Kigali', ref: 'LN-INT-05', amount: 3200, account: '5700', costCenter: 'cc-fin', poAmount: null, receiptAmount: null, dueDate: '2025-05-15', entity: 'ent-rw', status: 'paid', evidenceName: 'Loan interest advice.pdf' },
];
