import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { useToastStore } from '../../state/toastStore';
const ICON = {
    success: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
    danger: AlertOctagon,
};
const TONE = {
    success: 'bg-success-soft text-success',
    info: 'bg-info-soft text-info',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
};
export function Toaster() {
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);
    return (_jsx("div", { className: "pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2.5", children: toasts.map((t) => {
            const Icon = ICON[t.tone];
            return (_jsxs(GlassSurface, { tone: "strong", className: "pointer-events-auto flex items-start gap-3 p-3.5 shadow-glass-lg", children: [_jsx("span", { className: cn('grid size-9 shrink-0 place-items-center rounded-xl', TONE[t.tone]), children: _jsx(Icon, { className: "size-[18px]" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-[13px] font-bold text-ink", children: t.title }), t.body ? _jsx("p", { className: "text-[11.5px] text-ink-muted", children: t.body }) : null] }), _jsx("button", { type: "button", "aria-label": "Dismiss", onClick: () => dismiss(t.id), className: "grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }, t.id));
        }) }));
}
