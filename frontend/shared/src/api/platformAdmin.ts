export interface PlatformConsolePayload {
  tenantMetrics: {
    activeTenants: string;
    totalSeats: string;
    mrr: string;
    atRisk: string;
  };
  tenants: Array<{
    id: string;
    name: string;
    plan: string;
    users: number;
    mrr: string;
    health: 'success' | 'warning' | 'danger';
    since: string;
  }>;
  planMetrics: {
    mrr: string;
    arr: string;
    netRevenueRetention: string;
    churn: string;
  };
  plans: Array<{
    id: string;
    name: string;
    price: string;
    tenants: number;
    features: string;
  }>;
  featureFlags: Array<{
    id: string;
    name: string;
    desc: string;
    on: boolean;
  }>;
  healthMetrics: {
    overallUptime: string;
    openIncidents: string;
    avgLatency: string;
    errorRate: string;
  };
  services: Array<{
    id: string;
    name: string;
    status: 'success' | 'warning' | 'danger';
    uptime: string;
    latency: string;
  }>;
  activeIncident: {
    title: string;
    detail: string;
    subtext: string;
    badge: string;
  };
  usageMetrics: {
    apiCalls: string;
    aiTokens: string;
    infraCost: string;
    grossMargin: string;
  };
  costByService: Array<{
    name: string;
    value: number;
  }>;
  usageTenants: Array<{
    tenant: string;
    share: string;
  }>;
  platformUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    last: string;
  }>;
  supportGrants: Array<{
    id: string;
    tenant: string;
    status: string;
    detail: string;
    tone: 'success' | 'warning' | 'danger';
  }>;
  auditEvents: Array<{
    id: string;
    actor: string;
    action: string;
    target: string;
    at: string;
    icon: 'check' | 'activity' | 'plus' | 'ban' | 'arrow-up-right';
    tone: 'success' | 'info' | 'brand' | 'danger' | 'warning';
  }>;
}

export async function fetchPlatformConsole(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<PlatformConsolePayload> {
  return getJson<PlatformConsolePayload>(`${apiBaseUrl}/api/platform/console`, token, signal);
}

export async function createPlatformTenant(apiBaseUrl: string, token: string, name: string): Promise<PlatformConsolePayload> {
  return sendJson<PlatformConsolePayload>(`${apiBaseUrl}/api/platform/tenants`, token, { name });
}

export async function togglePlatformFlag(apiBaseUrl: string, token: string, flagId: string): Promise<PlatformConsolePayload> {
  return sendJson<PlatformConsolePayload>(`${apiBaseUrl}/api/platform/flags/${flagId}`, token, {});
}

export async function createPlatformUser(apiBaseUrl: string, token: string, name: string): Promise<PlatformConsolePayload> {
  return sendJson<PlatformConsolePayload>(`${apiBaseUrl}/api/platform/users`, token, { name });
}

export async function createSupportRequest(apiBaseUrl: string, token: string, tenant: string): Promise<PlatformConsolePayload> {
  return sendJson<PlatformConsolePayload>(`${apiBaseUrl}/api/platform/support-requests`, token, { tenant });
}

async function getJson<T>(url: string, token: string, signal?: AbortSignal): Promise<T> {
  const init: RequestInit = { method: 'GET', headers: { Authorization: `Bearer ${token}` } };
  if (signal) init.signal = signal;
  const response = await fetch(url, init);
  if (!response.ok) throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

async function sendJson<T>(url: string, token: string, body: unknown): Promise<T> {
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
