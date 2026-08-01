import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileWarning, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';
import { fetchControlsClose, lockClosePeriod, requestEvidenceGap, toggleCloseTask, type ControlsClosePayload } from '../../api/governanceOps';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, ProgressRing, cn } from '../../design-system';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';

export function ControlsClose() {
  const token = useSessionStore((s) => s.session?.token ?? '');
  const apiBaseUrl = getApiBaseUrl();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['controls-close', token],
    queryFn: ({ signal }) => fetchControlsClose(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });

  const syncPayload = (payload: ControlsClosePayload) => {
    queryClient.setQueryData(['controls-close', token], payload);
  };

  const toggleMutation = useMutation({
    mutationFn: (taskID: string) => toggleCloseTask(apiBaseUrl, token, taskID),
    onSuccess: syncPayload,
  });
  const requestGapMutation = useMutation({
    mutationFn: (gapID: string) => requestEvidenceGap(apiBaseUrl, token, gapID),
    onSuccess: syncPayload,
  });
  const lockMutation = useMutation({
    mutationFn: () => lockClosePeriod(apiBaseUrl, token),
    onSuccess: syncPayload,
  });

  const tasks = data?.tasks ?? [];
  const evidenceGaps = data?.evidenceGaps ?? seedEvidenceGaps;
  const controlChecks = data?.controlChecks ?? seedControlChecks;
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length === 0 ? 0 : done / tasks.length;
  const allDone = tasks.length > 0 && done === tasks.length - 1;
  const openEvidenceGaps = evidenceGaps.filter((gap) => !gap.requested);

  const toggle = async (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (task?.blocked) {
      toast({ tone: 'warning', title: 'Blocked', body: task.note ?? 'This task is blocked.' });
      return;
    }
    try {
      await toggleMutation.mutateAsync(id);
    } catch (error) {
      toast({ tone: 'danger', title: 'Close update failed', body: error instanceof Error ? error.message : 'Could not update this close task.' });
    }
  };

  const handleRequestGap = async (gapID: string, party: string, reference: string) => {
    try {
      await requestGapMutation.mutateAsync(gapID);
      toast({ tone: 'info', title: 'Document requested', body: `Asked ${party} for support on ${reference}.` });
    } catch (error) {
      toast({ tone: 'danger', title: 'Request failed', body: error instanceof Error ? error.message : 'Could not request this document.' });
    }
  };

  const handleLockPeriod = async () => {
    try {
      await lockMutation.mutateAsync();
      toast({ tone: 'success', title: 'Period locked', body: 'May 2025 is closed and locked. Postings are now read-only.' });
    } catch (error) {
      toast({ tone: 'danger', title: 'Lock failed', body: error instanceof Error ? error.message : 'Could not lock this period yet.' });
    }
  };

  const grouped = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const items = grouped.get(task.area) ?? [];
    items.push(task);
    grouped.set(task.area, items);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Controls & Close"
        subtitle="Run the month-end close and keep controls green. Clear exceptions, chase evidence, then lock the period."
        right={<DateRangePill label="May 2025 close - due in 3 days" />}
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6">
        <section className="grid grid-cols-1 gap-4 @3xl:grid-cols-[auto_1fr]">
          <GlassSurface tone="strong" className="flex items-center gap-5 p-5">
            <ProgressRing value={pct} size={104} thickness={11} color="#4361ee">
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold text-ink tabular">{done}/{tasks.length}</span>
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-muted">tasks</span>
              </div>
            </ProgressRing>
            <div>
              <p className="font-display text-[15px] font-bold text-ink">May close {Math.round(pct * 100)}% complete</p>
              <p className="text-[12px] text-ink-muted">{tasks.length - done} tasks remaining - {tasks.filter((task) => task.blocked).length} blocked</p>
              <button
                type="button"
                disabled={!allDone || lockMutation.isPending}
                onClick={() => void handleLockPeriod()}
                className={cn(
                  'mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[12px] font-bold',
                  allDone && !lockMutation.isPending
                    ? 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft hover:brightness-110'
                    : 'cursor-not-allowed bg-white/50 text-ink-muted ring-1 ring-white/60',
                )}
              >
                <Lock className="size-3.5" /> {lockMutation.isPending ? 'Locking...' : 'Lock the period'}
              </button>
            </div>
          </GlassSurface>
          <div className="grid grid-cols-3 gap-3">
            <MiniMetric label="Exceptions to clear" value="2" tone="text-danger" icon={<AlertTriangle className="size-4" />} />
            <MiniMetric label="Evidence gaps" value={String(openEvidenceGaps.length)} tone="text-warning" icon={<FileWarning className="size-4" />} />
            <MiniMetric label="Controls passing" value={`${controlChecks.filter((item) => item.ok).length}/${controlChecks.length}`} tone="text-success" icon={<ShieldCheck className="size-4" />} />
          </div>
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_320px]">
          <GlassSurface tone="strong" className="flex min-h-0 flex-col p-5">
            <h3 className="mb-3 font-display text-base font-bold text-ink">Month-end close checklist</h3>
            <div className="scrollbar-thin -mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
              {[...grouped.entries()].map(([area, items]) => (
                <div key={area}>
                  <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{area}</p>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => void toggle(task.id)}
                          disabled={toggleMutation.isPending}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition-colors',
                            task.done ? 'bg-success-soft/40 ring-success/15' : task.blocked ? 'bg-danger-soft/30 ring-danger/15' : 'bg-white/55 ring-white/60 hover:bg-white',
                            toggleMutation.isPending && 'cursor-not-allowed opacity-80',
                          )}
                        >
                          {task.done ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : task.blocked ? <XCircle className="size-5 shrink-0 text-danger" /> : <span className="size-5 shrink-0 rounded-full border-2 border-ink/25" />}
                          <div className="min-w-0 flex-1">
                            <p className={cn('text-[13px] font-semibold', task.done ? 'text-ink-soft line-through' : 'text-ink')}>{task.label}</p>
                            <p className="text-[11px] text-ink-muted">{task.owner}{task.note ? ` - ${task.note}` : ''}</p>
                          </div>
                          {task.blocked ? <span className="shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase text-danger">blocked</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </GlassSurface>

          <div className="flex min-h-0 flex-col gap-4">
            <GlassSurface tone="strong" className="flex flex-col gap-2.5 p-5">
              <header className="flex items-center gap-1.5"><FileWarning className="size-3.5 text-warning" /><h4 className="text-[12.5px] font-bold text-ink">Evidence to chase</h4></header>
              {evidenceGaps.map((gap) => (
                <div key={gap.id} className="flex items-center gap-2 rounded-xl bg-white/55 p-2.5 ring-1 ring-white/60">
                  <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold text-ink">{gap.party}</p><p className="font-mono text-[10.5px] text-ink-muted">{gap.reference} - {gap.amount} - {gap.age}</p></div>
                  <button
                    type="button"
                    onClick={() => void handleRequestGap(gap.id, gap.party, gap.reference)}
                    disabled={requestGapMutation.isPending || gap.requested}
                    className={cn(
                      'shrink-0 rounded-lg px-2 py-1 text-[10.5px] font-bold disabled:cursor-not-allowed disabled:opacity-70',
                      gap.requested ? 'bg-success-soft text-success ring-1 ring-success/20' : 'bg-brand text-white hover:brightness-110',
                    )}
                  >
                    {gap.requested ? 'Requested' : requestGapMutation.isPending ? 'Sending...' : 'Request'}
                  </button>
                </div>
              ))}
            </GlassSurface>
            <GlassSurface tone="strong" className="flex min-h-0 flex-col gap-2.5 p-5">
              <header className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-success" /><h4 className="text-[12.5px] font-bold text-ink">Control checks</h4></header>
              <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
                {controlChecks.map((check) => (
                  <li key={check.id} className="flex items-start gap-2.5 rounded-xl bg-white/55 p-2.5 ring-1 ring-white/60">
                    {check.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />}
                    <div><p className="text-[12px] font-bold text-ink">{check.label}</p><p className="text-[10.5px] text-ink-muted">{check.detail}</p></div>
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
