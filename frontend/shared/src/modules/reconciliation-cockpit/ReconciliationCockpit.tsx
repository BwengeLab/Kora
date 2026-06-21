import { Keyboard, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { useSession } from '../../auth/hooks';
import { type ReconciliationTier } from '../../seed/reconciliation';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';
import { ExceptionQueue, type TabId } from './ExceptionQueue';
import { MatchDetail } from './MatchDetail';
import { ReconStatsBand } from './ReconStatsBand';

// The Reconciliation Cockpit (v2) — a guided decision workspace, now wired to
// the shared workflow store: "Prepare match" creates an approval that flows to
// the Finance Lead's Action Center.
export function ReconciliationCockpit() {
  const recons = useWorkflowStore((s) => s.reconciliations);
  const prepareMatch = useWorkflowStore((s) => s.prepareMatch);
  const rejectReconciliation = useWorkflowStore((s) => s.rejectReconciliation);
  const session = useSession();
  const actor = { name: session?.user.displayName ?? 'Operator', role: session?.roles[0]?.name ?? 'Finance Operator' };

  const [selectedId, setSelectedId] = useState<string>(recons[0]?.id ?? '');
  const [tierFilter, setTierFilter] = useState<ReconciliationTier | 'all'>('all');
  const [tab, setTab] = useState<TabId>('to_review');
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });

  const handlePrepare = (id: string) => {
    const recon = recons.find((r) => r.id === id);
    prepareMatch(id, actor);
    toast({
      tone: 'success',
      title: 'Match prepared',
      body: `${recon?.transaction.counterparty ?? 'Match'} sent to Finance Lead for approval.`,
    });
  };

  const handleReject = (id: string) => {
    rejectReconciliation(id);
    toast({ tone: 'warning', title: 'Match rejected', body: 'Returned to the review queue.' });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Reconciliation Cockpit"
        subtitle={<>Match money to reality. Kora prepares · you review &amp; prepare · Finance Lead approves.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass transition-colors hover:bg-white hover:text-ink">
              <Keyboard className="size-4" /> Shortcuts
            </button>
            <button type="button" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass transition-colors hover:bg-white hover:text-ink">
              <RefreshCw className="size-4" /> Re-run agent
            </button>
            <DateRangePill label="May 12 – May 18, 2025" />
          </div>
        }
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 px-8">
        <ReconStatsBand activeTier={tierFilter} onTier={setTierFilter} />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 pb-6 @5xl:grid-cols-[400px_1fr]">
          <ExceptionQueue
            recons={recons}
            selectedId={selectedId}
            onSelect={setSelectedId}
            tierFilter={tierFilter}
            tab={tab}
            onTab={setTab}
            selectMode={selectMode}
            onToggleSelectMode={() => {
              setSelectMode((v) => !v);
              setChecked(new Set());
            }}
            checked={checked}
            onToggleCheck={toggleCheck}
            onClearChecks={() => setChecked(new Set())}
          />
          <MatchDetail
            recons={recons}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPrepare={handlePrepare}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  );
}
