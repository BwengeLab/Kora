import type { Overdue } from '../seed/ownerExtra';
import type { Money } from '../lib/money';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

export interface EscalationItem {
  id: string;
  customer: string;
  invoice: string;
  amount: Money;
  days: number;
  requested: 'write-off' | 'payment-plan' | 'legal' | 'agency';
  by: string;
  note: string;
}

export interface CollectionsManagementPayload {
  overdue: Overdue[];
  escalations: EscalationItem[];
  policy: {
    reminderCadence: string;
    dsoTarget: string;
    autoEscalateAt: string;
  };
}

export async function fetchCollectionsManagement(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<CollectionsManagementPayload> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/collections/management`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return reviveBigInts((await response.json()) as CollectionsManagementPayload) as CollectionsManagementPayload;
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
