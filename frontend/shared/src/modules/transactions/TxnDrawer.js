import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDownLeft, ArrowUpRight, Check, FileText, Flag, Link2, Send, X } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';
import { classifyTransaction, flagTransaction, prepareTransaction } from '../../api/financeOperations';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { CATEGORY_META } from '../../seed/cashLedger';
import { useSessionStore } from '../../state/sessionStore';
import { REVIEW_META, useTransactionsStore } from '../../state/transactionsStore';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';
// Detail + work drawer for one transaction. The preparer confirms the
// classification, attaches evidence, then either prepares it for reconciliation
// or flags it for the Finance Lead. Read-only mode (auditor/lead) hides actions.
export function TxnDrawer({ txn, onClose, readOnly }) {
    const classify = useTransactionsStore((s) => s.classify);
    const prepare = useTransactionsStore((s) => s.prepare);
    const flag = useTransactionsStore((s) => s.flag);
    const hydrateTransactions = useTransactionsStore((s) => s.hydrate);
    const token = useSessionStore((s) => s.session?.token ?? '');
    const t = txn;
    const isIn = t?.direction === 'in';
    const handleClassify = async (id, reference, category) => {
        if (!token) {
            classify(id, category);
            toast({ tone: 'success', title: 'Reclassified', body: `${reference} -> ${CATEGORY_META[category].label}` });
            return;
        }
        try {
            const snapshot = await classifyTransaction(getApiBaseUrl(), token, id, category);
            hydrateTransactions(snapshot.transactions);
            toast({ tone: 'success', title: 'Reclassified', body: `${reference} -> ${CATEGORY_META[category].label}` });
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Classification failed', body: error instanceof Error ? error.message : 'Unable to update transaction.' });
        }
    };
    const handleFlag = async (id, reference) => {
        if (!token) {
            flag(id);
            toast({ tone: 'warning', title: 'Flagged for Finance Lead', body: `${reference} escalated for review.` });
            return;
        }
        try {
            const snapshot = await flagTransaction(getApiBaseUrl(), token, id);
            hydrateTransactions(snapshot.transactions);
            toast({ tone: 'warning', title: 'Flagged for Finance Lead', body: `${reference} escalated for review.` });
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Flag failed', body: error instanceof Error ? error.message : 'Unable to flag transaction.' });
        }
    };
    const handlePrepare = async (id, reference) => {
        if (!token) {
            prepare(id);
            toast({ tone: 'success', title: 'Prepared for reconciliation', body: `${reference} handed to the matching queue.` });
            onClose();
            return;
        }
        try {
            const snapshot = await prepareTransaction(getApiBaseUrl(), token, id);
            hydrateTransactions(snapshot.transactions);
            toast({ tone: 'success', title: 'Prepared for reconciliation', body: `${reference} handed to the matching queue.` });
            onClose();
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Prepare failed', body: error instanceof Error ? error.message : 'Unable to prepare transaction.' });
        }
    };
    return (_jsx(Dialog.Root, { open: t !== null, onOpenChange: (o) => !o && onClose(), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsx(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: t ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: cn('grid size-11 place-items-center rounded-2xl', isIn ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'), children: isIn ? _jsx(ArrowDownLeft, { className: "size-5" }) : _jsx(ArrowUpRight, { className: "size-5" }) }), _jsxs("div", { children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: "Transaction" }), _jsxs("p", { className: "text-[11.5px] text-ink-muted", children: [t.reference, " \u00B7 ", new Date(t.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })] })] })] }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-ink-muted", children: isIn ? 'Money in' : 'Money out' }), _jsxs("p", { className: cn('font-display text-3xl font-bold tabular', isIn ? 'text-success' : 'text-danger'), children: [isIn ? '+' : '−', _jsx(MoneyCell, { amount: t.amount, size: "xl", className: cn('!text-3xl', isIn ? 'text-success' : 'text-danger') })] })] }), _jsx("span", { className: cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', REVIEW_META[t.review].tone), children: REVIEW_META[t.review].label })] }), _jsxs(GlassSurface, { noBlur: true, tone: "subtle", className: "bg-white/60 p-4", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Purpose \u2014 the why" }), _jsx("p", { className: "mt-1 text-[14px] font-semibold text-ink", children: t.purpose }), _jsx("p", { className: "mt-0.5 text-[12px] text-ink-muted", children: t.description })] }), _jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx(PartyAvatar, { name: t.counterparty, size: "md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: t.counterparty }), _jsxs("p", { className: "text-[11px] text-ink-muted", children: [t.account, " \u00B7 Counterparty"] })] })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Classification" }), readOnly ? (_jsx("span", { className: cn('inline-block rounded-lg px-2.5 py-1 text-[12px] font-bold', CATEGORY_META[t.category].tone), children: CATEGORY_META[t.category].label })) : (_jsx("select", { value: t.category, onChange: (e) => { classify(t.id, e.target.value); toast({ tone: 'success', title: 'Reclassified', body: `${t.reference} → ${CATEGORY_META[e.target.value].label}` }); }, className: "h-11 w-full rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30", children: Object.entries(CATEGORY_META).map(([k, v]) => _jsx("option", { value: k, children: v.label }, k)) }))] }), t.linked ? (_jsxs("button", { type: "button", onClick: () => toast({ tone: 'info', title: 'Opening linked record', body: `${t.linked.kind.toUpperCase()} ${t.linked.ref}` }), className: "flex w-full items-center gap-3 rounded-2xl bg-brand-soft/60 p-3 text-left ring-1 ring-brand/15 hover:bg-brand-soft", children: [_jsx(Link2, { className: "size-4 text-brand-ink" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("p", { className: "text-[12.5px] font-bold text-brand-ink", children: ["Linked ", t.linked.kind] }), _jsx("p", { className: "truncate font-mono text-[11px] text-ink-soft", children: t.linked.ref })] })] })) : null, t.evidence.length > 0 ? (_jsxs("div", { children: [_jsx("p", { className: "mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Evidence" }), _jsx("ul", { className: "flex flex-col gap-2", children: t.evidence.map((d) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => openDoc({ name: d.name, kind: d.kind, sizeText: d.sizeText, context: `${t.reference} · ${t.counterparty}` }), className: "flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger", children: _jsx(FileText, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12.5px] font-semibold text-ink", children: d.name }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [d.kind, " \u00B7 ", d.sizeText] })] }), _jsx("span", { className: "rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70", children: "View" })] }) }, d.id))) })] })) : (_jsxs("p", { className: "rounded-2xl bg-warning-soft/50 p-3 text-[12px] font-medium text-warning ring-1 ring-warning/20", children: ["No supporting document \u2014 ", readOnly ? 'incomplete audit trail.' : 'request one before preparing.'] })), t.note ? _jsxs("p", { className: "rounded-2xl bg-white/55 p-3 text-[12px] text-ink-soft ring-1 ring-white/60", children: [_jsx("span", { className: "font-bold text-ink", children: "Note: " }), t.note] }) : null] }), !readOnly && t.review !== 'prepared' ? (_jsxs("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: [_jsxs("button", { type: "button", onClick: () => { void handleFlag(t.id, t.reference); }, className: "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-danger ring-1 ring-white/70 hover:bg-white", children: [_jsx(Flag, { className: "size-4" }), " Flag"] }), _jsxs("button", { type: "button", onClick: () => { void handlePrepare(t.id, t.reference); }, className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Send, { className: "size-4" }), " Prepare for reconciliation"] })] })) : t.review === 'prepared' ? (_jsx("footer", { className: "border-t border-white/55 p-4", children: _jsxs("span", { className: "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success-soft text-[13px] font-bold text-success", children: [_jsx(Check, { className: "size-4" }), " Prepared \u2014 in reconciliation queue"] }) })) : null] })) : null })] }) }));
}
