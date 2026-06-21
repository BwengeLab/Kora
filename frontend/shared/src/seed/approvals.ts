// Action Center seed — the Finance Lead's approval queue. These are the items
// the Reconciliation/Collections/Ledger flows route up for a human decision.
// Each carries its approval chain, policy limit, dual-approval + SoD state, and
// evidence — so the approver decides with full context and within the rules.
// (Docs 03 finance-lead, 06 §10 controls, 07 §0.3 Approval Center.)

import type { Money } from '../lib/money';
import type { EvidenceDoc, HistoryEvent } from './reconciliation';

const M = (amount: number, currency = 'USD'): Money => ({
  amountMinor: BigInt(Math.round(amount * 100)),
  currency,
});

export type ApprovalType = 'match' | 'payment' | 'collection' | 'posting' | 'renewal' | 'refund';
export type ApprovalRisk = 'low' | 'medium' | 'high';
export type ApprovalStage = 'awaiting' | 'partial' | 'approved' | 'rejected' | 'escalated';

export interface Approver {
  name: string;
  role: string;
  at?: string; // ISO — set once they've approved
}

export interface ApprovalItem {
  id: string;
  type: ApprovalType;
  title: string;
  subtitle: string;
  amount: Money;
  risk: ApprovalRisk;
  preparedBy: { name: string; role: string };
  preparedAt: string;
  deadlineText: string; // "Due in 6h", "Overdue 2h"
  urgent: boolean;
  confidence?: number; // for AI-prepared matches
  stage: ApprovalStage;
  /** Over the approver's policy limit → needs two approvers. */
  requiresDualApproval: boolean;
  policyLimit: Money;
  withinLimit: boolean;
  approvals: Approver[]; // who has approved so far (in chain order)
  /** True if the CURRENT user prepared it → SoD blocks self-approval. */
  isOwnItem: boolean;
  agentRecommendation?: string;
  evidence: EvidenceDoc[];
  history: HistoryEvent[];
}

const ev = (id: string, name: string, kind: EvidenceDoc['kind'], sizeText: string, pageRef?: string): EvidenceDoc =>
  pageRef ? { id, name, kind, sizeText, pageRef } : { id, name, kind, sizeText };

const h = (id: string, at: string, actor: string, role: string, kind: HistoryEvent['kind'], action: string): HistoryEvent => ({
  id,
  at,
  actor,
  actorRole: role,
  kind,
  action,
});

