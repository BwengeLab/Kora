import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDownLeft, ArrowUpRight, CalendarClock, FileText, Mail, Phone, ScrollText, Search, Sparkles, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { ContractsView } from '../contracts';
import { seedParties, seedRenewals, type Party, type PartyType, type RiskLevel } from '../../seed/ownerExtra';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';

const TYPE_TONE: Record<PartyType, string> = { customer: 'bg-success-soft text-success', supplier: 'bg-warning-soft text-warning', partner: 'bg-brand-soft text-brand-ink' };
const RISK_TONE: Record<RiskLevel, string> = { low: 'bg-success-soft text-success', medium: 'bg-warning-soft text-warning', high: 'bg-danger-soft text-danger' };

type Lens = 'parties' | 'contracts';

// Org Owner "Relationships" — two sides of the same coin, on one page:
//   • Parties   — WHO you deal with (customers, suppliers, partners).
//   • Contracts — WHAT you're committed to (the signed agreements with them).
// A segmented control switches lenses; a party drill-in deep-links to that
// party's contracts so the relationship and its agreements stay connected.
export function RelationshipsPage({ readOnly = false }: { readOnly?: boolean }) {
  const [lens, setLens] = useState<Lens>('parties');
  const [contractQuery, setContractQuery] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<PartyType | 'all'>('all');
  const [risk, setRisk] = useState<RiskLevel | 'all'>('all');
  const [selected, setSelected] = useState<Party | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seedParties
      .filter((p) => (type === 'all' ? true : p.type === type))
      .filter((p) => (risk === 'all' ? true : p.risk === risk))
      .filter((p) => (q === '' ? true : [p.name, p.contact, p.email].some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => Number(b.moneyIn.amountMinor + b.moneyOut.amountMinor - (a.moneyIn.amountMinor + a.moneyOut.amountMinor)));
  }, [query, type, risk]);

  const counts = useMemo(() => ({
    customer: seedParties.filter((p) => p.type === 'customer').length,
    supplier: seedParties.filter((p) => p.type === 'supplier').length,
    partner: seedParties.filter((p) => p.type === 'partner').length,
    high: seedParties.filter((p) => p.risk === 'high').length,
  }), []);

  const viewContracts = (partyName: string) => { setContractQuery(partyName); setLens('contracts'); setSelected(null); };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Relationships"
        subtitle={readOnly ? (lens === 'parties' ? 'WHO the business deals with — read-only directory of parties, balances and history for verification.' : 'WHAT the business is committed to — read-only view of every agreement and its evidence.') : (lens === 'parties' ? 'WHO you deal with — customers, suppliers and partners. Open one to see history, balance and contacts.' : 'WHAT you’re committed to — the signed agreements behind those relationships, with value, terms and renewals.')}
        right={<DateRangePill label="May 2025" />}
      />
      {/* Lens switch — Parties (who) vs Contracts (what) */}
      <div className="px-8 pb-3">
        <div className="inline-flex items-center gap-1 rounded-2xl bg-glass-strong p-1 ring-1 ring-white/60 backdrop-blur-glass">
          <LensTab active={lens === 'parties'} onClick={() => setLens('parties')} icon={<Users className="size-4" />} label="Parties" sub="who you deal with" />
          <LensTab active={lens === 'contracts'} onClick={() => { setContractQuery(''); setLens('contracts'); }} icon={<ScrollText className="size-4" />} label="Contracts" sub="what you’re committed to" />
        </div>
      </div>

      {lens === 'contracts' ? (
        <ContractsView variant={readOnly ? 'read' : 'oversight'} initialQuery={contractQuery} key={contractQuery || 'all'} />
      ) : (
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="Customers" value={counts.customer} tone="text-success" active={type === 'customer'} onClick={() => setType(type === 'customer' ? 'all' : 'customer')} />
          <Stat label="Suppliers" value={counts.supplier} tone="text-warning" active={type === 'supplier'} onClick={() => setType(type === 'supplier' ? 'all' : 'supplier')} />
          <Stat label="Partners" value={counts.partner} tone="text-brand-ink" active={type === 'partner'} onClick={() => setType(type === 'partner' ? 'all' : 'partner')} />
          <Stat label="High risk" value={counts.high} tone="text-danger" active={risk === 'high'} onClick={() => setRisk(risk === 'high' ? 'all' : 'high')} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]">
          <GlassSurface tone="strong" className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/55 p-4">
              <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
                <Search className="size-4 text-ink-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search party, contact, email…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>
              <select value={type} onChange={(e) => setType(e.target.value as PartyType | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
                <option value="all">All types</option><option value="customer">Customers</option><option value="supplier">Suppliers</option><option value="partner">Partners</option>
              </select>
              <select value={risk} onChange={(e) => setRisk(e.target.value as RiskLevel | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
                <option value="all">All risk</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div className="grid grid-cols-[1fr_120px_120px_70px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
              <span>Party</span><span className="text-right">Money in</span><span className="text-right">Money out</span><span className="text-right">Risk</span>
            </div>
            <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelected(p)} className="grid w-full grid-cols-[1fr_120px_120px_70px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
                    <div className="flex min-w-0 items-center gap-3">
                      <PartyAvatar name={p.name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><p className="truncate text-[13px] font-semibold text-ink">{p.name}</p><span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', TYPE_TONE[p.type])}>{p.type}</span></div>
                        <p className="truncate text-[11px] text-ink-muted">{p.contact} · {p.openInvoices} open · {p.contracts} contracts</p>
                      </div>
                    </div>
                    <MoneyCell amount={p.moneyIn} size="sm" className="text-right font-semibold !text-[12.5px] text-success" />
                    <MoneyCell amount={p.moneyOut} size="sm" className="text-right font-semibold !text-[12.5px] text-ink-soft" />
                    <span className={cn('justify-self-end rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', RISK_TONE[p.risk])}>{p.risk}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No parties match.</li> : null}
            </ul>
          </GlassSurface>

          <div className="flex flex-col gap-4">
            <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-4">
              <header className="flex items-center justify-between gap-1.5"><span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5 text-warning" /><h4 className="text-[12px] font-bold text-ink">Upcoming renewals</h4></span><button type="button" onClick={() => viewContracts('')} className="text-[10.5px] font-bold text-brand hover:text-brand-ink">All contracts →</button></header>
              {seedRenewals.map((r) => (
                <button key={r.id} type="button" onClick={() => viewContracts(r.party)} className="rounded-xl bg-white/55 p-2.5 text-left text-[11.5px] ring-1 ring-white/60 transition-colors hover:bg-white">
                  <p className="font-bold text-ink">{r.contract}</p>
                  <p className="text-ink-muted">{r.party} · {r.dueText}</p>
                </button>
              ))}
            </GlassSurface>
            <GlassSurface tone="strong" className="flex flex-col gap-2.5 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15">
              <header className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-ai" /><h4 className="text-[12px] font-bold text-ink">Relationship insight</h4></header>
              <button type="button" onClick={() => { setRisk('high'); }} className="rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white">
                <span className="font-bold text-danger">PT Imports</span> is high-risk: 62-day overdue invoice + a payment over PO. <span className="font-semibold text-brand">Review →</span>
              </button>
            </GlassSurface>
          </div>
        </div>
      </div>
      )}

      <PartyDrawer party={selected} onClose={() => setSelected(null)} onViewContracts={viewContracts} readOnly={readOnly} />
    </div>
  );
}

