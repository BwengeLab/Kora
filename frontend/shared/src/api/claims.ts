import type { Claim, ClaimStage } from '../seed/claims';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

export interface ClaimWorkspacePayload {
  claims: Claim[];
  stats: {
    openClaims: number;
    totalReserves: Claim['claimedAmount'];
    avgCycleDays: number;
    fraudFlagged: number;
    leakagePrevented: Claim['claimedAmount'];
    pipeline: Record<ClaimStage, number>;
  };
}

export interface ClaimWorkspaceActionResponse {
  result: string;
  payload: ClaimWorkspacePayload;
}

export async function fetchClaimsWorkspace(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<ClaimWorkspacePayload> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/claims/workspace`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return reviveBigInts((await response.json()) as ClaimWorkspacePayload) as ClaimWorkspacePayload;
}

export async function claimWorkspaceAction(
  apiBaseUrl: string,
  token: string,
  claimID: string,
  action: 'advance' | 'refer-siu' | 'request-docs',
): Promise<ClaimWorkspaceActionResponse> {
  const response = await fetch(`${apiBaseUrl}/api/claims/${claimID}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { result: string; payload: ClaimWorkspacePayload };
  return {
    result: data.result,
    payload: reviveBigInts(data.payload) as ClaimWorkspacePayload,
  };
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
