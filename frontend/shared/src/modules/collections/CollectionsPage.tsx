import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Clock, HandCoins, Mail, Search, Send, Sparkles, TriangleAlert, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { collectionsAction, exportCollectionsSummary, fetchOverdueItems } from '../../api/collections';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { seedOverdue, type Overdue, type RiskLevel } from '../../seed/ownerExtra';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';

const RISK_TONE: Record<RiskLevel, string> = { low: 'bg-success-soft text-success', medium: 'bg-warning-soft text-warning', high: 'bg-danger-soft text-danger' };

type Bucket = 'all' | '0-30' | '31-60' | '61-90' | '90+';
const bucketOf = (days: number): Exclude<Bucket, 'all'> => (days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+');
const draftReminder = (item: Overdue) =>
  `Dear ${item.contact},\n\nA friendly reminder that invoice ${item.invoice} for ${money(item.amount)} is now ${item.daysOverdue} days overdue. We value our partnership and would appreciate settlement at your earliest convenience.\n\nIf payment is already in progress, please disregard this note.\n\nKind regards,\nFinance, Acme Insurance`;
const money = (amount: Money) => `$${(Number(amount.amountMinor) / 100).toLocaleString()}`;

export function CollectionsPage() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['collections-overdue', token],
    queryFn: ({ signal }) => fetchOverdueItems(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const overdue = data ?? seedOverdue;
  const [bucket, setBucket] = useState<Bucket>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Overdue | null>(null);
  const actionMutation = useMutation({
    mutationFn: ({ itemID, action }: { itemID: string; action: 'remind' | 'promise' | 'escalate' }) => collectionsAction(apiBaseUrl, token, itemID, action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['collections-overdue', token] }),
  });
  const exportMutation = useMutation({
    mutationFn: () => exportCollectionsSummary(apiBaseUrl, token),
    onSuccess: (result) => toast({ tone: 'success', title: 'Exporting', body: `${result.fileName} is ready from backend data.` }),
    onError: (error: Error) => toast({ tone: 'danger', title: 'Export failed', body: error.message }),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return overdue
      .filter((item) => (bucket === 'all' ? true : bucketOf(item.daysOverdue) === bucket))
      .filter((item) => (q === '' ? true : [item.customer, item.invoice, item.contact].some((value) => value.toLowerCase().includes(q))))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [bucket, overdue, query]);

  const totalOverdue: Money = { amountMinor: overdue.reduce((sum, item) => sum + item.amount.amountMinor, 0n), currency: 'USD' };
  const buckets = useMemo(() => {
    const map: Record<Exclude<Bucket, 'all'>, { count: number; sum: bigint }> = { '0-30': { count: 0, sum: 0n }, '31-60': { count: 0, sum: 0n }, '61-90': { count: 0, sum: 0n }, '90+': { count: 0, sum: 0n } };
    for (const item of overdue) {
      const bucketKey = bucketOf(item.daysOverdue);
      map[bucketKey].count++;
      map[bucketKey].sum += item.amount.amountMinor;
    }
    return map;
  }, [overdue]);
  const promised = overdue.filter((item) => item.actionStatus === 'promised').length;

  const sendReminder = async (item: Overdue) => {
    try {
      await actionMutation.mutateAsync({ itemID: item.id, action: 'remind' });
      toast({ tone: 'success', title: 'Reminder sent', body: `Tone-matched reminder sent to ${item.contact} at ${item.email}.` });
    } catch (error) {
      toast({ tone: 'danger', title: 'Reminder failed', body: error instanceof Error ? error.message : 'Could not send reminder.' });
    }
  };
  const logPromise = async (item: Overdue) => {
    try {
      await actionMutation.mutateAsync({ itemID: item.id, action: 'promise' });
      setSelected(null);
      toast({ tone: 'info', title: 'Promise-to-pay logged', body: `${item.customer} committed to settle ${item.invoice}.` });
    } catch (error) {
      toast({ tone: 'danger', title: 'Promise failed', body: error instanceof Error ? error.message : 'Could not log promise-to-pay.' });
    }
  };
  const escalate = async (item: Overdue) => {
    try {
      await actionMutation.mutateAsync({ itemID: item.id, action: 'escalate' });
      setSelected(null);
      toast({ tone: 'danger', title: 'Escalated', body: `${item.invoice} escalated - final notice + account hold proposed.` });
    } catch (error) {
      toast({ tone: 'danger', title: 'Escalation failed', body: error instanceof Error ? error.message : 'Could not escalate invoice.' });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Collections" subtitle="Turn ageing invoices into cash. Filter by age, open an invoice, and act - send a reminder, log a promise, or escalate." right={<div className="flex items-center gap-2.5"><button type="button" onClick={() => exportMutation.mutate()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink"><HandCoins className="size-4" /> Receivables summary</button><DateRangePill label="May 2025" /></div>} />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <GlassSurface tone="strong" className="p-3.5"><span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Total overdue</span><MoneyCell amount={totalOverdue} size="lg" className="!text-2xl font-bold text-danger" /></GlassSurface>
          <Stat label="Overdue invoices" value={String(overdue.length)} icon={<HandCoins className="size-4" />} tone="text-warning" />
          <Stat label="Avg days overdue" value="41d" icon={<Clock className="size-4" />} tone="text-info" />
          <Stat label="Promises to pay" value={String(4 + promised)} icon={<TriangleAlert className="size-4" />} tone="text-success" />
        </div>

        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-5">
          <BucketChip label="All ages" active={bucket === 'all'} onClick={() => setBucket('all')} count={overdue.length} sum={totalOverdue} />
          {(['0-30', '31-60', '61-90', '90+'] as const).map((bucketKey) => (
            <BucketChip key={bucketKey} label={`${bucketKey} days`} active={bucket === bucketKey} onClick={() => setBucket(bucket === bucketKey ? 'all' : bucketKey)} count={buckets[bucketKey].count} sum={{ amountMinor: buckets[bucketKey].sum, currency: 'USD' }} danger={bucketKey === '90+'} />
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]">
          <GlassSurface tone="strong" className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-white/55 p-4">
              <div className="flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
                <Search className="size-4 text-ink-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search customer, invoice, contact..." className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>
            </div>
            <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {filtered.map((item) => {
                const itemStatus = item.actionStatus ?? 'open';
                return (
                  <li key={item.id}>
                    <button type="button" onClick={() => setSelected(item)} className="flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
                      <PartyAvatar name={item.customer} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><p className="truncate text-[13px] font-semibold text-ink">{item.customer}</p><span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', RISK_TONE[item.risk])}>{item.risk}</span></div>
                        <p className="truncate text-[11px] text-ink-muted">{item.invoice} · {item.daysOverdue} days overdue · {item.reminderCount} reminders</p>
                      </div>
                      {itemStatus !== 'open' ? <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', itemStatus === 'promised' ? 'bg-success-soft text-success' : itemStatus === 'escalated' ? 'bg-danger-soft text-danger' : 'bg-info-soft text-info')}>{itemStatus === 'promised' ? 'Promised' : itemStatus === 'escalated' ? 'Escalated' : 'Reminded'}</span> : null}
                      <MoneyCell amount={item.amount} size="sm" className="shrink-0 font-bold !text-[13px] text-danger" />
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No invoices in this bucket.</li> : null}
            </ul>
          </GlassSurface>

          <div className="flex flex-col gap-4">
            <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-4">
              <h4 className="text-[12px] font-bold text-ink">Aging distribution</h4>
              {(['0-30', '31-60', '61-90', '90+'] as const).map((bucketKey) => {
                const pct = overdue.length === 0 ? 0 : (buckets[bucketKey].count / overdue.length) * 100;
                return (
                  <div key={bucketKey}>
                    <div className="flex justify-between text-[11.5px]"><span className="font-medium text-ink-soft">{bucketKey} days</span><span className="font-bold text-ink tabular">{buckets[bucketKey].count}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8"><div className={cn('h-full rounded-full', bucketKey === '90+' ? 'bg-danger' : bucketKey === '61-90' ? 'bg-warning' : 'bg-brand')} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </GlassSurface>
            <DsoTool />
            <GlassSurface tone="strong" className="flex flex-col gap-2 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15">
              <header className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-ai" /><h4 className="text-[12px] font-bold text-ink">Collections agent</h4></header>
              <button type="button" onClick={() => setBucket('90+')} className="rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white"><span className="font-bold text-danger">2 invoices 90+ days</span> at high risk - escalate to final notice. <span className="font-semibold text-brand">View {'->'}</span></button>
            </GlassSurface>
          </div>
        </div>
      </div>

      <CollectionDrawer item={selected} status={selected?.actionStatus ?? 'open'} onClose={() => setSelected(null)} onSend={sendReminder} onPromise={logPromise} onEscalate={escalate} />
    </div>
  );
}

function CollectionDrawer({ item, status, onClose, onSend, onPromise, onEscalate }: { item: Overdue | null; status: string; onClose: () => void; onSend: (item: Overdue) => void | Promise<void>; onPromise: (item: Overdue) => void | Promise<void>; onEscalate: (item: Overdue) => void | Promise<void> }) {
  return (
    <Dialog.Root open={item !== null} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(480px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          {item ? (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
                <div className="flex items-center gap-3">
                  <PartyAvatar name={item.customer} size="lg" />
                  <div><Dialog.Title className="font-display text-[15px] font-bold text-ink">{item.customer}</Dialog.Title><p className="text-[11.5px] text-ink-muted">{item.invoice} · {item.daysOverdue} days overdue</p></div>
                </div>
                <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
              </header>
              <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
                <div className="flex items-center justify-between">
                  <div><span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Amount due</span><MoneyCell amount={item.amount} size="xl" className="!text-3xl font-bold text-danger" /></div>
                  <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', RISK_TONE[item.risk])}>{item.risk} risk</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60"><span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Contact</span><p className="text-[13px] font-semibold text-ink">{item.contact}</p><p className="inline-flex items-center gap-1 text-[11px] text-ink-soft"><Mail className="size-3" />{item.email}</p></div>
                  <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60"><span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Last contact</span><p className="text-[13px] font-semibold text-ink">{new Date(item.lastContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p><p className="text-[11px] text-ink-soft">{item.reminderCount} reminders sent</p></div>
                </div>
                <div>
                  <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted"><Sparkles className="size-3.5 text-ai" /> Agent-drafted reminder</p>
                  <textarea defaultValue={draftReminder(item)} className="h-44 w-full resize-none rounded-2xl bg-white/70 p-3.5 text-[12.5px] leading-relaxed text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </div>
              </div>
              <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                <button type="button" onClick={() => onEscalate(item)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-danger ring-1 ring-white/70 hover:bg-white"><ArrowUpRight className="size-4" /> Escalate</button>
                <button type="button" onClick={() => onPromise(item)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink ring-1 ring-white/70 hover:bg-white">Promise-to-pay</button>
                <button type="button" onClick={() => onSend(item)} className={cn('inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold shadow-glass-soft', status === 'reminded' ? 'bg-success-soft text-success' : 'bg-gradient-to-br from-brand to-brand-ink text-white hover:brightness-110')}>{status === 'reminded' ? 'Reminder sent' : <><Send className="size-4" /> Send reminder</>}</button>
              </footer>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BucketChip({ label, active, onClick, count, sum, danger }: { label: string; active: boolean; onClick: () => void; count: number; sum: Money; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex flex-col items-start gap-0.5 rounded-2xl border p-3 text-left transition-colors', active ? 'border-brand/40 bg-white shadow-glass-soft ring-2 ring-brand/30' : 'border-glass-border-strong bg-glass-strong hover:bg-white/70', danger && !active && 'bg-danger-soft/40')}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <span className={cn('font-display text-xl font-bold tabular', danger ? 'text-danger' : 'text-ink')}>{count}</span>
      <MoneyCell amount={sum} size="sm" className="!text-[11px] font-semibold text-ink-muted" />
    </button>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return (
    <GlassSurface tone="strong" className="flex items-center gap-3 p-3.5">
      <span className={cn('grid size-10 place-items-center rounded-xl bg-white/70 ring-1 ring-white/60', tone)}>{icon}</span>
      <div><span className={cn('block font-display text-2xl font-bold tabular leading-none', tone)}>{value}</span><span className="text-[11px] font-semibold text-ink-muted">{label}</span></div>
    </GlassSurface>
  );
}

function DsoTool() {
  const [ar, setAr] = useState('');
  const [sales, setSales] = useState('');
  const [days, setDays] = useState('30');
  const dso = parseFloat(sales || '0') > 0 ? (parseFloat(ar || '0') / parseFloat(sales || '1')) * parseFloat(days || '0') : 0;
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2 p-4">
      <header className="flex items-center gap-1.5"><Clock className="size-3.5 text-brand" /><h4 className="text-[12px] font-bold text-ink">DSO calculator</h4></header>
      <input value={ar} onChange={(e) => setAr(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Receivables" className={dsoIn} />
      <input value={sales} onChange={(e) => setSales(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Credit sales" className={dsoIn} />
      <input value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Period (days)" className={dsoIn} />
      <div className="rounded-xl bg-brand-soft/50 p-2.5 text-center ring-1 ring-brand/15"><span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Days sales outstanding</span><p className="font-display text-xl font-bold text-brand-ink tabular">{dso.toFixed(1)} days</p></div>
    </GlassSurface>
  );
}

const dsoIn = 'h-9 rounded-lg bg-white/70 px-3 text-[12.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
