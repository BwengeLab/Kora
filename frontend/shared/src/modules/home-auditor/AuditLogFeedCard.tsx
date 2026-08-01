import {
  ArrowLeftRight,
  CheckCircle2,
  FileText,
  Lock,
  Search,
  Settings2,
  Share2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { openDoc } from '../../state/docViewerStore';
import { useWorkflowStore } from '../../state/workflowStore';

type AuditKind = 'approval' | 'posting' | 'access' | 'config' | 'agent' | 'consent' | 'audit' | 'claim';

const KIND: Record<AuditKind, { icon: LucideIcon; tone: string }> = {
  approval: { icon: CheckCircle2, tone: 'bg-success-soft text-success' },
  posting: { icon: ArrowLeftRight, tone: 'bg-lavender-soft text-lavender' },
  access: { icon: Lock, tone: 'bg-info-soft text-info' },
  config: { icon: Settings2, tone: 'bg-warning-soft text-warning' },
  agent: { icon: Sparkles, tone: 'bg-ai-soft text-ai' },
  consent: { icon: Share2, tone: 'bg-brand-soft text-brand-ink' },
  audit: { icon: FileText, tone: 'bg-danger-soft text-danger' },
  claim: { icon: FileText, tone: 'bg-info-soft text-info' },
};

export function AuditLogFeedCard() {
  const auditLog = useWorkflowStore((s) => s.auditLog);
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-3 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-bold text-ink">Audit log</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted ring-1 ring-white/70">
            <Lock className="size-3" /> Immutable
          </span>
        </div>
        <div className="flex h-9 w-56 items-center gap-2 rounded-xl bg-white/70 px-3 ring-1 ring-white/70">
          <Search className="size-4 text-ink-muted" />
          <input type="search" placeholder="Filter actor, action…" className="w-full bg-transparent text-[12px] text-ink placeholder:text-ink-muted focus:outline-none" />
        </div>
      </header>

      <ol className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5">
        {auditLog.map((e, i) => {
          const k = KIND[e.kind];
          return (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={cn('mt-1 grid size-8 shrink-0 place-items-center rounded-xl', k.tone)}>
                  <k.icon className="size-4" />
                </span>
                {i < auditLog.length - 1 ? <span className="my-1 w-px flex-1 bg-ink/10" /> : null}
              </div>
              <button
                type="button"
                onClick={() => e.hasEvidence && openDoc({ name: `Evidence — ${e.action}.pdf`, kind: 'audit evidence', context: `${e.target} · ${e.actor}` })}
                className="mb-2 flex flex-1 items-start justify-between gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-white/60"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">
                    {e.action} <span className="font-normal text-ink-muted">· {e.target}</span>
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {e.actor} · {e.role} · {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {e.amount ? <MoneyCell amount={e.amount} size="sm" className="font-bold !text-[12px]" /> : null}
                  {e.hasEvidence ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-0.5 text-[10px] font-bold text-brand ring-1 ring-white/70">
                      <FileText className="size-3" /> Evidence
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </GlassSurface>
  );
}
