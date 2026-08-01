import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchClaimsWorkspace } from '../../api/claims';
import { useFeatureStore } from '../../state/featureStore';
import { toast } from '../../state/toastStore';
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
  const hydrateClaims = useClaimsStore((s) => s.hydrate);
  const liveClaims = useClaimsStore((s) => s.claims);
  const { data } = useQuery({
    queryKey: ['claims-workspace', token],
    queryFn: ({ signal }) => fetchClaimsWorkspace(apiBaseUrl, token, signal),
    enabled: Boolean(token) && enabled,
  });
  const claims = data?.claims ?? [];
  const stats = data?.stats ?? []Stats;
  const [selectedId, setSelectedId] = useState<string>(claims[0]?.id ?? '');
  const [stageFilter, setStageFilter] = useState<ClaimStage | 'all'>('all');

  useEffect(() => {
    if (enabled) hydrateClaims(claims);
  }, [claims, enabled, hydrateClaims]);

  useEffect(() => {
    if (!liveClaims.some((claim) => claim.id === selectedId)) {
      setSelectedId(liveClaims[0]?.id ?? '');
    }
  }, [liveClaims, selectedId]);

  if (!enabled) return <ClaimsLocked />;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Claims"
        subtitle={<>FNOL to settlement — the Claims agent assists, you decide, every payout is approval-gated and audited.</>}
        right={<DateRangePill label="May 2025" />}
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 px-8">
        <ClaimsPipelineBand activeStage={stageFilter} onStage={setStageFilter} stats={stats} />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 pb-6 @5xl:grid-cols-[380px_1fr]">
          <ClaimsQueue selectedId={selectedId} onSelect={setSelectedId} stageFilter={stageFilter} />
          <ClaimDetail claimId={selectedId} />
        </div>
      </div>
    </div>
  );
}
