import type { Money } from '../lib/money';
import type { KpiSeed } from '../types/api';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

export interface OwnerCashFlow {
  netPosition: Money;
  inflow: Money;
  outflow: Money;
  net: Money;
  xLabels: readonly string[];
  series: readonly { name: string; color: string; data: readonly number[] }[];
}

export interface OwnerHomeSummary {
  kpis: KpiSeed[];
  cashFlow: OwnerCashFlow;
}

export async function fetchOwnerHomeSummary(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<OwnerHomeSummary> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/home/owner-summary`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return reviveBigInts((await response.json()) as unknown) as OwnerHomeSummary;
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
