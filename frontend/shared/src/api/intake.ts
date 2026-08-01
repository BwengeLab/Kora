import type { IntakeDoc } from '../types/api';

export async function fetchIntakeDocs(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<IntakeDoc[]> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/intake/docs`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items?: IntakeDoc[] };
  return data.items ?? [];
}

export async function uploadIntakeDoc(apiBaseUrl: string, token: string, file: File): Promise<IntakeDoc> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${apiBaseUrl}/api/intake/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<IntakeDoc>;
}

export async function matchIntakeDoc(apiBaseUrl: string, token: string, docID: string): Promise<IntakeDoc> {
  return mutateDoc(`${apiBaseUrl}/api/intake/docs/${docID}/match`, token);
}

export async function postIntakeDoc(apiBaseUrl: string, token: string, docID: string): Promise<IntakeDoc> {
  return mutateDoc(`${apiBaseUrl}/api/intake/docs/${docID}/post`, token);
}

export async function fetchIntakeSources(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<Record<string, boolean>> {
  const init: RequestInit = { method: 'GET', headers: { Authorization: `Bearer ${token}` } };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/intake/sources`, init);
  if (!response.ok) throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  const data = (await response.json()) as { sources?: Record<string, boolean> };
  return data.sources ?? {};
}

export async function connectIntakeSource(apiBaseUrl: string, token: string, source: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/intake/sources/${source}/connect`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
}

async function mutateDoc(url: string, token: string, body?: unknown): Promise<IntakeDoc> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as IntakeDoc;
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
