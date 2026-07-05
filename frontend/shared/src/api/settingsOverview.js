export async function fetchSettingsOverview(apiBaseUrl, token, signal) {
    return getJson(`${apiBaseUrl}/api/settings/overview`, token, signal);
}
export async function saveOrgProfile(apiBaseUrl, token, payload) {
    return sendJson(`${apiBaseUrl}/api/settings/org-profile`, token, payload);
}
export async function savePolicyControls(apiBaseUrl, token, payload) {
    return sendJson(`${apiBaseUrl}/api/settings/policy-controls`, token, payload);
}
export async function saveDataControls(apiBaseUrl, token, payload) {
    return sendJson(`${apiBaseUrl}/api/settings/data-controls`, token, payload);
}
export async function requestDataExport(apiBaseUrl, token) {
    await sendJson(`${apiBaseUrl}/api/settings/data-export`, token, {});
}
export async function openBillingPortal(apiBaseUrl, token) {
    await sendJson(`${apiBaseUrl}/api/settings/billing-portal`, token, {});
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
