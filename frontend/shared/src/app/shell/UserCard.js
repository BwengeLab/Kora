import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown } from 'lucide-react';
import { useSession } from '../../auth/hooks';
import { PartyAvatar } from '../../design-system';
// Bottom user card; collapses to just the avatar in the icon-rail.
export function UserCard({ collapsed }) {
    const session = useSession();
    if (!session)
        return null;
    if (collapsed) {
        return (_jsx("button", { type: "button", "aria-label": session.user.displayName, title: `${session.user.displayName} · ${session.roles[0]?.name ?? ''}`, className: "mx-auto rounded-full ring-2 ring-white/70 transition-transform hover:-translate-y-0.5", children: _jsx(PartyAvatar, { name: session.user.displayName, size: "lg" }) }));
    }
    return (_jsxs("button", { type: "button", className: "mx-3 flex items-center gap-3 rounded-2xl bg-white/80 p-2.5 text-left ring-1 ring-white/80 shadow-glass-soft transition-colors hover:bg-white", children: [_jsx(PartyAvatar, { name: session.user.displayName, size: "lg" }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col leading-tight", children: [_jsx("span", { className: "truncate text-sm font-semibold text-ink", children: session.user.displayName }), _jsx("span", { className: "truncate text-[11px] font-medium text-ink-soft", children: session.roles[0]?.name ?? '—' })] }), _jsx(ChevronDown, { className: "size-4 shrink-0 text-ink-muted" })] }));
}
