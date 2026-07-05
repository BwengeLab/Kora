import type { Session } from '../auth/types';

const SESSION_TOKEN_KEY = 'kora.session.token';

export async function demoLoginSession(
  apiBaseUrl: string,
  roleId: string,
  signal?: AbortSignal,
): Promise<Session> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: roleId }),
  };
  if (signal) init.signal = signal;
  return jsonRequest<Session>(`${apiBaseUrl}/api/session/demo-login`, init);
}

export async function fetchCurrentSession(
  apiBaseUrl: string,
  token: string,
  signal?: AbortSignal,
): Promise<Session> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  return jsonRequest<Session>(`${apiBaseUrl}/api/session/me`, init);
}

export function sessionTokenKey(): string {
  return SESSION_TOKEN_KEY;
}

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = await safePayload(response);
    throw new Error(payload || `${response.status} ${response.statusText}`);
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
