export async function fetchFinanceOperations(apiBaseUrl, token, signal) {
    return getJson(`${apiBaseUrl}/api/finance/operations`, token, undefined, signal);
}
export async function createJournalEntry(apiBaseUrl, token, body) {
    return getJson(`${apiBaseUrl}/api/finance/journals`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}
export async function approveBill(apiBaseUrl, token, billId) {
    return getJson(`${apiBaseUrl}/api/finance/bills/${billId}/approve`, token, { method: 'POST' });
}
export async function payBill(apiBaseUrl, token, billId) {
    return getJson(`${apiBaseUrl}/api/finance/bills/${billId}/pay`, token, { method: 'POST' });
}
export async function classifyTransaction(apiBaseUrl, token, transactionId, category) {
    return getJson(`${apiBaseUrl}/api/finance/transactions/${transactionId}/classify`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
    });
}
export async function prepareTransaction(apiBaseUrl, token, transactionId) {
    return getJson(`${apiBaseUrl}/api/finance/transactions/${transactionId}/prepare`, token, { method: 'POST' });
}
export async function flagTransaction(apiBaseUrl, token, transactionId, note) {
    return getJson(`${apiBaseUrl}/api/finance/transactions/${transactionId}/flag`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note ? { note } : {}),
    });
}
async function getJson(url, token, init, signal) {
    const headers = { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) };
    const requestInit = { ...(init ?? {}), headers };
    if (signal)
        requestInit.signal = signal;
    const response = await fetch(url, requestInit);
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    return reviveBigInts((await response.json()));
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
