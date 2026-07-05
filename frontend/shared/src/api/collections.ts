import type { Overdue } from '../seed/ownerExtra';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

export async function fetchOverdueItems(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<Overdue[]> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/collections/overdue`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items?: unknown[] };
  return (data.items ?? []).map((item) => reviveBigInts(item) as Overdue);
}

export async function collectionsAction(apiBaseUrl: string, token: string, itemID: string, action: 'remind' | 'promise' | 'escalate' | 'hand-to-finance' | 'flag-owner-call' | 'request-update'): Promise<Overdue[]> {
  const response = await fetch(`${apiBaseUrl}/api/collections/overdue/${itemID}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items?: unknown[] };
  return (data.items ?? []).map((item) => reviveBigInts(item) as Overdue);
}

export async function exportCollectionsSummary(apiBaseUrl: string, token: string): Promise<{ status: string; fileName: string }> {
  const response = await fetch(`${apiBaseUrl}/api/collections/export-summary`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as { status: string; fileName: string };
}

function reviveBigInts(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reviveBigInts);
  if (value && typeof value === 'object') {
    if (looksLikeMoney(value)) {
      return { amountMinor: BigInt(value.amountMinor), currency: value.currency };
    }
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) out[key] = reviveBigInts(nested);
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
