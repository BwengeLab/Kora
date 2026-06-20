import { Bell, Building2, ChevronDown, HelpCircle, Search } from 'lucide-react';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';

// Slim top bar dominated by a centered search field; greeting and date-range
// live in <PageHeader/> below it, not here.

export function TopBar() {
  const session = useSession();

  return (
    <header className="flex items-center gap-3 px-8 pt-6 pb-2">
      {/* Search — takes most of the row */}
      <GlassSurface
        tone="strong"
        className="flex h-12 flex-1 items-center gap-3 px-5 py-0"
      >
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

      <CircleAction label="Notifications" badge>
        <Bell className="size-[18px]" />
      </CircleAction>
      <CircleAction label="Help">
        <HelpCircle className="size-[18px]" />
      </CircleAction>

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

function CircleAction({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'relative grid size-12 place-items-center rounded-2xl',
        'bg-glass-strong border border-glass-border-strong backdrop-blur-glass text-ink-soft shadow-glass',
        'hover:text-ink hover:bg-white transition-colors',
      )}
    >
      {children}
      {badge ? (
        <span className="absolute right-3 top-3 size-2 rounded-full bg-danger ring-2 ring-white" />
      ) : null}
    </button>
  );
}
