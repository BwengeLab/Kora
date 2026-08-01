import * as Dialog from '@radix-ui/react-dialog';
import { Download, FileText, GitBranch, MessageSquare, ShieldCheck, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { ConfidenceChip, DonutChart, GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import type { Money } from '../../lib/money';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';
import { useSessionStore } from '../../state/sessionStore';
import { getApiBaseUrl } from '../../api/client';
import { downloadReconciliationSummary, workflowReconciliationAction } from '../../api/workflow';

// Org Owner "Reconciliation" — an ASSURANCE view, not the operator's cockpit.
// The owner does not match items; they see whether money is under control, what
// is slipping, and push it to the people who do the work (delegate / ask /
// acknowledge). Role separation is the point.
export function ReconciliationOverview({ readOnly = false }: { readOnly?: boolean }) {
  const recons = useWorkflowStore((s) => s.reconciliations);
  const hydrate = useWorkflowStore((s) => s.hydrate);
  const session = useSessionStore((s) => s.session);
  const open = recons.filter((r) => r.stage === 'reviewing' || r.stage === 'detected');
  const [selected, setSelected] = useState<Reconciliation | null>(null);

  const runAction = async (r: Reconciliation, action: 'assign' | 'ask' | 'acknowledge') => {
    if (!session?.token) return;
    try {
      const response = await workflowReconciliationAction(getApiBaseUrl(), session.token, r.id, action);
      hydrate(response.snapshot);
      setSelected(null);
      const labels = { assign: 'Delegated to finance', ask: 'Explanation requested', acknowledge: 'Exception acknowledged' };
      toast({ tone: action === 'acknowledge' ? 'success' : 'info', title: labels[action], body: `${r.transaction.counterparty} was updated and logged in the audit trail.` });
    } catch (error) {
      toast({ tone: 'danger', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not update this exception.' });
    }
  };

  const exportSummary = async () => {
    if (!session?.token) return;
    try {
      const blob = await downloadReconciliationSummary(getApiBaseUrl(), session.token);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'kora-reconciliation-summary.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
      toast({ tone: 'success', title: 'Export downloaded', body: 'The reconciliation control summary is ready.' });
    } catch (error) {
      toast({ tone: 'danger', title: 'Export failed', body: error instanceof Error ? error.message : 'Could not export reconciliation.' });
    }
  };

  const tierStats = [
    { tier: 'auto', label: 'Auto matched', color: '#16a37b' },
    { tier: 'suggested', label: 'Suggested', color: '#8b5cf6' },
    { tier: 'review', label: 'Needs review', color: '#e89914' },
    { tier: 'duplicate', label: 'Duplicate risk', color: '#3b86ff' },
    { tier: 'suspicious', label: 'Suspicious', color: '#dc4848' },
  ].map((item) => ({
    ...item,
    count: recons.filter((r) => r.tier === item.tier).length,
  }));

  const matched = tierStats.find((t) => t.tier === 'auto')?.count ?? 0;
  const totalAll = tierStats.reduce((a, t) => a + t.count, 0);
  const autoRate = totalAll === 0 ? 0 : Math.round((matched / totalAll) * 100);

  // Value at risk = unmatched / unexplained money the owner is accountable for.
  const valueAtRisk: Money = useMemo(
    () => ({ amountMinor: open.reduce((a, r) => a + (r.unexplainedDifference?.amountMinor ?? r.transaction.amount.amountMinor), 0n), currency: 'USD' }),
    [open],
  );

  const slices = tierStats.map((t) => ({
    name: t.label,
    value: t.count,
    color: t.color,
  }));

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Reconciliation"
        subtitle={readOnly ? <>Read-only assurance — verify that money is matched to reality and evidence is complete. You change nothing.</> : <>Assurance that money is matched to reality. You oversee control health and push exceptions to finance — the team does the matching.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => void exportSummary()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink">
              <Download className="size-4" /> Control summary
            </button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        <section className="grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12">
          <GlassSurface tone="strong" className="flex items-center gap-6 p-6 @5xl:col-span-5">
            <DonutChart slices={slices} centerLabel={totalAll.toLocaleString()} centerSub="Total" size={180} />
            <ul className="flex flex-1 flex-col gap-2.5">
              {tierStats.map((t, i) => (
                <li key={t.tier} className="flex items-center gap-2.5">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: slices[i]!.color }} />
                  <span className="flex-1 text-[12.5px] font-medium text-ink">{t.label}</span>
                  <span className="text-[12.5px] font-bold tabular text-ink">{t.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </GlassSurface>

          <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-3 @5xl:col-span-7">
            <GlassSurface tone="strong" className="flex flex-col justify-center gap-1.5 p-6">
              <span className="text-[12px] font-semibold text-ink-muted">Auto-match rate</span>
              <span className="font-display text-4xl font-bold text-ink tabular">{autoRate}%</span>
              <span className="text-[11.5px] text-ink-muted">Reconciled with no human touch</span>
            </GlassSurface>
            <GlassSurface tone="strong" className="flex flex-col justify-center gap-1.5 p-6">
              <span className="text-[12px] font-semibold text-ink-muted">Needs attention</span>
              <span className="font-display text-4xl font-bold text-warning tabular">{open.length}</span>
              <span className="text-[11.5px] text-ink-muted">Exceptions awaiting the team</span>
            </GlassSurface>
            <GlassSurface tone="strong" className="flex flex-col justify-center gap-1.5 p-6">
              <span className="text-[12px] font-semibold text-ink-muted">Value at risk</span>
              <MoneyCell amount={valueAtRisk} size="lg" className="!text-3xl font-bold text-danger" />
              <span className="text-[11.5px] text-ink-muted">Unmatched / unexplained money</span>
            </GlassSurface>
          </div>
        </section>

        {/* Exceptions — owner oversight, drill to understand & delegate */}
        <GlassSurface tone="strong" className="flex flex-col gap-3 p-6">
          <header className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">Exceptions to oversee</h3>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted"><ShieldCheck className="size-3.5" /> {readOnly ? 'Read-only — inspect & verify evidence' : 'You review & delegate — the team matches'}</span>
          </header>
          <ul className="flex flex-col gap-1.5">
            {open.slice(0, 8).map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setSelected(r)} className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 transition-colors hover:bg-white">
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', r.tier === 'suspicious' ? 'bg-danger-soft text-danger' : 'bg-ai-soft text-ai')}><GitBranch className="size-4" /></span>
                  <PartyAvatar name={r.transaction.counterparty} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">{r.transaction.counterparty}</p>
                    <p className="truncate text-[11px] text-ink-muted">{r.transaction.source} · {r.reason}</p>
                  </div>
                  <ConfidenceChip score={r.confidence} />
                  <MoneyCell amount={r.transaction.amount} size="sm" className="shrink-0 font-bold !text-[13px]" />
                </button>
              </li>
            ))}
            {open.length === 0 ? <li className="grid place-items-center py-10 text-[12.5px] text-ink-muted">No open exceptions — everything is matched. 🎉</li> : null}
          </ul>
        </GlassSurface>
      </div>

      <ExceptionDrawer
        item={selected}
        readOnly={readOnly}
        onClose={() => setSelected(null)}
        onAssign={(r) => { void runAction(r, 'assign'); }}
        onAsk={(r) => { void runAction(r, 'ask'); }}
        onAck={(r) => { void runAction(r, 'acknowledge'); }}
      />
    </div>
  );
}

function ExceptionDrawer({ item, onClose, onAssign, onAsk, onAck, readOnly = false }: { item: Reconciliation | null; onClose: () => void; onAssign: (r: Reconciliation) => void; onAsk: (r: Reconciliation) => void; onAck: (r: Reconciliation) => void; readOnly?: boolean }) {
  const r = item;
  return (
    <Dialog.Root open={r !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
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
                <GlassSurface noBlur tone="subtle" className="bg-white/60 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Why it's an exception</p><p className="mt-1 text-[13.5px] text-ink">{r.reason}</p></GlassSurface>
                {r.unexplainedDifference ? (
                  <div className="rounded-2xl bg-danger-soft/50 p-3.5 ring-1 ring-danger/15"><p className="text-[11px] font-bold uppercase tracking-wider text-danger">Unexplained difference</p><MoneyCell amount={r.unexplainedDifference} size="lg" className="!text-xl font-bold text-danger" /></div>
                ) : null}
                {r.suggestedRecord ? (
                  <div className="rounded-2xl bg-brand-soft/50 p-3.5 ring-1 ring-brand/15">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-ink">Suggested match</p>
                    <div className="mt-1 flex items-center justify-between"><div><p className="text-[13px] font-bold text-ink">{r.suggestedRecord.partyName}</p><p className="font-mono text-[11px] text-ink-muted">{r.suggestedRecord.reference}</p></div><MoneyCell amount={r.suggestedRecord.amount} size="sm" className="font-bold !text-[13px]" /></div>
                  </div>
                ) : null}
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
                <p className="rounded-2xl bg-white/45 p-3 text-[11.5px] text-ink-muted ring-1 ring-white/50">{readOnly ? 'You are reviewing this as an auditor — inspect the match and evidence. You make no changes.' : "As the owner you don't match this yourself — delegate it to finance, ask for an explanation, or acknowledge that you've reviewed it."}</p>
              </div>
              {readOnly ? (
                <footer className="border-t border-white/55 p-4"><span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/60 text-[12.5px] font-bold text-ink-muted"><ShieldCheck className="size-4" /> Read-only · verified against evidence</span></footer>
              ) : (
                <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                  <button type="button" onClick={() => onAck(r)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white">Acknowledge</button>
                  <button type="button" onClick={() => onAsk(r)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink ring-1 ring-white/70 hover:bg-white"><MessageSquare className="size-4" /> Ask</button>
                  <button type="button" onClick={() => onAssign(r)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110"><UserPlus className="size-4" /> Delegate to finance</button>
                </footer>
              )}
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
