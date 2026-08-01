import type { Bill } from '../types/api';
import type { JournalEntry } from '../types/api';
import type { Txn } from '../state/transactionsStore';

interface RawMoney {
  amountMinor: string;
  currency: string;
}

export interface FinanceOperationsSnapshot {
  journals: JournalEntry[];
  bills: Bill[];
  transactions: Txn[];
}

export async function fetchFinanceOperations(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<FinanceOperationsSnapshot> {
  return getJson<FinanceOperationsSnapshot>(`${apiBaseUrl}/api/finance/operations`, token, undefined, signal);
}

export async function createJournalEntry(
  apiBaseUrl: string,
  token: string,
  body: {
    date: string;
    ref: string;
    memo: string;
    source: string;
    entity: string;
    lines: Array<{ account: string; debit: string; credit: string; costCenter?: string }>;
  },
): Promise<FinanceOperationsSnapshot> {
  return getJson<FinanceOperationsSnapshot>(`${apiBaseUrl}/api/finance/journals`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function approveBill(apiBaseUrl: string, token: string, billId: string): Promise<FinanceOperationsSnapshot> {
  return getJson<FinanceOperationsSnapshot>(`${apiBaseUrl}/api/finance/bills/${billId}/approve`, token, { method: 'POST' });
}

export async function payBill(apiBaseUrl: string, token: string, billId: string): Promise<FinanceOperationsSnapshot> {
  return getJson<FinanceOperationsSnapshot>(`${apiBaseUrl}/api/finance/bills/${billId}/pay`, token, { method: 'POST' });
}

export async function classifyTransaction(apiBaseUrl: string, token: string, transactionId: string, category: string): Promise<FinanceOperationsSnapshot> {
  return getJson<FinanceOperationsSnapshot>(`${apiBaseUrl}/api/finance/transactions/${transactionId}/classify`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  });
}

export async function prepareTransaction(apiBaseUrl: string, token: string, transactionId: string): Promise<FinanceOperationsSnapshot> {
  return getJson<FinanceOperationsSnapshot>(`${apiBaseUrl}/api/finance/transactions/${transactionId}/prepare`, token, { method: 'POST' });
}

export async function flagTransaction(apiBaseUrl: string, token: string, transactionId: string, note?: string): Promise<FinanceOperationsSnapshot> {
  return getJson<FinanceOperationsSnapshot>(`${apiBaseUrl}/api/finance/transactions/${transactionId}/flag`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note ? { note } : {}),
  });
}

async function getJson<T>(url: string, token: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  const headers = { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) };
  const requestInit: RequestInit = { ...(init ?? {}), headers };
  if (signal) requestInit.signal = signal;
  const response = await fetch(url, requestInit);
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
