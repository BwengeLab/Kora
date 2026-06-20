import { Bot } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedAgents, type AgentStatus } from '../../seed/orgOwnerHome';

const STATUS_TONES: Record<AgentStatus, string> = {
  Completed: 'bg-success-soft text-success',
  'In Progress': 'bg-info-soft text-info',
  Failed: 'bg-danger-soft text-danger',
};

export function AIAgentsActivityCard() {
  return (
    <GlassSurface tone="strong" className="flex flex-col gap-3 p-5">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">AI Agent Activity</h3>
        <button type="button" className="text-xs font-semibold text-brand hover:text-brand-ink">
          View all
        </button>
      </header>
      <ul className="flex flex-col">
        {seedAgents.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 border-b border-white/50 py-2.5 last:border-b-0"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ai-soft to-brand-soft text-ai">
              <Bot className="size-[14px]" />
            </span>
            <span className="flex-1 text-[13px] font-semibold text-ink">{a.name}</span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                STATUS_TONES[a.status],
              )}
            >
              {a.status}
            </span>
            <span className="w-14 text-right text-[11px] font-medium text-ink-muted">{a.when}</span>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}
