import { useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { seedReconciliations, type ReconciliationTier } from '../../seed/reconciliation';
import { ExceptionListCard } from './ExceptionListCard';
import { MatchWorkspaceCard } from './MatchWorkspaceCard';
import { SummaryChipsBar } from './SummaryChipsBar';

// The Reconciliation Cockpit — the operator's main workspace.
// Layout: page header → summary chips → 2-col workspace (list ← → detail).
// The list and detail card both `h-full` so the workspace fills the viewport
// and the two scroll independently.
export function ReconciliationCockpit() {
  const [selectedId, setSelectedId] = useState<string>(seedReconciliations[0]?.id ?? '');
  const [tierFilter, setTierFilter] = useState<ReconciliationTier | 'all'>('all');

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Reconciliation Cockpit"
        subtitle={
          <>
            Prepare matches with full evidence. AI suggests · you prepare · Finance Lead approves.
          </>
        }
        right={<DateRangePill label="May 12 – May 18, 2025" />}
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 px-8">
        <SummaryChipsBar />

        {/* Two-column workspace */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 pb-6 @5xl:grid-cols-[360px_1fr]">
          <ExceptionListCard
            selectedId={selectedId}
            onSelect={setSelectedId}
            tierFilter={tierFilter}
            onTierFilter={setTierFilter}
          />
          <MatchWorkspaceCard selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>
    </div>
  );
}
