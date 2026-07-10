interface RawMoney {
  amountMinor: string;
  currency: string;
}

export interface PortalAccessGrant {
  id: string;
  grantee: string;
  scopes: string[];
  status: 'active' | 'pending' | 'revoked' | 'expired';
  expiresAt: string;
}

export interface PortalAccessActivity {
  action: string;
  at: string;
}

export interface PortalAccessPayload {
  organizationName: string;
  grants: PortalAccessGrant[];
  activity: PortalAccessActivity[];
}

export interface CreditPassportPortalPayload {
  passport: {
    tenant: string;
    score: number;
    label: string;
    band: string;
    updated: string;
    sharedBy: string;
  };
  subScores: Array<{
    id: string;
    label: string;
    value: number;
    rating: 'Strong' | 'Good' | 'Fair' | 'Low';
    evidence: string;
  }>;
  trends: {
    labels: string[];
    revenue: number[];
    cashflow: number[];
  };
  affordability: {
    maxFacility: { amountMinor: bigint; currency: string };
    monthlyCapacity: { amountMinor: bigint; currency: string };
    termMonths: number;
    assumptions: string[];
  };
  evidencePack: Array<{
    id: string;
    factor: string;
    docName: string;
    detail: string;
  }>;
  grant: {
    expiresInDays: number;
    dataCategories: string[];
    scopeNote: string;
  };
}

export async function fetchPortalCreditPassport(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<CreditPassportPortalPayload> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/portal/credit-passport`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return reviveBigInts((await response.json()) as CreditPassportPortalPayload) as CreditPassportPortalPayload;
}

export async function fetchPortalAccess(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<PortalAccessPayload> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/portal/access`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as PortalAccessPayload;
}

export async function requestPortalAccess(apiBaseUrl: string, token: string, scope: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/portal/access-requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope }),
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
}

export async function downloadPortalCreditPassport(apiBaseUrl: string, token: string): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/api/portal/credit-passport/download`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
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
