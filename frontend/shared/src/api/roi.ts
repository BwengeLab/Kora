import type { RoiItem } from '../types/api';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

export interface ROISummaryPayload {
  totalValue: { amountMinor: bigint; currency: string };
  subscriptionCost: { amountMinor: bigint; currency: string };
  roiMultiple: number;
  series: number[];
  labels: string[];
  items: RoiItem[];
  hoursSaved: number;
}

export async function fetchRoiSummary(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<ROISummaryPayload> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/roi/summary`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return reviveBigInts((await response.json()) as ROISummaryPayload) as ROISummaryPayload;
}

export async function downloadRoiSummary(apiBaseUrl: string, token: string): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/api/roi/export`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  return response.blob();
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
