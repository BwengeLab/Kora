import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, HandCoins, Mail, MessageSquare, Phone, ShieldCheck, TrendingDown, UserPlus, X } from 'lucide-react';
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
const bucketOf = (days: number) => (days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+');

export function CollectionsOverview() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['collections-overdue', token],
    queryFn: ({ signal }) => fetchOverdueItems(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const overdue = data ?? seedOverdue;
  const [selected, setSelected] = useState<Overdue | null>(null);
  const actionMutation = useMutation({
    mutationFn: ({ itemID, action }: { itemID: string; action: 'hand-to-finance' | 'flag-owner-call' | 'request-update' }) => collectionsAction(apiBaseUrl, token, itemID, action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['collections-overdue', token] }),
  });
  const exportMutation = useMutation({
    mutationFn: () => exportCollectionsSummary(apiBaseUrl, token),
    onSuccess: (result) => toast({ tone: 'success', title: 'Exporting', body: `${result.fileName} is being prepared.` }),
    onError: (error: Error) => toast({ tone: 'danger', title: 'Export failed', body: error.message }),
  });

  const totalOverdue: Money = { amountMinor: overdue.reduce((sum, item) => sum + item.amount.amountMinor, 0n), currency: 'USD' };
  const buckets = useMemo(() => {
    const map: Record<string, { count: number; sum: bigint }> = { '0-30': { count: 0, sum: 0n }, '31-60': { count: 0, sum: 0n }, '61-90': { count: 0, sum: 0n }, '90+': { count: 0, sum: 0n } };
    for (const item of overdue) { const bucketKey = bucketOf(item.daysOverdue); map[bucketKey]!.count++; map[bucketKey]!.sum += item.amount.amountMinor; }
    return map;
  }, [overdue]);
  const worst = useMemo(() => [...overdue].sort((a, b) => b.daysOverdue - a.daysOverdue), [overdue]);
  const atRisk90: Money = { amountMinor: overdue.filter((item) => item.daysOverdue > 90).reduce((sum, item) => sum + item.amount.amountMinor, 0n), currency: 'USD' };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Collections"
        subtitle={<>How much you&apos;re owed and whether it threatens cash. Finance runs the day-to-day chasing - you watch the health and step in on key accounts.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => exportMutation.mutate()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink">
              <HandCoins className="size-4" /> Receivables summary
            </button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 px-8 pb-8">
        <section className="grid grid-cols-2 gap-4 @5xl:grid-cols-4">
          <GlassSurface tone="strong" className="p-5"><span className="text-[12px] font-semibold text-ink-muted">Total owed</span><MoneyCell amount={totalOverdue} size="lg" className="!text-3xl font-bold text-danger" /><span className="text-[11.5px] text-ink-muted">Cash tied up in receivables</span></GlassSurface>
          <BigStat label="Days sales outstanding" value="41d" sub="down 4d vs last month" tone="text-ink" trendOk />
          <BigStat label="90+ days at risk" money={atRisk90} sub="Hand to finance for final notice" tone="text-danger" />
          <BigStat label="Collected this month" value="$128,400" sub="recovered via the team" tone="text-success" trendOk />
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-12">
          <GlassSurface tone="strong" className="flex min-h-0 flex-col p-6 @5xl:col-span-8">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink">Accounts to watch</h3>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted"><ShieldCheck className="size-3.5" /> Finance chases - you oversee and escalate</span>
            </header>
            <ul className="scrollbar-thin -mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-2">
              {worst.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setSelected(item)} className="flex w-full items-center gap-3 border-b border-white/40 py-3 text-left transition-colors hover:bg-white/55">
                    <PartyAvatar name={item.customer} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="truncate text-[13px] font-bold text-ink">{item.customer}</p><span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', RISK_TONE[item.risk])}>{item.risk}</span></div>
                      <p className="truncate text-[11px] text-ink-muted">{item.invoice} · {item.daysOverdue} days overdue · {item.reminderCount} reminders by finance</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', item.daysOverdue > 90 ? 'bg-danger-soft text-danger' : item.daysOverdue > 60 ? 'bg-warning-soft text-warning' : 'bg-info-soft text-info')}>{bucketOf(item.daysOverdue)}d</span>
                    <MoneyCell amount={item.amount} size="sm" className="shrink-0 font-bold !text-[13px] text-danger" />
                  </button>
                </li>
              ))}
            </ul>
          </GlassSurface>

          <div className="flex flex-col gap-5 @5xl:col-span-4">
            <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-5">
              <h4 className="text-[12.5px] font-bold text-ink">Aging distribution</h4>
              {(['0-30', '31-60', '61-90', '90+'] as const).map((bucketKey) => {
                const pct = overdue.length === 0 ? 0 : (buckets[bucketKey]!.count / overdue.length) * 100;
                return (
                  <div key={bucketKey}>
                    <div className="flex items-center justify-between text-[11.5px]"><span className="font-medium text-ink-soft">{bucketKey} days</span><MoneyCell amount={{ amountMinor: buckets[bucketKey]!.sum, currency: 'USD' }} size="sm" className="!text-[11.5px] font-bold text-ink" /></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/8"><div className={cn('h-full rounded-full', bucketKey === '90+' ? 'bg-danger' : bucketKey === '61-90' ? 'bg-warning' : 'bg-brand')} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </GlassSurface>
            <GlassSurface tone="strong" className="flex flex-col gap-2.5 bg-gradient-to-br from-warning-soft/50 to-white/40 p-5 ring-1 ring-warning/15">
              <header className="flex items-center gap-1.5"><TrendingDown className="size-3.5 text-warning" /><h4 className="text-[12.5px] font-bold text-ink">What needs you</h4></header>
              <p className="text-[12px] text-ink">Two accounts are <span className="font-bold text-danger">90+ days</span> overdue and high-risk. Hand them to finance for final notice, or call the relationship yourself.</p>
              <button type="button" onClick={() => setSelected(worst[0] ?? null)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/70 text-[12px] font-bold text-ink ring-1 ring-white/70 hover:bg-white">Review worst account</button>
            </GlassSurface>
          </div>
        </div>
      </div>

      <OversightDrawer
        item={selected}
        onClose={() => setSelected(null)}
        onHand={async (item) => {
          try {
            await actionMutation.mutateAsync({ itemID: item.id, action: 'hand-to-finance' });
            toast({ tone: 'info', title: 'Handed to finance', body: `${item.customer} (${item.invoice}) escalated to the finance team to action.` });
            setSelected(null);
          } catch (error) {
            toast({ tone: 'danger', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not hand item to finance.' });
          }
        }}
        onFlag={async (item) => {
          try {
            await actionMutation.mutateAsync({ itemID: item.id, action: 'flag-owner-call' });
            toast({ tone: 'warning', title: 'Flagged for your call', body: `${item.customer} marked for a personal call from you.` });
          } catch (error) {
            toast({ tone: 'danger', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not flag owner call.' });
          }
        }}
        onMessage={async (item) => {
          try {
            await actionMutation.mutateAsync({ itemID: item.id, action: 'request-update' });
            toast({ tone: 'info', title: 'Message to finance', body: `Asked finance for an update on ${item.customer}.` });
          } catch (error) {
            toast({ tone: 'danger', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not request update.' });
          }
        }}
      />
    </div>
  );
}

function OversightDrawer({ item, onClose, onHand, onFlag, onMessage }: { item: Overdue | null; onClose: () => void; onHand: (item: Overdue) => void; onFlag: (item: Overdue) => void; onMessage: (item: Overdue) => void }) {
  return (
    <Dialog.Root open={item !== null} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
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
                  <div><span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Amount owed</span><MoneyCell amount={item.amount} size="xl" className="!text-3xl font-bold text-danger" /></div>
                  <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', RISK_TONE[item.risk])}>{item.risk} risk</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60"><span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Contact</span><p className="text-[13px] font-semibold text-ink">{item.contact}</p><p className="inline-flex items-center gap-1 text-[11px] text-ink-soft"><Mail className="size-3" />{item.email}</p></div>
                  <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60"><span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Finance activity</span><p className="text-[13px] font-semibold text-ink">{item.reminderCount} reminders</p><p className="inline-flex items-center gap-1 text-[11px] text-ink-soft"><Clock className="size-3" />last {new Date(item.lastContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
                </div>
                <p className="rounded-2xl bg-white/45 p-3 text-[11.5px] text-ink-muted ring-1 ring-white/50">This is your oversight view - finance sends the reminders. You can hand this account to them to action, ask for an update, or flag it for a personal call.</p>
              </div>
              <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                <button type="button" onClick={() => onFlag(item)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white"><Phone className="size-4" /> My call</button>
                <button type="button" onClick={() => onMessage(item)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink ring-1 ring-white/70 hover:bg-white"><MessageSquare className="size-4" /> Ask finance</button>
                <button type="button" onClick={() => onHand(item)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><UserPlus className="size-4" /> Hand to finance</button>
              </footer>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BigStat({ label, value, money, sub, tone, trendOk }: { label: string; value?: string; money?: Money; sub: string; tone: string; trendOk?: boolean }) {
  return (
    <GlassSurface tone="strong" className="p-5">
      <span className="text-[12px] font-semibold text-ink-muted">{label}</span>
      {money ? <MoneyCell amount={money} size="lg" className={cn('!text-3xl font-bold', tone)} /> : <span className={cn('block font-display text-3xl font-bold tabular', tone)}>{value}</span>}
      <span className={cn('text-[11.5px]', trendOk ? 'font-semibold text-success' : 'text-ink-muted')}>{sub}</span>
    </GlassSurface>
  );
}
