import type { ReportDef } from '../seed/ownerExtra';

export interface ReportContent {
  kpis: { label: string; value: string; tone?: string }[];
  columns: string[];
  rows: string[][];
  narrative: string;
}

export interface ReportDetailPayload {
  report: ReportDef;
  content: ReportContent;
  periods: string[];
  evidence: string;
}

export async function fetchReports(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<ReportDef[]> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/reports`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { items?: ReportDef[] };
  return data.items ?? [];
}

export async function fetchReportDetail(
  apiBaseUrl: string,
  token: string,
  reportID: string,
  signal?: AbortSignal,
): Promise<ReportDetailPayload> {
  const init: RequestInit = {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  };
  if (signal) init.signal = signal;
  const response = await fetch(`${apiBaseUrl}/api/reports/${reportID}`, init);
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as ReportDetailPayload;
}

export async function generateReport(apiBaseUrl: string, token: string, reportID: string): Promise<ReportDef> {
  const response = await fetch(`${apiBaseUrl}/api/reports/${reportID}/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as ReportDef;
}

export async function exportReport(apiBaseUrl: string, token: string, reportID: string, period: string): Promise<{ status: string; fileName: string; period: string }> {
  const response = await fetch(`${apiBaseUrl}/api/reports/${reportID}/export`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ period }),
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as { status: string; fileName: string; period: string };
}

export async function scheduleReport(apiBaseUrl: string, token: string, reportID: string, schedule: string): Promise<ReportDef> {
  const response = await fetch(`${apiBaseUrl}/api/reports/${reportID}/schedule`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule }),
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as ReportDef;
}

export async function buildBoardPack(apiBaseUrl: string, token: string): Promise<{ status: string; fileName: string }> {
  const response = await fetch(`${apiBaseUrl}/api/reports-board-pack`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as { status: string; fileName: string };
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
