import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Check, Clock, Gavel, HandCoins, Scale, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { decideCollectionsEscalation, fetchCollectionsManagement, updateCollectionsPolicy, type EscalationItem } from '../../api/collectionsManagement';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';

type EscAction = 'write-off' | 'payment-plan' | 'legal' | 'agency';
const ESC_META: Record<EscAction, { label: string; icon: typeof Gavel; tone: string }> = {
  'write-off': { label: 'Write-off', icon: Banknote, tone: 'bg-danger-soft text-danger' },
  'payment-plan': { label: 'Payment plan', icon: Scale, tone: 'bg-info-soft text-info' },
  legal: { label: 'Legal notice', icon: Gavel, tone: 'bg-warning-soft text-warning' },
  agency: { label: 'Debt agency', icon: HandCoins, tone: 'bg-lavender-soft text-lavender' },
};

const FALLBACK_ESCALATIONS: EscalationItem[] = [
  { id: 'e1', customer: 'Umoja SACCO', invoice: 'INV-10231', amount: { amountMinor: 5359000n, currency: 'USD' }, days: 95, requested: 'write-off', by: 'Diane Uwase', note: 'No response after 4 reminders; debtor insolvent per public filing.' },
  { id: 'e2', customer: 'PT Imports', invoice: 'INV-10221', amount: { amountMinor: 4860000n, currency: 'USD' }, days: 62, requested: 'payment-plan', by: 'Diane Uwase', note: 'Promised settlement by Friday; proposes 3-month plan.' },
  { id: 'e3', customer: 'Vendor 7741', invoice: 'INV-10255', amount: { amountMinor: 1920000n, currency: 'USD' }, days: 31, requested: 'legal', by: 'Diane Uwase', note: 'Disputed invoice, no PO; recommend formal notice.' },
];

