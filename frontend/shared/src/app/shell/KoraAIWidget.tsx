import { Sparkles } from 'lucide-react';
import { cn } from '../../design-system';

// "Kora AI / AI Workspace" copilot launcher. Collapses to a single gradient
// tile in the icon-rail.
export function KoraAIWidget({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="Kora AI"
        title="Kora AI"
        className="mx-auto grid size-10 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white shadow-[0_4px_12px_rgba(139,92,246,0.4)] transition-transform hover:-translate-y-0.5 [&>svg]:size-5"
      >
        <Sparkles />
      </button>
    );
  }
  return (
    <button
      type="button"
      className={cn(
        'group mx-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-ai-soft via-white/80 to-brand-soft p-3 text-left ring-1 ring-white/80 shadow-glass-soft transition-transform hover:-translate-y-0.5',
        className,
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white shadow-[0_4px_12px_rgba(139,92,246,0.4)] [&>svg]:size-5">
        <Sparkles />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-display text-sm font-semibold text-ink">Kora AI</span>
        <span className="text-[11px] font-medium text-ink-muted">AI Workspace</span>
      </span>
    </button>
  );
}
