import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { useSession } from '../../auth/hooks';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';
import { ApprovalDetail } from './ApprovalDetail';
import { ApprovalQueue, type TabId } from './ApprovalQueue';
import { ApprovalStatsBand } from './ApprovalStatsBand';
import { VARIANTS, type ActionVariant } from './variant';

// The approval control point. `variant` scopes it per role (lead = full queue,
// owner = top-tier). Wired to the shared workflow store: items prepared in the
// Reconciliation Cockpit appear here, and Approve/Reject mutate live state.
export function ActionCenter({ variant = 'finance_lead' }: { variant?: ActionVariant }) {
  const cfg = VARIANTS[variant];
  const allApprovals = useWorkflowStore((s) => s.approvals);
  const approveAction = useWorkflowStore((s) => s.approve);
  const rejectAction = useWorkflowStore((s) => s.rejectApproval);
  const session = useSession();
  const actor = { name: session?.user.displayName ?? 'Approver', role: session?.roles[0]?.name ?? 'Finance Lead' };

  const items = useMemo(() => allApprovals.filter(cfg.includes), [allApprovals, cfg]);

  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? '');
  const [tab, setTab] = useState<TabId>('awaiting');

  const handleApprove = (id: string) => {
    const item = allApprovals.find((a) => a.id === id);
    const name = item?.title ?? 'Item';
    const result = approveAction(id, actor);
    switch (result) {
      case 'approved':
        toast({ tone: 'success', title: 'Approved & posted', body: `${name} executed and written to the audit log.` });
        break;
      case 'partial':
        toast({ tone: 'info', title: 'Approved (1 of 2)', body: `${name} now needs a second, different approver.` });
        break;
      case 'sod':
        toast({ tone: 'danger', title: "Can't approve your own item", body: 'Segregation of duties — another approver must sign off.' });
        break;
      case 'duplicate':
        toast({ tone: 'warning', title: 'You already approved this', body: 'A second, different approver is required.' });
        break;
      case 'needs-first':
        toast({ tone: 'warning', title: 'You approve last', body: 'This dual-approval item still needs its first approval (Finance Lead).' });
        break;
      default:
        break;
    }
  };

  const handleReject = (id: string) => {
    const item = allApprovals.find((a) => a.id === id);
    rejectAction(id, actor);
    toast({ tone: 'danger', title: 'Rejected', body: `${item?.title ?? 'Item'} sent back with your reason.` });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} right={<DateRangePill label="May 12 – May 18, 2025" />} />
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 px-8">
        <ApprovalStatsBand variant={variant} items={items} />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 pb-6 @5xl:grid-cols-[400px_1fr]">
          <ApprovalQueue items={items} variant={variant} selectedId={selectedId} onSelect={setSelectedId} tab={tab} onTab={setTab} />
          <ApprovalDetail
            items={items}
            variant={variant}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  );
}
