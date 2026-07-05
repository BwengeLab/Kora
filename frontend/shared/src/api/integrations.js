export async function fetchIntegrationStatuses(apiBaseUrl, token, signal) {
    const init = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    };
    if (signal)
        init.signal = signal;
    const response = await fetch(`${apiBaseUrl}/api/integrations/status`, init);
    if (!response.ok) {
        throw new Error(await safePayload(response) || `${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return data.items ?? [];
}
async function safePayload(response) {
    try {
        const data = (await response.json());
        return data.error ?? '';
    }
    catch {
        return '';
    }
}
