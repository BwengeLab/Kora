import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileSignature,
  GaugeCircle,
  Handshake,
  Inbox,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Truck,
  Upload,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';
import { seedAgentStats, seedAgents, type AgentCard } from '../../seed/agents';
import { timeAgo, useAgentActivityStore, type EventTone } from '../../state/agentActivityStore';
import { toast } from '../../state/toastStore';

const ICON: Record<AgentCard['icon'], LucideIcon> = {
  intake: Upload, recon: GaugeCircle, cfo: Wallet, relationship: Handshake, contract: FileSignature,
  collections: Inbox, credit: TrendingUp, supplier: Truck, sales: Sparkles, audit: ShieldCheck,
};
const TONE: Record<EventTone, { dot: string; ring: string }> = {
  info: { dot: 'bg-info', ring: 'bg-info-soft text-info' },
  success: { dot: 'bg-success', ring: 'bg-success-soft text-success' },
  warning: { dot: 'bg-warning', ring: 'bg-warning-soft text-warning' },
  danger: { dot: 'bg-danger', ring: 'bg-danger-soft text-danger' },
  ai: { dot: 'bg-ai', ring: 'bg-ai-soft text-ai' },
};

// "AI Agents" — your AI workforce, observable. Run an agent (or all) and watch it
// do real work: it mutates the live books/queues and logs to the activity feed,
// so you can see the change propagate. Agents propose; humans decide.
export function AiAgentsPage() {
  const activity = useAgentActivityStore((s) => s.activity);
  const runningId = useAgentActivityStore((s) => s.runningId);
  const processed = useAgentActivityStore((s) => s.processed);
  const lastRun = useAgentActivityStore((s) => s.lastRun);
  const run = useAgentActivityStore((s) => s.run);
  const runAll = useAgentActivityStore((s) => s.runAll);

  const extraProcessed = Object.values(processed).reduce((a, n) => a + n, 0);
  const s = seedAgentStats;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="AI Agents"
        subtitle={<>Your AI workforce — run an agent and watch it work. Agents act on the live books and queues; you see every change.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button type="button" disabled={!!runningId} onClick={runAll} className={cn('inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-[13px] font-bold shadow-glass-soft', runningId ? 'cursor-not-allowed bg-ink/15 text-ink-muted' : 'bg-gradient-to-br from-ai to-brand text-white hover:brightness-110')}>
              {runningId ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Run all agents
            </button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 px-8 pb-6">
        <section className="grid grid-cols-2 gap-4 @5xl:grid-cols-4">
          <Stat icon={<Bot className="size-[18px]" />} tone="bg-ai-soft text-ai" value={runningId ? 'Running…' : `${s.agentsActive}/10`} label="Agents active" />
          <Stat icon={<CheckCircle2 className="size-[18px]" />} tone="bg-success-soft text-success" value={(s.processedToday + extraProcessed).toLocaleString()} label="Processed today" />
          <Stat icon={<Sparkles className="size-[18px]" />} tone="bg-brand-soft text-brand-ink" value={activity.length.toString()} label="Actions this session" />
          <Stat icon={<GaugeCircle className="size-[18px]" />} tone="bg-info-soft text-info" value={`${s.avgAccuracyPct}%`} label="Avg accuracy" />
        </section>

        <section className="grid min-h-0 flex-1 grid-cols-1 items-start gap-5 @5xl:grid-cols-12">
          {/* Agent grid */}
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:col-span-8">
            {seedAgents.map((a) => (
              <AgentTile key={a.id} agent={a} running={runningId === a.id} processedExtra={processed[a.id] ?? 0} ranAt={lastRun[a.id]} disabled={!!runningId} onRun={() => run(a.id)} />
            ))}
          </div>
          {/* Live activity feed */}
          <div className="@5xl:col-span-4">
            <GlassSurface tone="strong" className="flex max-h-[70vh] min-h-[320px] flex-col p-5">
              <header className="mb-3 flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-ai-soft text-ai"><Sparkles className="size-4" /></span><h3 className="font-display text-[15px] font-bold text-ink">Agent activity</h3>{runningId ? <Loader2 className="ml-auto size-4 animate-spin text-ai" /> : null}</header>
              <ul className="scrollbar-thin -mx-1 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-1">
                {activity.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className={cn('mt-1 size-2 shrink-0 rounded-full', TONE[e.tone].dot)} />
                    <div className="min-w-0 flex-1 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
                      <p className="text-[12.5px] font-bold text-ink">{e.action}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-soft">{e.detail}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10.5px] font-semibold text-ink-muted">{e.agentName} Agent · {timeAgo(e.at)}</span>
                        {e.link ? <Link to={e.link.to} className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-brand hover:text-brand-ink">{e.link.label} <ArrowRight className="size-3" /></Link> : null}
                      </div>
                    </div>
                  </li>
                ))}
                {activity.length === 0 ? (
                  <li className="grid flex-1 place-items-center py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-ink-muted"><Play className="size-7" /><p className="text-[12.5px]">Run an agent to watch it work.<br />Changes show up here and across the app.</p></div>
                  </li>
                ) : null}
              </ul>
            </GlassSurface>
          </div>
        </section>
      </div>
    </div>
  );
}

