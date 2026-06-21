import { create } from 'zustand';
import { seedApprovals, type ApprovalItem } from '../seed/approvals';
import { seedAuditLog, type AuditEvent } from '../seed/auditorHome';
import {
  seedReconciliations,
  type Reconciliation,
  type ReconciliationTier,
} from '../seed/reconciliation';
import type { Money } from '../lib/money';

// Live, shared workflow state. Both the Reconciliation Cockpit and the Action
// Center read/write this, so preparing a match in the cockpit creates an
// approval that appears in the Finance Lead's Action Center — the real
// operator → lead handoff, with shared state instead of static seed.

const POLICY_LIMIT: Money = { amountMinor: 10000000n, currency: 'USD' }; // $100,000

function riskFromTier(tier: ReconciliationTier): ApprovalItem['risk'] {
  if (tier === 'suspicious' || tier === 'review') return 'high';
  if (tier === 'duplicate') return 'medium';
  return 'low';
}

function nowIso() {
  return new Date().toISOString();
}

interface Actor {
  name: string;
  role: string;
}

interface WorkflowState {
  reconciliations: Reconciliation[];
  approvals: ApprovalItem[];
  auditLog: AuditEvent[];
  dismissedReconIds: string[];
  prepareMatch: (reconId: string, by: Actor) => void;
  rejectReconciliation: (reconId: string) => void;
  dismissSuggestion: (reconId: string) => void;
  approve: (approvalId: string, by: Actor) => ApproveResult;
  rejectApproval: (approvalId: string, by: Actor) => void;
  reset: () => void;
}

// Outcome of an approval attempt — drives the toast + the audit trail.
export type ApproveResult =
  | 'approved' //   completed (single, or 2nd of 2) → posted
  | 'partial' //    1st of 2 recorded, needs another approver
  | 'sod' //        blocked: you prepared this (segregation of duties)
  | 'duplicate' //  blocked: you already approved this item
  | 'needs-first' // blocked: owner can't give the FIRST approval (approves last)
  | null;

const isOwnerRole = (role: string) => /owner/i.test(role);

// Can this actor approve this item right now? (Mirrors the store rules so the
// UI can disable the button + explain why before the click.)
export function approvalBlockReason(item: ApprovalItem, actorRole: string, actorName: string): ApproveResult {
  if (item.stage === 'approved' || item.stage === 'rejected') return null;
  if (item.isOwnItem) return 'sod';
  if (item.approvals.some((a) => a.name === actorName)) return 'duplicate';
  if (item.requiresDualApproval && item.approvals.length === 0 && isOwnerRole(actorRole)) return 'needs-first';
  return null; // null here = no block → may approve
}

// Deep-ish clones so we never mutate the seed module arrays.
const cloneRecons = (): Reconciliation[] => seedReconciliations.map((r) => ({ ...r, history: [...r.history] }));
const cloneApprovals = (): ApprovalItem[] => seedApprovals.map((a) => ({ ...a, approvals: [...a.approvals], history: [...a.history] }));
const cloneAudit = (): AuditEvent[] => seedAuditLog.map((e) => ({ ...e }));

