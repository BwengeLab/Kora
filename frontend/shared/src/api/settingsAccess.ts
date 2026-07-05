import type { ApprovalRule } from '../seed/approvalPolicy';
import type { OrgUser } from '../seed/orgUsers';

export async function fetchSettingsUsers(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<OrgUser[]> {
  const data = await getJson<{ items: OrgUser[] }>(`${apiBaseUrl}/api/settings/users`, token, signal);
  return data.items ?? [];
}

export async function createSettingsUser(apiBaseUrl: string, token: string, user: OrgUser): Promise<OrgUser[]> {
  const data = await sendJson<{ items: OrgUser[] }>(`${apiBaseUrl}/api/settings/users`, 'POST', token, user);
  return data.items ?? [];
}

export async function updateSettingsUser(apiBaseUrl: string, token: string, user: OrgUser): Promise<OrgUser[]> {
  const data = await sendJson<{ items: OrgUser[] }>(`${apiBaseUrl}/api/settings/users/${user.id}`, 'POST', token, user);
  return data.items ?? [];
}

export async function deleteSettingsUser(apiBaseUrl: string, token: string, userID: string): Promise<OrgUser[]> {
  const data = await sendJson<{ items: OrgUser[] }>(`${apiBaseUrl}/api/settings/users/${userID}`, 'DELETE', token);
  return data.items ?? [];
}

export async function fetchApprovalRules(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<ApprovalRule[]> {
  const data = await getJson<{ items: ApprovalRule[] }>(`${apiBaseUrl}/api/settings/approval-rules`, token, signal);
  return data.items ?? [];
}

export async function createApprovalRule(apiBaseUrl: string, token: string, rule: ApprovalRule): Promise<ApprovalRule[]> {
  const data = await sendJson<{ items: ApprovalRule[] }>(`${apiBaseUrl}/api/settings/approval-rules`, 'POST', token, rule);
  return data.items ?? [];
}

export async function updateApprovalRule(apiBaseUrl: string, token: string, rule: ApprovalRule): Promise<ApprovalRule[]> {
  const data = await sendJson<{ items: ApprovalRule[] }>(`${apiBaseUrl}/api/settings/approval-rules/${rule.id}`, 'POST', token, rule);
  return data.items ?? [];
}

export async function deleteApprovalRule(apiBaseUrl: string, token: string, ruleID: string): Promise<ApprovalRule[]> {
  const data = await sendJson<{ items: ApprovalRule[] }>(`${apiBaseUrl}/api/settings/approval-rules/${ruleID}`, 'DELETE', token);
  return data.items ?? [];
}

async function getJson<T>(url: string, token: string, signal?: AbortSignal): Promise<T> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function sendJson<T>(url: string, method: 'POST' | 'DELETE', token: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
