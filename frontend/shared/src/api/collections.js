export async function fetchOverdueItems(apiBaseUrl, token, signal) {
    const init = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    };
    if (signal)
        init.signal = signal;
    const response = await fetch(`${apiBaseUrl}/api/collections/overdue`, init);
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return (data.items ?? []).map((item) => reviveBigInts(item));
}
export async function collectionsAction(apiBaseUrl, token, itemID, action) {
    const response = await fetch(`${apiBaseUrl}/api/collections/overdue/${itemID}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return (data.items ?? []).map((item) => reviveBigInts(item));
}
export async function exportCollectionsSummary(apiBaseUrl, token) {
    const response = await fetch(`${apiBaseUrl}/api/collections/export-summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    return (await response.json());
}
function reviveBigInts(value) {
    if (Array.isArray(value))
        return value.map(reviveBigInts);
    if (value && typeof value === 'object') {
        if (looksLikeMoney(value)) {
            return { amountMinor: BigInt(value.amountMinor), currency: value.currency };
        }
        const out = {};
        for (const [key, nested] of Object.entries(value))
            out[key] = reviveBigInts(nested);
        return out;
    }
    return value;
}
function looksLikeMoney(value) {
    return Boolean(value &&
        typeof value === 'object' &&
        'amountMinor' in value &&
        'currency' in value &&
        typeof value.amountMinor === 'string' &&
        typeof value.currency === 'string');
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
