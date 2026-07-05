export interface SettingsOverviewPayload {
  orgProfile: {
    legalName: string;
    tradingName: string;
    taxId: string;
    registrationNo: string;
    country: string;
    baseCurrency: string;
    fiscalYearStart: string;
    timezone: string;
    vatRate: string;
  };
  policyControls: {
    segregationOfDuties: boolean;
    requireEvidenceToPost: boolean;
    lockPeriodsAfterClose: boolean;
    flagRoundNumberTransfers: boolean;
  };
  billing: {
    plan: string;
    priceMonthly: string;
    renews: string;
    seatsUsed: number;
    seatsIncluded: number;
    tenants: number;
    apiCalls: string;
  };
  invoices: Array<{
    number: string;
    date: string;
    amount: string;
    status: string;
  }>;
  retention: {
    transactionRecords: string;
    documentsEvidence: string;
    auditLog: string;
    dataResidency: string;
  };
  dataControls: {
    encryptAtRest: boolean;
    exportEntireDataset: boolean;
    rightToErasureWorkflow: boolean;
  };
}

export async function fetchSettingsOverview(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<SettingsOverviewPayload> {
  return getJson<SettingsOverviewPayload>(`${apiBaseUrl}/api/settings/overview`, token, signal);
}

export async function saveOrgProfile(apiBaseUrl: string, token: string, payload: SettingsOverviewPayload['orgProfile']): Promise<SettingsOverviewPayload> {
  return sendJson<SettingsOverviewPayload>(`${apiBaseUrl}/api/settings/org-profile`, token, payload);
}

export async function savePolicyControls(apiBaseUrl: string, token: string, payload: SettingsOverviewPayload['policyControls']): Promise<SettingsOverviewPayload> {
  return sendJson<SettingsOverviewPayload>(`${apiBaseUrl}/api/settings/policy-controls`, token, payload);
}

export async function saveDataControls(apiBaseUrl: string, token: string, payload: SettingsOverviewPayload['dataControls']): Promise<SettingsOverviewPayload> {
  return sendJson<SettingsOverviewPayload>(`${apiBaseUrl}/api/settings/data-controls`, token, payload);
}

export async function requestDataExport(apiBaseUrl: string, token: string): Promise<void> {
  await sendJson(`${apiBaseUrl}/api/settings/data-export`, token, {});
}

export async function openBillingPortal(apiBaseUrl: string, token: string): Promise<void> {
  await sendJson(`${apiBaseUrl}/api/settings/billing-portal`, token, {});
}

async function getJson<T>(url: string, token: string, signal?: AbortSignal): Promise<T> {
  const init: RequestInit = { method: 'GET', headers: { Authorization: `Bearer ${token}` } };
  if (signal) init.signal = signal;
  const response = await fetch(url, init);
  if (!response.ok) throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

async function sendJson<T = unknown>(url: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
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
