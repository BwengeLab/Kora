export async function fetchIntakeDocs(apiBaseUrl, token, signal) {
    const init = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    };
    if (signal)
        init.signal = signal;
    const response = await fetch(`${apiBaseUrl}/api/intake/docs`, init);
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return data.items ?? [];
}
export async function uploadIntakeDoc(apiBaseUrl, token, name) {
    return mutateDoc(`${apiBaseUrl}/api/intake/upload`, token, { name });
}
export async function matchIntakeDoc(apiBaseUrl, token, docID) {
    return mutateDoc(`${apiBaseUrl}/api/intake/docs/${docID}/match`, token);
}
export async function postIntakeDoc(apiBaseUrl, token, docID) {
    return mutateDoc(`${apiBaseUrl}/api/intake/docs/${docID}/post`, token);
}
async function mutateDoc(url, token, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
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
