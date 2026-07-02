import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Check, FileText, Search, Send, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { ConfidenceChip, GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { useSession } from '../../auth/hooks';
import { seedTierStats } from '../../seed/reconciliation';
import type { FieldDelta, Reconciliation, ReconciliationTier } from '../../seed/reconciliation';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';

const TIER_TONE: Record<ReconciliationTier, string> = {
  auto: 'bg-success-soft text-success',
  suggested: 'bg-lavender-soft text-lavender',
  review: 'bg-warning-soft text-warning',
  duplicate: 'bg-info-soft text-info',
  suspicious: 'bg-danger-soft text-danger',
};
const TIER_LABEL: Record<ReconciliationTier, string> = { auto: 'Auto', suggested: 'Suggested', review: 'Needs review', duplicate: 'Duplicate', suspicious: 'Suspicious' };
const DELTA_TONE: Record<FieldDelta['status'], string> = { match: 'text-success', near: 'text-warning', diff: 'text-danger' };

// Finance Lead "Reconciliation" — the REVIEW & APPROVE control room. The operator
// prepares matches; the Lead inspects the match quality (field-by-field deltas +
// evidence) and approves them to post, or sends them back. Distinct from the
// owner's high-level assurance and from the broad Action Center queue.
export function FinanceLeadReconciliation() {
  const recons = useWorkflowStore((s) => s.reconciliations);
  const approveRecon = useWorkflowStore((s) => s.approveReconciliation);
  const rejectRecon = useWorkflowStore((s) => s.rejectReconciliation);
  const session = useSession();
  const actor = { name: session?.user.displayName ?? 'Finance Lead', role: session?.roles[0]?.name ?? 'Finance Lead' };

  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<ReconciliationTier | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recons
      .filter((r) => r.stage !== 'posted')
      .filter((r) => (tier === 'all' ? true : r.tier === tier))
      .filter((r) => (q === '' ? true : [r.transaction.counterparty, r.transaction.reference ?? '', r.suggestedRecord?.reference ?? ''].some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => a.confidence - b.confidence);
  }, [recons, query, tier]);

  const selected = recons.find((r) => r.id === selectedId) ?? null;
  const counts = useMemo(() => ({
    prepared: recons.filter((r) => r.stage === 'prepared').length,
    review: recons.filter((r) => r.tier === 'review' && r.stage !== 'posted').length,
    suggested: recons.filter((r) => r.tier === 'suggested' && r.stage !== 'posted').length,
    suspicious: recons.filter((r) => r.tier === 'suspicious' && r.stage !== 'posted').length,
  }), [recons]);

  const approve = (r: Reconciliation) => { approveRecon(r.id, actor); toast({ tone: 'success', title: 'Match approved & posted', body: `${r.transaction.counterparty} reconciled and written to the audit log.` }); setSelectedId(null); };
  const sendBack = (r: Reconciliation) => { rejectRecon(r.id); toast({ tone: 'warning', title: 'Sent back', body: `${r.transaction.counterparty} returned to the operator to re-prepare.` }); setSelectedId(null); };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Reconciliation" subtitle="Review the matches Kora and your team prepared — inspect the deltas and evidence, then approve to post or send back." right={<DateRangePill label="May 2025" />} />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="Prepared — to approve" value={counts.prepared} tone="text-success" active={tier === 'all'} />
          <Stat label="Needs review" value={counts.review} tone="text-warning" active={tier === 'review'} onClick={() => setTier(tier === 'review' ? 'all' : 'review')} />
          <Stat label="Suggested" value={counts.suggested} tone="text-lavender" active={tier === 'suggested'} onClick={() => setTier(tier === 'suggested' ? 'all' : 'suggested')} />
          <Stat label="Suspicious" value={counts.suspicious} tone="text-danger" active={tier === 'suspicious'} onClick={() => setTier(tier === 'suspicious' ? 'all' : 'suspicious')} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_280px]">
          <GlassSurface tone="strong" className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-white/55 p-4">
              <div className="flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
                <Search className="size-4 text-ink-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search party or reference…" className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>
              <select value={tier} onChange={(e) => setTier(e.target.value as ReconciliationTier | 'all')} className="h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none">
                <option value="all">All tiers</option>
                {(['suggested', 'review', 'duplicate', 'suspicious'] as ReconciliationTier[]).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
            </div>
            <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {queue.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelectedId(r.id)} className="flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55">
                    <PartyAvatar name={r.transaction.counterparty} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-ink">{r.transaction.counterparty}</p>
                        <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', TIER_TONE[r.tier])}>{TIER_LABEL[r.tier]}</span>
                        {r.stage === 'prepared' ? <span className="shrink-0 rounded-full bg-success-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-success">ready</span> : null}
                      </div>
                      <p className="truncate text-[11px] text-ink-muted">{r.transaction.source} · {r.suggestedRecord?.reference ?? r.transaction.reference ?? 'no ref'} · {r.ageText}</p>
                    </div>
                    <ConfidenceChip score={r.confidence} />
                    <MoneyCell amount={r.transaction.amount} size="sm" className="shrink-0 font-bold !text-[13px]" />
                  </button>
                </li>
              ))}
              {queue.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">Nothing to review — all caught up. 🎉</li> : null}
            </ul>
          </GlassSurface>

          <div className="flex flex-col gap-4">
            <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-4">
              <h4 className="text-[12px] font-bold text-ink">By tier</h4>
              {seedTierStats.map((t) => (
                <button key={t.tier} type="button" onClick={() => setTier(t.tier === 'auto' ? 'all' : t.tier)} className="flex items-center justify-between rounded-xl bg-white/55 p-2.5 text-left ring-1 ring-white/60 hover:bg-white">
                  <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold text-ink"><span className={cn('size-2 rounded-full', TIER_TONE[t.tier])} />{t.label}</span>
                  <span className="text-[11.5px] font-bold tabular text-ink-soft">{t.count.toLocaleString()}</span>
                </button>
              ))}
            </GlassSurface>
            <GlassSurface tone="strong" className="flex flex-col gap-2 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15">
              <header className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-ai" /><h4 className="text-[12px] font-bold text-ink">Reconciliation agent</h4></header>
              <button type="button" onClick={() => setTier('suspicious')} className="rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white"><span className="font-bold text-danger">1 suspicious match</span> needs your decision before posting. <span className="font-semibold text-brand">Review →</span></button>
            </GlassSurface>
          </div>
        </div>
      </div>

      <MatchDrawer recon={selected} onClose={() => setSelectedId(null)} onApprove={approve} onSendBack={sendBack} />
    </div>
  );
}

