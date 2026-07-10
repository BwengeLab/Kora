import type { Money } from '../lib/money';
import type { CashMovement } from '../seed/cashLedger';
import type { AuditEvent, MissingDoc, SodViolation } from '../seed/auditorHome';
import type { LedgerKpi, PnlLine, SegmentMargin } from '../seed/ownerLedger';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

interface RawTrend {
  direction: 'up' | 'down';
  valueText: string;
  label: string;
}

interface RawLedgerKpi {
  id: LedgerKpi['id'];
  label: string;
  money?: RawMoney;
  valueText?: string;
  delta: RawTrend;
  positiveDirection: 'up' | 'down';
}

interface RawEvidenceDoc {
  id: string;
  name: string;
  kind: 'invoice' | 'statement' | 'receipt' | 'contract' | 'po';
  sizeText: string;
}

interface RawCashMovement extends Omit<CashMovement, 'amount' | 'evidence'> {
  amount: RawMoney;
  evidence: RawEvidenceDoc[];
}

interface RawPnlLine extends Omit<PnlLine, 'amount' | 'prior'> {
  amount: RawMoney;
  prior: RawMoney;
}

interface RawAuditEvent extends Omit<AuditEvent, 'amount'> {
  amount?: RawMoney;
}

interface RawMissingDoc extends Omit<MissingDoc, 'amount'> {
  amount: RawMoney;
}

export interface FinanceCashflowViewPayload {
  kpis: LedgerKpi[];
  forecast: {
    current: Money;
    projected: Money;
    labels: string[];
    inflow: Array<number | null>;
    outflow: Array<number | null>;
    forecast: Array<number | null>;
  };
  pnl: PnlLine[];
  marginBySegment: SegmentMargin[];
  openingBalance: Money;
  movements: CashMovement[];
}

export interface AuditInvestigationsPayload {
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
  auditLog: AuditEvent[];
  sodViolations: SodViolation[];
  missingDocs: MissingDoc[];
}

