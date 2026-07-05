import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, UserCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GlassSurface } from '../../design-system';
import { toast } from '../../state/toastStore';
export function AccessRequestsCard({ items }) {
    const [requests, setRequests] = useState(items);
    useEffect(() => {
        setRequests(items);
    }, [items]);
    const resolve = (request, granted) => {
        setRequests((prev) => prev.filter((entry) => entry.id !== request.id));
        toast({
            tone: granted ? 'success' : 'warning',
            title: granted ? 'Access granted' : 'Request denied',
            body: `${request.name} · ${request.requestedRole}`,
        });
    };
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center gap-2", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-xl bg-warning-soft text-warning", children: _jsx(UserCheck, { className: "size-4" }) }), _jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Pending access requests" }), _jsx("span", { className: "rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning tabular", children: requests.length })] }), _jsxs("ul", { className: "flex flex-col gap-2", children: [requests.map((request) => (_jsxs("li", { className: "flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: request.name }), _jsx("p", { className: "truncate text-[11px] text-ink-muted", children: request.requestedRole }), _jsxs("p", { className: "truncate text-[10.5px] text-ink-muted", children: [request.reason, " \u00B7 ", request.when] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [_jsx("button", { type: "button", "aria-label": "Deny", title: "Deny", onClick: () => resolve(request, false), className: "grid size-8 place-items-center rounded-xl bg-white/70 text-ink-muted ring-1 ring-white/70 hover:bg-danger-soft hover:text-danger", children: _jsx(X, { className: "size-4" }) }), _jsx("button", { type: "button", "aria-label": "Grant", title: "Grant", onClick: () => resolve(request, true), className: "grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft", children: _jsx(Check, { className: "size-4" }) })] })] }, request.id))), requests.length === 0 ? (_jsxs("li", { className: "grid place-items-center gap-1 py-10 text-center", children: [_jsx(Check, { className: "size-7 text-success" }), _jsx("p", { className: "text-[13px] font-semibold text-ink", children: "No pending requests" }), _jsx("p", { className: "text-[12px] text-ink-muted", children: "You're all caught up." })] })) : null] })] }));
}
