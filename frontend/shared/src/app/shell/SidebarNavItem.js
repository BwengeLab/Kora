import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Tooltip from '@radix-ui/react-tooltip';
import { Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '../../design-system';
import { NavIcon } from './navIcons';
function pathIsActive(active, target) {
    if (target === '/')
        return active === '/';
    return active === target || active.startsWith(target + '/');
}
export function SidebarNavItem({ entry, collapsed, depth = 0, }) {
    const { t } = useTranslation();
    const activePath = useRouterState({ select: (s) => s.location.pathname });
    const isActive = pathIsActive(activePath, entry.path);
    const hasChildren = (entry.children?.length ?? 0) > 0;
    const label = t(entry.labelKey);
    const iconTile = (_jsx("span", { className: cn('grid place-items-center rounded-xl transition-colors', collapsed ? 'size-10 [&>svg]:size-[19px]' : 'size-9 [&>svg]:size-[17px]', isActive
            ? 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-[0_4px_12px_rgba(67,97,238,0.4)]'
            : 'bg-white/0 text-ink-soft group-hover:bg-white/70 group-hover:text-ink'), children: _jsx(NavIcon, { id: entry.id }) }));
    const link = (_jsxs(Link, { to: entry.path, "aria-label": label, className: cn('group flex items-center rounded-2xl transition-all', collapsed ? 'mx-auto justify-center p-1.5' : 'mx-3 gap-3 px-2.5 py-1.5', depth > 0 && !collapsed && 'ml-12 mr-3', isActive
            ? 'bg-white text-ink shadow-glass-soft ring-1 ring-white/80'
            : 'text-ink-soft hover:bg-white/55 hover:text-ink'), children: [depth === 0 ? iconTile : _jsx("span", { className: "ml-1 size-1.5 rounded-full bg-current opacity-40" }), !collapsed && _jsx("span", { className: "truncate text-[14px] font-semibold", children: label })] }));
    return (_jsxs("li", { children: [collapsed ? (_jsxs(Tooltip.Root, { delayDuration: 0, children: [_jsx(Tooltip.Trigger, { asChild: true, children: link }), _jsx(Tooltip.Portal, { children: _jsxs(Tooltip.Content, { side: "right", sideOffset: 10, className: "z-50 rounded-xl bg-ink px-2.5 py-1.5 text-xs font-semibold text-white shadow-glass-lg", children: [label, _jsx(Tooltip.Arrow, { className: "fill-ink" })] }) })] })) : (link), hasChildren && isActive && !collapsed ? (_jsx("ul", { className: "mt-1 flex flex-col gap-1", children: entry.children.map((child) => (_jsx(SidebarNavItem, { entry: child, collapsed: collapsed, depth: depth + 1 }, child.id))) })) : null] }));
}