export async function fetchFinanceCashflowView(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<FinanceCashflowViewPayload> {
  const data = await getJson<{
    kpis: RawLedgerKpi[];
    forecast: {
      current: RawMoney;
      projected: RawMoney;
      labels: string[];
      inflow: number[];
      outflow: number[];
      forecast: number[];
    };
    pnl: RawPnlLine[];
    marginBySegment: SegmentMargin[];
    openingBalance: RawMoney;
    movements: RawCashMovement[];
  }>(`${apiBaseUrl}/api/finance/cashflow-view`, token, signal);
  return {
    kpis: (data.kpis ?? []).map((item) => {
      const base = {
        id: item.id,
        label: item.label,
        delta: item.delta,
        positiveDirection: item.positiveDirection,
      };
      if (item.money) {
        return { ...base, money: reviveMoney(item.money) };
      }
      return { ...base, valueText: item.valueText ?? '' };
    }),
    forecast: {
      current: reviveMoney(data.forecast.current),
      projected: reviveMoney(data.forecast.projected),
      labels: data.forecast.labels ?? [],
      inflow: data.forecast.inflow ?? [],
      outflow: data.forecast.outflow ?? [],
      forecast: data.forecast.forecast ?? [],
    },
    pnl: (data.pnl ?? []).map((item) => ({
      ...item,
      amount: reviveMoney(item.amount),
      prior: reviveMoney(item.prior),
    })),
    marginBySegment: data.marginBySegment ?? [],
    openingBalance: reviveMoney(data.openingBalance),
    movements: (data.movements ?? []).map(reviveCashMovement),
  };
}

export async function downloadCashflowSummary(apiBaseUrl: string, token: string): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/api/finance/cashflow-export`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  return response.blob();
}

export async function reconcileCashMovement(apiBaseUrl: string, token: string, movementID: string): Promise<FinanceCashflowViewPayload> {
  await postJson(`${apiBaseUrl}/api/finance/transactions/${movementID}/reconcile`, token);
  return fetchFinanceCashflowView(apiBaseUrl, token);
}

export async function holdCashMovement(apiBaseUrl: string, token: string, movementID: string, note?: string): Promise<FinanceCashflowViewPayload> {
  await postJson(`${apiBaseUrl}/api/finance/transactions/${movementID}/hold`, token, note ? { note } : undefined);
  return fetchFinanceCashflowView(apiBaseUrl, token);
}

export async function postCashMovement(apiBaseUrl: string, token: string, movementID: string): Promise<FinanceCashflowViewPayload> {
  await postJson(`${apiBaseUrl}/api/finance/transactions/${movementID}/post`, token);
  return fetchFinanceCashflowView(apiBaseUrl, token);
}

export async function flagCashMovement(apiBaseUrl: string, token: string, movementID: string, note?: string): Promise<FinanceCashflowViewPayload> {
  await postJson(`${apiBaseUrl}/api/finance/transactions/${movementID}/flag`, token, note ? { note } : undefined);
  return fetchFinanceCashflowView(apiBaseUrl, token);
}

export async function fetchAuditInvestigations(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<AuditInvestigationsPayload> {
  const data = await getJson<{
    controlHealth: AuditInvestigationsPayload['controlHealth'];
    riskStats: AuditInvestigationsPayload['riskStats'];
    auditLog: RawAuditEvent[];
    sodViolations: SodViolation[];
    missingDocs: RawMissingDoc[];
  }>(`${apiBaseUrl}/api/audit/investigations`, token, signal);
  return {
    controlHealth: data.controlHealth,
    riskStats: data.riskStats,
    auditLog: (data.auditLog ?? []).map((item) => {
      const base = {
        id: item.id,
        at: item.at,
        actor: item.actor,
        role: item.role,
        kind: item.kind,
        action: item.action,
        target: item.target,
        hasEvidence: item.hasEvidence,
      };
      return item.amount ? { ...base, amount: reviveMoney(item.amount) } : base;
    }),
    sodViolations: data.sodViolations ?? [],
    missingDocs: (data.missingDocs ?? []).map((item) => ({
      ...item,
      amount: reviveMoney(item.amount),
    })),
  };
}

export async function exportAuditEvidencePack(apiBaseUrl: string, token: string): Promise<{ status: string; fileName: string }> {
  const response = await fetch(`${apiBaseUrl}/api/audit/investigations/evidence-pack`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as { status: string; fileName: string };
}

export async function createAuditFinding(apiBaseUrl: string, token: string, eventID: string): Promise<AuditInvestigationsPayload> {
  const response = await fetch(`${apiBaseUrl}/api/audit/investigations/findings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId: eventID }),
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as {
    controlHealth: AuditInvestigationsPayload['controlHealth'];
    riskStats: AuditInvestigationsPayload['riskStats'];
    auditLog: RawAuditEvent[];
    sodViolations: SodViolation[];
    missingDocs: RawMissingDoc[];
  };
  return {
    controlHealth: data.controlHealth,
    riskStats: data.riskStats,
    auditLog: (data.auditLog ?? []).map((item) => {
      const base = {
        id: item.id,
        at: item.at,
        actor: item.actor,
        role: item.role,
        kind: item.kind,
        action: item.action,
        target: item.target,
        hasEvidence: item.hasEvidence,
      };
      return item.amount ? { ...base, amount: reviveMoney(item.amount) } : base;
    }),
    sodViolations: data.sodViolations ?? [],
    missingDocs: (data.missingDocs ?? []).map((item) => ({
      ...item,
      amount: reviveMoney(item.amount),
    })),
  };
}

function reviveCashMovement(item: RawCashMovement): CashMovement {
  return {
    ...item,
    amount: reviveMoney(item.amount),
  };
}

function reviveMoney(value: RawMoney): Money {
  return {
    amountMinor: BigInt(value.amountMinor),
    currency: value.currency,
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

async function postJson(url: string, token: string, body?: Record<string, string>): Promise<void> {
  const init: RequestInit = {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