function AgentTile({ agent: a, running, processedExtra, ranAt, disabled, onRun }: { agent: AgentCard; running: boolean; processedExtra: number; ranAt: number | undefined; disabled: boolean; onRun: () => void }) {
  const Icon = ICON[a.icon];
  return (
    <GlassSurface tone="strong" className={cn('flex flex-col gap-3 p-5 transition-shadow', running && 'ring-2 ring-ai/40')}>
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-ai-soft to-brand-soft text-ai">{running ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}</span>
        <div className="min-w-0 flex-1"><p className="truncate font-display text-[14px] font-bold text-ink">{a.name} Agent</p><p className="truncate text-[11px] text-ink-muted">{a.role}</p></div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', running ? 'bg-ai-soft text-ai' : ranAt ? 'bg-success-soft text-success' : 'bg-white/70 text-ink-muted')}>
          <span className={cn('size-1.5 rounded-full', running ? 'bg-ai animate-pulse' : ranAt ? 'bg-success' : 'bg-ink/30')} /> {running ? 'Running' : ranAt ? 'Done' : 'Ready'}
        </span>
      </header>
      <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted"><Sparkles className="size-3 text-ai" /> Latest finding</p>
        <p className="mt-0.5 text-[12.5px] text-ink">{a.insight}</p>
      </div>
      <footer className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-[11px] font-medium text-ink-muted">
          <span><span className="font-bold text-ink tabular">{(a.processedToday + processedExtra).toLocaleString()}</span> today</span>
          <span>· {ranAt ? timeAgo(ranAt) : a.lastRun}</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Helpful" onClick={() => toast({ tone: 'success', title: 'Feedback noted', body: `${a.name} Agent — marked helpful.` })} className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-success-soft hover:text-success"><ThumbsUp className="size-3.5" /></button>
          <button type="button" aria-label="Not helpful" onClick={() => toast({ tone: 'info', title: 'Feedback noted', body: `${a.name} Agent — we'll improve.` })} className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger"><ThumbsDown className="size-3.5" /></button>
          <button type="button" disabled={disabled} onClick={onRun} className={cn('inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold transition-colors', disabled ? 'cursor-not-allowed bg-ink/10 text-ink-muted' : 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft hover:brightness-110')}>
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Run
          </button>
        </div>
      </footer>
    </GlassSurface>
  );
}

function Stat({ icon, tone, value, label }: { icon: React.ReactNode; tone: string; value: string; label: string }) {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-1.5 p-5">
      <span className={cn('grid size-10 place-items-center rounded-2xl', tone)}>{icon}</span>
      <span className="font-display text-3xl font-bold leading-none text-ink tabular">{value}</span>
      <span className="text-[12.5px] font-semibold text-ink-soft">{label}</span>
    </GlassSurface>
  );
}
