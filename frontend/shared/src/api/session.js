const SESSION_TOKEN_KEY = 'kora.session.token';
export async function demoLoginSession(apiBaseUrl, roleId, signal) {
    const init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId }),
    };
    if (signal)
        init.signal = signal;
    return jsonRequest(`${apiBaseUrl}/api/session/demo-login`, init);
}
export async function fetchCurrentSession(apiBaseUrl, token, signal) {
    const init = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    };
    if (signal)
        init.signal = signal;
    return jsonRequest(`${apiBaseUrl}/api/session/me`, init);
}
export function sessionTokenKey() {
    return SESSION_TOKEN_KEY;
}
async function jsonRequest(url, init) {
    const response = await fetch(url, init);
    if (!response.ok) {
        const payload = await safePayload(response);
        throw new Error(payload || `${response.status} ${response.statusText}`);
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
