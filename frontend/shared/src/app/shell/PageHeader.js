import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Calendar } from 'lucide-react';
import { useSession } from '../../auth/hooks';
import { GlassSurface, cn } from '../../design-system';
function greeting() {
    const h = new Date().getHours();
    if (h < 12)
        return 'Good morning';
    if (h < 18)
        return 'Good afternoon';
    return 'Good evening';
}
export function PageHeader({ title, subtitle, right, className }) {
    const session = useSession();
    const firstName = session?.user.displayName.split(' ')[0] ?? '';
    const computed = (_jsxs(_Fragment, { children: [greeting(), ", ", firstName, _jsx("span", { "aria-hidden": true, className: "ml-2", children: "\uD83D\uDC4B" })] }));
    return (_jsxs("div", { className: cn('flex flex-wrap items-end justify-between gap-4 px-8 pt-2 pb-5', className), children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h1", { className: "font-display text-[28px] font-bold leading-tight tracking-tight text-ink", children: title ?? computed }), subtitle ? _jsx("p", { className: "mt-1 text-sm text-ink-muted", children: subtitle }) : null] }), right] }));
}
// Default right-side: a date-range pill matching the reference image.
export function DateRangePill({ label }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-11 items-center gap-2.5 px-4", children: [_jsx(Calendar, { className: "size-4 text-ink-muted" }), _jsx("span", { className: "text-sm font-semibold text-ink tabular", children: label })] }));
}
