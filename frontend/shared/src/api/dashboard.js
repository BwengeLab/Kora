export async function fetchOwnerDashboard(apiBaseUrl, token, signal) {
    return getJson(`${apiBaseUrl}/api/home/owner-dashboard`, token, signal);
}
export async function fetchAdminDashboard(apiBaseUrl, token, signal) {
    return getJson(`${apiBaseUrl}/api/home/admin-dashboard`, token, signal);
}
async function getJson(url, token, signal) {
    const init = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    };
    if (signal)
        init.signal = signal;
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
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