const bucketOf = (d: number) => (d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+');

export function CollectionsManagement() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['collections-management', token],
    queryFn: ({ signal }) => fetchCollectionsManagement(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });

  const syncPayload = (payload: Awaited<ReturnType<typeof fetchCollectionsManagement>>) => {
    queryClient.setQueryData(['collections-management', token], payload);
  };

  const decideMutation = useMutation({
    mutationFn: ({ escalationID, decision }: { escalationID: string; decision: 'approved' | 'declined' }) =>
      decideCollectionsEscalation(apiBaseUrl, token, escalationID, decision),
    onSuccess: syncPayload,
  });
  const policyMutation = useMutation({
    mutationFn: () => updateCollectionsPolicy(apiBaseUrl, token),
    onSuccess: syncPayload,
  });

  const overdue = data?.overdue ?? [];
  const escalations = data?.escalations ?? FALLBACK_ESCALATIONS;
  const policy = data?.policy ?? { reminderCadence: 'Day 7, 14, 30', dsoTarget: '<= 35 days', autoEscalateAt: '90 days' };

  const [query, setQuery] = useState('');

  const pending = escalations;
  const totalOverdue: Money = { amountMinor: overdue.reduce((a, o) => a + o.amount.amountMinor, 0n), currency: 'USD' };
  const escalatedValue: Money = { amountMinor: pending.reduce((a, e) => a + e.amount.amountMinor, 0n), currency: 'USD' };

  const buckets = useMemo(() => {
    const m: Record<string, { count: number; sum: bigint }> = { '0-30': { count: 0, sum: 0n }, '31-60': { count: 0, sum: 0n }, '61-90': { count: 0, sum: 0n }, '90+': { count: 0, sum: 0n } };
    for (const o of overdue) {
      const b = bucketOf(o.daysOverdue);
      m[b]!.count++;
      m[b]!.sum += o.amount.amountMinor;
    }
    return m;
  }, [overdue]);

  const list = pending.filter((e) => (query.trim() === '' ? true : [e.customer, e.invoice].some((s) => s.toLowerCase().includes(query.trim().toLowerCase()))));

  const decide = async (e: EscalationItem, d: 'approved' | 'declined') => {
    try {
      await decideMutation.mutateAsync({ escalationID: e.id, decision: d });
      toast(
        d === 'approved'
          ? { tone: 'success', title: `${ESC_META[e.requested].label} approved`, body: `${e.customer} · ${e.invoice} - authorised and logged.` }
          : { tone: 'warning', title: 'Escalation declined', body: `${e.customer} sent back to the collections desk to keep chasing.` },
      );
    } catch (error) {
      toast({ tone: 'danger', title: 'Collections decision failed', body: error instanceof Error ? error.message : 'Could not update this escalation.' });
    }
  };

  const savePolicy = async () => {
    try {
      await policyMutation.mutateAsync();
      toast({ tone: 'success', title: 'Policy saved', body: 'Collections agent will chase on the new cadence.' });
    } catch (error) {
      toast({ tone: 'danger', title: 'Policy save failed', body: error instanceof Error ? error.message : 'Could not update collections policy.' });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Collections" subtitle="Manage the receivables book - review aging, approve the escalations your team raises, and set the chase policy. The desk does the chasing." right={<DateRangePill label="May 2025" />} />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="Total overdue" money={totalOverdue} tone="text-danger" />
          <Stat label="DSO" value="41 days" tone="text-warning" />
          <Stat label="Escalations pending" value={String(pending.length)} tone="text-brand-ink" />
          <Stat label="Value escalated" money={escalatedValue} tone="text-ink" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]">
          <GlassSurface tone="strong" className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-white/55 p-4">
              <ShieldCheck className="size-4 text-brand" />
              <h3 className="text-[13px] font-bold text-ink">Escalations to approve</h3>
              <span className="ml-auto rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-ink">{pending.length} pending</span>
            </div>
            <div className="border-b border-white/45 p-3">
              <div className="flex h-9 items-center gap-2.5 rounded-xl bg-white/70 px-3 ring-1 ring-white/70">
                <Search className="size-4 text-ink-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or invoice..." className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>
            </div>
            <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3">
              {list.map((e) => {
                const meta = ESC_META[e.requested];
                return (
                  <li key={e.id} className="mb-2 rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
                    <div className="flex items-center gap-3">
                      <PartyAvatar name={e.customer} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-bold text-ink">{e.customer}</p>
                          <span className={cn('shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', meta.tone)}><meta.icon className="size-3" /> {meta.label}</span>
                        </div>
                        <p className="truncate text-[11px] text-ink-muted">{e.invoice} · {e.days}d overdue · raised by {e.by}</p>
                      </div>
                      <MoneyCell amount={e.amount} size="sm" className="shrink-0 font-bold !text-[13px] text-danger" />
                    </div>
                    <p className="mt-2 rounded-xl bg-white/60 p-2.5 text-[11.5px] text-ink-soft ring-1 ring-white/50"><span className="font-bold text-ink">Operator's note: </span>{e.note}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button type="button" disabled={decideMutation.isPending} onClick={() => void decide(e, 'declined')} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-3.5 text-[12px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70">Decline</button>
                      <button type="button" disabled={decideMutation.isPending} onClick={() => void decide(e, 'approved')} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-[12.5px] font-bold text-white shadow-glass-soft hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"><Check className="size-3.5" /> Approve {meta.label.toLowerCase()}</button>
                    </div>
                  </li>
                );
              })}
              {list.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No escalations awaiting you.</li> : null}
            </ul>
          </GlassSurface>

          <div className="flex flex-col gap-4">
            <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-4">
              <h4 className="text-[12px] font-bold text-ink">Aging of the book</h4>
              {(['0-30', '31-60', '61-90', '90+'] as const).map((b) => {
                const pct = overdue.length === 0 ? 0 : (buckets[b]!.count / overdue.length) * 100;
                return (
                  <div key={b}>
                    <div className="flex justify-between text-[11.5px]"><span className="font-medium text-ink-soft">{b} days</span><MoneyCell amount={{ amountMinor: buckets[b]!.sum, currency: 'USD' }} size="sm" className="!text-[11px] font-bold text-ink-soft" /></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8"><div className={cn('h-full rounded-full', b === '90+' ? 'bg-danger' : b === '61-90' ? 'bg-warning' : 'bg-brand')} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </GlassSurface>

            <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-4">
              <header className="flex items-center gap-1.5"><Clock className="size-3.5 text-brand" /><h4 className="text-[12px] font-bold text-ink">Chase policy</h4></header>
              <Policy label="Reminder cadence" value={policy.reminderCadence} />
              <Policy label="DSO target" value={policy.dsoTarget} />
              <Policy label="Auto-escalate at" value={policy.autoEscalateAt} />
              <button type="button" disabled={policyMutation.isPending} onClick={() => void savePolicy()} className="mt-1 inline-flex h-9 items-center justify-center rounded-xl bg-white/70 text-[12px] font-bold text-ink ring-1 ring-white/70 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70">{policyMutation.isPending ? 'Saving...' : 'Update policy'}</button>
            </GlassSurface>

            <GlassSurface tone="strong" className="flex flex-col gap-2 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15">
              <header className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-ai" /><h4 className="text-[12px] font-bold text-ink">Collections agent</h4></header>
              <p className="rounded-xl bg-white/65 p-2.5 text-[11.5px] text-ink ring-1 ring-white/60">Recommend approving the <span className="font-bold text-danger">Umoja SACCO write-off</span> - debtor insolvent, recovery unlikely.</p>
            </GlassSurface>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, money, value, tone }: { label: string; money?: Money; value?: string; tone: string }) {
  return (
    <GlassSurface tone="strong" className="p-3.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      {money ? <MoneyCell amount={money} size="lg" className={cn('!text-2xl font-bold', tone)} /> : <span className={cn('block font-display text-2xl font-bold tabular', tone)}>{value}</span>}
    </GlassSurface>
  );
}

function Policy({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-white/55 px-3 py-2 ring-1 ring-white/60"><span className="text-[11.5px] font-medium text-ink-soft">{label}</span><span className="text-[12px] font-bold text-ink">{value}</span></div>;
}
