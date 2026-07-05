import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from '@tanstack/react-router';
import { Clock, MailQuestion, PenLine, RotateCcw, Send } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedOperatorTasks } from '../../seed/operatorHome';
const STATUS = {
    assigned: { label: 'Assigned', icon: PenLine, tone: 'bg-brand-soft text-brand-ink' },
    awaiting_info: { label: 'Awaiting info', icon: MailQuestion, tone: 'bg-warning-soft text-warning' },
    prepared: { label: 'Prepared', icon: Send, tone: 'bg-success-soft text-success' },
    returned: { label: 'Returned', icon: RotateCcw, tone: 'bg-danger-soft text-danger' },
};
export function MyTasksCard({ tasks = seedOperatorTasks }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center justify-between gap-3", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "My tasks" }), _jsx(Link, { to: "/approvals", className: "text-xs font-semibold text-brand hover:text-brand-ink", children: "View all" })] }), _jsx("ul", { className: "scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5", children: tasks.map((t) => {
                    const s = STATUS[t.status];
                    return (_jsxs("li", { className: "flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("span", { className: cn('grid size-9 shrink-0 place-items-center rounded-xl', s.tone), children: _jsx(s.icon, { className: "size-[16px]" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: t.title }), _jsx("p", { className: "truncate text-[11px] text-ink-muted", children: t.context })] }), _jsxs("div", { className: "flex shrink-0 flex-col items-end gap-1", children: [_jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide', s.tone), children: s.label }), _jsxs("span", { className: cn('inline-flex items-center gap-1 text-[10.5px] font-medium', t.urgent ? 'text-danger' : 'text-ink-muted'), children: [_jsx(Clock, { className: "size-3" }), " ", t.deadlineText] })] })] }, t.id));
                }) })] }));
}
