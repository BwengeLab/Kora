import type { AgentCard } from '../types/api';

export interface AgentActivityEvent {
  id: string;
  agentId: string;
  agentName: string;
  at: string;
  action: string;
  detail: string;
  tone: 'info' | 'success' | 'warning' | 'danger' | 'ai';
  link?: { label: string; to: string };
}

export interface AgentsOverviewPayload {
  stats: {
    agentsActive: number;
    processedToday: number;
    suggestionsAwaiting: number;
    avgAccuracyPct: number;
  };
  agents: AgentCard[];
  activity: AgentActivityEvent[];
  runningId?: string;
}

export async function fetchAgentsOverview(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<AgentsOverviewPayload> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/agents/overview`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as AgentsOverviewPayload;
}

export async function runAgent(apiBaseUrl: string, token: string, agentID: string): Promise<AgentsOverviewPayload> {
  const response = await fetch(`${apiBaseUrl}/api/agents/run/${agentID}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as AgentsOverviewPayload;
}

export async function runAllAgents(apiBaseUrl: string, token: string): Promise<AgentsOverviewPayload> {
  const response = await fetch(`${apiBaseUrl}/api/agents/run-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as AgentsOverviewPayload;
}

export async function submitAgentFeedback(
  apiBaseUrl: string,
  token: string,
  agentID: string,
  rating: 'helpful' | 'not_helpful',
): Promise<AgentsOverviewPayload> {
  const response = await fetch(`${apiBaseUrl}/api/agents/${agentID}/feedback`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as AgentsOverviewPayload;
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
