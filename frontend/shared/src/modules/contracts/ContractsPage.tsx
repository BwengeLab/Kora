import { CalendarClock, Check, FileText, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { CONTRACT_STATUS_META, CONTRACT_TYPE_META, seedContracts, type Contract, type ContractStatus, type ContractType } from '../../seed/contracts';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';

const TODAY = new Date('2025-05-18');
const daysToExpiry = (end: string) => Math.round((new Date(end).getTime() - TODAY.getTime()) / 86400000);

// Contracts register — policies, leases, vendor and partner agreements. The
// Finance Lead manages renewals; the Auditor reads obligations. Every contract
// links to its signed document.
export function ContractsPage({ readOnly = false }: { readOnly?: boolean }) {
  const [contracts, setContracts] = useState<Contract[]>(seedContracts);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ContractType | 'all'>('all');
  const [status, setStatus] = useState<ContractStatus | 'all'>('all');
  const [selected, setSelected] = useState<Contract | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contracts
      .filter((c) => (type === 'all' ? true : c.type === type))
      .filter((c) => (status === 'all' ? true : c.status === status))
      .filter((c) => (q === '' ? true : [c.title, c.counterparty, c.reference].some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => daysToExpiry(a.endDate) - daysToExpiry(b.endDate));
  }, [contracts, query, type, status]);

  const renew = (id: string) => {
    setContracts((cs) => cs.map((c) => (c.id === id ? { ...c, status: 'active', startDate: c.endDate, endDate: new Date(new Date(c.endDate).setFullYear(new Date(c.endDate).getFullYear() + 1)).toISOString().slice(0, 10) } : c)));
    setSelected(null);
    toast({ tone: 'success', title: 'Renewed', body: 'Contract renewed for another term and logged.' });
  };

  const renewalDue = contracts.filter((c) => c.status === 'renewal-due' || c.status === 'expiring').length;
  const annualValue = { amountMinor: contracts.filter((c) => c.status !== 'expired' && c.status !== 'draft').reduce((a, c) => a + c.value.amountMinor, 0n), currency: 'USD' };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Contracts"
        subtitle={readOnly ? 'Every obligation the business is committed to — read-only, with signed evidence.' : 'Policies, leases and vendor agreements. Track renewals before they lapse.'}
        right={<DateRangePill label="As of May 18, 2025" />}
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <MetricCard label="Active contracts" value={String(contracts.filter((c) => c.status === 'active').length)} tone="text-success" />
          <MetricCard label="Renewal / expiring" value={String(renewalDue)} tone="text-warning" active={status === 'renewal-due'} onClick={() => setStatus(status === 'renewal-due' ? 'all' : 'renewal-due')} />
          <MetricCard label="Annual value" money={annualValue} tone="text-ink" />
          <MetricCard label="Drafts" value={String(contracts.filter((c) => c.status === 'draft').length)} tone="text-info" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]">
          <GlassSurface tone="strong" className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/55 p-4">
              <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
                <Search className="size-4 text-ink-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search title, party, reference…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>
              <select value={type} onChange={(e) => setType(e.target.value as ContractType | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
                <option value="all">All types</option>
                {Object.entries(CONTRACT_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value as ContractStatus | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
                <option value="all">All statuses</option>
                {Object.entries(CONTRACT_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {filtered.map((c) => {
                const days = daysToExpiry(c.endDate);
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => setSelected(c)} className="flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
                      <PartyAvatar name={c.counterparty} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-semibold text-ink">{c.title}</p>
                          <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', CONTRACT_TYPE_META[c.type].tone)}>{CONTRACT_TYPE_META[c.type].label}</span>
                        </div>
                        <p className="truncate text-[11px] text-ink-muted">{c.counterparty} · {c.reference} · {days < 0 ? 'expired' : `${days}d to expiry`}</p>
                      </div>
                      <MoneyCell amount={c.value} size="sm" className="!text-[12.5px] font-semibold text-ink-soft" />
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', CONTRACT_STATUS_META[c.status].tone)}>{CONTRACT_STATUS_META[c.status].label}</span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No contracts match.</li> : null}
            </ul>
          </GlassSurface>

          {/* Helper rail */}
          <div className="flex flex-col gap-4">
            <RenewalRadar contracts={contracts} onPick={(c) => setSelected(c)} />
            <ProRataTool />
          </div>
        </div>
      </div>

      {/* Detail */}
      <Dialog.Root open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
          <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
            {selected ? (
              <>
                <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <PartyAvatar name={selected.counterparty} size="lg" />
                    <div className="min-w-0">
                      <Dialog.Title className="font-display text-[15px] font-bold text-ink">{selected.title}</Dialog.Title>
                      <p className="text-[11.5px] text-ink-muted">{selected.counterparty}</p>
                    </div>
                  </div>
                  <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
                </header>
                <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Annual value</span>
                      <MoneyCell amount={selected.value} size="xl" className="!text-3xl font-bold text-ink" />
                    </div>
                    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', CONTRACT_STATUS_META[selected.status].tone)}>{CONTRACT_STATUS_META[selected.status].label}</span>
                  </div>
                  <GlassSurface noBlur tone="subtle" className="bg-white/60 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Key terms</p>
                    <p className="mt-1 text-[13.5px] text-ink">{selected.terms}</p>
                  </GlassSurface>
                  <dl className="grid grid-cols-2 gap-3">
                    <Meta label="Type" value={CONTRACT_TYPE_META[selected.type].label} />
                    <Meta label="Reference" value={selected.reference} mono />
                    <Meta label="Start" value={new Date(selected.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                    <Meta label="End" value={new Date(selected.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                    <Meta label="Owner" value={selected.owner} />
                    <Meta label="Auto-renew" value={selected.autoRenew ? 'Yes' : 'No'} tone={selected.autoRenew ? 'success' : undefined} />
                  </dl>
                  <button type="button" onClick={() => openDoc({ name: selected.evidenceName, kind: 'contract', sizeText: '—', context: selected.reference })} className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"><FileText className="size-4" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-ink">{selected.evidenceName}</p><p className="text-[11px] text-ink-muted">Signed contract</p></div>
                    <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70">View</span>
                  </button>
                </div>
                {!readOnly ? (
                  <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                    <button type="button" onClick={() => toast({ tone: 'info', title: 'Reminder set', body: `You'll be alerted 30 days before ${selected.reference} expires.` })} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white"><CalendarClock className="size-4" /> Remind me</button>
                    <button type="button" onClick={() => renew(selected.id)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><RefreshCw className="size-4" /> Renew contract</button>
                  </footer>
                ) : null}
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function MetricCard({ label, value, money, tone, active, onClick }: { label: string; value?: string; money?: import('../../lib/money').Money; tone: string; active?: boolean; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <GlassSurface tone="strong" className={cn('p-3.5', active && 'ring-2 ring-brand/40')}>
      <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={cn('flex w-full flex-col gap-0.5 text-left', onClick && 'cursor-pointer')}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
        {money ? <MoneyCell amount={money} size="lg" className={cn('!text-2xl font-bold', tone)} /> : <span className={cn('font-display text-2xl font-bold tabular', tone)}>{value}</span>}
      </Comp>
    </GlassSurface>
  );
}

function Meta({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'success' | undefined }) {
  return <div><dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{label}</dt><dd className={cn('text-[13px] font-semibold', mono && 'font-mono', tone === 'success' ? 'text-success' : 'text-ink')}>{value}</dd></div>;
}

function RenewalRadar({ contracts, onPick }: { contracts: Contract[]; onPick: (c: Contract) => void }) {
  const soon = contracts.filter((c) => daysToExpiry(c.endDate) >= 0 && daysToExpiry(c.endDate) <= 60).sort((a, b) => daysToExpiry(a.endDate) - daysToExpiry(b.endDate));
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2.5 bg-gradient-to-br from-warning-soft/50 to-white/40 p-4 ring-1 ring-warning/15">
      <header className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-warning" /><h4 className="text-[12px] font-bold text-ink">Renewal radar</h4></header>
      {soon.length === 0 ? <p className="text-[11.5px] text-ink-muted">Nothing expiring in the next 60 days.</p> : soon.map((c) => (
        <button key={c.id} type="button" onClick={() => onPick(c)} className="rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white">
          <span className="font-bold text-warning">{daysToExpiry(c.endDate)}d</span> · {c.title} <span className="font-semibold text-brand">Open →</span>
        </button>
      ))}
    </GlassSurface>
  );
}

// Per-page tool: pro-rata calculator for partial-term renewals & cancellations.
function ProRataTool() {
  const [annual, setAnnual] = useState('');
  const [days, setDays] = useState('90');
  const a = parseFloat(annual || '0');
  const d = parseFloat(days || '0');
  const prorata = (a / 365) * d;
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-4">
      <header className="flex items-center gap-1.5"><CalendarClock className="size-3.5 text-brand" /><h4 className="text-[12px] font-bold text-ink">Pro-rata calculator</h4></header>
      <label className="flex flex-col gap-1"><span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Annual value</span><input value={annual} onChange={(e) => setAnnual(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className="h-9 rounded-lg bg-white/70 px-3 text-[12.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30" /></label>
      <label className="flex flex-col gap-1"><span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Days</span><input value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className="h-9 rounded-lg bg-white/70 px-3 text-[12.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30" /></label>
      <div className="rounded-xl bg-brand-soft/50 p-2.5 text-center ring-1 ring-brand/15">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Pro-rata</p>
        <p className="font-display text-xl font-bold text-brand-ink tabular">{prorata.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      </div>
    </GlassSurface>
  );
}
