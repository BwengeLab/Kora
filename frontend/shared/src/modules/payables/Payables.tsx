import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Banknote, Check, FileText, Link2, Search, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { accountByCode } from '../../seed/chartOfAccounts';
import { entityName, seedCostCenters } from '../../seed/entities';
import { matchStatus, type Bill, type BillStatus, type MatchStatus } from '../../seed/payables';
import { resolveChainFrom, useApprovalPolicyStore } from '../../state/approvalPolicyStore';
import { useEntityStore } from '../../state/entityStore';
import { openDoc } from '../../state/docViewerStore';
import { usePayablesStore } from '../../state/payablesStore';
import { toast } from '../../state/toastStore';

const M = (n: number): Money => ({ amountMinor: BigInt(Math.round(n * 100)), currency: 'USD' });
const TODAY = new Date('2025-05-18');
const STATUS_TONE: Record<BillStatus, string> = { draft: 'bg-warning-soft text-warning', approved: 'bg-info-soft text-info', paid: 'bg-success-soft text-success' };
const MATCH_TONE: Record<MatchStatus, string> = { matched: 'bg-success-soft text-success', 'price-variance': 'bg-danger-soft text-danger', 'no-po': 'bg-ink/10 text-ink-muted' };
const MATCH_LABEL: Record<MatchStatus, string> = { matched: '3-way matched', 'price-variance': 'Price variance', 'no-po': 'No PO' };
const isOverdue = (b: Bill) => b.status !== 'paid' && new Date(b.dueDate) < TODAY;

// Accounts Payable — the Procure-to-Pay desk. Enter/approve vendor bills with
// 3-way matching; approval and payment post real journals to the GL so the books
// move with the workflow. `canApprove` = Finance Lead; operators prepare only.
export function Payables({ canApprove = false }: { canApprove?: boolean }) {
  const scope = useEntityStore((s) => s.scope);
  const bills = usePayablesStore((s) => s.bills);
  const approve = usePayablesStore((s) => s.approve);
  const pay = usePayablesStore((s) => s.pay);
  const rules = useApprovalPolicyStore((s) => s.rules);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<BillStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bills
      .filter((b) => scope === 'all' || b.entity === scope)
      .filter((b) => (status === 'all' ? true : b.status === status))
      .filter((b) => (q === '' ? true : [b.vendor, b.ref].some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [bills, scope, query, status]);

  const scoped = bills.filter((b) => scope === 'all' || b.entity === scope);
  const toApprove = scoped.filter((b) => b.status === 'draft').length;
  const toPay = scoped.filter((b) => b.status === 'approved').length;
  const overdue = scoped.filter(isOverdue).length;
  const outstanding = M(scoped.filter((b) => b.status !== 'paid').reduce((a, b) => a + b.amount, 0));
  const selected = bills.find((b) => b.id === selectedId) ?? null;

  const doApprove = (b: Bill) => { approve(b.id, 'Finance Lead'); toast({ tone: 'success', title: 'Bill approved & posted', body: `${b.vendor} — liability posted to the GL (CR Accounts Payable).` }); };
  const doPay = (b: Bill) => { pay(b.id); toast({ tone: 'success', title: 'Payment posted', body: `${b.vendor} paid — DR Accounts Payable, CR cash. Books updated.` }); setSelectedId(null); };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Accounts Payable"
        subtitle={canApprove ? 'Approve and pay vendor bills — every action posts to the ledger. 3-way matched against PO and goods receipt.' : 'Vendor bills and their 3-way match status. You prepare; the Finance Lead approves and pays.'}
        right={<DateRangePill label="May 2025" />}
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="To approve" value={String(toApprove)} tone="text-warning" active={status === 'draft'} onClick={() => setStatus(status === 'draft' ? 'all' : 'draft')} />
          <Stat label="Approved · to pay" value={String(toPay)} tone="text-info" active={status === 'approved'} onClick={() => setStatus(status === 'approved' ? 'all' : 'approved')} />
          <Stat label="Overdue" value={String(overdue)} tone="text-danger" />
          <Stat label="Outstanding payable" money={outstanding} tone="text-ink" />
        </div>

        <GlassSurface tone="strong" className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-white/55 p-4">
            <div className="flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
              <Search className="size-4 text-ink-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search vendor or invoice ref…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_130px_120px_110px_90px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
            <span>Vendor / bill</span><span>Match</span><span className="text-right">Amount</span><span className="text-right">Due</span><span className="text-right">Status</span>
          </div>
          <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {list.map((b) => {
              const ms = matchStatus(b);
              return (
                <li key={b.id}>
                  <button type="button" onClick={() => setSelectedId(b.id)} className="grid w-full grid-cols-[1fr_130px_120px_110px_90px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
                    <div className="flex min-w-0 items-center gap-3"><PartyAvatar name={b.vendor} size="md" /><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{b.vendor}</p><p className="truncate font-mono text-[11px] text-ink-muted">{b.ref}</p></div></div>
                    <span><span className={cn('rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase', MATCH_TONE[ms])}>{MATCH_LABEL[ms]}</span></span>
                    <MoneyCell amount={M(b.amount)} size="sm" className="text-right font-bold !text-[13px]" />
                    <span className={cn('text-right text-[11.5px] tabular', isOverdue(b) ? 'font-bold text-danger' : 'text-ink-soft')}>{new Date(b.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span className="flex justify-end"><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STATUS_TONE[b.status])}>{b.status}</span></span>
                  </button>
                </li>
              );
            })}
            {list.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No bills match.</li> : null}
          </ul>
          <footer className="flex items-center justify-between border-t border-white/55 bg-white/45 px-4 py-2.5 text-[11.5px] font-semibold text-ink-muted">
            <span>{list.length} bills · {entityName(scope)}{scope === 'all' ? ' (consolidated)' : ''}</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Approvals post to the General Ledger</span>
          </footer>
        </GlassSurface>
      </div>

      <BillDrawer bill={selected} canApprove={canApprove} rules={rules} onClose={() => setSelectedId(null)} onApprove={doApprove} onPay={doPay} />
    </div>
  );
}

