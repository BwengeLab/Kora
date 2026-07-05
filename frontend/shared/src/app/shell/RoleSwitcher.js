import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronsUpDown, Sparkles } from 'lucide-react';
import { CANONICAL_ROLE_IDS, CUSTOM_ROLE_IDS } from '../../auth/catalog';
import { cn } from '../../design-system';
import { seedSessions } from '../../seed/sessions';
import { useFeatureStore } from '../../state/featureStore';
import { usePreviewRoleStore } from '../../state/previewRoleStore';
// Dev-only: lets the engineer hot-swap which seed role the app renders as.
// Renders nothing in production (where the session comes from real auth).
const ROLE_ORDER = [
    CANONICAL_ROLE_IDS.SUPER_ADMIN,
    CANONICAL_ROLE_IDS.ORG_OWNER,
    CANONICAL_ROLE_IDS.FINANCE_LEAD,
    CANONICAL_ROLE_IDS.FINANCE_OPERATOR,
    CANONICAL_ROLE_IDS.AUDITOR,
    CANONICAL_ROLE_IDS.ORG_ADMIN,
    CANONICAL_ROLE_IDS.EXTERNAL_COLLABORATOR,
];
export function RoleSwitcher() {
    const isDev = typeof import.meta !== 'undefined' ? import.meta.env?.DEV : false;
    const roleId = usePreviewRoleStore((s) => s.roleId);
    const setRoleId = usePreviewRoleStore((s) => s.setRoleId);
    // The Claims Officer custom role only appears once the Insurance pack is unlocked.
    const claimsUnlocked = useFeatureStore((s) => s.isEnabled('insurance-claims'));
    if (!isDev)
        return null;
    const order = claimsUnlocked ? [...ROLE_ORDER, CUSTOM_ROLE_IDS.CLAIMS_OFFICER] : ROLE_ORDER;
    const current = seedSessions[roleId];
    return (_jsxs(Popover.Root, { children: [_jsx(Popover.Trigger, { asChild: true, children: _jsxs("button", { type: "button", className: "mx-2 mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/40 px-3 py-2 text-left text-xs font-medium text-ink-soft transition-colors hover:bg-white/70", children: [_jsxs("span", { className: "flex flex-col", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-ink-muted", children: "Preview as" }), _jsx("span", { className: "truncate text-ink", children: current.roles[0]?.name })] }), _jsx(ChevronsUpDown, { className: "size-3.5 shrink-0 opacity-60" })] }) }), _jsx(Popover.Portal, { children: _jsxs(Popover.Content, { side: "right", align: "end", sideOffset: 8, className: "z-50 w-64 rounded-2xl border border-glass-border-strong bg-glass-strong p-1.5 shadow-glass-lg backdrop-blur-glass-lg", children: [_jsx("p", { className: "px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted", children: "Dev: preview role" }), _jsx("ul", { className: "flex flex-col gap-0.5", children: order.map((id) => {
                                const s = seedSessions[id];
                                const active = id === roleId;
                                const custom = id === CUSTOM_ROLE_IDS.CLAIMS_OFFICER;
                                return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setRoleId(id), className: cn('flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors', active ? 'bg-white/70 text-ink' : 'text-ink-soft hover:bg-white/50 hover:text-ink'), children: [_jsxs("span", { className: "flex flex-col", children: [_jsxs("span", { className: "flex items-center gap-1.5 font-medium", children: [s.roles[0]?.name, custom ? (_jsxs("span", { className: "inline-flex items-center gap-0.5 rounded-full bg-ai-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-ai", children: [_jsx(Sparkles, { className: "size-2.5" }), " Custom"] })) : null] }), _jsx("span", { className: "text-xs text-ink-muted", children: s.user.email })] }), active ? _jsx(Check, { className: "size-4 text-brand" }) : null] }) }, id));
                            }) })] }) })] }));
}
