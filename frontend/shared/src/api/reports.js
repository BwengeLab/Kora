export async function fetchReports(apiBaseUrl, token, signal) {
    const init = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    };
    if (signal)
        init.signal = signal;
    const response = await fetch(`${apiBaseUrl}/api/reports`, init);
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return data.items ?? [];
}
export async function fetchReportDetail(apiBaseUrl, token, reportID, signal) {
    const init = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    };
    if (signal)
        init.signal = signal;
    const response = await fetch(`${apiBaseUrl}/api/reports/${reportID}`, init);
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    return (await response.json());
}
export async function generateReport(apiBaseUrl, token, reportID) {
    const response = await fetch(`${apiBaseUrl}/api/reports/${reportID}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    return (await response.json());
}
export async function exportReport(apiBaseUrl, token, reportID, period) {
    const response = await fetch(`${apiBaseUrl}/api/reports/${reportID}/export`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
    });
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    return (await response.json());
}
export async function scheduleReport(apiBaseUrl, token, reportID, schedule) {
    const response = await fetch(`${apiBaseUrl}/api/reports/${reportID}/schedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule }),
    });
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    return (await response.json());
}
export async function buildBoardPack(apiBaseUrl, token) {
    const response = await fetch(`${apiBaseUrl}/api/reports-board-pack`, {
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
