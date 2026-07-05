import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDownLeft, ArrowUpRight, Check, FileText, Flag, Link2, MessageSquare, X } from 'lucide-react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { CATEGORY_META, type CashMovement } from '../../seed/cashLedger';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';

export type LedgerMode = 'operate' | 'post' | 'oversight' | 'read';

export function MovementDrawer({
  movement,
  onClose,
  mode = 'oversight',
  onReconcile,
  onHold,
  onPost,
  onFlag,
}: {
  movement: CashMovement | null;
  onClose: () => void;
  mode?: LedgerMode;
  onReconcile?: (movement: CashMovement) => void | Promise<void>;
  onHold?: (movement: CashMovement) => void | Promise<void>;
  onPost?: (movement: CashMovement) => void | Promise<void>;
  onFlag?: (movement: CashMovement) => void | Promise<void>;
}) {
  const open = movement !== null;
  const m = movement;
  const isIn = m?.direction === 'in';

  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(440px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none"
        >
          {m ? (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className={cn('grid size-11 place-items-center rounded-2xl', isIn ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                    {isIn ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                  </span>
                  <div>
                    <Dialog.Title className="font-display text-[15px] font-bold text-ink">Cash movement</Dialog.Title>
                    <p className="text-[11.5px] text-ink-muted">{m.reference} · {new Date(m.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
              </header>

              <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{isIn ? 'Money in' : 'Money out'}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-display text-3xl font-bold tabular', isIn ? 'text-success' : 'text-danger')}>
                      {isIn ? '+' : '-'}<MoneyCell amount={m.amount} size="xl" className={cn('!text-3xl', isIn ? 'text-success' : 'text-danger')} />
                    </span>
                  </div>
                </div>

                <GlassSurface noBlur tone="subtle" className="bg-white/60 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Purpose</p>
                  <p className="mt-1 text-[14px] font-semibold text-ink">{m.purpose}</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">{m.description}</p>
                </GlassSurface>

                <div className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
                  <PartyAvatar name={m.counterparty} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">{m.counterparty}</p>
                    <p className="text-[11px] text-ink-muted">Counterparty</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  <Meta label="Category" value={CATEGORY_META[m.category].label} />
                  <Meta label="Account" value={m.account} />
                  <Meta label="Reference" value={m.reference} mono />
                  <Meta label="Reconciled" value={m.reconciled ? 'Yes' : 'Not yet'} tone={m.reconciled ? 'success' : 'warning'} />
                </dl>

                {m.linked ? (
                  <button
                    type="button"
                    onClick={() => toast({ tone: 'info', title: 'Opening linked record', body: `${m.linked!.kind.toUpperCase()} ${m.linked!.ref}` })}
                    className="flex w-full items-center gap-3 rounded-2xl bg-brand-soft/60 p-3 text-left ring-1 ring-brand/15 hover:bg-brand-soft"
                  >
                    <Link2 className="size-4 text-brand-ink" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-brand-ink">Linked {m.linked.kind}</p>
                      <p className="truncate font-mono text-[11px] text-ink-soft">{m.linked.ref}</p>
                    </div>
                  </button>
                ) : null}

                {m.evidence.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Evidence</p>
                    <ul className="flex flex-col gap-2">
                      {m.evidence.map((doc) => (
                        <li key={doc.id}>
                          <button type="button" onClick={() => openDoc({ name: doc.name, kind: doc.kind, sizeText: doc.sizeText, context: `${m.reference} · ${m.counterparty}` })} className="flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"><FileText className="size-4" /></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12.5px] font-semibold text-ink">{doc.name}</p>
                              <p className="truncate text-[11px] text-ink-muted">{doc.kind} · {doc.sizeText}</p>
                            </div>
                            <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70">View</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-warning-soft/50 p-3 text-[12px] font-medium text-warning ring-1 ring-warning/20">No supporting document attached - request one for a complete audit trail.</p>
                )}
              </div>

              {mode === 'read' ? (
                <footer className="border-t border-white/55 p-4">
                  <span className={cn('inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-bold', m.reconciled ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
                    <Check className="size-4" /> {m.reconciled ? 'Reconciled' : 'Unreconciled'}
                  </span>
                </footer>
              ) : mode === 'operate' ? (
                <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                  {!m.reconciled ? (
                    <button type="button" onClick={() => { void onReconcile?.(m); }} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
                      <Check className="size-4" /> Reconcile
                    </button>
                  ) : (
                    <span className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-success-soft text-[13px] font-bold text-success"><Check className="size-4" /> Reconciled</span>
                  )}
                </footer>
              ) : mode === 'post' ? (
                <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                  <button type="button" onClick={() => { void onHold?.(m); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white">
                    <MessageSquare className="size-4" /> Hold
                  </button>
                  <button type="button" onClick={() => { void onPost?.(m); }} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
                    <Check className="size-4" /> Post to ledger
                  </button>
                </footer>
              ) : (
                <footer className="flex items-center gap-2 border-t border-white/55 p-4">
                  <button type="button" onClick={() => { void onFlag?.(m); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-danger ring-1 ring-white/70 hover:bg-white">
                    <Flag className="size-4" /> Flag
                  </button>
                  <button type="button" onClick={() => toast({ tone: 'info', title: 'Asked finance', body: `Requested an explanation for ${m.reference} from the finance team.` })} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
                    <MessageSquare className="size-4" /> Ask finance
                  </button>
                </footer>
              )}
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Meta({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'success' | 'warning' }) {
  return (
    <div>
      <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className={cn('text-[13px] font-semibold', mono && 'font-mono', tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-ink')}>{value}</dd>
    </div>
  );
}