function LensTab({ active, onClick, icon, label, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition-colors', active ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-soft hover:bg-white/55 hover:text-ink')}>
      <span className={cn('grid size-7 place-items-center rounded-lg', active ? 'bg-brand-soft text-brand-ink' : 'bg-white/60 text-ink-muted')}>{icon}</span>
      <span className="leading-tight"><span className="block text-[13px] font-bold">{label}</span><span className="block text-[10.5px] font-medium text-ink-muted">{sub}</span></span>
    </button>
  );
}

function PartyDrawer({ party: p, onClose, onViewContracts, readOnly = false }: { party: Party | null; onClose: () => void; onViewContracts: (name: string) => void; readOnly?: boolean }) {
  const net: Money | null = p ? { amountMinor: p.moneyIn.amountMinor - p.moneyOut.amountMinor, currency: 'USD' } : null;
  return (
    <Dialog.Root open={p !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          {p && net ? (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
                <div className="flex items-center gap-3">
                  <PartyAvatar name={p.name} size="lg" />
                  <div className="min-w-0">
                    <Dialog.Title className="font-display text-[15px] font-bold text-ink">{p.name}</Dialog.Title>
                    <p className="text-[11.5px] capitalize text-ink-muted">{p.type} · since {p.since}</p>
                  </div>
                </div>
                <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
              </header>
              <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
                <div className="grid grid-cols-3 gap-2">
                  <Mini label="Money in" money={p.moneyIn} tone="text-success" />
                  <Mini label="Money out" money={p.moneyOut} tone="text-ink-soft" />
                  <Mini label="Net" money={net} tone={net.amountMinor >= 0n ? 'text-success' : 'text-danger'} sign />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Mini label="Open" value={String(p.openInvoices)} />
                  <button type="button" onClick={() => onViewContracts(p.name)} className="rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 transition-colors hover:bg-white hover:ring-brand/30"><span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Contracts</span><p className="text-[15px] font-bold tabular text-ink">{p.contracts} <span className="text-[10px] font-bold text-brand">view →</span></p></button>
                  <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60"><span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Risk</span><p className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase', RISK_TONE[p.risk])}>{p.risk}</p></div>
                </div>

                <div className="rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Primary contact</p>
                  <p className="mt-1 text-[13.5px] font-bold text-ink">{p.contact}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-ink-soft"><Mail className="size-3.5" /> {p.email}</p>
                  <p className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft"><Phone className="size-3.5" /> {p.phone}</p>
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
                <button type="button" onClick={() => openDoc({ name: `${p.name} — statement.pdf`, kind: 'statement', sizeText: '—', context: p.name })} className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white', readOnly && 'flex-1')}><FileText className="size-4" /> {readOnly ? 'View statement' : 'Statement'}</button>
                {!readOnly ? <button type="button" onClick={() => toast({ tone: 'success', title: 'Email drafted', body: `Opening a message to ${p.contact} <${p.email}>.` })} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><Mail className="size-4" /> Email contact</button> : null}
              </footer>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Stat({ label, value, tone, active, onClick }: { label: string; value: number; tone: string; active?: boolean; onClick?: () => void }) {
  return (
    <GlassSurface tone="strong" className={cn('p-3.5', active && 'ring-2 ring-brand/40')}>
      <button type="button" onClick={onClick} className="flex w-full flex-col gap-0.5 text-left">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
        <span className={cn('font-display text-2xl font-bold tabular', tone)}>{value}</span>
        <span className="text-[10.5px] font-semibold text-brand">{active ? 'Filtered · clear' : 'Filter'}</span>
      </button>
    </GlassSurface>
  );
}

function Mini({ label, money, value, tone = 'text-ink', sign }: { label: string; money?: Money; value?: string; tone?: string; sign?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      {money ? <MoneyCell amount={money} size="sm" className={cn('!text-[15px] font-bold', tone)} showSign={sign ?? false} /> : <p className={cn('text-[15px] font-bold tabular', tone)}>{value}</p>}
    </div>
  );
}
