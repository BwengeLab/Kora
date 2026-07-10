export interface IntegrationStatusItem {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSync: string;
  connected: boolean;
  connectionId?: string;
}

export async function fetchIntegrationStatuses(
  apiBaseUrl: string,
  token: string,
  signal?: AbortSignal,
): Promise<IntegrationStatusItem[]> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/integrations/status`, init);
  if (!response.ok) {
    throw new Error(await safePayload(response) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items: IntegrationStatusItem[] };
  return data.items ?? [];
}

export async function integrationStatusAction(
  apiBaseUrl: string,
  token: string,
  integrationID: string,
  action: 'connect' | 'disconnect',
): Promise<IntegrationStatusItem[]> {
  const response = await fetch(`${apiBaseUrl}/api/integrations/status/${integrationID}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items: IntegrationStatusItem[] };
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
