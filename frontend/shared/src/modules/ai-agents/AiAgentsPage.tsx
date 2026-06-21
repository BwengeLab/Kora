import {
  Bot,
  CheckCircle2,
  FileSignature,
  GaugeCircle,
  Handshake,
  Inbox,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Truck,
  Upload,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, cn } from '../../design-system';
import { AIInsightsCard } from '../home-org-owner';
import { seedAgentStats, seedAgents, type AgentCard, type AgentStatus } from '../../seed/agents';
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

const STATUS: Record<AgentStatus, { label: string; tone: string; dot: string }> = {
  running: { label: 'Running', tone: 'bg-info-soft text-info', dot: 'bg-info animate-pulse' },
  active: { label: 'Active', tone: 'bg-success-soft text-success', dot: 'bg-success' },
  idle: { label: 'Idle', tone: 'bg-white/70 text-ink-muted', dot: 'bg-ink/30' },
};

// Org Owner "AI Agents" — oversight of all 10 agents' work, with feedback.
export function AiAgentsPage() {
  const s = seedAgentStats;
  return (
    <div className="flex flex-col">
      <PageHeader
        title="AI Agents"
        subtitle={<>Your AI workforce — what every agent did, its findings, and your feedback. Agents propose; humans decide.</>}
        right={<DateRangePill label="May 2025" />}
      />
      <div className="@container flex flex-col gap-6 px-8 pb-8">
        {/* Stats */}
        <section className="grid grid-cols-2 gap-5 @5xl:grid-cols-4">
          <Stat icon={<Bot className="size-[18px]" />} tone="bg-ai-soft text-ai" value={`${s.agentsActive}/10`} label="Agents active" />
          <Stat icon={<CheckCircle2 className="size-[18px]" />} tone="bg-success-soft text-success" value={s.processedToday.toLocaleString()} label="Processed today" />
          <Stat icon={<Sparkles className="size-[18px]" />} tone="bg-brand-soft text-brand-ink" value={s.suggestionsAwaiting.toLocaleString()} label="Suggestions awaiting" />
          <Stat icon={<GaugeCircle className="size-[18px]" />} tone="bg-info-soft text-info" value={`${s.avgAccuracyPct}%`} label="Avg accuracy" />
        </section>

        {/* Agents grid + insights */}
        <section className="grid grid-cols-1 items-start gap-5 @5xl:grid-cols-12">
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:col-span-8">
            {seedAgents.map((a) => (
              <AgentTile key={a.id} agent={a} />
            ))}
          </div>
          <div className="@5xl:col-span-4">
            <AIInsightsCard />
          </div>
        </section>
      </div>
    </div>
  );
}

function AgentTile({ agent: a }: { agent: AgentCard }) {
  const Icon = ICON[a.icon];
  const st = STATUS[a.status];
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-3 p-5">
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-ai-soft to-brand-soft text-ai">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] font-bold text-ink">{a.name} Agent</p>
          <p className="truncate text-[11px] text-ink-muted">{a.role}</p>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', st.tone)}>
          <span className={cn('size-1.5 rounded-full', st.dot)} /> {st.label}
        </span>
      </header>

      <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <Sparkles className="size-3 text-ai" /> Latest finding
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink">{a.insight}</p>
      </div>

      <footer className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] font-medium text-ink-muted">
          <span><span className="font-bold text-ink tabular">{a.processedToday.toLocaleString()}</span> today</span>
          <span>· {a.accuracyPct}% acc.</span>
          <span>· {a.lastRun}</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Helpful" onClick={() => toast({ tone: 'success', title: 'Feedback noted', body: `${a.name} Agent — marked helpful.` })} className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-success-soft hover:text-success">
            <ThumbsUp className="size-3.5" />
          </button>
          <button type="button" aria-label="Not helpful" onClick={() => toast({ tone: 'info', title: 'Feedback noted', body: `${a.name} Agent — we'll improve.` })} className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger">
            <ThumbsDown className="size-3.5" />
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
