import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, Lock } from 'lucide-react';
import { cn } from '../../design-system';
const STEPS = [
    { stage: 'detected', label: 'Detected', owner: 'Kora AI', ownedByOperator: false },
    { stage: 'reviewing', label: 'Review', owner: 'You', ownedByOperator: true },
    { stage: 'prepared', label: 'Prepare', owner: 'You', ownedByOperator: true },
    { stage: 'approved', label: 'Approve', owner: 'Finance Lead', ownedByOperator: false },
    { stage: 'posted', label: 'Post to ledger', owner: 'Finance Lead', ownedByOperator: false },
];
const ORDER = ['detected', 'reviewing', 'prepared', 'approved', 'posted'];
export function StageStepper({ current }) {
    const currentIdx = ORDER.indexOf(current);
    return (_jsx("ol", { className: "flex items-center gap-1", children: STEPS.map((step, i) => {
            const idx = ORDER.indexOf(step.stage);
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;
            const lockedForOperator = !step.ownedByOperator && isFuture;
            return (_jsxs("li", { className: "flex flex-1 items-center gap-1", children: [_jsxs("div", { className: cn('flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2 transition-colors', isCurrent && 'border-brand/30 bg-brand-soft/70 ring-1 ring-brand/20', isDone && 'border-success/20 bg-success-soft/50', isFuture && 'border-white/60 bg-white/35'), children: [_jsx("span", { className: cn('grid size-7 shrink-0 place-items-center rounded-lg text-[12px] font-bold', isDone && 'bg-success text-white', isCurrent && 'bg-brand text-white', isFuture && (lockedForOperator ? 'bg-white/70 text-ink-muted' : 'bg-white/70 text-ink-soft')), children: isDone ? _jsx(Check, { className: "size-4" }) : lockedForOperator ? _jsx(Lock, { className: "size-3.5" }) : i + 1 }), _jsxs("div", { className: "flex min-w-0 flex-col leading-tight", children: [_jsx("span", { className: cn('truncate text-[12.5px] font-bold', isCurrent ? 'text-brand-ink' : isDone ? 'text-success' : 'text-ink-soft'), children: step.label }), _jsx("span", { className: "truncate text-[10.5px] font-medium text-ink-muted", children: isCurrent ? `You are here · ${step.owner}` : step.owner })] })] }), i < STEPS.length - 1 ? (_jsx("span", { className: cn('h-0.5 w-3 shrink-0 rounded-full', isDone ? 'bg-success/40' : 'bg-ink/10') })) : null] }, step.stage));
        }) }));
}
