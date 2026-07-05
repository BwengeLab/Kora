import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../utils/cn';
const toneClasses = {
    neutral: 'bg-white/60 text-ink-soft border-white/70',
    info: 'bg-info-soft text-info border-info/20',
    success: 'bg-success-soft text-success border-success/20',
    warning: 'bg-warning-soft text-warning border-warning/30',
    danger: 'bg-danger-soft text-danger border-danger/25',
    ai: 'bg-ai-soft text-ai border-ai/20',
};
export function StatusChip({ tone = 'neutral', icon, className, children, ...rest }) {
    return (_jsxs("span", { className: cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5', toneClasses[tone], className), ...rest, children: [icon ? _jsx("span", { className: "-ml-0.5 [&>svg]:size-3.5", children: icon }) : null, children] }));
}
