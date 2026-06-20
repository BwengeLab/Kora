import * as Tooltip from '@radix-ui/react-tooltip';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useResolvedBlueprint } from '../../blueprints/renderer';
import { cn } from '../../design-system';
import { useUiStore } from '../../state/uiStore';
import { KoraGlyph, KoraLogo } from './KoraLogo';
import { RoleSwitcher } from './RoleSwitcher';
import { SidebarNavItem } from './SidebarNavItem';
import { UserCard } from './UserCard';

// Collapsible sidebar. Collapsed = a fixed icon-rail (icons full-size, labels
// as hover tooltips); expanded = full labels. Never scrolls — items stay
// compact enough to fit. The user toggles state deliberately.
export function Sidebar() {
  const { nav } = useResolvedBlueprint();
  const open = useUiStore((s) => s.sidebarOpen);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <Tooltip.Provider delayDuration={0}>
      <aside
        className={cn(
          'group/sidebar flex h-full shrink-0 flex-col gap-2 py-5 transition-[width] duration-300 ease-out',
          open ? 'w-[276px]' : 'w-[84px]',
        )}
      >
        {/* Header: logo + collapse toggle (ghost — appears only on sidebar hover) */}
        <div className={cn('flex items-center', open ? 'justify-between px-5' : 'flex-col gap-3 px-2')}>
          {open ? <KoraLogo /> : <KoraGlyph className="size-11" />}
          <button
            type="button"
            onClick={toggle}
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
            title={open ? 'Collapse sidebar' : 'Expand sidebar'}
            className={cn(
              'grid size-9 place-items-center rounded-xl text-ink-muted/70 transition-all duration-200',
              'opacity-0 group-hover/sidebar:opacity-100 focus-visible:opacity-100',
              'hover:bg-white/70 hover:text-ink hover:backdrop-blur-glass',
            )}
          >
            {open ? <PanelLeftClose className="size-[18px]" /> : <PanelLeftOpen className="size-[18px]" />}
          </button>
        </div>

        {/* Nav (no scroll) */}
        <nav className="flex-1 overflow-hidden">
          <ul className="flex flex-col gap-1 py-1">
            {nav.map((entry) => (
              <SidebarNavItem key={entry.id} entry={entry} collapsed={!open} />
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-2">
          {open ? <RoleSwitcher /> : null}
          <UserCard collapsed={!open} />
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
