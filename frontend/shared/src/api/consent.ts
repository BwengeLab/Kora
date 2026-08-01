import type { ConsentGrant } from '../types/api';

export interface CreateConsentGrantInput {
  grantee: string;
  granteeType: ConsentGrant['granteeType'];
  purpose: string;
  scopes: ConsentGrant['scopes'];
  expiresAt: string;
  basis: string;
}

export async function fetchConsentGrants(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<ConsentGrant[]> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/consent/grants`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items?: ConsentGrant[] };
  return data.items ?? [];
}

export async function createConsentGrant(apiBaseUrl: string, token: string, input: CreateConsentGrantInput): Promise<ConsentGrant[]> {
  const response = await fetch(`${apiBaseUrl}/api/consent/grants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items?: ConsentGrant[] };
  return data.items ?? [];
}

export async function approveConsentGrant(apiBaseUrl: string, token: string, grantID: string): Promise<ConsentGrant[]> {
  const response = await fetch(`${apiBaseUrl}/api/consent/grants/${grantID}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items?: ConsentGrant[] };
  return data.items ?? [];
}

export async function revokeConsentGrant(apiBaseUrl: string, token: string, grantID: string): Promise<ConsentGrant[]> {
  const response = await fetch(`${apiBaseUrl}/api/consent/grants/${grantID}/revoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items?: ConsentGrant[] };
  return data.items ?? [];
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
