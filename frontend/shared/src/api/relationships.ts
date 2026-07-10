import type { Party, Renewal } from '../seed/ownerExtra';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

export interface RelationshipsOverviewPayload {
  parties: Party[];
  renewals: Renewal[];
}

export async function fetchRelationshipsOverview(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<RelationshipsOverviewPayload> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/relationships/overview`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return reviveBigInts((await response.json()) as RelationshipsOverviewPayload) as RelationshipsOverviewPayload;
}

export async function relationshipPartyAction(
  apiBaseUrl: string,
  token: string,
  partyID: string,
  action: 'email-contact' | 'review-terms' | 'send-statement' | 'schedule-payment',
): Promise<RelationshipsOverviewPayload> {
  const response = await fetch(`${apiBaseUrl}/api/relationships/parties/${partyID}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return reviveBigInts((await response.json()) as RelationshipsOverviewPayload) as RelationshipsOverviewPayload;
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
