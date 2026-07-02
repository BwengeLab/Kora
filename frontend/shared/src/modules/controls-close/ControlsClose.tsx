import { AlertTriangle, CheckCircle2, FileWarning, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, ProgressRing, cn } from '../../design-system';
import { seedCloseTasks, seedControlChecks, seedEvidenceGaps, type CloseTask } from '../../seed/financeLeadClose';
import { toast } from '../../state/toastStore';

// Finance Lead "Controls & Close" — the operational control room. Run the
// month-end close checklist, clear exceptions, chase missing evidence, and keep
// controls green, then lock the period. This is the Lead DOING the work the
// owner only governs.
export function ControlsClose() {
  const [tasks, setTasks] = useState<CloseTask[]>(seedCloseTasks);
  const done = tasks.filter((t) => t.done).length;
  const pct = done / tasks.length;
  const allDone = done === tasks.length - 1; // all but the final "lock period"

  const toggle = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (t?.blocked) { toast({ tone: 'warning', title: 'Blocked', body: t.note ?? 'This task is blocked.' }); return; }
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  };

  const grouped = useMemo(() => {
    const m = new Map<string, CloseTask[]>();
    for (const t of tasks) { const a = m.get(t.area) ?? []; a.push(t); m.set(t.area, a); }
    return [...m.entries()];
  }, [tasks]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Controls & Close"
        subtitle="Run the month-end close and keep controls green. Clear exceptions, chase evidence, then lock the period."
        right={<DateRangePill label="May 2025 close · due in 3 days" />}
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        {/* Progress + control health band */}
        <section className="grid grid-cols-1 gap-4 @3xl:grid-cols-[auto_1fr]">
          <GlassSurface tone="strong" className="flex items-center gap-5 p-5">
            <ProgressRing value={pct} size={104} thickness={11} color="#4361ee">
              <div className="flex flex-col"><span className="font-display text-xl font-bold text-ink tabular">{done}/{tasks.length}</span><span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-muted">tasks</span></div>
            </ProgressRing>
            <div>
              <p className="font-display text-[15px] font-bold text-ink">May close {Math.round(pct * 100)}% complete</p>
              <p className="text-[12px] text-ink-muted">{tasks.length - done} tasks remaining · {tasks.filter((t) => t.blocked).length} blocked</p>
              <button type="button" disabled={!allDone} onClick={() => toast({ tone: 'success', title: 'Period locked', body: 'May 2025 is closed and locked. Postings are now read-only.' })} className={cn('mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[12px] font-bold', allDone ? 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft hover:brightness-110' : 'cursor-not-allowed bg-white/50 text-ink-muted ring-1 ring-white/60')}><Lock className="size-3.5" /> Lock the period</button>
            </div>
          </GlassSurface>
          <div className="grid grid-cols-3 gap-3">
            <MiniMetric label="Exceptions to clear" value="2" tone="text-danger" icon={<AlertTriangle className="size-4" />} />
            <MiniMetric label="Evidence gaps" value={String(seedEvidenceGaps.length)} tone="text-warning" icon={<FileWarning className="size-4" />} />
            <MiniMetric label="Controls passing" value={`${seedControlChecks.filter((c) => c.ok).length}/${seedControlChecks.length}`} tone="text-success" icon={<ShieldCheck className="size-4" />} />
          </div>
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_320px]">
          {/* Close checklist */}
          <GlassSurface tone="strong" className="flex min-h-0 flex-col p-5">
            <h3 className="mb-3 font-display text-base font-bold text-ink">Month-end close checklist</h3>
            <div className="scrollbar-thin -mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
              {grouped.map(([area, items]) => (
                <div key={area}>
                  <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{area}</p>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((t) => (
                      <li key={t.id}>
                        <button type="button" onClick={() => toggle(t.id)} className={cn('flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition-colors', t.done ? 'bg-success-soft/40 ring-success/15' : t.blocked ? 'bg-danger-soft/30 ring-danger/15' : 'bg-white/55 ring-white/60 hover:bg-white')}>
                          {t.done ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : t.blocked ? <XCircle className="size-5 shrink-0 text-danger" /> : <span className="size-5 shrink-0 rounded-full border-2 border-ink/25" />}
                          <div className="min-w-0 flex-1">
                            <p className={cn('text-[13px] font-semibold', t.done ? 'text-ink-soft line-through' : 'text-ink')}>{t.label}</p>
                            <p className="text-[11px] text-ink-muted">{t.owner}{t.note ? ` · ${t.note}` : ''}</p>
                          </div>
                          {t.blocked ? <span className="shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase text-danger">blocked</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </GlassSurface>

          {/* Right rail: evidence gaps + control checks */}
          <div className="flex min-h-0 flex-col gap-4">
            <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-5">
              <header className="flex items-center gap-1.5"><FileWarning className="size-3.5 text-warning" /><h4 className="text-[12.5px] font-bold text-ink">Evidence to chase</h4></header>
              {seedEvidenceGaps.map((g) => (
                <div key={g.id} className="flex items-center gap-2 rounded-xl bg-white/55 p-2.5 ring-1 ring-white/60">
                  <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold text-ink">{g.party}</p><p className="font-mono text-[10.5px] text-ink-muted">{g.reference} · {g.amount} · {g.age}</p></div>
                  <button type="button" onClick={() => toast({ tone: 'info', title: 'Document requested', body: `Asked ${g.party} for support on ${g.reference}.` })} className="shrink-0 rounded-lg bg-brand px-2 py-1 text-[10.5px] font-bold text-white hover:brightness-110">Request</button>
                </div>
              ))}
            </GlassSurface>
            <GlassSurface tone="strong" className="flex min-h-0 flex-col gap-2.5 p-5">
              <header className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-success" /><h4 className="text-[12.5px] font-bold text-ink">Control checks</h4></header>
              <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
                {seedControlChecks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2.5 rounded-xl bg-white/55 p-2.5 ring-1 ring-white/60">
                    {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />}
                    <div><p className="text-[12px] font-bold text-ink">{c.label}</p><p className="text-[10.5px] text-ink-muted">{c.detail}</p></div>
                  </li>
                ))}
              </ul>
            </GlassSurface>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: React.ReactNode }) {
  return (
    <GlassSurface tone="strong" className="flex items-center gap-3 p-4">
      <span className={cn('grid size-10 place-items-center rounded-xl bg-white/70 ring-1 ring-white/60', tone)}>{icon}</span>
      <div><span className={cn('block font-display text-2xl font-bold tabular leading-none', tone)}>{value}</span><span className="text-[11px] font-semibold text-ink-muted">{label}</span></div>
    </GlassSurface>
  );
}
