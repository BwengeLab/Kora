import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDownLeft, ArrowUpRight, Check, FileText, Flag, Link2, Send, X } from 'lucide-react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { CATEGORY_META, type CashCategory } from '../../seed/cashLedger';
import { REVIEW_META, useTransactionsStore, type Txn } from '../../state/transactionsStore';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';

// Detail + work drawer for one transaction. The preparer confirms the
// classification, attaches evidence, then either prepares it for reconciliation
// or flags it for the Finance Lead. Read-only mode (auditor/lead) hides actions.
export function TxnDrawer({ txn, onClose, readOnly }: { txn: Txn | null; onClose: () => void; readOnly?: boolean }) {
  const classify = useTransactionsStore((s) => s.classify);
  const prepare = useTransactionsStore((s) => s.prepare);
  const flag = useTransactionsStore((s) => s.flag);
  const t = txn;
  const isIn = t?.direction === 'in';

  return (
    <Dialog.Root open={t !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          {t ? (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className={cn('grid size-11 place-items-center rounded-2xl', isIn ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                    {isIn ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                  </span>
                  <div>
                    <Dialog.Title className="font-display text-[15px] font-bold text-ink">Transaction</Dialog.Title>
                    <p className="text-[11.5px] text-ink-muted">{t.reference} · {new Date(t.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
              </header>

              <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{isIn ? 'Money in' : 'Money out'}</span>
                    <p className={cn('font-display text-3xl font-bold tabular', isIn ? 'text-success' : 'text-danger')}>
                      {isIn ? '+' : '−'}<MoneyCell amount={t.amount} size="xl" className={cn('!text-3xl', isIn ? 'text-success' : 'text-danger')} />
                    </p>
                  </div>
                  <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', REVIEW_META[t.review].tone)}>{REVIEW_META[t.review].label}</span>
                </div>

                <GlassSurface noBlur tone="subtle" className="bg-white/60 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Purpose — the why</p>
                  <p className="mt-1 text-[14px] font-semibold text-ink">{t.purpose}</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">{t.description}</p>
                </GlassSurface>

                <div className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
                  <PartyAvatar name={t.counterparty} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">{t.counterparty}</p>
                    <p className="text-[11px] text-ink-muted">{t.account} · Counterparty</p>
                  </div>
                </div>

                {/* Classification — editable for the preparer */}
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Classification</p>
                  {readOnly ? (
                    <span className={cn('inline-block rounded-lg px-2.5 py-1 text-[12px] font-bold', CATEGORY_META[t.category].tone)}>{CATEGORY_META[t.category].label}</span>
                  ) : (
                    <select value={t.category} onChange={(e) => { classify(t.id, e.target.value as CashCategory); toast({ tone: 'success', title: 'Reclassified', body: `${t.reference} → ${CATEGORY_META[e.target.value as CashCategory].label}` }); }} className="h-11 w-full rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30">
                      {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  )}
                </div>

                {t.linked ? (
                  <button type="button" onClick={() => toast({ tone: 'info', title: 'Opening linked record', body: `${t.linked!.kind.toUpperCase()} ${t.linked!.ref}` })} className="flex w-full items-center gap-3 rounded-2xl bg-brand-soft/60 p-3 text-left ring-1 ring-brand/15 hover:bg-brand-soft">
                    <Link2 className="size-4 text-brand-ink" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-brand-ink">Linked {t.linked.kind}</p>
                      <p className="truncate font-mono text-[11px] text-ink-soft">{t.linked.ref}</p>
                    </div>
                  </button>
                ) : null}

                {t.evidence.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Evidence</p>
                    <ul className="flex flex-col gap-2">
                      {t.evidence.map((d) => (
                        <li key={d.id}>
                          <button type="button" onClick={() => openDoc({ name: d.name, kind: d.kind, sizeText: d.sizeText, context: `${t.reference} · ${t.counterparty}` })} className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"><FileText className="size-4" /></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12.5px] font-semibold text-ink">{d.name}</p>
                              <p className="truncate text-[11px] text-ink-muted">{d.kind} · {d.sizeText}</p>
                            </div>
                            <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70">View</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-warning-soft/50 p-3 text-[12px] font-medium text-warning ring-1 ring-warning/20">No supporting document — {readOnly ? 'incomplete audit trail.' : 'request one before preparing.'}</p>
                )}

                {t.note ? <p className="rounded-2xl bg-white/55 p-3 text-[12px] text-ink-soft ring-1 ring-white/60"><span className="font-bold text-ink">Note: </span>{t.note}</p> : null}
              </div>

              {!readOnly && t.review !== 'prepared' ? (
                <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                  <button type="button" onClick={() => { flag(t.id); toast({ tone: 'warning', title: 'Flagged for Finance Lead', body: `${t.reference} escalated for review.` }); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-danger ring-1 ring-white/70 hover:bg-white">
                    <Flag className="size-4" /> Flag
                  </button>
                  <button type="button" onClick={() => { prepare(t.id); toast({ tone: 'success', title: 'Prepared for reconciliation', body: `${t.reference} handed to the matching queue.` }); onClose(); }} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
                    <Send className="size-4" /> Prepare for reconciliation
                  </button>
                </footer>
              ) : t.review === 'prepared' ? (
                <footer className="border-t border-white/55 p-4">
                  <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success-soft text-[13px] font-bold text-success"><Check className="size-4" /> Prepared — in reconciliation queue</span>
                </footer>
              ) : null}
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
