import { useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { seedClaims, type ClaimStage } from '../../seed/claims';
import { useFeatureStore } from '../../state/featureStore';
import { ClaimDetail } from './ClaimDetail';
import { ClaimsLocked } from './ClaimsLocked';
import { ClaimsPipelineBand } from './ClaimsPipelineBand';
import { ClaimsQueue } from './ClaimsQueue';

// Insurance Claims workspace — the unlockable vertical feature. FNOL → Triage →
// Adjusting → Approval → Settlement → Closed, with the Claims AI agent assisting
// and settlement approval-gated. Locked until the Org Admin enables the pack.
export function ClaimsWorkspace() {
  const enabled = useFeatureStore((s) => s.isEnabled('insurance-claims'));
  const [selectedId, setSelectedId] = useState<string>(seedClaims[0]?.id ?? '');
  const [stageFilter, setStageFilter] = useState<ClaimStage | 'all'>('all');

  if (!enabled) return <ClaimsLocked />;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Claims"
        subtitle={<>FNOL to settlement — the Claims agent assists, you decide, every payout is approval-gated and audited.</>}
        right={<DateRangePill label="May 2025" />}
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 px-8">
        <ClaimsPipelineBand activeStage={stageFilter} onStage={setStageFilter} />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 pb-6 @5xl:grid-cols-[380px_1fr]">
          <ClaimsQueue selectedId={selectedId} onSelect={setSelectedId} stageFilter={stageFilter} />
          <ClaimDetail claimId={selectedId} />
        </div>
      </div>
    </div>
  );
}
