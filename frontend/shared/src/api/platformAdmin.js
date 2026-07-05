export async function fetchPlatformConsole(apiBaseUrl, token, signal) {
    return getJson(`${apiBaseUrl}/api/platform/console`, token, signal);
}
export async function createPlatformTenant(apiBaseUrl, token, name) {
    return sendJson(`${apiBaseUrl}/api/platform/tenants`, token, { name });
}
export async function togglePlatformFlag(apiBaseUrl, token, flagId) {
    return sendJson(`${apiBaseUrl}/api/platform/flags/${flagId}`, token, {});
}
export async function createPlatformUser(apiBaseUrl, token, name) {
    return sendJson(`${apiBaseUrl}/api/platform/users`, token, { name });
}
export async function createSupportRequest(apiBaseUrl, token, tenant) {
    return sendJson(`${apiBaseUrl}/api/platform/support-requests`, token, { tenant });
}
async function getJson(url, token, signal) {
    const init = { method: 'GET', headers: { Authorization: `Bearer ${token}` } };
    if (signal)
        init.signal = signal;
    const response = await fetch(url, init);
    if (!response.ok)
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    return (await response.json());
}
async function sendJson(url, token, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok)
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    return (await response.json());
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
