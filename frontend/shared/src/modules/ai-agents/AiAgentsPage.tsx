import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { fetchAgentsOverview, runAgent, runAllAgents, submitAgentFeedback, type AgentActivityEvent } from '../../api/agents';
import { getApiBaseUrl } from '../../api/client';
import { GlassSurface, cn } from '../../design-system';
import type { AgentCard } from '../../seed/agents';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';

const ICON: Record<AgentCard['icon'], LucideIcon> = {
  intake: Upload,
  recon: GaugeCircle,
  cfo: Wallet,
  relationship: Handshake,
  contract: FileSignature,
  collections: Inbox,
  credit: TrendingUp,
  supplier: Truck,
  sales: Sparkles,
  audit: ShieldCheck,
};

const TONE: Record<AgentActivityEvent['tone'], { dot: string; ring: string }> = {
  info: { dot: 'bg-info', ring: 'bg-info-soft text-info' },
  success: { dot: 'bg-success', ring: 'bg-success-soft text-success' },
  warning: { dot: 'bg-warning', ring: 'bg-warning-soft text-warning' },
  danger: { dot: 'bg-danger', ring: 'bg-danger-soft text-danger' },
  ai: { dot: 'bg-ai', ring: 'bg-ai-soft text-ai' },
};

export function AiAgentsPage() {
  const apiBaseUrl = getApiBaseUrl();
  const token = useSessionStore((s) => s.session?.token ?? '');
  const queryClient = useQueryClient();
  const [runningId, setRunningId] = useState<string | null>(null);

  const { data, error: overviewError, isLoading } = useQuery({
    queryKey: ['agents-overview', token],
    queryFn: ({ signal }) => fetchAgentsOverview(apiBaseUrl, token, signal),
    enabled: Boolean(token),
  });

  const runOneMutation = useMutation({
    mutationFn: (agentID: string) => runAgent(apiBaseUrl, token, agentID),
    onSuccess: (response) => {
      queryClient.setQueryData(['agents-overview', token], response);
    },
  });

  const runAllMutation = useMutation({
    mutationFn: () => runAllAgents(apiBaseUrl, token),
    onSuccess: (response) => {
      queryClient.setQueryData(['agents-overview', token], response);
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ agentID, rating }: { agentID: string; rating: 'helpful' | 'not_helpful' }) => submitAgentFeedback(apiBaseUrl, token, agentID, rating),
    onSuccess: (response) => {
      queryClient.setQueryData(['agents-overview', token], response);
    },
  });

  const stats = data?.stats ?? { agentsActive: 0, processedToday: 0, suggestionsAwaiting: 0, avgAccuracyPct: 0 };
  const agents = data?.agents ?? [];
  const activity = data?.activity ?? [];
  const activeRun = runningId ?? data?.runningId ?? null;

  async function handleRun(agentID: string) {
    setRunningId(agentID);
    try {
      await runOneMutation.mutateAsync(agentID);
    } catch (error) {
      toast({ tone: 'danger', title: 'Agent run failed', body: error instanceof Error ? error.message : 'Could not run this agent.' });
    } finally {
      setRunningId(null);
    }
  }

  async function handleRunAll() {
    setRunningId('all');
    try {
      await runAllMutation.mutateAsync();
    } catch (error) {
      toast({ tone: 'danger', title: 'Agent run failed', body: error instanceof Error ? error.message : 'Could not run all agents.' });
    } finally {
      setRunningId(null);
    }
  }

  async function handleFeedback(agentID: string, agentName: string, rating: 'helpful' | 'not_helpful') {
    try {
      await feedbackMutation.mutateAsync({ agentID, rating });
      toast({
        tone: rating === 'helpful' ? 'success' : 'info',
        title: 'Feedback recorded',
        body: `${agentName} Agent was marked ${rating === 'helpful' ? 'helpful' : 'not helpful'}.`,
      });
    } catch (error) {
      toast({ tone: 'warning', title: 'Feedback failed', body: error instanceof Error ? error.message : 'Could not record this feedback.' });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="AI Agents"
        subtitle={<>Your AI workforce - run an agent and watch it work. Agents act on the live books and queues; you see every change.</>}
        right={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!!activeRun || !data}
              onClick={handleRunAll}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-[13px] font-bold shadow-glass-soft',
                activeRun ? 'cursor-not-allowed bg-ink/15 text-ink-muted' : 'bg-gradient-to-br from-ai to-brand text-white hover:brightness-110',
              )}
            >
              {activeRun ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />} Run all agents
            </button>
            <DateRangePill label="May 2025" />
          </div>
        }
      />

      <div className="@container flex min-h-0 flex-1 flex-col gap-5 px-8 pb-6">
        <section className="grid grid-cols-2 gap-4 @5xl:grid-cols-4">
          <Stat icon={<Bot className="size-[18px]" />} tone="bg-ai-soft text-ai" value={activeRun ? 'Running...' : `${stats.agentsActive}/10`} label="Agents active" />
          <Stat icon={<CheckCircle2 className="size-[18px]" />} tone="bg-success-soft text-success" value={stats.processedToday.toLocaleString()} label="Processed today" />
          <Stat icon={<Sparkles className="size-[18px]" />} tone="bg-brand-soft text-brand-ink" value={activity.length.toString()} label="Actions this session" />
          <Stat icon={<GaugeCircle className="size-[18px]" />} tone="bg-info-soft text-info" value={`${stats.avgAccuracyPct}%`} label="Avg accuracy" />
        </section>

        <section className="grid min-h-0 flex-1 grid-cols-1 items-start gap-5 @5xl:grid-cols-12">
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:col-span-8">
            {!data ? (
              <GlassSurface tone="strong" className="p-5 text-[13px] text-ink-soft @2xl:col-span-2">
                {isLoading ? 'Loading live agent status...' : `Live agent service unavailable${overviewError instanceof Error ? `: ${overviewError.message}` : '.'}`}
              </GlassSurface>
            ) : null}
            {agents.map((agent) => (
              <AgentTile
                key={agent.id}
                agent={agent}
                running={activeRun === agent.id || activeRun === 'all'}
                disabled={!!activeRun}
                onRun={() => handleRun(agent.id)}
                onFeedback={(rating) => void handleFeedback(agent.id, agent.name, rating)}
              />
            ))}
          </div>

          <div className="@5xl:col-span-4">
            <GlassSurface tone="strong" className="flex max-h-[70vh] min-h-[320px] flex-col p-5">
              <header className="mb-3 flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-ai-soft text-ai">
                  <Sparkles className="size-4" />
                </span>
                <h3 className="font-display text-[15px] font-bold text-ink">Agent activity</h3>
                {activeRun ? <Loader2 className="ml-auto size-4 animate-spin text-ai" /> : null}
              </header>

              <ul className="scrollbar-thin -mx-1 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-1">
                {activity.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className={cn('mt-1 size-2 shrink-0 rounded-full', TONE[event.tone].dot)} />
                    <div className="min-w-0 flex-1 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
                      <p className="text-[12.5px] font-bold text-ink">{event.action}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-soft">{event.detail}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10.5px] font-semibold text-ink-muted">
                          {event.agentName} Agent - {timeAgo(event.at)}
                        </span>
                        {event.link ? (
                          <Link to={event.link.to} className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-brand hover:text-brand-ink">
                            {event.link.label} <ArrowRight className="size-3" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}

                {activity.length === 0 ? (
                  <li className="grid flex-1 place-items-center py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-ink-muted">
                      <Play className="size-7" />
                      <p className="text-[12.5px]">
                        Run an agent to watch it work.
                        <br />
                        Changes show up here and across the app.
                      </p>
                    </div>
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

function AgentTile({ agent, running, disabled, onRun, onFeedback }: { agent: AgentCard; running: boolean; disabled: boolean; onRun: () => void; onFeedback: (rating: 'helpful' | 'not_helpful') => void }) {
  const Icon = ICON[agent.icon];

  return (
    <GlassSurface tone="strong" className={cn('flex flex-col gap-3 p-5 transition-shadow', running && 'ring-2 ring-ai/40')}>
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-ai-soft to-brand-soft text-ai">
          {running ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] font-bold text-ink">{agent.name} Agent</p>
          <p className="truncate text-[11px] text-ink-muted">{agent.role}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
            running ? 'bg-ai-soft text-ai' : agent.lastRun === 'just now' ? 'bg-success-soft text-success' : 'bg-white/70 text-ink-muted',
          )}
        >
          <span className={cn('size-1.5 rounded-full', running ? 'bg-ai animate-pulse' : agent.lastRun === 'just now' ? 'bg-success' : 'bg-ink/30')} />
          {running ? 'Running' : agent.lastRun === 'just now' ? 'Done' : 'Ready'}
        </span>
      </header>

      <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <Sparkles className="size-3 text-ai" /> Latest finding
        </p>
          <p className="mt-0.5 text-[12.5px] text-ink">{agent.insight}</p>
          {agent.runtimeRunId ? <p className="mt-1 text-[10.5px] font-semibold text-ai">Live - {agent.modelName}</p> : null}
      </div>

      <footer className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-[11px] font-medium text-ink-muted">
          <span>
            <span className="font-bold text-ink tabular">{agent.processedToday.toLocaleString()}</span> today
          </span>
          <span>- {agent.lastRun}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Helpful"
            onClick={() => onFeedback('helpful')}
            className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-success-soft hover:text-success"
          >
            <ThumbsUp className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Not helpful"
            onClick={() => onFeedback('not_helpful')}
            className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger"
          >
            <ThumbsDown className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onRun}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold transition-colors',
              disabled ? 'cursor-not-allowed bg-ink/10 text-ink-muted' : 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft hover:brightness-110',
            )}
          >
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} Run
          </button>
        </div>
      </footer>
    </GlassSurface>
  );
}

function timeAgo(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
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
