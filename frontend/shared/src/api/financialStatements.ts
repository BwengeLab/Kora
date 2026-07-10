export async function downloadFinancialStatementPack(apiBaseUrl: string, token: string): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/api/financial-statements/export`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
  }
  return response.blob();
}

async function safePayload(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? '';
  } catch {
    return '';
  }
}
