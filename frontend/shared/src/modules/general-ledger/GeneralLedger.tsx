import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, Check, CheckCircle2, Layers, Plus, Scale, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { createJournalEntry } from '../../api/financeOperations';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { displayBalance, linesBalanced, trialBalance, useGLStore } from '../../state/glStore';
import { useEntityStore } from '../../state/entityStore';
import { usePayablesStore } from '../../state/payablesStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { useTransactionsStore } from '../../state/transactionsStore';

const M = (amountMinor: bigint): Money => ({ amountMinor, currency: 'USD' });
const SOURCE_TONE: Record<JournalSource, string> = {
  opening: 'bg-ink/10 text-ink-soft', manual: 'bg-brand-soft text-brand-ink', AP: 'bg-info-soft text-info', AR: 'bg-success-soft text-success',
  bank: 'bg-lavender-soft text-lavender', payroll: 'bg-warning-soft text-warning', tax: 'bg-danger-soft text-danger', claims: 'bg-ai-soft text-ai',
};

type Tab = 'accounts' | 'journals' | 'trial';

// The General Ledger — Kora as a system of record. Chart of Accounts with live
// balances, the journal (double-entry), and a trial balance that ties out. The
// creator enforces Σdebits = Σcredits before anything posts.
export function GeneralLedger({ canEdit = false }: { canEdit?: boolean }) {
  const scope = useEntityStore((s) => s.scope);
  const journals = useGLStore((s) => s.journals);
  const [tab, setTab] = useState<Tab>('journals');
  const [creating, setCreating] = useState(false);
  const [openEntry, setOpenEntry] = useState<JournalEntry | null>(null);

  const tb = useMemo(() => trialBalance(journals, scope), [journals, scope]);
  const posted = useMemo(() => journals.filter((j) => (scope === 'all' || j.entity === scope)).sort((a, b) => b.date.localeCompare(a.date)), [journals, scope]);
  const balanced = tb.totalDebit === tb.totalCredit;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="General Ledger"
        subtitle={<>Double-entry books for <span className="font-semibold text-ink">{entityName(scope)}</span>{scope === 'all' ? ' (consolidated)' : ''} — every entry balanced, the trial balance ties out.</>}
        right={
          <div className="flex items-center gap-2.5">
            {canEdit ? <button type="button" onClick={() => setCreating(true)} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-4" /> New journal entry</button> : null}
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        {/* Balance health band */}
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="Total debits" money={M(tb.totalDebit)} />
          <Stat label="Total credits" money={M(tb.totalCredit)} />
          <GlassSurface tone="strong" className={cn('flex items-center gap-3 p-3.5', balanced ? '' : 'ring-2 ring-danger/40')}>
            <span className={cn('grid size-10 place-items-center rounded-xl', balanced ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>{balanced ? <CheckCircle2 className="size-5" /> : <Scale className="size-5" />}</span>
            <div><span className={cn('block font-display text-[15px] font-bold leading-none', balanced ? 'text-success' : 'text-danger')}>{balanced ? 'In balance' : 'Out of balance'}</span><span className="text-[11px] font-semibold text-ink-muted">Trial balance</span></div>
          </GlassSurface>
          <Stat label="Posted entries" value={String(posted.filter((p) => p.status === 'posted').length)} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/55">
          {([['journals', 'Journal entries', BookOpen], ['accounts', 'Chart of accounts', Layers], ['trial', 'Trial balance', Scale]] as [Tab, string, typeof BookOpen][]).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={cn('relative inline-flex items-center gap-1.5 px-3.5 pb-2.5 text-[13.5px] font-semibold transition-colors', tab === id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft')}>
              <Icon className="size-4" /> {label}
              {tab === id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
            </button>
          ))}
        </div>

        {tab === 'journals' ? <JournalsTab entries={posted} onOpen={setOpenEntry} /> : null}
        {tab === 'accounts' ? <AccountsTab journals={journals} scope={scope} /> : null}
        {tab === 'trial' ? <TrialTab tb={tb} /> : null}
      </div>

      {creating ? <JournalCreator scope={scope} onClose={() => setCreating(false)} /> : null}
      <EntryDrawer entry={openEntry} onClose={() => setOpenEntry(null)} />
    </div>
  );
}

function JournalsTab({ entries, onOpen }: { entries: JournalEntry[]; onOpen: (e: JournalEntry) => void }) {
  return (
    <GlassSurface tone="strong" className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-[90px_1fr_110px_120px_90px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
        <span>Date</span><span>Entry</span><span>Source</span><span className="text-right">Amount</span><span className="text-right">Status</span>
      </div>
      <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {entries.map((e) => {
          const total = e.lines.reduce((a, l) => a + l.debit, 0n);
          return (
            <li key={e.id}>
              <button type="button" onClick={() => onOpen(e)} className="grid w-full grid-cols-[90px_1fr_110px_120px_90px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
                <span className="text-[12px] tabular text-ink-soft">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{e.memo}</p><p className="truncate font-mono text-[11px] text-ink-muted">{e.ref} · {e.lines.length} lines</p></div>
                <span><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SOURCE_TONE[e.source])}>{e.source}</span></span>
                <MoneyCell amount={M(total)} size="sm" className="text-right font-bold !text-[13px]" />
                <span className="flex justify-end"><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', e.status === 'posted' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>{e.status}</span></span>
              </button>
            </li>
          );
        })}
        {entries.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No journal entries for this entity.</li> : null}
      </ul>
    </GlassSurface>
  );
}

function AccountsTab({ journals, scope }: { journals: JournalEntry[]; scope: ReturnType<typeof useEntityStore.getState>['scope'] }) {
  const groups = useMemo(() => {
    return (Object.keys(ACCOUNT_TYPE_META) as AccountType[]).map((type) => ({
      type,
      accounts: [].filter((a) => a.type === type).map((a) => ({ ...a, bal: displayBalance(a.code, journals, scope) })),
    }));
  }, [journals, scope]);
  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        {groups.map((g) => (
          <GlassSurface key={g.type} tone="strong" className="flex flex-col p-5">
            <h3 className="mb-2 font-display text-[14px] font-bold text-ink">{ACCOUNT_TYPE_META[g.type].label}</h3>
            <ul className="flex flex-col">
              {g.accounts.map((a) => (
                <li key={a.code} className="flex items-center gap-3 border-b border-white/40 py-2 last:border-0">
                  <span className="font-mono text-[11px] text-ink-muted">{a.code}</span>
                  <span className="flex-1 truncate text-[12.5px] font-medium text-ink">{a.name}</span>
                  <MoneyCell amount={M(a.bal)} size="sm" className={cn('font-semibold !text-[12.5px]', a.bal < 0n ? 'text-danger' : 'text-ink-soft')} />
                </li>
              ))}
            </ul>
          </GlassSurface>
        ))}
      </div>
    </div>
  );
}

function TrialTab({ tb }: { tb: ReturnType<typeof trialBalance> }) {
  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      <GlassSurface tone="strong" className="mx-auto max-w-3xl p-6">
        <h3 className="font-display text-lg font-bold text-ink">Trial balance · May 2025</h3>
        <div className="mt-4 grid grid-cols-[1fr_140px_140px] gap-x-4 border-b border-white/45 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
          <span>Account</span><span className="text-right">Debit</span><span className="text-right">Credit</span>
        </div>
        <ul>
          {tb.rows.map((r) => (
            <li key={r.code} className="grid grid-cols-[1fr_140px_140px] gap-x-4 border-b border-white/40 py-2 text-[12.5px]">
              <span className="text-ink"><span className="font-mono text-ink-muted">{r.code}</span> · {r.name}</span>
              <span className="text-right tabular text-ink-soft">{r.debit > 0n ? <MoneyCell amount={M(r.debit)} size="sm" className="!text-[12.5px]" /> : '—'}</span>
              <span className="text-right tabular text-ink-soft">{r.credit > 0n ? <MoneyCell amount={M(r.credit)} size="sm" className="!text-[12.5px]" /> : '—'}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid grid-cols-[1fr_140px_140px] gap-x-4 rounded-xl bg-white/55 px-2 py-2.5 ring-1 ring-white/60">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink">{tb.totalDebit === tb.totalCredit ? <><CheckCircle2 className="size-4 text-success" /> Totals — in balance</> : 'Totals'}</span>
          <MoneyCell amount={M(tb.totalDebit)} size="sm" className="text-right font-bold !text-[13px]" />
          <MoneyCell amount={M(tb.totalCredit)} size="sm" className="text-right font-bold !text-[13px]" />
        </div>
      </GlassSurface>
    </div>
  );
}

function EntryDrawer({ entry: e, onClose }: { entry: JournalEntry | null; onClose: () => void }) {
  return (
    <Dialog.Root open={e !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(520px,95vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          {e ? (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
                <div><Dialog.Title className="font-display text-[15px] font-bold text-ink">{e.memo}</Dialog.Title><p className="font-mono text-[11.5px] text-ink-muted">{e.ref} · {new Date(e.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
                <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
              </header>
              <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-[1fr_120px_120px] gap-x-3 border-b border-white/45 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted"><span>Account</span><span className="text-right">Debit</span><span className="text-right">Credit</span></div>
                <ul>
                  {e.lines.map((l, i) => (
                    <li key={i} className="grid grid-cols-[1fr_120px_120px] gap-x-3 border-b border-white/40 py-2.5 text-[12.5px]">
                      <span className="min-w-0"><span className="font-mono text-ink-muted">{l.account}</span> · {accountByCode(l.account)?.name}{l.costCenter ? <span className="ml-1 rounded bg-white/70 px-1 text-[9.5px] font-bold text-ink-muted">{[].find((c) => c.id === l.costCenter)?.name}</span> : null}</span>
                      <span className="text-right tabular text-ink">{l.debit > 0n ? <MoneyCell amount={M(l.debit)} size="sm" className="!text-[12.5px]" /> : ''}</span>
                      <span className="text-right tabular text-ink">{l.credit > 0n ? <MoneyCell amount={M(l.credit)} size="sm" className="!text-[12.5px]" /> : ''}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 grid grid-cols-[1fr_120px_120px] gap-x-3 rounded-xl bg-success-soft/40 px-2 py-2 ring-1 ring-success/20 text-[12.5px] font-bold">
                  <span className="inline-flex items-center gap-1.5 text-success"><Check className="size-3.5" /> Balanced</span>
                  <MoneyCell amount={M(e.lines.reduce((a, l) => a + l.debit, 0n))} size="sm" className="text-right !text-[12.5px]" />
                  <MoneyCell amount={M(e.lines.reduce((a, l) => a + l.credit, 0n))} size="sm" className="text-right !text-[12.5px]" />
                </div>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface DraftLine { account: string; debit: string; credit: string; costCenter: string }
const blankLine = (): DraftLine => ({ account: '1010', debit: '', credit: '', costCenter: '' });

function JournalCreator({ scope, onClose }: { scope: ReturnType<typeof useEntityStore.getState>['scope']; onClose: () => void }) {
  const hydrateGL = useGLStore((s) => s.hydrate);
  const postJournal = useGLStore((s) => s.postJournal);
  const hydratePayables = usePayablesStore((s) => s.hydrate);
  const hydrateTransactions = useTransactionsStore((s) => s.hydrate);
  const token = useSessionStore((s) => s.session?.token ?? '');
  const [memo, setMemo] = useState('');
  const [ref, setRef] = useState('');
  const [source, setSource] = useState<JournalSource>('manual');
  const [lines, setLines] = useState<DraftLine[]>([blankLine(), blankLine()]);

  const toMinor = (s: string) => BigInt(Math.round((parseFloat(s || '0') || 0) * 100));
  const drTotal = lines.reduce((a, l) => a + toMinor(l.debit), 0n);
  const crTotal = lines.reduce((a, l) => a + toMinor(l.credit), 0n);
  const diff = drTotal - crTotal;
  const jLines: JournalLine[] = lines
    .filter((l) => toMinor(l.debit) > 0n || toMinor(l.credit) > 0n)
    .map((l) => ({ account: l.account, debit: toMinor(l.debit), credit: toMinor(l.credit), ...(l.costCenter ? { costCenter: l.costCenter } : {}) }));
  const canPost = linesBalanced(jLines) && memo.trim() !== '';

  const setLine = (i: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const post = async () => {
    const entity = scope === 'all' ? 'ent-rw' : scope;
    if (token) {
      try {
        const snapshot = await createJournalEntry(getApiBaseUrl(), token, {
          date: new Date().toISOString().slice(0, 10),
          ref: ref || `JE-${Date.now().toString().slice(-5)}`,
          memo,
          source,
          entity,
          lines: jLines.map((line) => ({
            account: line.account,
            debit: line.debit.toString(),
            credit: line.credit.toString(),
            ...(line.costCenter ? { costCenter: line.costCenter } : {}),
          })),
        });
        hydrateGL(snapshot.journals);
        hydratePayables(snapshot.bills);
        hydrateTransactions(snapshot.transactions);
        toast({ tone: 'success', title: 'Journal posted', body: `${memo} posted to the ledger - debits = credits.` });
        onClose();
        return;
      } catch (error) {
        toast({ tone: 'danger', title: 'Journal failed', body: error instanceof Error ? error.message : 'Unable to post journal.' });
        return;
      }
    }
    const ok = postJournal({ date: new Date().toISOString().slice(0, 10), ref: ref || `JE-${Date.now().toString().slice(-5)}`, memo, source, entity, lines: jLines });
    if (ok) { toast({ tone: 'success', title: 'Journal posted', body: `${memo} posted to the ledger — debits = credits.` }); onClose(); }
    else toast({ tone: 'danger', title: 'Not balanced', body: 'Debits must equal credits before posting.' });
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/25 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-[95] flex h-[min(86vh,720px)] w-[min(820px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          <header className="flex items-center justify-between gap-3 border-b border-white/55 px-6 py-4">
            <Dialog.Title className="font-display text-[16px] font-bold text-ink">New journal entry</Dialog.Title>
            <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
          </header>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-[2fr_1fr_1fr]">
              <Field label="Memo"><input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="What is this entry for?" className={inp} /></Field>
              <Field label="Reference"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="auto" className={inp} /></Field>
              <Field label="Source"><select value={source} onChange={(e) => setSource(e.target.value as JournalSource)} className={inp}>{(['manual', 'AP', 'AR', 'bank', 'payroll', 'tax', 'claims'] as JournalSource[]).map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-white/60">
              <div className="grid grid-cols-[1fr_130px_130px_130px_36px] gap-2 bg-white/60 px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted"><span>Account</span><span className="text-right">Debit</span><span className="text-right">Credit</span><span>Cost center</span><span /></div>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_130px_130px_130px_36px] items-center gap-2 border-t border-white/45 bg-white/30 px-3 py-2">
                  <select value={l.account} onChange={(e) => setLine(i, { account: e.target.value })} className={inpSm}>{[].map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select>
                  <input value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value.replace(/[^0-9.]/g, ''), credit: '' })} inputMode="decimal" placeholder="0.00" className={cn(inpSm, 'text-right')} />
                  <input value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value.replace(/[^0-9.]/g, ''), debit: '' })} inputMode="decimal" placeholder="0.00" className={cn(inpSm, 'text-right')} />
                  <select value={l.costCenter} onChange={(e) => setLine(i, { costCenter: e.target.value })} className={inpSm}><option value="">—</option>{[].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <button type="button" onClick={() => setLines((ls) => ls.length > 2 ? ls.filter((_, idx) => idx !== i) : ls)} className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger" title="Remove line"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setLines((ls) => [...ls, blankLine()])} className="flex w-full items-center gap-1.5 border-t border-white/45 bg-white/40 px-3 py-2 text-[12px] font-bold text-brand hover:bg-white/60"><Plus className="size-3.5" /> Add line</button>
            </div>

            <div className="mt-3 flex items-center justify-end gap-6 text-[13px]">
              <span className="text-ink-muted">Debits <MoneyCell amount={M(drTotal)} size="sm" className="ml-1 font-bold !text-[13px] text-ink" /></span>
              <span className="text-ink-muted">Credits <MoneyCell amount={M(crTotal)} size="sm" className="ml-1 font-bold !text-[13px] text-ink" /></span>
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold', diff === 0n && drTotal > 0n ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
                {diff === 0n && drTotal > 0n ? <><Check className="size-3.5" /> Balanced</> : `Difference ${(Number(diff) / 100).toLocaleString()}`}
              </span>
            </div>
          </div>
          <footer className="flex items-center gap-2 border-t border-white/55 p-4">
            <Dialog.Close className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white">Cancel</Dialog.Close>
            <button type="button" disabled={!canPost} onClick={post} className={cn('inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold shadow-glass-soft', canPost ? 'bg-gradient-to-br from-brand to-brand-ink text-white hover:brightness-110' : 'cursor-not-allowed bg-ink/15 text-ink-muted')}><Check className="size-4" /> Post entry</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Stat({ label, money, value }: { label: string; money?: Money; value?: string }) {
  return (
    <GlassSurface tone="strong" className="p-3.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      {money ? <MoneyCell amount={money} size="lg" className="!text-2xl font-bold text-ink" /> : <span className="block font-display text-2xl font-bold tabular text-ink">{value}</span>}
    </GlassSurface>
  );
}

const inp = 'h-11 w-full rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
const inpSm = 'h-9 w-full rounded-lg bg-white/70 px-2.5 text-[12.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}