function MatchDrawer({ recon: r, onClose, onApprove, onSendBack }: { recon: Reconciliation | null; onClose: () => void; onApprove: (r: Reconciliation) => void; onSendBack: (r: Reconciliation) => void }) {
  return (
    <Dialog.Root open={r !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(500px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          {r ? (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
                <div className="flex items-center gap-3">
                  <PartyAvatar name={r.transaction.counterparty} size="lg" />
                  <div><Dialog.Title className="font-display text-[15px] font-bold text-ink">{r.transaction.counterparty}</Dialog.Title><p className="text-[11.5px] text-ink-muted">{r.transaction.source} · {r.ageText}</p></div>
                </div>
                <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
              </header>
              <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
                <div className="flex items-center justify-between">
                  <div><span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Amount</span><MoneyCell amount={r.transaction.amount} size="xl" className="!text-3xl font-bold text-ink" /></div>
                  <ConfidenceChip score={r.confidence} />
                </div>

                {/* Two sides of the match */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60"><p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Bank</p><p className="text-[12.5px] font-bold text-ink">{r.transaction.source}</p><p className="font-mono text-[11px] text-ink-soft">{r.transaction.reference ?? '—'}</p></div>
                  <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60"><p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Record</p><p className="text-[12.5px] font-bold text-ink">{r.suggestedRecord ? r.suggestedRecord.partyName : 'No match'}</p><p className="font-mono text-[11px] text-ink-soft">{r.suggestedRecord?.reference ?? '—'}</p></div>
                </div>

                {/* Field-by-field deltas */}
                {r.deltas.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Field comparison</p>
                    <ul className="overflow-hidden rounded-2xl ring-1 ring-white/60">
                      {r.deltas.map((d) => (
                        <li key={d.field} className="grid grid-cols-[80px_1fr_1fr] items-center gap-2 border-b border-white/45 bg-white/40 px-3 py-2 text-[11.5px] last:border-0">
                          <span className="font-bold capitalize text-ink-muted">{d.field}</span>
                          <span className="truncate text-ink-soft">{d.bankValue}</span>
                          <span className={cn('truncate text-right font-semibold', DELTA_TONE[d.status])}>{d.recordValue}{d.status !== 'match' ? ' ⚠' : ' ✓'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <GlassSurface noBlur tone="subtle" className="bg-ai-soft/40 p-3.5 ring-1 ring-ai/15"><p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ai"><Sparkles className="size-3.5" /> Agent read</p><p className="mt-1 text-[12.5px] text-ink">{r.reason}</p></GlassSurface>

                {r.evidence.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Evidence</p>
                    <ul className="flex flex-col gap-2">
                      {r.evidence.map((d) => (
                        <li key={d.id}><button type="button" onClick={() => openDoc({ name: d.name, kind: d.kind, sizeText: d.sizeText, ...(d.pageRef ? { context: d.pageRef } : {}) })} className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"><FileText className="size-4" /></span>
                          <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-ink">{d.name}</p><p className="text-[11px] text-ink-muted">{d.kind}{d.pageRef ? ` · ${d.pageRef}` : ''}</p></div>
                          <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70">View</span>
                        </button></li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                <button type="button" onClick={() => onSendBack(r)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-danger ring-1 ring-white/70 hover:bg-white"><Send className="size-4" /> Send back</button>
                <button type="button" onClick={() => onApprove(r)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><Check className="size-4" /> Approve &amp; post <ArrowRight className="size-4" /></button>
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
    <GlassSurface tone="strong" className={cn('p-3.5', active && onClick && 'ring-2 ring-brand/40')}>
      <button type="button" onClick={onClick} disabled={!onClick} className={cn('flex w-full flex-col gap-0.5 text-left', onClick && 'cursor-pointer')}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
        <span className={cn('font-display text-2xl font-bold tabular', tone)}>{value}</span>
        {onClick ? <span className="text-[10.5px] font-semibold text-brand">{active ? 'Filtered · clear' : 'Filter'}</span> : <span className="text-[10.5px] font-semibold text-ink-muted">awaiting you</span>}
      </button>
    </GlassSurface>
  );
}
