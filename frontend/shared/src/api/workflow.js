export async function fetchWorkflowSnapshot(apiBaseUrl, token, signal) {
    const init = {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    };
    if (signal)
        init.signal = signal;
    const response = await fetch(`${apiBaseUrl}/api/workflow/snapshot`, init);
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return {
        approvals: (data.approvals ?? []).map((item) => reviveBigInts(item)),
        reconciliations: (data.reconciliations ?? []).map((item) => reviveBigInts(item)),
        auditLog: (data.auditLog ?? []).map((item) => reviveBigInts(item)),
        dismissedReconIds: data.dismissedReconIds ?? [],
    };
}
export async function workflowApprovalAction(apiBaseUrl, token, approvalID, action) {
    const response = await fetch(`${apiBaseUrl}/api/workflow/approvals/${approvalID}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return {
        result: data.result,
        snapshot: {
            approvals: (data.snapshot.approvals ?? []).map((item) => reviveBigInts(item)),
            reconciliations: (data.snapshot.reconciliations ?? []).map((item) => reviveBigInts(item)),
            auditLog: (data.snapshot.auditLog ?? []).map((item) => reviveBigInts(item)),
            dismissedReconIds: data.snapshot.dismissedReconIds ?? [],
        },
    };
}
export async function workflowReconciliationAction(apiBaseUrl, token, reconciliationID, action) {
    const response = await fetch(`${apiBaseUrl}/api/workflow/reconciliations/${reconciliationID}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return {
        result: data.result,
        snapshot: {
            approvals: (data.snapshot.approvals ?? []).map((item) => reviveBigInts(item)),
            reconciliations: (data.snapshot.reconciliations ?? []).map((item) => reviveBigInts(item)),
            auditLog: (data.snapshot.auditLog ?? []).map((item) => reviveBigInts(item)),
            dismissedReconIds: data.snapshot.dismissedReconIds ?? [],
        },
    };
}
function reviveBigInts(value) {
    if (Array.isArray(value)) {
        return value.map(reviveBigInts);
    }
    if (value && typeof value === 'object') {
        if (looksLikeMoney(value)) {
            return {
                amountMinor: BigInt(value.amountMinor),
                currency: value.currency,
            };
        }
        const out = {};
        for (const [key, nested] of Object.entries(value)) {
            out[key] = reviveBigInts(nested);
        }
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
