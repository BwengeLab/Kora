export async function fetchFinanceCashflowView(apiBaseUrl, token, signal) {
    const data = await getJson(`${apiBaseUrl}/api/finance/cashflow-view`, token, signal);
    return {
        kpis: (data.kpis ?? []).map((item) => {
            const base = {
                id: item.id,
                label: item.label,
                delta: item.delta,
                positiveDirection: item.positiveDirection,
            };
            if (item.money) {
                return { ...base, money: reviveMoney(item.money) };
            }
            return { ...base, valueText: item.valueText ?? '' };
        }),
        forecast: {
            current: reviveMoney(data.forecast.current),
            projected: reviveMoney(data.forecast.projected),
            labels: data.forecast.labels ?? [],
            inflow: data.forecast.inflow ?? [],
            outflow: data.forecast.outflow ?? [],
            forecast: data.forecast.forecast ?? [],
        },
        pnl: (data.pnl ?? []).map((item) => ({
            ...item,
            amount: reviveMoney(item.amount),
            prior: reviveMoney(item.prior),
        })),
        marginBySegment: data.marginBySegment ?? [],
        openingBalance: reviveMoney(data.openingBalance),
        movements: (data.movements ?? []).map(reviveCashMovement),
    };
}
export async function reconcileCashMovement(apiBaseUrl, token, movementID) {
    await postJson(`${apiBaseUrl}/api/finance/transactions/${movementID}/reconcile`, token);
    return fetchFinanceCashflowView(apiBaseUrl, token);
}
export async function holdCashMovement(apiBaseUrl, token, movementID, note) {
    await postJson(`${apiBaseUrl}/api/finance/transactions/${movementID}/hold`, token, note ? { note } : undefined);
    return fetchFinanceCashflowView(apiBaseUrl, token);
}
export async function postCashMovement(apiBaseUrl, token, movementID) {
    await postJson(`${apiBaseUrl}/api/finance/transactions/${movementID}/post`, token);
    return fetchFinanceCashflowView(apiBaseUrl, token);
}
export async function flagCashMovement(apiBaseUrl, token, movementID, note) {
    await postJson(`${apiBaseUrl}/api/finance/transactions/${movementID}/flag`, token, note ? { note } : undefined);
    return fetchFinanceCashflowView(apiBaseUrl, token);
}
export async function fetchAuditInvestigations(apiBaseUrl, token, signal) {
    const data = await getJson(`${apiBaseUrl}/api/audit/investigations`, token, signal);
    return {
        controlHealth: data.controlHealth,
        riskStats: data.riskStats,
        auditLog: (data.auditLog ?? []).map((item) => {
            const base = {
                id: item.id,
                at: item.at,
                actor: item.actor,
                role: item.role,
                kind: item.kind,
                action: item.action,
                target: item.target,
                hasEvidence: item.hasEvidence,
            };
            return item.amount ? { ...base, amount: reviveMoney(item.amount) } : base;
        }),
        sodViolations: data.sodViolations ?? [],
        missingDocs: (data.missingDocs ?? []).map((item) => ({
            ...item,
            amount: reviveMoney(item.amount),
        })),
    };
}
function reviveCashMovement(item) {
    return {
        ...item,
        amount: reviveMoney(item.amount),
    };
}
function reviveMoney(value) {
    return {
        amountMinor: BigInt(value.amountMinor),
        currency: value.currency,
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
async function postJson(url, token, body) {
    const init = {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    };
    if (body) {
        init.headers = { ...init.headers, 'Content-Type': 'application/json' };
        init.body = JSON.stringify(body);
    }
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error((await safePayload(response)) || `${response.status} ${response.statusText}`);
    }
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
