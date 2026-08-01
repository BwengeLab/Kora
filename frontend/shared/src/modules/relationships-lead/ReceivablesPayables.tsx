import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDownLeft, ArrowUpRight, Banknote, FileText, Mail, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchRelationshipsOverview, relationshipPartyAction, type RelationshipsOverviewPayload } from '../../api/relationships';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { openDoc } from '../../state/docViewerStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';

const TYPE_TONE: Record<PartyType, string> = { customer: 'bg-success-soft text-success', supplier: 'bg-warning-soft text-warning', partner: 'bg-brand-soft text-brand-ink' };
type Side = 'all' | 'receivable' | 'payable';
const isAR = (p: Party) => p.balance.amountMinor > 0n;
const abs = (m: Money): Money => ({ amountMinor: m.amountMinor < 0n ? -m.amountMinor : m.amountMinor, currency: m.currency });

// Finance Lead "Relationships" — operational AR/AP. The Lead manages who owes the
// business (receivables) and who the business owes (payables): balances, credit
// terms, limits and statements. Parties-only — contracts have their own Lead
// page. Distinct from the owner's strategic + contracts oversight.
export function ReceivablesPayables() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['relationships-overview', token],
    queryFn: ({ signal }) => fetchRelationshipsOverview(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });
  const parties = data?.parties ?? [];
  const [query, setQuery] = useState('');
  const [side, setSide] = useState<Side>('all');
  const [type, setType] = useState<PartyType | 'all'>('all');
  const [selected, setSelected] = useState<Party | null>(null);
  const actionMutation = useMutation({
    mutationFn: ({ partyID, action }: { partyID: string; action: 'review-terms' | 'send-statement' | 'schedule-payment' }) =>
      relationshipPartyAction(apiBaseUrl, token, partyID, action),
    onSuccess: (payload) => syncRelationshipData(payload),
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parties
      .filter((p) => (side === 'all' ? true : side === 'receivable' ? isAR(p) : !isAR(p)))
      .filter((p) => (type === 'all' ? true : p.type === type))
      .filter((p) => (q === '' ? true : [p.name, p.contact].some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => Number(abs(b.balance).amountMinor - abs(a.balance).amountMinor));
  }, [parties, query, side, type]);

  const totalAR: Money = { amountMinor: parties.filter(isAR).reduce((a, p) => a + p.balance.amountMinor, 0n), currency: 'USD' };
  const totalAP: Money = { amountMinor: parties.filter((p) => !isAR(p)).reduce((a, p) => a - p.balance.amountMinor, 0n), currency: 'USD' };
  const overdueCount = parties.filter((p) => p.overdue).length;
  const net: Money = { amountMinor: totalAR.amountMinor - totalAP.amountMinor, currency: 'USD' };

  function syncRelationshipData(payload: RelationshipsOverviewPayload) {
    queryClient.setQueryData(['relationships-overview', token], payload);
    if (selected) {
      setSelected(payload.parties.find((party) => party.id === selected.id) ?? null);
    }
  }

  async function handlePartyAction(party: Party, action: 'review-terms' | 'send-statement' | 'schedule-payment') {
    try {
      await actionMutation.mutateAsync({ partyID: party.id, action });
      const body =
        action === 'review-terms'
          ? `Terms review for ${party.name} was logged.`
          : action === 'send-statement'
            ? `Statement delivery for ${party.name} was logged.`
            : `Payment scheduling for ${party.name} was logged.`;
      toast({ tone: 'success', title: 'Relationship updated', body });
    } catch (error) {
      toast({
        tone: 'warning',
        title: 'Action failed',
        body: error instanceof Error ? error.message : 'Could not complete this relationship action.',
      });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Relationships" subtitle="Receivables & payables — who owes you, who you owe, on what terms. Manage balances, credit limits and statements." right={<DateRangePill label="As of May 18, 2025" />} />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="Receivable (AR)" money={totalAR} tone="text-success" active={side === 'receivable'} onClick={() => setSide(side === 'receivable' ? 'all' : 'receivable')} />
          <Stat label="Payable (AP)" money={totalAP} tone="text-danger" active={side === 'payable'} onClick={() => setSide(side === 'payable' ? 'all' : 'payable')} />
          <Stat label="Net position" money={net} tone={net.amountMinor >= 0n ? 'text-success' : 'text-danger'} sign />
          <Stat label="Overdue accounts" value={String(overdueCount)} tone="text-warning" />
        </div>

        <GlassSurface tone="strong" className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/55 p-4">
            <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
              <Search className="size-4 text-ink-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search customer or supplier…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
            </div>
            <div className="flex h-10 items-center gap-0.5 rounded-xl bg-white/55 p-0.5 ring-1 ring-white/60">
              {(['all', 'receivable', 'payable'] as Side[]).map((s) => (
                <button key={s} type="button" onClick={() => setSide(s)} className={cn('h-9 rounded-lg px-3 text-[12px] font-bold capitalize transition-colors', side === s ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-muted hover:text-ink')}>{s === 'all' ? 'All' : s === 'receivable' ? 'AR' : 'AP'}</button>
              ))}
            </div>
            <select value={type} onChange={(e) => setType(e.target.value as PartyType | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
              <option value="all">All types</option><option value="customer">Customers</option><option value="supplier">Suppliers</option><option value="partner">Partners</option>
            </select>
          </div>
          <div className="grid grid-cols-[1fr_130px_90px_90px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
            <span>Party</span><span className="text-right">Balance</span><span className="text-right">Terms</span><span className="text-right">Status</span>
          </div>
          <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {rows.map((p) => {
              const ar = isAR(p);
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelected(p)} className="grid w-full grid-cols-[1fr_130px_90px_90px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', ar ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{ar ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><p className="truncate text-[13px] font-semibold text-ink">{p.name}</p><span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', TYPE_TONE[p.type])}>{p.type}</span></div>
                        <p className="truncate text-[11px] text-ink-muted">{p.contact} · {ar ? 'owes us' : 'we owe'}</p>
                      </div>
                    </div>
                    <span className={cn('text-right text-[13px] font-bold tabular', ar ? 'text-success' : 'text-danger')}>{ar ? '' : '−'}<MoneyCell amount={abs(p.balance)} size="sm" className={cn('!text-[13px]', ar ? 'text-success' : 'text-danger')} /></span>
                    <span className="text-right text-[12px] font-semibold text-ink-soft">{p.terms}</span>
                    <span className="flex justify-end"><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', p.overdue ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success')}>{p.overdue ? 'Overdue' : 'Current'}</span></span>
                  </button>
                </li>
              );
            })}
            {rows.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No accounts match.</li> : null}
          </ul>
        </GlassSurface>
      </div>

      <AccountDrawer
        party={selected}
        onClose={() => setSelected(null)}
        onReviewTerms={(party) => void handlePartyAction(party, 'review-terms')}
        onSettlement={(party, action) => void handlePartyAction(party, action)}
        busy={actionMutation.isPending}
      />
    </div>
  );
}

function AccountDrawer({ party: p, onClose, onReviewTerms, onSettlement, busy = false }: { party: Party | null; onClose: () => void; onReviewTerms: (party: Party) => void; onSettlement: (party: Party, action: 'send-statement' | 'schedule-payment') => void; busy?: boolean }) {
  if (!p) return <Dialog.Root open={false} onOpenChange={() => onClose()}><span /></Dialog.Root>;
  const ar = isAR(p);
  const utilization = Math.min(100, Math.round((Number(abs(p.balance).amountMinor) / Number(p.creditLimit.amountMinor)) * 100));
  return (
    <Dialog.Root open={p !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
            <div className="flex items-center gap-3">
              <PartyAvatar name={p.name} size="lg" />
              <div><Dialog.Title className="font-display text-[15px] font-bold text-ink">{p.name}</Dialog.Title><p className="text-[11.5px] capitalize text-ink-muted">{p.type} · {p.terms}</p></div>
            </div>
            <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
          </header>
          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
            <div className="flex items-center justify-between">
              <div><span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{ar ? 'They owe us' : 'We owe them'}</span><MoneyCell amount={abs(p.balance)} size="xl" className={cn('!text-3xl font-bold', ar ? 'text-success' : 'text-danger')} /></div>
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', p.overdue ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success')}>{p.overdue ? 'Overdue' : 'Current'}</span>
            </div>
            {ar ? (
              <div className="rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
                <div className="flex items-center justify-between text-[11.5px]"><span className="font-semibold text-ink-soft">Credit used</span><span className="font-bold text-ink">{utilization}% of <MoneyCell amount={p.creditLimit} size="sm" className="!text-[11.5px] inline" /></span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/8"><div className={cn('h-full rounded-full', utilization > 80 ? 'bg-danger' : utilization > 50 ? 'bg-warning' : 'bg-success')} style={{ width: `${utilization}%` }} /></div>
              </div>
            ) : null}
            <div className="rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Contact</p>
              <p className="mt-1 text-[13.5px] font-bold text-ink">{p.contact}</p>
              <p className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft"><Mail className="size-3.5" /> {p.email}</p>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Recent activity</p>
              <ul className="flex flex-col">
                {p.activity.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 border-b border-white/40 py-2.5 last:border-0">
                    {a.amount ? <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', a.dir === 'in' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{a.dir === 'in' ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}</span> : <span className="size-2 rounded-full bg-ink/20" />}
                    <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-ink">{a.text}</p><p className="text-[10.5px] text-ink-muted">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
                    {a.amount ? <MoneyCell amount={a.amount} size="sm" className={cn('!text-[12px] font-bold', a.dir === 'in' ? 'text-success' : 'text-danger')} /> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <footer className="flex items-center gap-2 border-t border-white/55 p-4">
            <button type="button" disabled={busy} onClick={() => onReviewTerms(p)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink ring-1 ring-white/70 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"><SlidersHorizontal className="size-4" /> Terms</button>
            <button type="button" onClick={() => openDoc({ name: `${p.name} — statement.pdf`, kind: 'statement', sizeText: '—', context: p.name })} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink ring-1 ring-white/70 hover:bg-white"><FileText className="size-4" /> Statement</button>
            <button type="button" disabled={busy} onClick={() => onSettlement(p, ar ? 'send-statement' : 'schedule-payment')} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"><Banknote className="size-4" /> {busy ? 'Working...' : ar ? 'Send statement' : 'Schedule payment'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Stat({ label, money, value, tone, active, onClick, sign }: { label: string; money?: Money; value?: string; tone: string; active?: boolean; onClick?: () => void; sign?: boolean }) {
  return (
    <GlassSurface tone="strong" className={cn('p-3.5', active && 'ring-2 ring-brand/40')}>
      <button type="button" onClick={onClick} disabled={!onClick} className={cn('flex w-full flex-col gap-0.5 text-left', onClick && 'cursor-pointer')}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
        {money ? <MoneyCell amount={money} size="lg" className={cn('!text-2xl font-bold', tone)} showSign={sign ?? false} /> : <span className={cn('font-display text-2xl font-bold tabular', tone)}>{value}</span>}
        {onClick ? <span className="text-[10.5px] font-semibold text-brand">{active ? 'Filtered · clear' : 'Filter'}</span> : null}
      </button>
    </GlassSurface>
  );
}
