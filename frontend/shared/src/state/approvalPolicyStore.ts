import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EntityScope } from '../seed/entities';
import { seedApprovalRules, type ApprovalRule, type ApproverRole, type RuleCategory } from '../seed/approvalPolicy';

// The live DOA matrix. Org Admin edits it; the workflow engine resolves the
// required approval chain for any item from it (instead of a hardcoded limit).

export interface ResolvedChain {
  approvers: ApproverRole[];
  requiresDual: boolean;
  rule: ApprovalRule | null;
}

interface PolicyState {
  rules: ApprovalRule[];
  addRule: (rule: ApprovalRule) => void;
  updateRule: (id: string, patch: Partial<ApprovalRule>) => void;
  removeRule: (id: string) => void;
  reset: () => void;
}

const matches = (r: ApprovalRule, amount: number, category: RuleCategory, scope: EntityScope) =>
  amount >= r.minAmount &&
  (r.maxAmount === null || amount < r.maxAmount) &&
  (r.category === 'all' || r.category === category) &&
  (r.scope === 'all' || r.scope === scope);

// Pure resolver so non-React code (the workflow store) can use it too.
export function resolveChainFrom(rules: ApprovalRule[], amount: number, opts?: { category?: RuleCategory; scope?: EntityScope }): ResolvedChain {
  const category = opts?.category ?? 'all';
  const scope = opts?.scope ?? 'all';
  const candidates = rules.filter((r) => matches(r, amount, category, scope));
  if (candidates.length === 0) return { approvers: ['Finance Lead'], requiresDual: false, rule: null };
  // Most conservative wins: the rule demanding the longest approval chain; tie-break
  // toward the more specific rule (category/scope not 'all').
  const specificity = (r: ApprovalRule) => (r.category !== 'all' ? 1 : 0) + (r.scope !== 'all' ? 1 : 0);
  const best = candidates.sort((a, b) => b.approvers.length - a.approvers.length || specificity(b) - specificity(a))[0]!;
  return { approvers: best.approvers, requiresDual: best.approvers.length >= 2, rule: best };
}

export const useApprovalPolicyStore = create<PolicyState>()(
  persist(
    (set) => ({
      rules: seedApprovalRules,
      addRule: (rule) => set((s) => ({ rules: [...s.rules, rule] })),
      updateRule: (id, patch) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
      reset: () => set({ rules: seedApprovalRules }),
    }),
    { name: 'kora.approval-policy' },
  ),
);

// Convenience for non-hook callers.
export const resolveChain = (amount: number, opts?: { category?: RuleCategory; scope?: EntityScope }): ResolvedChain =>
  resolveChainFrom(useApprovalPolicyStore.getState().rules, amount, opts);

// The general dual-approval threshold (smallest amount where an all/all rule needs ≥2).
export function dualThreshold(): number {
  const rules = useApprovalPolicyStore.getState().rules;
  const general = rules.filter((r) => r.scope === 'all' && r.category === 'all' && r.approvers.length >= 2).sort((a, b) => a.minAmount - b.minAmount)[0];
  return general?.minAmount ?? 100000;
}