function auditEvent(item: ApprovalItem, by: Actor, action: string, kind: AuditEvent['kind']): AuditEvent {
  return {
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor: by.name,
    role: by.role,
    kind,
    action,
    target: `${item.title.replace(/^Approve match: /, '')} · ${item.subtitle}`,
    amount: item.amount,
    hasEvidence: item.evidence.length > 0,
  };
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  reconciliations: cloneRecons(),
  approvals: cloneApprovals(),
  auditLog: cloneAudit(),
  dismissedReconIds: [],

  prepareMatch: (reconId, by) => {
    const recon = get().reconciliations.find((r) => r.id === reconId);
    if (!recon || recon.stage === 'prepared') return;

    // 1. advance the reconciliation
    set((s) => ({
      reconciliations: s.reconciliations.map((r) =>
        r.id === reconId
          ? {
              ...r,
              stage: 'prepared',
              ageText: 'Prepared just now',
              history: [
                ...r.history,
                { id: `h-${Date.now()}`, at: nowIso(), actor: by.name, actorRole: by.role, kind: 'user', action: 'Prepared match · routed for approval' },
              ],
            }
          : r,
      ),
    }));

    // 2. create an approval item from it (deduped by id)
    const overLimit = recon.transaction.amount.amountMinor > POLICY_LIMIT.amountMinor;
    const approvalId = `ap-from-${reconId}`;
    if (get().approvals.some((a) => a.id === approvalId)) return;

    const newApproval: ApprovalItem = {
      id: approvalId,
      type: 'match',
      title: `Approve match: ${recon.transaction.counterparty}`,
      subtitle: recon.suggestedRecord ? `${recon.suggestedRecord.reference} · prepared` : 'prepared',
      amount: recon.transaction.amount,
      risk: riskFromTier(recon.tier),
      preparedBy: by,
      preparedAt: nowIso(),
      deadlineText: 'Due in 2d',
      urgent: false,
      confidence: recon.confidence,
      stage: 'awaiting',
      requiresDualApproval: overLimit,
      policyLimit: POLICY_LIMIT,
      withinLimit: !overLimit,
      approvals: [],
      isOwnItem: false,
      agentRecommendation: recon.reason,
      evidence: recon.evidence,
      history: [
        { id: `ah-${Date.now()}`, at: nowIso(), actor: by.name, actorRole: by.role, kind: 'user', action: 'Prepared match · routed for approval' },
      ],
    };
    set((s) => ({ approvals: [newApproval, ...s.approvals] }));
  },

  rejectReconciliation: (reconId) => {
    set((s) => ({
      reconciliations: s.reconciliations.map((r) =>
        r.id === reconId ? { ...r, stage: 'detected', ageText: 'Rejected — back to review' } : r,
      ),
    }));
  },

  dismissSuggestion: (reconId) => {
    set((s) => ({ dismissedReconIds: [...s.dismissedReconIds, reconId] }));
  },

  approve: (approvalId, by) => {
    const item = get().approvals.find((a) => a.id === approvalId);
    if (!item) return null;

    // Enforce SoD + dual-approval ordering before recording anything.
    const block = approvalBlockReason(item, by.role, by.name);
    if (block) return block;

    const willCount = item.approvals.length + 1;
    const needsSecond = item.requiresDualApproval && willCount < 2;
    const nextStage: ApprovalItem['stage'] = needsSecond ? 'partial' : 'approved';
    const action = needsSecond ? 'Approved (1 of 2)' : 'Approved & posted · audited';

    set((s) => ({
      approvals: s.approvals.map((a) =>
        a.id === approvalId
          ? {
              ...a,
              stage: nextStage,
              approvals: [...a.approvals, { name: by.name, role: by.role, at: nowIso() }],
              history: [
                ...a.history,
                { id: `ah-${Date.now()}`, at: nowIso(), actor: by.name, actorRole: by.role, kind: 'user', action },
              ],
            }
          : a,
      ),
      // if this approval came from a reconciliation, mark the recon posted
      reconciliations: s.reconciliations.map((r) =>
        `ap-from-${r.id}` === approvalId && !needsSecond ? { ...r, stage: 'posted' } : r,
      ),
      // append to the immutable audit log the auditor sees
      auditLog: [auditEvent(item, by, action, needsSecond ? 'approval' : 'posting'), ...s.auditLog],
    }));
    return nextStage;
  },

  rejectApproval: (approvalId, by) => {
    const item = get().approvals.find((a) => a.id === approvalId);
    set((s) => ({
      approvals: s.approvals.map((a) => (a.id === approvalId ? { ...a, stage: 'rejected' } : a)),
      auditLog: item ? [auditEvent(item, by, 'Rejected approval', 'approval'), ...s.auditLog] : s.auditLog,
    }));
  },

  reset: () => set({ reconciliations: cloneRecons(), approvals: cloneApprovals(), auditLog: cloneAudit(), dismissedReconIds: [] }),
}));
