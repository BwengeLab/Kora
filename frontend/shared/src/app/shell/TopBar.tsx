import * as Popover from '@radix-ui/react-popover';
import {
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  GitBranch,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';
import { useCopilotStore } from '../../state/copilotStore';
import { useWorkflowStore } from '../../state/workflowStore';

// Slim top bar: centered search, then a working Copilot button + a live
// Notifications popover + Settings, plus the tenant chip.
export function TopBar() {
  const session = useSession();
  const toggleCopilot = useCopilotStore((s) => s.toggle);

  return (
    <header className="flex items-center gap-3 px-8 pt-6 pb-2">
      <GlassSurface tone="strong" className="flex h-12 flex-1 items-center gap-3 px-5 py-0">
        <Search className="size-[18px] text-ink-muted" />
        <input
          type="search"
          placeholder="Search anything…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
        <kbd className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-muted ring-1 ring-white/80">
          <span>⌘</span>K
        </kbd>
      </GlassSurface>

      <button type="button" aria-label="Kora copilot" title="Kora copilot" onClick={toggleCopilot} className={circleClass}>
        <Sparkles className="size-[18px]" />
      </button>

      <NotificationsBell />

      <CircleLink to="/settings" label="Settings">
        <SettingsIcon className="size-[18px]" />
      </CircleLink>

      {session ? (
        <GlassSurface tone="strong" className="flex h-12 items-center gap-2.5 pl-3 pr-3.5">
          <span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-brand-ink">
            <Building2 className="size-[14px]" />
          </span>
          <span className="text-sm font-semibold text-ink">{session.tenant.name}</span>
          <ChevronDown className="size-3.5 text-ink-muted" />
        </GlassSurface>
      ) : null}
    </header>
  );
}

const circleClass = cn(
  'relative grid size-12 place-items-center rounded-2xl',
  'bg-glass-strong border border-glass-border-strong backdrop-blur-glass text-ink-soft shadow-glass',
  'hover:text-ink hover:bg-white transition-colors',
);

// Live notifications, derived from the workflow store.
function NotificationsBell() {
  const approvals = useWorkflowStore((s) => s.approvals);
  const recons = useWorkflowStore((s) => s.reconciliations);
  const auditLog = useWorkflowStore((s) => s.auditLog);

  const pending = approvals.filter((a) => a.stage === 'awaiting' || a.stage === 'partial');
  const suspicious = recons.filter((r) => r.tier === 'suspicious' && r.stage !== 'posted');
  const recent = auditLog.slice(0, 3);

  type Note = { id: string; tone: 'info' | 'danger' | 'success'; icon: ReactNode; title: string; sub: string };
  const notes: Note[] = [];
  if (pending.length > 0)
    notes.push({ id: 'n-appr', tone: 'info', icon: <GitBranch className="size-4" />, title: `${pending.length} approvals awaiting`, sub: 'Routed to your Action Center' });
  if (suspicious.length > 0)
    notes.push({ id: 'n-susp', tone: 'danger', icon: <ShieldAlert className="size-4" />, title: `${suspicious.length} suspicious flagged`, sub: 'Review with the Audit agent' });
  recent.forEach((e) =>
    notes.push({ id: e.id, tone: 'success', icon: <CheckCircle2 className="size-4" />, title: e.action, sub: `${e.actor} · ${e.target}` }),
  );

  const count = pending.length + suspicious.length;
  const toneClass = { info: 'bg-info-soft text-info', danger: 'bg-danger-soft text-danger', success: 'bg-success-soft text-success' };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" aria-label="Notifications" title="Notifications" className={circleClass}>
          <Bell className="size-[18px]" />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {count}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-50 w-[340px] rounded-3xl border border-glass-border-strong bg-glass-strong p-2 shadow-glass-lg backdrop-blur-glass-lg"
        >
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Notifications</p>
          <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start gap-3 rounded-2xl p-3 hover:bg-white/60">
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-xl', toneClass[n.tone])}>{n.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{n.title}</p>
                  <p className="truncate text-[11px] text-ink-muted">{n.sub}</p>
                </div>
              </li>
            ))}
            {notes.length === 0 ? (
              <li className="px-3 py-8 text-center text-[12.5px] text-ink-muted">You're all caught up 🎉</li>
            ) : null}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CircleLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <Link to={to} aria-label={label} title={label} className={circleClass}>
      {children}
    </Link>
  );
}
