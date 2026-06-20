import * as Tooltip from '@radix-ui/react-tooltip';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useResolvedBlueprint } from '../../blueprints/renderer';
import { cn } from '../../design-system';
import { useUiStore } from '../../state/uiStore';
import { KoraAIWidget } from './KoraAIWidget';
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
    <Tooltip.Provider>
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col gap-2 py-5 transition-[width] duration-300 ease-out',
          open ? 'w-[276px]' : 'w-[84px]',
        )}
      >
        {/* Header: logo + collapse toggle */}
        <div className={cn('flex items-center', open ? 'justify-between px-5' : 'flex-col gap-3 px-2')}>
          {open ? <KoraLogo /> : <KoraGlyph className="size-11" />}
          <button
            type="button"
            onClick={toggle}
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
            title={open ? 'Collapse sidebar' : 'Expand sidebar'}
            className="grid size-9 place-items-center rounded-xl bg-white/55 text-ink-soft ring-1 ring-white/70 transition-colors hover:bg-white hover:text-ink"
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
          <KoraAIWidget collapsed={!open} />
          <UserCard collapsed={!open} />
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
