import { Ban, Check, Clock, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { CONSENT_STATUS_META, SCOPE_LABEL, seedConsents, type ConsentGrant, type ConsentStatus } from '../../seed/consent';
import { toast } from '../../state/toastStore';

const TODAY = new Date('2025-05-18');
const daysLeft = (end: string) => Math.round((new Date(end).getTime() - TODAY.getTime()) / 86400000);

// Consent ledger — who can see the business's data, for what, and until when.
// The Finance Lead grants & revokes; the Auditor reviews it as an immutable log
// (readOnly). Sharing data is a deliberate, revocable, time-boxed act.
export function ConsentPage({ readOnly = false }: { readOnly?: boolean }) {
  const [grants, setGrants] = useState<ConsentGrant[]>(seedConsents);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ConsentStatus | 'all'>('all');
  const [selected, setSelected] = useState<ConsentGrant | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return grants
      .filter((c) => (status === 'all' ? true : c.status === status))
      .filter((c) => (q === '' ? true : [c.grantee, c.purpose].some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  }, [grants, query, status]);

  const revoke = (id: string) => {
    setGrants((gs) => gs.map((g) => (g.id === id ? { ...g, status: 'revoked' } : g)));
    setSelected(null);
    toast({ tone: 'danger', title: 'Consent revoked', body: 'Access withdrawn immediately and written to the audit log.' });
  };
  const approve = (id: string) => {
    setGrants((gs) => gs.map((g) => (g.id === id ? { ...g, status: 'active' } : g)));
    setSelected(null);
    toast({ tone: 'success', title: 'Consent granted', body: 'Access authorised and logged.' });
  };

  const active = grants.filter((g) => g.status === 'active').length;
  const pending = grants.filter((g) => g.status === 'pending').length;
  const expiringSoon = grants.filter((g) => g.status === 'active' && daysLeft(g.expiresAt) <= 30).length;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={readOnly ? 'Consent log' : 'Consent'}
        subtitle={readOnly ? 'Immutable record of every data-sharing consent — who, what, when, and the legal basis.' : 'Control who can access the business’s data. Every grant is scoped, time-boxed and revocable.'}
        right={<DateRangePill label="As of May 18, 2025" />}
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Metric label="Active grants" value={String(active)} tone="text-success" icon={<ShieldCheck className="size-4" />} />
          <Metric label="Pending" value={String(pending)} tone="text-warning" icon={<Clock className="size-4" />} active={status === 'pending'} onClick={() => setStatus(status === 'pending' ? 'all' : 'pending')} />
          <Metric label="Expiring ≤30d" value={String(expiringSoon)} tone="text-danger" icon={<Clock className="size-4" />} />
          <Metric label="Revoked" value={String(grants.filter((g) => g.status === 'revoked').length)} tone="text-ink-muted" icon={<Ban className="size-4" />} />
        </div>

        <GlassSurface tone="strong" className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/55 p-4">
            <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
              <Search className="size-4 text-ink-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search grantee or purpose…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value as ConsentStatus | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
              <option value="all">All statuses</option>
              {Object.entries(CONSENT_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {!readOnly ? <button type="button" onClick={() => toast({ tone: 'info', title: 'New consent', body: 'Choose a grantee, scopes and expiry to grant access.' })} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12.5px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-4" /> Grant access</button> : null}
          </div>

          <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {filtered.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelected(c)} className="flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
                  <PartyAvatar name={c.grantee} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{c.grantee}</p>
                    <p className="truncate text-[11px] text-ink-muted">{c.purpose} · granted {new Date(c.grantedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-1 @3xl:flex">
                    {c.scopes.slice(0, 2).map((s) => <span key={s} className="rounded-md bg-white/70 px-1.5 py-0.5 text-[9.5px] font-bold text-ink-soft ring-1 ring-white/60">{SCOPE_LABEL[s]}</span>)}
                    {c.scopes.length > 2 ? <span className="text-[10px] font-bold text-ink-muted">+{c.scopes.length - 2}</span> : null}
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', CONSENT_STATUS_META[c.status].tone)}>{CONSENT_STATUS_META[c.status].label}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No consents match.</li> : null}
          </ul>
        </GlassSurface>
      </div>

      <Dialog.Root open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
          <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
            {selected ? (
              <>
                <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <PartyAvatar name={selected.grantee} size="lg" />
                    <div className="min-w-0">
                      <Dialog.Title className="font-display text-[15px] font-bold text-ink">{selected.grantee}</Dialog.Title>
                      <p className="text-[11.5px] capitalize text-ink-muted">{selected.granteeType}</p>
                    </div>
                  </div>
                  <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
                </header>
                <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
                  <div className="flex items-center justify-between">
                    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', CONSENT_STATUS_META[selected.status].tone)}>{CONSENT_STATUS_META[selected.status].label}</span>
                    {selected.status === 'active' ? <span className="text-[12px] font-semibold text-ink-muted">{daysLeft(selected.expiresAt)} days left</span> : null}
                  </div>
                  <GlassSurface noBlur tone="subtle" className="bg-white/60 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Purpose</p>
                    <p className="mt-1 text-[13.5px] font-semibold text-ink">{selected.purpose}</p>
                  </GlassSurface>
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Data shared</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.scopes.map((s) => <span key={s} className="rounded-lg bg-brand-soft/60 px-2.5 py-1 text-[12px] font-semibold text-brand-ink ring-1 ring-brand/15">{SCOPE_LABEL[s]}</span>)}
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3">
                    <Meta label="Legal basis" value={selected.basis} />
                    <Meta label="Granted by" value={selected.grantedBy} />
                    <Meta label="Granted" value={new Date(selected.grantedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                    <Meta label="Expires" value={new Date(selected.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                    {selected.lastAccessed ? <Meta label="Last accessed" value={new Date(selected.lastAccessed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} /> : null}
                  </dl>
                </div>
                {!readOnly ? (
                  <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                    {selected.status === 'pending' ? (
                      <button type="button" onClick={() => approve(selected.id)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><Check className="size-4" /> Grant access</button>
                    ) : null}
                    {selected.status === 'active' || selected.status === 'pending' ? (
                      <button type="button" onClick={() => revoke(selected.id)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-danger-soft text-[13px] font-bold text-danger hover:brightness-105"><Ban className="size-4" /> Revoke</button>
                    ) : (
                      <span className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/60 text-[13px] font-bold text-ink-muted">No active access</span>
                    )}
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

function Metric({ label, value, tone, icon, active, onClick }: { label: string; value: string; tone: string; icon: React.ReactNode; active?: boolean; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <GlassSurface tone="strong" className={cn('p-3.5', active && 'ring-2 ring-brand/40')}>
      <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={cn('flex w-full items-center gap-3 text-left', onClick && 'cursor-pointer')}>
        <span className={cn('grid size-10 place-items-center rounded-xl bg-white/70 ring-1 ring-white/60', tone)}>{icon}</span>
        <div><span className={cn('block font-display text-2xl font-bold tabular leading-none', tone)}>{value}</span><span className="text-[11px] font-semibold text-ink-muted">{label}</span></div>
      </Comp>
    </GlassSurface>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{label}</dt><dd className="text-[13px] font-semibold text-ink">{value}</dd></div>;
}
