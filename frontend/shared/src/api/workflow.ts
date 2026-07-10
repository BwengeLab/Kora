import type { ApprovalItem } from '../seed/approvals';
import type { AuditEvent } from '../seed/auditorHome';
import type { Reconciliation } from '../seed/reconciliation';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

interface RawWorkflowSnapshot {
  approvals: unknown[];
  reconciliations: unknown[];
  auditLog: unknown[];
  dismissedReconIds?: string[];
}

export interface WorkflowSnapshot {
  approvals: ApprovalItem[];
  reconciliations: Reconciliation[];
  auditLog: AuditEvent[];
  dismissedReconIds: string[];
}

export interface WorkflowActionResponse {
  result: string;
  snapshot: WorkflowSnapshot;
}

export async function fetchWorkflowSnapshot(
  apiBaseUrl: string,
  token: string,
  signal?: AbortSignal,
): Promise<WorkflowSnapshot> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/workflow/snapshot`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as RawWorkflowSnapshot;
  return {
    approvals: (data.approvals ?? []).map((item) => reviveBigInts(item) as ApprovalItem),
    reconciliations: (data.reconciliations ?? []).map((item) => reviveBigInts(item) as Reconciliation),
    auditLog: (data.auditLog ?? []).map((item) => reviveBigInts(item) as AuditEvent),
    dismissedReconIds: data.dismissedReconIds ?? [],
  };
}

export async function workflowApprovalAction(
  apiBaseUrl: string,
  token: string,
  approvalID: string,
  action: 'approve' | 'reject' | 'withdraw' | 'nudge' | 'resubmit' | 'request-info' | 'reassign' | 'escalate',
): Promise<WorkflowActionResponse> {
  const response = await fetch(`${apiBaseUrl}/api/workflow/approvals/${approvalID}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { result: string; snapshot: RawWorkflowSnapshot };
  return {
    result: data.result,
    snapshot: {
      approvals: (data.snapshot.approvals ?? []).map((item) => reviveBigInts(item) as ApprovalItem),
      reconciliations: (data.snapshot.reconciliations ?? []).map((item) => reviveBigInts(item) as Reconciliation),
      auditLog: (data.snapshot.auditLog ?? []).map((item) => reviveBigInts(item) as AuditEvent),
      dismissedReconIds: data.snapshot.dismissedReconIds ?? [],
    },
  };
}

export async function workflowReconciliationAction(
  apiBaseUrl: string,
  token: string,
  reconciliationID: string,
  action: 'prepare' | 'reject' | 'approve' | 'dismiss' | 'assign' | 'ask' | 'acknowledge',
): Promise<WorkflowActionResponse> {
  const response = await fetch(`${apiBaseUrl}/api/workflow/reconciliations/${reconciliationID}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { result: string; snapshot: RawWorkflowSnapshot };
  return {
    result: data.result,
    snapshot: {
      approvals: (data.snapshot.approvals ?? []).map((item) => reviveBigInts(item) as ApprovalItem),
      reconciliations: (data.snapshot.reconciliations ?? []).map((item) => reviveBigInts(item) as Reconciliation),
      auditLog: (data.snapshot.auditLog ?? []).map((item) => reviveBigInts(item) as AuditEvent),
      dismissedReconIds: data.snapshot.dismissedReconIds ?? [],
    },
  };
}

export async function downloadReconciliationSummary(apiBaseUrl: string, token: string): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/api/workflow/reconciliation-export`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  return response.blob();
}

function reviveBigInts(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reviveBigInts);
  }
  if (value && typeof value === 'object') {
    if (looksLikeMoney(value)) {
      return {
        amountMinor: BigInt(value.amountMinor),
        currency: value.currency,
      };
    }
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = reviveBigInts(nested);
    }
    return out;
  }
  return value;
}

function looksLikeMoney(value: unknown): value is RawMoney {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'amountMinor' in value &&
      'currency' in value &&
      typeof (value as RawMoney).amountMinor === 'string' &&
      typeof (value as RawMoney).currency === 'string',
  );
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
