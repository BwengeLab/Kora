import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from '@tanstack/react-router';
import { AlertTriangle, Compass, Home, RotateCw } from 'lucide-react';
import { Component } from 'react';
import { GlassSurface } from '../../design-system';
// Production-grade fallbacks: a page never white-screens. Route errors and 404s
// land on a branded panel; render crashes are caught by the boundary below.
function Panel({ icon, title, body, children }) {
    return (_jsx("div", { className: "grid min-h-[70vh] place-items-center px-8 py-10", children: _jsxs(GlassSurface, { tone: "strong", className: "flex max-w-md flex-col items-center gap-4 p-10 text-center", children: [_jsx("span", { className: "grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-soft to-ai-soft text-brand-ink", children: icon }), _jsx("h2", { className: "font-display text-2xl font-bold text-ink", children: title }), _jsx("p", { className: "text-[14px] leading-relaxed text-ink-muted", children: body }), _jsx("div", { className: "mt-1 flex items-center gap-2", children: children })] }) }));
}
const homeBtn = (_jsxs(Link, { to: "/", className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white", children: [_jsx(Home, { className: "size-4" }), " Back to home"] }));
// Route-level error (thrown in a page/loader). TanStack passes error + reset.
export function RouteError({ error, reset }) {
    return (_jsxs(Panel, { icon: _jsx(AlertTriangle, { className: "size-8" }), title: "Something went wrong", body: "This screen hit an unexpected error. You can retry, or head back \u2014 nothing you did was lost.", children: [reset ? (_jsxs("button", { type: "button", onClick: reset, className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(RotateCw, { className: "size-4" }), " Try again"] })) : null, homeBtn, import.meta.env?.DEV && error?.message ? (_jsx("p", { className: "mt-3 w-full break-words rounded-xl bg-danger-soft/50 p-2.5 text-left font-mono text-[11px] text-danger", children: error.message })) : null] }));
}
// 404.
export function NotFound() {
    return (_jsx(Panel, { icon: _jsx(Compass, { className: "size-8" }), title: "Page not found", body: "That page doesn\u2019t exist, or you don\u2019t have access to it in your current role.", children: homeBtn }));
}
// Top-level boundary for render crashes anywhere in the shell (sidebar, top bar,
// providers) — a last line of defence so the app shows a graceful screen, never
// a blank page. A full reload is the safe recovery.
export class AppErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        // In production this is where we'd report to the error service.
        console.error('Kora app error:', error, info.componentStack);
    }
    render() {
        if (this.state.error) {
            return (_jsx("div", { className: "grid h-dvh w-full place-items-center bg-backdrop px-6", children: _jsxs(GlassSurface, { tone: "strong", className: "flex max-w-md flex-col items-center gap-4 p-10 text-center", children: [_jsx("span", { className: "grid size-16 place-items-center rounded-3xl bg-danger-soft text-danger", children: _jsx(AlertTriangle, { className: "size-8" }) }), _jsx("h2", { className: "font-display text-2xl font-bold text-ink", children: "Kora hit a snag" }), _jsx("p", { className: "text-[14px] leading-relaxed text-ink-muted", children: "Something unexpected happened. Reloading usually fixes it." }), _jsxs("button", { type: "button", onClick: () => window.location.reload(), className: "mt-1 inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(RotateCw, { className: "size-4" }), " Reload Kora"] })] }) }));
        }
        return this.props.children;
    }
}
