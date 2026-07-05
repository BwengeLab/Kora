import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(Tooltip.Provider, { delayDuration: 0, children: _jsxs("aside", { className: cn('group/sidebar flex h-full shrink-0 flex-col gap-2 py-5 transition-[width] duration-300 ease-out', open ? 'w-[276px]' : 'w-[84px]'), children: [_jsxs("div", { className: cn('flex items-center', open ? 'justify-between px-5' : 'flex-col gap-3 px-2'), children: [open ? _jsx(KoraLogo, {}) : _jsx(KoraGlyph, { className: "size-11" }), _jsx("button", { type: "button", onClick: toggle, "aria-label": open ? 'Collapse sidebar' : 'Expand sidebar', title: open ? 'Collapse sidebar' : 'Expand sidebar', className: cn('grid size-9 place-items-center rounded-xl text-ink-muted/70 transition-all duration-200', 'opacity-0 group-hover/sidebar:opacity-100 focus-visible:opacity-100', 'hover:bg-white/70 hover:text-ink hover:backdrop-blur-glass'), children: open ? _jsx(PanelLeftClose, { className: "size-[18px]" }) : _jsx(PanelLeftOpen, { className: "size-[18px]" }) })] }), _jsx("nav", { className: "flex-1 overflow-hidden", children: _jsx("ul", { className: "flex flex-col gap-1 py-1", children: nav.map((entry) => (_jsx(SidebarNavItem, { entry: entry, collapsed: !open }, entry.id))) }) }), _jsxs("div", { className: "mt-auto flex flex-col gap-2", children: [open ? _jsx(RoleSwitcher, {}) : null, _jsx(UserCard, { collapsed: !open })] })] }) }));
}
