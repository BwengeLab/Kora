// Org Owner "Audit & Risk" seed — a decision-oriented risk & control overview
// (distinct from the Auditor's investigator view). Business risks + compliance
// posture; the recent sensitive-actions list reads live from the workflow store.

export const seedControlPosture = {
  controlHealth: 92,
  controlTrend: 3,
  riskScore: 'Low–Moderate',
  openRisks: 5,
};

export type RiskSeverity = 'low' | 'medium' | 'high';

export interface BusinessRisk {
  id: string;
  title: string;
  category: string;
  severity: RiskSeverity;
  detail: string;
  recommendation: string;
  owner: string;
  impact: string;
  likelihood: 'Low' | 'Medium' | 'High';
  evidenceName: string;
  trend: 'up' | 'down' | 'flat';
}

export const seedBusinessRisks: BusinessRisk[] = [
  { id: 'br-1', title: 'Gross margin pressure', category: 'Financial', severity: 'high', detail: 'Property line margin down 2.4pp; software & subscription costs up 22%.', recommendation: 'Review supplier pricing and re-price the property book.', owner: 'Eric Habimana (Finance Lead)', impact: '≈ $120K annual margin', likelihood: 'High', evidenceName: 'Margin analysis — May.xlsx', trend: 'up' },
  { id: 'br-2', title: 'Customer concentration', category: 'Revenue', severity: 'medium', detail: 'Top 3 corporate clients are 38% of premiums.', recommendation: 'Diversify the corporate pipeline next quarter.', owner: 'Aline Mukamana (Owner)', impact: '38% of premium income', likelihood: 'Medium', evidenceName: 'Revenue concentration.pdf', trend: 'flat' },
  { id: 'br-3', title: 'High-value claim exposure', category: 'Claims', severity: 'high', detail: 'Warehouse fire claim of $184K awaiting dual approval.', recommendation: 'Confirm reinsurance recovery before settlement.', owner: 'Claims & Finance Lead', impact: '$184,000 gross', likelihood: 'High', evidenceName: 'Claim CLM-2025-00501.pdf', trend: 'up' },
  { id: 'br-4', title: 'Suspicious activity', category: 'Fraud', severity: 'medium', detail: '4 transactions flagged; 1 motor claim referred to SIU.', recommendation: 'Track SIU outcomes; review the affected policy.', owner: 'Patrick Niyonsenga (Auditor)', impact: '$15,400 at risk', likelihood: 'Medium', evidenceName: 'SIU referral pack.pdf', trend: 'down' },
  { id: 'br-5', title: 'Overdue receivables', category: 'Liquidity', severity: 'medium', detail: '$214,890 overdue > 30 days across 12 invoices.', recommendation: 'Escalate collections on the oldest 5 accounts.', owner: 'Eric Habimana (Finance Lead)', impact: '$214,890 tied up', likelihood: 'Medium', evidenceName: 'Aging report — May.xlsx', trend: 'down' },
];

export interface ComplianceItem {
  id: string;
  label: string;
  ok: boolean;
  note: string;
}

export const seedCompliance: ComplianceItem[] = [
  { id: 'c-1', label: 'Segregation of duties enforced', ok: true, note: 'Preparer ≠ approver on all financial actions' },
  { id: 'c-2', label: 'Dual approval over threshold', ok: true, note: 'Two approvers required above $100K' },
  { id: 'c-3', label: 'Immutable audit trail', ok: true, note: 'Every approval, posting & access logged' },
  { id: 'c-4', label: 'Evidence coverage', ok: false, note: '9 entries missing supporting documents' },
  { id: 'c-5', label: 'Data residency (Rwanda)', ok: true, note: 'Financial data kept in-region' },
];