function BillDrawer({ bill: b, canApprove, rules, onClose, onApprove, onPay }: { bill: Bill | null; canApprove: boolean; rules: ReturnType<typeof useApprovalPolicyStore.getState>['rules']; onClose: () => void; onApprove: (b: Bill) => void; onPay: (b: Bill) => void }) {
  if (!b) return <Dialog.Root open={false} onOpenChange={() => onClose()}><span /></Dialog.Root>;
  const ms = matchStatus(b);
  const chain = resolveChainFrom(rules, b.amount);
  const acct = accountByCode(b.account);
  const cc = seedCostCenters.find((c) => c.id === b.costCenter);
  return (
    <Dialog.Root open={b !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(480px,95vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
            <div className="flex items-center gap-3"><PartyAvatar name={b.vendor} size="lg" /><div><Dialog.Title className="font-display text-[15px] font-bold text-ink">{b.vendor}</Dialog.Title><p className="font-mono text-[11.5px] text-ink-muted">{b.ref}</p></div></div>
            <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
          </header>
          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
            <div className="flex items-center justify-between">
              <div><span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Amount</span><MoneyCell amount={M(b.amount)} size="xl" className="!text-3xl font-bold text-ink" /></div>
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', STATUS_TONE[b.status])}>{b.status}</span>
            </div>

            {/* 3-way match */}
            <div className="rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
              <div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">3-way match</p><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', MATCH_TONE[ms])}>{MATCH_LABEL[ms]}</span></div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <MatchCell label="PO" value={b.poAmount} />
                <MatchCell label="Receipt" value={b.receiptAmount} />
                <MatchCell label="Invoice" value={b.amount} />
              </div>
              {ms === 'price-variance' ? <p className="mt-2 text-[11.5px] font-semibold text-danger">Invoice exceeds the PO — investigate before approving.</p> : null}
            </div>

            {/* GL coding */}
            <div className="grid grid-cols-2 gap-3">
              <Meta label="Debit account" value={`${b.account} · ${acct?.name ?? ''}`} />
              <Meta label="Cost center" value={cc?.name ?? '—'} />
            </div>

            {/* Approval chain from the DOA matrix */}
            <div className="rounded-2xl bg-brand-soft/40 p-3.5 ring-1 ring-brand/15">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-ink">Approval required</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {chain.approvers.map((a, i) => (
                  <span key={a} className="inline-flex items-center gap-1.5"><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', i === 0 ? 'bg-white text-brand-ink' : 'bg-lavender-soft text-lavender')}>{a}</span>{i < chain.approvers.length - 1 ? <ArrowRight className="size-3.5 text-brand-ink" /> : null}</span>
                ))}
                <span className="text-[11px] font-semibold text-ink-muted">{chain.requiresDual ? '· dual approval' : '· single approval'}</span>
              </div>
            </div>

            <button type="button" onClick={() => openDoc({ name: b.evidenceName, kind: 'invoice', sizeText: '—', context: b.ref })} className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"><FileText className="size-4" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-ink">{b.evidenceName}</p><p className="text-[11px] text-ink-muted">Supporting document</p></div>
              <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70">View</span>
            </button>
          </div>

          {canApprove ? (
            <footer className="flex items-center gap-2 border-t border-white/55 p-4">
              {b.status === 'draft' ? (
                <button type="button" onClick={() => onApprove(b)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><Check className="size-4" /> Approve &amp; post to GL</button>
              ) : b.status === 'approved' ? (
                <button type="button" onClick={() => onPay(b)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-success to-[#0e7a5b] text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><Banknote className="size-4" /> Pay &amp; post to GL</button>
              ) : (
                <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success-soft text-[13px] font-bold text-success"><Check className="size-4" /> Paid &amp; posted</span>
              )}
            </footer>
          ) : (
            <footer className="border-t border-white/55 p-4"><span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/60 text-[12.5px] font-bold text-ink-muted"><Link2 className="size-4" /> {b.status === 'draft' ? 'Prepared — awaiting Finance Lead approval' : b.status === 'approved' ? 'Approved — awaiting payment' : 'Paid'}</span></footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MatchCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-white/70 p-2 ring-1 ring-white/60">
      <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
      {value === null ? <p className="text-[12px] font-semibold text-ink-muted">—</p> : <MoneyCell amount={M(value)} size="sm" className="!text-[12.5px] font-bold" />}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{label}</dt><dd className="text-[12.5px] font-semibold text-ink">{value}</dd></div>;
}

function Stat({ label, value, money, tone, active, onClick }: { label: string; value?: string; money?: Money; tone: string; active?: boolean; onClick?: () => void }) {
  return (
    <GlassSurface tone="strong" className={cn('p-3.5', active && 'ring-2 ring-brand/40')}>
      <button type="button" onClick={onClick} disabled={!onClick} className={cn('flex w-full flex-col gap-0.5 text-left', onClick && 'cursor-pointer')}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
        {money ? <MoneyCell amount={money} size="lg" className={cn('!text-2xl font-bold', tone)} /> : <span className={cn('font-display text-2xl font-bold tabular', tone)}>{value}</span>}
        {onClick ? <span className="text-[10.5px] font-semibold text-brand">{active ? 'Filtered · clear' : 'Filter'}</span> : null}
      </button>
    </GlassSurface>
  );
}
