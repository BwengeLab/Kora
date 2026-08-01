// Type definitions for reconciliation module - replacing seed data

export interface BankTransaction {
  id: string;
  date: string;
  amount: { amountMinor: bigint; currency: string };
  description: string;
  counterparty?: string;
  reference?: string;
}

export interface BusinessRecord {
  id: string;
  date: string;
  amount: { amountMinor: bigint; currency: string };
  description: string;
  entity?: string;
  reference?: string;
}

export interface EvidenceDoc {
  id: string;
  name: string;
  type: 'invoice' | 'receipt' | 'contract' | 'statement';
  uploadedAt: string;
  url?: string;
}

export interface HistoryEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
}
