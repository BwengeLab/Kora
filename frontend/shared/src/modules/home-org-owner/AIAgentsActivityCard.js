import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bot } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedAgents } from '../../seed/orgOwnerHome';
const STATUS_TONES = {
    Completed: 'bg-success-soft text-success',
    'In Progress': 'bg-info-soft text-info',
    Failed: 'bg-danger-soft text-danger',
};
export function AIAgentsActivityCard() {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-3 p-5", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsx("h3", { className: "font-display text-base font-semibold text-ink", children: "AI Agent Activity" }), _jsx("button", { type: "button", className: "text-xs font-semibold text-brand hover:text-brand-ink", children: "View all" })] }), _jsx("ul", { className: "flex flex-col", children: seedAgents.map((a) => (_jsxs("li", { className: "flex items-center gap-3 border-b border-white/50 py-2.5 last:border-b-0", children: [_jsx("span", { className: "grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ai-soft to-brand-soft text-ai", children: _jsx(Bot, { className: "size-[14px]" }) }), _jsx("span", { className: "flex-1 text-[13px] font-semibold text-ink", children: a.name }), _jsx("span", { className: cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', STATUS_TONES[a.status]), children: a.status }), _jsx("span", { className: "w-14 text-right text-[11px] font-medium text-ink-muted", children: a.when })] }, a.id))) })] }));
}
