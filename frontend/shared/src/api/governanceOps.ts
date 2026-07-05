import type { Contract } from '../seed/contracts';
import type { CloseTask, ControlCheck, EvidenceGap } from '../seed/financeLeadClose';
import type { InsightSeed } from '../seed/orgOwnerHome';
import type { BusinessRisk, ComplianceItem } from '../seed/ownerRisk';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

interface RawTrend {
  direction: 'up' | 'down';
  valueText: string;
  label: string;
}

interface RawInsight {
  id: string;
  iconKey: InsightSeed['iconKey'];
  title: string;
  subtitle: string;
  primaryValue: string;
  delta: RawTrend;
  sparkColor: string;
  spark: number[];
}

interface RawCashForecast {
  current: RawMoney;
  projected: RawMoney;
  labels: string[];
  actual: Array<number | null>;
  forecast: Array<number | null>;
}

interface RawCloseTask extends CloseTask {}
interface RawEvidenceGap extends EvidenceGap {
  requested?: boolean;
}
interface RawControlCheck extends ControlCheck {}
interface RawContract extends Omit<Contract, 'value'> {
  value: RawMoney;
}
interface RawBusinessRisk extends BusinessRisk {
  status?: 'open' | 'mitigating' | 'accepted';
}
interface RawControlPosture {
  controlHealth: number;
  controlTrend: number;
  riskScore: string;
  openRisks: number;
}

export interface FinanceLeadDashboardPayload {
  cashForecast: {
    current: { amountMinor: bigint; currency: string };
    projected: { amountMinor: bigint; currency: string };
    labels: string[];
    actual: Array<number | null>;
    forecast: Array<number | null>;
  };
  closeTasks: CloseTask[];
  insights: InsightSeed[];
}

export interface ContractsOverviewPayload {
  items: Contract[];
}

export interface OwnerRiskDashboardPayload {
  controlPosture: RawControlPosture;
  risks: RawBusinessRisk[];
  compliance: ComplianceItem[];
}

export interface ControlsClosePayload {
  tasks: CloseTask[];
  evidenceGaps: RawEvidenceGap[];
  controlChecks: ControlCheck[];
}

export async function fetchFinanceLeadDashboard(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<FinanceLeadDashboardPayload> {
  const data = await getJson<{ cashForecast: RawCashForecast; closeTasks: RawCloseTask[]; insights: RawInsight[] }>(`${apiBaseUrl}/api/home/finance-lead-dashboard`, token, signal);
  return {
    cashForecast: {
      current: reviveMoney(data.cashForecast.current),
      projected: reviveMoney(data.cashForecast.projected),
      labels: data.cashForecast.labels ?? [],
      actual: data.cashForecast.actual ?? [],
      forecast: data.cashForecast.forecast ?? [],
    },
    closeTasks: data.closeTasks ?? [],
    insights: data.insights ?? [],
  };
}

export async function fetchContractsOverview(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<ContractsOverviewPayload> {
  const data = await getJson<{ items: RawContract[] }>(`${apiBaseUrl}/api/contracts/overview`, token, signal);
  return { items: (data.items ?? []).map(reviveContract) };
}

export async function renewContract(apiBaseUrl: string, token: string, contractID: string): Promise<ContractsOverviewPayload> {
  const data = await postJson<{ items: RawContract[] }>(`${apiBaseUrl}/api/contracts/${contractID}/renew`, token);
  return { items: (data.items ?? []).map(reviveContract) };
}

export async function flagContractRenewal(apiBaseUrl: string, token: string, contractID: string): Promise<ContractsOverviewPayload> {
  const data = await postJson<{ items: RawContract[] }>(`${apiBaseUrl}/api/contracts/${contractID}/flag-renewal`, token);
  return { items: (data.items ?? []).map(reviveContract) };
}

export async function fetchOwnerRiskDashboard(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<OwnerRiskDashboardPayload> {
  return getJson<OwnerRiskDashboardPayload>(`${apiBaseUrl}/api/owner/risk-dashboard`, token, signal);
}

export async function assignRisk(apiBaseUrl: string, token: string, riskID: string): Promise<OwnerRiskDashboardPayload> {
  return postJson<OwnerRiskDashboardPayload>(`${apiBaseUrl}/api/owner/risks/${riskID}/assign`, token);
}

export async function mitigateRisk(apiBaseUrl: string, token: string, riskID: string): Promise<OwnerRiskDashboardPayload> {
  return postJson<OwnerRiskDashboardPayload>(`${apiBaseUrl}/api/owner/risks/${riskID}/mitigate`, token);
}

export async function acceptRisk(apiBaseUrl: string, token: string, riskID: string): Promise<OwnerRiskDashboardPayload> {
  return postJson<OwnerRiskDashboardPayload>(`${apiBaseUrl}/api/owner/risks/${riskID}/accept`, token);
}

export async function fetchControlsClose(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<ControlsClosePayload> {
  return getJson<ControlsClosePayload>(`${apiBaseUrl}/api/controls-close/overview`, token, signal);
}

export async function toggleCloseTask(apiBaseUrl: string, token: string, taskID: string): Promise<ControlsClosePayload> {
  return postJson<ControlsClosePayload>(`${apiBaseUrl}/api/controls-close/tasks/${taskID}/toggle`, token);
}

export async function requestEvidenceGap(apiBaseUrl: string, token: string, gapID: string): Promise<ControlsClosePayload> {
  return postJson<ControlsClosePayload>(`${apiBaseUrl}/api/controls-close/evidence-gaps/${gapID}/request`, token);
}

export async function lockClosePeriod(apiBaseUrl: string, token: string): Promise<ControlsClosePayload> {
  return postJson<ControlsClosePayload>(`${apiBaseUrl}/api/controls-close/lock`, token);
}

function reviveMoney(value: RawMoney) {
  return {
    amountMinor: BigInt(value.amountMinor),
    currency: value.currency,
  };
}

function reviveContract(item: RawContract): Contract {
  return {
    ...item,
    value: reviveMoney(item.value),
  };
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
  return (await response.json()) as T;
}

async function postJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
