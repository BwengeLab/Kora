import type { Money } from '../lib/money';
import type { OperatorTask, IntakeBatch } from '../seed/operatorHome';
import type { MissingDoc, SodViolation } from '../seed/auditorHome';
import type { Incident, PlatformTenant, SupportRequest } from '../seed/platformHome';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

export interface OperatorDashboardPayload {
  focus: {
    exceptionsToClear: number;
    unmatchedCount: number;
    unmatchedValue: Money;
    dataQualityFlags: number;
    agentSuggestions: number;
  };
  throughput: {
    clearedToday: number;
    clearedMonth: number;
    dailyGoal: number;
    streakDays: number;
    weekLabels: string[];
    weekSeries: number[];
  };
  resume: {
    reconId: string;
    party: string;
    amount: Money;
    tier: 'review' | 'suggested' | 'duplicate' | 'suspicious';
    confidence: number;
    note: string;
  };
  tasks: OperatorTask[];
  intakeBatches: IntakeBatch[];
}

export interface AuditorDashboardPayload {
  controlHealth: {
    score: number;
    trendPts: number;
    subscores: { label: string; value: number }[];
  };
  riskStats: {
    riskFlags: number;
    sodViolations: number;
    suspicious: number;
    missingDocs: number;
  };
  sodViolations: SodViolation[];
  missingDocs: MissingDoc[];
}

export interface PlatformDashboardPayload {
  stats: {
    activeTenants: number;
    tenantsAddedThisMonth: number;
    suspendedTenants: number;
    mrr: Money;
    mrrGrowthPct: number;
    uptimePct: number;
    grossMarginPct: number;
  };
  tenantGrowth: {
    labels: string[];
    series: number[];
  };
  systemHealth: {
    uptimePct: number;
    errorRatePct: number;
    p95LatencyMs: number;
    requestsPerSec: number;
    modelSpendToday: Money;
  };
  tenants: PlatformTenant[];
  incidents: Incident[];
  supportQueue: SupportRequest[];
}

export async function fetchOperatorDashboard(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<OperatorDashboardPayload> {
  return getJson<OperatorDashboardPayload>(`${apiBaseUrl}/api/home/operator-dashboard`, token, signal);
}

export async function fetchAuditorDashboard(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<AuditorDashboardPayload> {
  return getJson<AuditorDashboardPayload>(`${apiBaseUrl}/api/home/auditor-dashboard`, token, signal);
}

export async function fetchPlatformDashboard(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<PlatformDashboardPayload> {
  return getJson<PlatformDashboardPayload>(`${apiBaseUrl}/api/home/platform-dashboard`, token, signal);
}

async function getJson<T>(url: string, token: string, signal?: AbortSignal): Promise<T> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return reviveBigInts((await response.json()) as unknown) as T;
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
