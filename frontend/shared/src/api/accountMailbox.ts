export interface AccountSettingsPayload {
  displayName: string;
  jobTitle: string;
  phone: string;
  language: 'en' | 'fr' | 'rw';
  theme: 'system' | 'light';
  dateFormat: 'DMY' | 'MDY' | 'ISO';
  notifyApprovals: boolean;
  notifyMentions: boolean;
  notifyDigest: boolean;
  notifyAgent: boolean;
  twoFactor: boolean;
}

export interface MailMessagePayload {
  id: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive';
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  label?: 'collections' | 'claims' | 'approval' | 'audit' | 'general';
  agentDrafted?: boolean;
}

export interface MailboxPayload {
  connected: boolean;
  account: string;
  provider: string;
  messages: MailMessagePayload[];
}

export async function fetchAccountSettings(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<AccountSettingsPayload> {
  return getJson<AccountSettingsPayload>(`${apiBaseUrl}/api/account/settings`, token, signal);
}

export async function saveAccountSettings(apiBaseUrl: string, token: string, payload: AccountSettingsPayload): Promise<AccountSettingsPayload> {
  return sendJson<AccountSettingsPayload>(`${apiBaseUrl}/api/account/settings`, token, payload);
}

export async function signOutOtherSessions(apiBaseUrl: string, token: string): Promise<void> {
  await sendJson(`${apiBaseUrl}/api/account/sign-out-others`, token, {});
}

export async function fetchMailbox(apiBaseUrl: string, token: string, signal?: AbortSignal): Promise<MailboxPayload> {
  return getJson<MailboxPayload>(`${apiBaseUrl}/api/mailbox`, token, signal);
}

export async function connectMailbox(apiBaseUrl: string, token: string, account: string, provider: string): Promise<MailboxPayload> {
  return sendJson<MailboxPayload>(`${apiBaseUrl}/api/mailbox/connect`, token, { account, provider });
}

export async function sendMailboxMessage(apiBaseUrl: string, token: string, payload: { toName: string; toEmail: string; subject: string; body: string; agentDrafted?: boolean }): Promise<MailboxPayload> {
  return sendJson<MailboxPayload>(`${apiBaseUrl}/api/mailbox/send`, token, payload);
}

export async function markMailboxMessageRead(apiBaseUrl: string, token: string, messageId: string): Promise<MailboxPayload> {
  return sendJson<MailboxPayload>(`${apiBaseUrl}/api/mailbox/messages/${messageId}/read`, token, {});
}

export async function toggleMailboxMessageStar(apiBaseUrl: string, token: string, messageId: string): Promise<MailboxPayload> {
  return sendJson<MailboxPayload>(`${apiBaseUrl}/api/mailbox/messages/${messageId}/star`, token, {});
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