export const seedApprovals: ApprovalItem[] = [
  {
    id: 'ap-1',
    type: 'payment',
    title: 'Payment to ACME Supplies',
    subtitle: 'Invoice INV-10356 · matched & prepared',
    amount: M(45600),
    risk: 'medium',
    preparedBy: { name: 'Diane Uwase', role: 'Finance Operator' },
    preparedAt: '2025-05-15T16:20:00Z',
    deadlineText: 'Due in 6h',
    urgent: true,
    confidence: 91,
    stage: 'awaiting',
    requiresDualApproval: false,
    policyLimit: M(100000),
    withinLimit: true,
    approvals: [],
    isOwnItem: false,
    agentRecommendation: 'Approve. The bank payment cleanly matches invoice INV-10356; supplier is in good standing with no open disputes.',
    evidence: [
      ev('ae-1', 'Invoice INV-10356.pdf', 'invoice', '320 KB'),
      ev('ae-2', 'HSBC Statement — May 2025.pdf', 'statement', '2.4 MB', 'p.3, line 14'),
    ],
    history: [
      h('ah-1a', '2025-05-14T09:12:00Z', 'Reconciliation Agent', 'Kora AI', 'agent', 'Matched payment to invoice (91%)'),
      h('ah-1b', '2025-05-15T16:20:00Z', 'Diane Uwase', 'Finance Operator', 'user', 'Prepared match · routed for approval'),
    ],
  },
  {
    id: 'ap-2',
    type: 'payment',
    title: 'Payment to PT Imports',
    subtitle: 'PO-2025-441 · $260 over PO — overcharge?',
    amount: M(8760),
    risk: 'high',
    preparedBy: { name: 'Diane Uwase', role: 'Finance Operator' },
    preparedAt: '2025-05-15T15:02:00Z',
    deadlineText: 'Overdue 2h',
    urgent: true,
    confidence: 58,
    stage: 'awaiting',
    requiresDualApproval: false,
    policyLimit: M(100000),
    withinLimit: true,
    approvals: [],
    isOwnItem: false,
    agentRecommendation: 'Hold. The amount is $260 above PO-2025-441 with no supporting note. Recommend requesting a corrected invoice before approving.',
    evidence: [
      ev('ae-3', 'PO-2025-441.pdf', 'po', '210 KB'),
      ev('ae-4', 'I&M Statement — May.pdf', 'statement', '1.1 MB', 'p.2, line 3'),
    ],
    history: [
      h('ah-2a', '2025-05-15T11:20:00Z', 'Reconciliation Agent', 'Kora AI', 'agent', 'Flagged: $260 over PO'),
      h('ah-2b', '2025-05-15T15:02:00Z', 'Diane Uwase', 'Finance Operator', 'user', 'Prepared with note · routed for approval'),
    ],
  },
  {
    id: 'ap-3',
    type: 'payment',
    title: 'Capital equipment purchase',
    subtitle: 'Server infrastructure · CapEx 2025',
    amount: M(184500),
    risk: 'high',
    preparedBy: { name: 'Diane Uwase', role: 'Finance Operator' },
    preparedAt: '2025-05-15T10:00:00Z',
    deadlineText: 'Due in 1d',
    urgent: false,
    stage: 'partial',
    requiresDualApproval: true,
    policyLimit: M(100000),
    withinLimit: false,
    approvals: [{ name: 'Eric Habimana', role: 'Finance Lead', at: '2025-05-15T12:30:00Z' }],
    isOwnItem: false,
    agentRecommendation: 'Within budget. CapEx line has $220K remaining for 2025. Finance Lead approved (1 of 2); as Organization Owner you give the final signature.',
    evidence: [
      ev('ae-5', 'Equipment quote.pdf', 'invoice', '540 KB'),
      ev('ae-6', 'CapEx budget 2025.xlsx', 'contract', '88 KB'),
    ],
    history: [
      h('ah-3a', '2025-05-15T10:00:00Z', 'Diane Uwase', 'Finance Operator', 'user', 'Prepared payment'),
      h('ah-3b', '2025-05-15T12:30:00Z', 'Eric Habimana', 'Finance Lead', 'user', 'Approved (1 of 2)'),
    ],
  },
  {
    id: 'ap-4',
    type: 'posting',
    title: 'Post month-end accruals',
    subtitle: 'May 2025 close · 14 journal entries',
    amount: M(62300),
    risk: 'medium',
    preparedBy: { name: 'Diane Uwase', role: 'Finance Operator' },
    preparedAt: '2025-05-15T14:10:00Z',
    deadlineText: 'Due in 3d',
    urgent: false,
    stage: 'awaiting',
    requiresDualApproval: false,
    policyLimit: M(100000),
    withinLimit: true,
    approvals: [],
    isOwnItem: false,
    agentRecommendation: 'Entries balance and tie to supporting schedules. Safe to post.',
    evidence: [ev('ae-7', 'Accruals schedule — May.xlsx', 'contract', '120 KB')],
    history: [h('ah-4a', '2025-05-15T14:10:00Z', 'Diane Uwase', 'Finance Operator', 'user', 'Prepared 14 entries')],
  },
  {
    id: 'ap-5',
    type: 'collection',
    title: 'Send overdue reminders',
    subtitle: '8 invoices · 48+ days overdue',
    amount: M(214890.3),
    risk: 'low',
    preparedBy: { name: 'Collections Agent', role: 'Kora AI' },
    preparedAt: '2025-05-15T08:00:00Z',
    deadlineText: 'Due today',
    urgent: false,
    stage: 'awaiting',
    requiresDualApproval: false,
    policyLimit: M(100000),
    withinLimit: true,
    approvals: [],
    isOwnItem: false,
    agentRecommendation: 'Approve to send. Tone-matched reminders drafted per customer history; no customer is in an active dispute.',
    evidence: [ev('ae-8', 'Overdue aging — May.xlsx', 'contract', '96 KB')],
    history: [h('ah-5a', '2025-05-15T08:00:00Z', 'Collections Agent', 'Kora AI', 'agent', 'Drafted 8 reminders')],
  },
  {
    id: 'ap-6',
    type: 'renewal',
    title: 'Office Lease renewal',
    subtitle: 'Kigali Office Park · expires in 14 days',
    amount: M(149760),
    risk: 'medium',
    preparedBy: { name: 'Contract Agent', role: 'Kora AI' },
    preparedAt: '2025-05-14T09:00:00Z',
    deadlineText: 'Due in 5d',
    urgent: false,
    stage: 'awaiting',
    requiresDualApproval: true,
    policyLimit: M(100000),
    withinLimit: false,
    approvals: [],
    isOwnItem: false,
    agentRecommendation: 'Rent unchanged from prior term. Annual value exceeds your limit — dual approval required.',
    evidence: [ev('ae-9', 'Office Lease 2025.pdf', 'contract', '850 KB')],
    history: [h('ah-6a', '2025-05-14T09:00:00Z', 'Contract Agent', 'Kora AI', 'agent', 'Extracted renewal terms')],
  },
  {
    id: 'ap-7',
    type: 'match',
    title: 'Approve match: Cloud Services',
    subtitle: 'Subscription SUB-Q2 · prepared by you',
    amount: M(2240),
    risk: 'low',
    preparedBy: { name: 'Eric Habimana', role: 'Finance Lead' },
    preparedAt: '2025-05-15T16:40:00Z',
    deadlineText: 'Due in 2d',
    urgent: false,
    confidence: 94,
    stage: 'awaiting',
    requiresDualApproval: false,
    policyLimit: M(100000),
    withinLimit: true,
    approvals: [],
    isOwnItem: true, // SoD: current Finance Lead prepared this → cannot self-approve
    agentRecommendation: 'High-confidence recurring subscription. Because you prepared this, another approver must sign off (segregation of duties).',
    evidence: [ev('ae-10', 'HSBC Statement — May 2025.pdf', 'statement', '2.4 MB', 'p.2, line 9')],
    history: [
      h('ah-7a', '2025-05-13T10:00:00Z', 'Reconciliation Agent', 'Kora AI', 'agent', 'Matched subscription (94%)'),
      h('ah-7b', '2025-05-15T16:40:00Z', 'Eric Habimana', 'Finance Lead', 'user', 'Prepared match'),
    ],
  },
  {
    id: 'ap-8',
    type: 'refund',
    title: 'Customer refund — Marie Iradukunda',
    subtitle: 'Policy cancellation · PREM-7741',
    amount: M(420),
    risk: 'low',
    preparedBy: { name: 'Diane Uwase', role: 'Finance Operator' },
    preparedAt: '2025-05-15T13:00:00Z',
    deadlineText: 'Due in 1d',
    urgent: false,
    stage: 'awaiting',
    requiresDualApproval: false,
    policyLimit: M(100000),
    withinLimit: true,
    approvals: [],
    isOwnItem: false,
    agentRecommendation: 'Cancellation within the cooling-off window; refund is due per policy terms.',
    evidence: [ev('ae-11', 'Policy PREM-7741.pdf', 'contract', '180 KB')],
    history: [h('ah-8a', '2025-05-15T13:00:00Z', 'Diane Uwase', 'Finance Operator', 'user', 'Prepared refund')],
  },
];

// ─── Stats ───────────────────────────────────────────────────────────────
export const seedApprovalStats = {
  awaitingCount: 7,
  awaitingValue: M(672110.3),
  highRiskCount: 2,
  overLimitCount: 2,
  urgentCount: 2,
  approvedTodayCount: 23,
  approvedTodayValue: M(418500),
  approvedTodaySeries: [3, 5, 8, 11, 14, 18, 21, 23],
};

export interface ApprovalTypeStat {
  type: ApprovalType;
  label: string;
  count: number;
}

export const seedApprovalTypeStats: ApprovalTypeStat[] = [
  { type: 'payment', label: 'Payments', count: 3 },
  { type: 'match', label: 'Matches', count: 1 },
  { type: 'posting', label: 'Postings', count: 1 },
  { type: 'collection', label: 'Collections', count: 1 },
  { type: 'renewal', label: 'Renewals', count: 1 },
];
