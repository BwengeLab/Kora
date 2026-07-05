export async function fetchAccountSettings(apiBaseUrl, token, signal) {
    return getJson(`${apiBaseUrl}/api/account/settings`, token, signal);
}
export async function saveAccountSettings(apiBaseUrl, token, payload) {
    return sendJson(`${apiBaseUrl}/api/account/settings`, token, payload);
}
export async function signOutOtherSessions(apiBaseUrl, token) {
    await sendJson(`${apiBaseUrl}/api/account/sign-out-others`, token, {});
}
export async function fetchMailbox(apiBaseUrl, token, signal) {
    return getJson(`${apiBaseUrl}/api/mailbox`, token, signal);
}
export async function connectMailbox(apiBaseUrl, token, account, provider) {
    return sendJson(`${apiBaseUrl}/api/mailbox/connect`, token, { account, provider });
}
export async function sendMailboxMessage(apiBaseUrl, token, payload) {
    return sendJson(`${apiBaseUrl}/api/mailbox/send`, token, payload);
}
export async function markMailboxMessageRead(apiBaseUrl, token, messageId) {
    return sendJson(`${apiBaseUrl}/api/mailbox/messages/${messageId}/read`, token, {});
}
export async function toggleMailboxMessageStar(apiBaseUrl, token, messageId) {
    return sendJson(`${apiBaseUrl}/api/mailbox/messages/${messageId}/star`, token, {});
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
