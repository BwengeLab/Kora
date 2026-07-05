import type { FeatureId } from '../state/featureStore';

export interface FeatureEntitlementsPayload {
  enabled: FeatureId[];
}

export async function fetchFeatureEntitlements(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<FeatureEntitlementsPayload> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/features`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as FeatureEntitlementsPayload;
}

export async function toggleFeatureEntitlement(apiBaseUrl: string, token: string, featureID: FeatureId): Promise<FeatureEntitlementsPayload> {
  const response = await fetch(`${apiBaseUrl}/api/features/${featureID}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as FeatureEntitlementsPayload;
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
