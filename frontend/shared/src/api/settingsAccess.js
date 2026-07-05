export async function fetchSettingsUsers(apiBaseUrl, token, signal) {
    const data = await getJson(`${apiBaseUrl}/api/settings/users`, token, signal);
    return data.items ?? [];
}
export async function createSettingsUser(apiBaseUrl, token, user) {
    const data = await sendJson(`${apiBaseUrl}/api/settings/users`, 'POST', token, user);
    return data.items ?? [];
}
export async function updateSettingsUser(apiBaseUrl, token, user) {
    const data = await sendJson(`${apiBaseUrl}/api/settings/users/${user.id}`, 'POST', token, user);
    return data.items ?? [];
}
export async function deleteSettingsUser(apiBaseUrl, token, userID) {
    const data = await sendJson(`${apiBaseUrl}/api/settings/users/${userID}`, 'DELETE', token);
    return data.items ?? [];
}
export async function fetchApprovalRules(apiBaseUrl, token, signal) {
    const data = await getJson(`${apiBaseUrl}/api/settings/approval-rules`, token, signal);
    return data.items ?? [];
}
export async function createApprovalRule(apiBaseUrl, token, rule) {
    const data = await sendJson(`${apiBaseUrl}/api/settings/approval-rules`, 'POST', token, rule);
    return data.items ?? [];
}
export async function updateApprovalRule(apiBaseUrl, token, rule) {
    const data = await sendJson(`${apiBaseUrl}/api/settings/approval-rules/${rule.id}`, 'POST', token, rule);
    return data.items ?? [];
}
export async function deleteApprovalRule(apiBaseUrl, token, ruleID) {
    const data = await sendJson(`${apiBaseUrl}/api/settings/approval-rules/${ruleID}`, 'DELETE', token);
    return data.items ?? [];
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
async function sendJson(url, method, token, body) {
    const init = {
        method,
        headers: { Authorization: `Bearer ${token}` },
    };
    if (body !== undefined) {
        init.headers = { ...init.headers, 'Content-Type': 'application/json' };
        init.body = JSON.stringify(body);
    }
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
