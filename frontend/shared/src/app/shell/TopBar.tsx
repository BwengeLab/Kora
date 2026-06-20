import { Link } from '@tanstack/react-router';
import { Bell, Building2, ChevronDown, Search, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';

// Slim top bar: a centered search field, then Copilot, Notifications and
// Settings as glass action chips, plus the tenant chip. By design we never
// put Search, Copilot, Notifications or Settings in the sidebar — they all
// live here. Greeting + date-range live in <PageHeader/> below this row.

export function TopBar() {
  const session = useSession();

  return (
    <header className="flex items-center gap-3 px-8 pt-6 pb-2">
      {/* Search — takes most of the row */}
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

      <CircleAction label="Kora copilot">
        <Sparkles className="size-[18px]" />
      </CircleAction>
      <CircleAction label="Notifications" badge>
        <Bell className="size-[18px]" />
      </CircleAction>
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

// Shared glass circle styling for the top-bar action chips.
const circleClass = cn(
  'relative grid size-12 place-items-center rounded-2xl',
  'bg-glass-strong border border-glass-border-strong backdrop-blur-glass text-ink-soft shadow-glass',
  'hover:text-ink hover:bg-white transition-colors',
);

function CircleAction({ label, badge, children }: { label: string; badge?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} className={circleClass}>
      {children}
      {badge ? <span className="absolute right-3 top-3 size-2 rounded-full bg-danger ring-2 ring-white" /> : null}
    </button>
  );
}

function CircleLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <Link to={to} aria-label={label} title={label} className={circleClass}>
      {children}
    </Link>
  );
}
