// Type definitions for API responses - replacing seed data imports

export interface AgentCard {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'error';
  accuracyPct: number;
  lastRunAt?: string;
  description: string;
}

export interface SodViolation {
  id: string;
  user: string;
  conflict: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
}

export interface MissingDoc {
  id: string;
  docType: string;
  party: string;
  period: string;
  daysMissing: number;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  outcome: 'success' | 'failure' | 'warning';
  detail?: string;
}

export interface Overdue {
  id: string;
  party: string;
  amount: { amountMinor: bigint; currency: string };
  daysOverdue: number;
  riskLevel: 'high' | 'medium' | 'low';
  contactName: string;
  contactPhone: string;
  lastPromiseDate?: string;
}

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'vendor' | 'partner';
  status: 'active' | 'inactive';
  renewalDate?: string;
  contractValue?: { amountMinor: bigint; currency: string };
}

export interface Renewal {
  id: string;
  party: string;
  contractEnd: string;
  value: { amountMinor: bigint; currency: string };
  probability: number;
  owner: string;
}

export interface ReportDef {
  id: string;
  name: string;
  kind: 'financial' | 'operational' | 'compliance' | 'risk';
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastRunAt?: string;
  nextRunAt?: string;
  owner: string;
}

export interface ConsentGrant {
  id: string;
  grantor: string;
  grantee: string;
  scope: string[];
  grantedAt: string;
  expiresAt?: string;
  status: 'active' | 'revoked' | 'expired';
}

export interface OperatorTask {
  id: string;
  type: 'exception' | 'match' | 'review' | 'intake';
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  reconId?: string;
}

export interface IntakeBatch {
  id: string;
  source: string;
  docCount: number;
  receivedAt: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
}

export interface Incident {
  id: string;
  tenant: string;
  severity: 'critical' | 'major' | 'minor';
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  createdAt: string;
  updatedAt?: string;
}

export interface PlatformTenant {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'starter' | 'growth' | 'enterprise';
  mrr: { amountMinor: bigint; currency: string };
  addedAt: string;
}

export interface SupportRequest {
  id: string;
  tenant: string;
  subject: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'open' | 'in_progress' | 'waiting' | 'closed';
  createdAt: string;
  assignee?: string;
}

export interface KpiSeed {
  label: string;
  value: { amountMinor: bigint; currency: string } | number;
  delta: number;
  trend: 'up' | 'down' | 'flat';
}

export interface InsightSeed {
  id: string;
  title: string;
  detail: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
  createdAt: string;
}

export interface DocSeed {
  id: string;
  name: string;
  type: string;
  status: 'missing' | 'received' | 'expired' | 'valid';
  expiryDate?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended' | 'invited';
  lastActiveAt?: string;
}

export interface AccessRequest {
  id: string;
  requester: string;
  role: string;
  resource: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface AccessAlert {
  id: string;
  user: string;
  alertType: 'soviolation' | 'excessive_access' | 'stale_access' | 'policy_change';
  detail: string;
  severity: 'high' | 'medium' | 'low';
  detectedAt: string;
}

export interface PolicyVersion {
  id: string;
  name: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'draft' | 'active' | 'archived';
}

export interface Contract {
  id: string;
  counterparty: string;
  type: 'vendor' | 'customer' | 'partner';
  value: { amountMinor: bigint; currency: string };
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  status: 'draft' | 'active' | 'expired' | 'terminated';
}

export interface CloseTask {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'complete' | 'blocked';
  priority: 'high' | 'medium' | 'low';
}

export interface ControlCheck {
  id: string;
  control: string;
  result: 'pass' | 'fail' | 'partial';
  evidence: string;
  checkedAt: string;
  checker: string;
}

export interface EvidenceGap {
  id: string;
  control: string;
  missing: string;
  impact: 'high' | 'medium' | 'low';
  dueDate: string;
}

export interface BusinessRisk {
  id: string;
  title: string;
  category: 'strategic' | 'operational' | 'financial' | 'compliance';
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  owner: string;
  mitigation?: string;
}

export interface ComplianceItem {
  id: string;
  requirement: string;
  framework: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence?: string;
  dueDate?: string;
}

export interface CashMovement {
  id: string;
  date: string;
  description: string;
  amount: { amountMinor: bigint; currency: string };
  direction: 'inflow' | 'outflow';
  category: string;
  reconciled: boolean;
}

export interface LedgerKpi {
  label: string;
  value: { amountMinor: bigint; currency: string };
  delta: number;
}

export interface PnlLine {
  account: string;
  label: string;
  current: { amountMinor: bigint; currency: string };
  prior: { amountMinor: bigint; currency: string };
  variance: number;
}

export interface SegmentMargin {
  segment: string;
  revenue: { amountMinor: bigint; currency: string };
  directCost: { amountMinor: bigint; currency: string };
  margin: { amountMinor: bigint; currency: string };
  marginPct: number;
}

export interface Bill {
  id: string;
  vendor: string;
  amount: { amountMinor: bigint; currency: string };
  dueDate: string;
  status: 'pending' | 'approved' | 'paid' | 'overdue';
  invoiceNumber: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  lines: Array<{
    account: string;
    debit: { amountMinor: bigint; currency: string };
    credit: { amountMinor: bigint; currency: string };
  }>;
  postedBy: string;
  postedAt: string;
}

export interface ApprovalItem {
  id: string;
  type: 'expense' | 'invoice' | 'journal' | 'access';
  title: string;
  amount?: { amountMinor: bigint; currency: string };
  requester: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  dueDate?: string;
}

export interface Reconciliation {
  id: string;
  party: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  status: 'pending' | 'in_progress' | 'complete' | 'exception';
  period: string;
  matchedAmount: { amountMinor: bigint; currency: string };
  unmatchedAmount: { amountMinor: bigint; currency: string };
  exceptions: number;
}

export interface IntakeDoc {
  id: string;
  name: string;
  type: string;
  source: string;
  receivedAt: string;
  status: 'pending' | 'processed' | 'error';
  extractedData?: Record<string, unknown>;
}

export interface RoiItem {
  id: string;
  initiative: string;
  investment: { amountMinor: bigint; currency: string };
  return: { amountMinor: bigint; currency: string };
  period: string;
  roiPct: number;
}

// Cash movement types for ledger-cashflow module
export interface CashMovement {
  id: string;
  date: string;
  description: string;
  amount: { amountMinor: bigint; currency: string };
  direction: 'in' | 'out';
  category: string;
  accountId: string;
  status: 'posted' | 'pending' | 'reconciled';
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  balance: { amountMinor: bigint; currency: string };
}

export interface CashCategory {
  id: string;
  name: string;
  color: string;
}

// Reconciliation types for reconciliation-cockpit module
export interface Reconciliation {
  id: string;
  tier: 'suspicious' | 'normal' | 'high-value';
  stage: 'detected' | 'reviewing' | 'prepared' | 'posted';
  transaction: {
    id: string;
    amount: { amountMinor: bigint; currency: string };
    date: string;
    description: string;
  };
  unexplainedDifference?: {
    amountMinor: bigint;
    currency: string;
  };
  matches?: Array<{
    id: string;
    amount: { amountMinor: bigint; currency: string };
    source: string;
  }>;
}

export interface FieldDelta {
  field: string;
  systemValue: string;
  documentValue: string;
  confidence: number;
}
