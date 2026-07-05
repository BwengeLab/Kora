import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchClaimsWorkspace } from '../../api/claims';
import { seedClaims, seedClaimsStats } from '../../seed/claims';
import { useFeatureStore } from '../../state/featureStore';
import { useSessionStore } from '../../state/sessionStore';
import { useClaimsStore } from '../../state/claimsStore';
import { ClaimDetail } from './ClaimDetail';
import { ClaimsLocked } from './ClaimsLocked';
import { ClaimsPipelineBand } from './ClaimsPipelineBand';
import { ClaimsQueue } from './ClaimsQueue';
// Insurance Claims workspace — the unlockable vertical feature. FNOL → Triage →
// Adjusting → Approval → Settlement → Closed, with the Claims AI agent assisting
// and settlement approval-gated. Locked until the Org Admin enables the pack.
export function ClaimsWorkspace() {
    const enabled = useFeatureStore((s) => s.isEnabled('insurance-claims'));
    const apiBaseUrl = getApiBaseUrl();
    const token = useSessionStore((s) => s.session?.token ?? '');
    const loadClaims = useClaimsStore((s) => s.loadClaims);
    const liveClaims = useClaimsStore((s) => s.claims);
    const { data } = useQuery({
        queryKey: ['claims-workspace', token],
        queryFn: ({ signal }) => fetchClaimsWorkspace(apiBaseUrl, token, signal),
        enabled: Boolean(token) && enabled,
    });
    const claims = data?.claims ?? seedClaims;
    const stats = data?.stats ?? seedClaimsStats;
    const [selectedId, setSelectedId] = useState(claims[0]?.id ?? '');
    const [stageFilter, setStageFilter] = useState('all');
    useEffect(() => {
        if (enabled)
            loadClaims(claims);
    }, [claims, enabled, loadClaims]);
    useEffect(() => {
        if (!liveClaims.some((claim) => claim.id === selectedId)) {
            setSelectedId(liveClaims[0]?.id ?? '');
        }
    }, [liveClaims, selectedId]);
    if (!enabled)
        return _jsx(ClaimsLocked, {});
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Claims", subtitle: _jsx(_Fragment, { children: "FNOL to settlement \u2014 the Claims agent assists, you decide, every payout is approval-gated and audited." }), right: _jsx(DateRangePill, { label: "May 2025" }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-5 px-8", children: [_jsx(ClaimsPipelineBand, { activeStage: stageFilter, onStage: setStageFilter, stats: stats }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-5 pb-6 @5xl:grid-cols-[380px_1fr]", children: [_jsx(ClaimsQueue, { selectedId: selectedId, onSelect: setSelectedId, stageFilter: stageFilter }), _jsx(ClaimDetail, { claimId: selectedId })] })] })] }));
}
