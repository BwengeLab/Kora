import type { InsightSeed, RelationshipRowSeed, DocSeed } from '../types/api';
import type { AdminUser, AccessRequest, AccessAlert, PolicyVersion } from '../types/api';

export interface OwnerDashboardPayload {
  insights: InsightSeed[];
  relationships: RelationshipRowSeed[];
  creditPassport: {
    score: number;
    label: string;
    caption: string;
    updated: string;
    factors: { name: string; rating: 'Good' | 'Low' | 'Strong' }[];
  };
  documents: DocSeed[];
}

export interface AdminDashboardPayload {
  stats: {
    activeUsers: number;
    pendingRequests: number;
    integrationsConnected: number;
    integrationsTotal: number;
    activePolicies: number;
    customRoles: number;
  };
  users: AdminUser[];
  accessRequests: AccessRequest[];
  accessAlerts: AccessAlert[];
  policies: PolicyVersion[];
  billing: {
    plan: string;
    seats: number;
    seatsIncluded: number;
    usagePct: number;
    renews: string;
  };
}

export async function fetchOwnerDashboard(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<OwnerDashboardPayload> {
  return getJson<OwnerDashboardPayload>(`${apiBaseUrl}/api/home/owner-dashboard`, token, signal);
}

export async function fetchAdminDashboard(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<AdminDashboardPayload> {
  return getJson<AdminDashboardPayload>(`${apiBaseUrl}/api/home/admin-dashboard`, token, signal);
}

export async function resolveAdminAccessRequest(
  apiBaseUrl: string,
  token: string,
  requestID: string,
  action: 'grant' | 'deny',
): Promise<AdminDashboardPayload> {
  const response = await fetch(`${apiBaseUrl}/api/home/admin-dashboard/access-requests/${encodeURIComponent(requestID)}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as AdminDashboardPayload;
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

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
