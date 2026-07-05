export async function fetchFinanceLeadDashboard(apiBaseUrl, token, signal) {
    const data = await getJson(`${apiBaseUrl}/api/home/finance-lead-dashboard`, token, signal);
    return {
        cashForecast: {
            current: reviveMoney(data.cashForecast.current),
            projected: reviveMoney(data.cashForecast.projected),
            labels: data.cashForecast.labels ?? [],
            actual: data.cashForecast.actual ?? [],
            forecast: data.cashForecast.forecast ?? [],
        },
        closeTasks: data.closeTasks ?? [],
        insights: data.insights ?? [],
    };
}
export async function fetchContractsOverview(apiBaseUrl, token, signal) {
    const data = await getJson(`${apiBaseUrl}/api/contracts/overview`, token, signal);
    return { items: (data.items ?? []).map(reviveContract) };
}
export async function renewContract(apiBaseUrl, token, contractID) {
    const data = await postJson(`${apiBaseUrl}/api/contracts/${contractID}/renew`, token);
    return { items: (data.items ?? []).map(reviveContract) };
}
export async function flagContractRenewal(apiBaseUrl, token, contractID) {
    const data = await postJson(`${apiBaseUrl}/api/contracts/${contractID}/flag-renewal`, token);
    return { items: (data.items ?? []).map(reviveContract) };
}
export async function fetchOwnerRiskDashboard(apiBaseUrl, token, signal) {
    return getJson(`${apiBaseUrl}/api/owner/risk-dashboard`, token, signal);
}
export async function assignRisk(apiBaseUrl, token, riskID) {
    return postJson(`${apiBaseUrl}/api/owner/risks/${riskID}/assign`, token);
}
export async function mitigateRisk(apiBaseUrl, token, riskID) {
    return postJson(`${apiBaseUrl}/api/owner/risks/${riskID}/mitigate`, token);
}
export async function acceptRisk(apiBaseUrl, token, riskID) {
    return postJson(`${apiBaseUrl}/api/owner/risks/${riskID}/accept`, token);
}
export async function fetchControlsClose(apiBaseUrl, token, signal) {
    return getJson(`${apiBaseUrl}/api/controls-close/overview`, token, signal);
}
export async function toggleCloseTask(apiBaseUrl, token, taskID) {
    return postJson(`${apiBaseUrl}/api/controls-close/tasks/${taskID}/toggle`, token);
}
export async function requestEvidenceGap(apiBaseUrl, token, gapID) {
    return postJson(`${apiBaseUrl}/api/controls-close/evidence-gaps/${gapID}/request`, token);
}
export async function lockClosePeriod(apiBaseUrl, token) {
    return postJson(`${apiBaseUrl}/api/controls-close/lock`, token);
}
function reviveMoney(value) {
    return {
        amountMinor: BigInt(value.amountMinor),
        currency: value.currency,
    };
}
function reviveContract(item) {
    return {
        ...item,
        value: reviveMoney(item.value),
    };
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
async function postJson(url, token) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
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
