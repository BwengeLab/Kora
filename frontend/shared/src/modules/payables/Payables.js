import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Banknote, Check, FileText, Link2, Search, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { approveBill, payBill } from '../../api/financeOperations';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { accountByCode } from '../../seed/chartOfAccounts';
import { entityName, seedCostCenters } from '../../seed/entities';
import { matchStatus } from '../../seed/payables';
import { resolveChainFrom, useApprovalPolicyStore } from '../../state/approvalPolicyStore';
import { useEntityStore } from '../../state/entityStore';
import { openDoc } from '../../state/docViewerStore';
import { useGLStore } from '../../state/glStore';
import { usePayablesStore } from '../../state/payablesStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { useTransactionsStore } from '../../state/transactionsStore';
const M = (n) => ({ amountMinor: BigInt(Math.round(n * 100)), currency: 'USD' });
const TODAY = new Date('2025-05-18');
const STATUS_TONE = { draft: 'bg-warning-soft text-warning', approved: 'bg-info-soft text-info', paid: 'bg-success-soft text-success' };
const MATCH_TONE = { matched: 'bg-success-soft text-success', 'price-variance': 'bg-danger-soft text-danger', 'no-po': 'bg-ink/10 text-ink-muted' };
const MATCH_LABEL = { matched: '3-way matched', 'price-variance': 'Price variance', 'no-po': 'No PO' };
const isOverdue = (b) => b.status !== 'paid' && new Date(b.dueDate) < TODAY;
// Accounts Payable — the Procure-to-Pay desk. Enter/approve vendor bills with
// 3-way matching; approval and payment post real journals to the GL so the books
// move with the workflow. `canApprove` = Finance Lead; operators prepare only.
export function Payables({ canApprove = false }) {
    const scope = useEntityStore((s) => s.scope);
    const bills = usePayablesStore((s) => s.bills);
    const hydrateBills = usePayablesStore((s) => s.hydrate);
    const approve = usePayablesStore((s) => s.approve);
    const pay = usePayablesStore((s) => s.pay);
    const hydrateGL = useGLStore((s) => s.hydrate);
    const hydrateTransactions = useTransactionsStore((s) => s.hydrate);
    const token = useSessionStore((s) => s.session?.token ?? '');
    const rules = useApprovalPolicyStore((s) => s.rules);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [selectedId, setSelectedId] = useState(null);
    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        return bills
            .filter((b) => scope === 'all' || b.entity === scope)
            .filter((b) => (status === 'all' ? true : b.status === status))
            .filter((b) => (q === '' ? true : [b.vendor, b.ref].some((s) => s.toLowerCase().includes(q))))
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }, [bills, scope, query, status]);
    const scoped = bills.filter((b) => scope === 'all' || b.entity === scope);
    const toApprove = scoped.filter((b) => b.status === 'draft').length;
    const toPay = scoped.filter((b) => b.status === 'approved').length;
    const overdue = scoped.filter(isOverdue).length;
    const outstanding = M(scoped.filter((b) => b.status !== 'paid').reduce((a, b) => a + b.amount, 0));
    const selected = bills.find((b) => b.id === selectedId) ?? null;
    const doApproveRemote = async (b) => {
        if (!token) {
            approve(b.id, 'Finance Lead');
            toast({ tone: 'success', title: 'Bill approved & posted', body: `${b.vendor} - liability posted to the GL (CR Accounts Payable).` });
            return;
        }
        try {
            const snapshot = await approveBill(getApiBaseUrl(), token, b.id);
            hydrateBills(snapshot.bills);
            hydrateGL(snapshot.journals);
            hydrateTransactions(snapshot.transactions);
            toast({ tone: 'success', title: 'Bill approved & posted', body: `${b.vendor} - liability posted to the GL (CR Accounts Payable).` });
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Approval failed', body: error instanceof Error ? error.message : 'Unable to approve bill.' });
        }
    };
    const doPayRemote = async (b) => {
        if (!token) {
            pay(b.id);
            toast({ tone: 'success', title: 'Payment posted', body: `${b.vendor} paid - DR Accounts Payable, CR cash. Books updated.` });
            setSelectedId(null);
            return;
        }
        try {
            const snapshot = await payBill(getApiBaseUrl(), token, b.id);
            hydrateBills(snapshot.bills);
            hydrateGL(snapshot.journals);
            hydrateTransactions(snapshot.transactions);
            toast({ tone: 'success', title: 'Payment posted', body: `${b.vendor} paid - DR Accounts Payable, CR cash. Books updated.` });
            setSelectedId(null);
        }
        catch (error) {
            toast({ tone: 'danger', title: 'Payment failed', body: error instanceof Error ? error.message : 'Unable to pay bill.' });
        }
    };
    const doApprove = (b) => { approve(b.id, 'Finance Lead'); toast({ tone: 'success', title: 'Bill approved & posted', body: `${b.vendor} — liability posted to the GL (CR Accounts Payable).` }); };
    const doPay = (b) => { pay(b.id); toast({ tone: 'success', title: 'Payment posted', body: `${b.vendor} paid — DR Accounts Payable, CR cash. Books updated.` }); setSelectedId(null); };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Accounts Payable", subtitle: canApprove ? 'Approve and pay vendor bills — every action posts to the ledger. 3-way matched against PO and goods receipt.' : 'Vendor bills and their 3-way match status. You prepare; the Finance Lead approves and pays.', right: _jsx(DateRangePill, { label: "May 2025" }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(Stat, { label: "To approve", value: String(toApprove), tone: "text-warning", active: status === 'draft', onClick: () => setStatus(status === 'draft' ? 'all' : 'draft') }), _jsx(Stat, { label: "Approved \u00B7 to pay", value: String(toPay), tone: "text-info", active: status === 'approved', onClick: () => setStatus(status === 'approved' ? 'all' : 'approved') }), _jsx(Stat, { label: "Overdue", value: String(overdue), tone: "text-danger" }), _jsx(Stat, { label: "Outstanding payable", money: outstanding, tone: "text-ink" })] }), _jsxs(GlassSurface, { tone: "strong", className: "flex min-h-0 flex-1 flex-col", children: [_jsx("div", { className: "flex items-center gap-2 border-b border-white/55 p-4", children: _jsxs("div", { className: "flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70", children: [_jsx(Search, { className: "size-4 text-ink-muted" }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), type: "search", placeholder: "Search vendor or invoice ref\u2026", className: "w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" })] }) }), _jsxs("div", { className: "grid grid-cols-[1fr_130px_120px_110px_90px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Vendor / bill" }), _jsx("span", { children: "Match" }), _jsx("span", { className: "text-right", children: "Amount" }), _jsx("span", { className: "text-right", children: "Due" }), _jsx("span", { className: "text-right", children: "Status" })] }), _jsxs("ul", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto", children: [list.map((b) => {
                                        const ms = matchStatus(b);
                                        return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setSelectedId(b.id), className: "grid w-full grid-cols-[1fr_130px_120px_110px_90px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [_jsx(PartyAvatar, { name: b.vendor, size: "md" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: b.vendor }), _jsx("p", { className: "truncate font-mono text-[11px] text-ink-muted", children: b.ref })] })] }), _jsx("span", { children: _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase', MATCH_TONE[ms]), children: MATCH_LABEL[ms] }) }), _jsx(MoneyCell, { amount: M(b.amount), size: "sm", className: "text-right font-bold !text-[13px]" }), _jsx("span", { className: cn('text-right text-[11.5px] tabular', isOverdue(b) ? 'font-bold text-danger' : 'text-ink-soft'), children: new Date(b.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }), _jsx("span", { className: "flex justify-end", children: _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STATUS_TONE[b.status]), children: b.status }) })] }) }, b.id));
                                    }), list.length === 0 ? _jsx("li", { className: "grid place-items-center py-16 text-[13px] text-ink-muted", children: "No bills match." }) : null] }), _jsxs("footer", { className: "flex items-center justify-between border-t border-white/55 bg-white/45 px-4 py-2.5 text-[11.5px] font-semibold text-ink-muted", children: [_jsxs("span", { children: [list.length, " bills \u00B7 ", entityName(scope), scope === 'all' ? ' (consolidated)' : ''] }), _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(ShieldCheck, { className: "size-3.5" }), " Approvals post to the General Ledger"] })] })] })] }), _jsx(BillDrawer, { bill: selected, canApprove: canApprove, rules: rules, onClose: () => setSelectedId(null), onApprove: doApproveRemote, onPay: doPayRemote })] }));
}
function BillDrawer({ bill: b, canApprove, rules, onClose, onApprove, onPay }) {
    if (!b)
        return _jsx(Dialog.Root, { open: false, onOpenChange: () => onClose(), children: _jsx("span", {}) });
    const ms = matchStatus(b);
    const chain = resolveChainFrom(rules, b.amount);
    const acct = accountByCode(b.account);
    const cc = seedCostCenters.find((c) => c.id === b.costCenter);
    return (_jsx(Dialog.Root, { open: b !== null, onOpenChange: (o) => !o && onClose(), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsxs(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(480px,95vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: [_jsxs("header", { className: "flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(PartyAvatar, { name: b.vendor, size: "lg" }), _jsxs("div", { children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: b.vendor }), _jsx("p", { className: "font-mono text-[11.5px] text-ink-muted", children: b.ref })] })] }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-ink-muted", children: "Amount" }), _jsx(MoneyCell, { amount: M(b.amount), size: "xl", className: "!text-3xl font-bold text-ink" })] }), _jsx("span", { className: cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', STATUS_TONE[b.status]), children: b.status })] }), _jsxs("div", { className: "rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "3-way match" }), _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', MATCH_TONE[ms]), children: MATCH_LABEL[ms] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 text-center", children: [_jsx(MatchCell, { label: "PO", value: b.poAmount }), _jsx(MatchCell, { label: "Receipt", value: b.receiptAmount }), _jsx(MatchCell, { label: "Invoice", value: b.amount })] }), ms === 'price-variance' ? _jsx("p", { className: "mt-2 text-[11.5px] font-semibold text-danger", children: "Invoice exceeds the PO \u2014 investigate before approving." }) : null] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Meta, { label: "Debit account", value: `${b.account} · ${acct?.name ?? ''}` }), _jsx(Meta, { label: "Cost center", value: cc?.name ?? '—' })] }), _jsxs("div", { className: "rounded-2xl bg-brand-soft/40 p-3.5 ring-1 ring-brand/15", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-brand-ink", children: "Approval required" }), _jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-1.5", children: [chain.approvers.map((a, i) => (_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[11px] font-bold', i === 0 ? 'bg-white text-brand-ink' : 'bg-lavender-soft text-lavender'), children: a }), i < chain.approvers.length - 1 ? _jsx(ArrowRight, { className: "size-3.5 text-brand-ink" }) : null] }, a))), _jsx("span", { className: "text-[11px] font-semibold text-ink-muted", children: chain.requiresDual ? '· dual approval' : '· single approval' })] })] }), _jsxs("button", { type: "button", onClick: () => openDoc({ name: b.evidenceName, kind: 'invoice', sizeText: '—', context: b.ref }), className: "flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger", children: _jsx(FileText, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12.5px] font-semibold text-ink", children: b.evidenceName }), _jsx("p", { className: "text-[11px] text-ink-muted", children: "Supporting document" })] }), _jsx("span", { className: "rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70", children: "View" })] })] }), canApprove ? (_jsx("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: b.status === 'draft' ? (_jsxs("button", { type: "button", onClick: () => onApprove(b), className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Check, { className: "size-4" }), " Approve & post to GL"] })) : b.status === 'approved' ? (_jsxs("button", { type: "button", onClick: () => onPay(b), className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-success to-[#0e7a5b] text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Banknote, { className: "size-4" }), " Pay & post to GL"] })) : (_jsxs("span", { className: "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success-soft text-[13px] font-bold text-success", children: [_jsx(Check, { className: "size-4" }), " Paid & posted"] })) })) : (_jsx("footer", { className: "border-t border-white/55 p-4", children: _jsxs("span", { className: "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/60 text-[12.5px] font-bold text-ink-muted", children: [_jsx(Link2, { className: "size-4" }), " ", b.status === 'draft' ? 'Prepared — awaiting Finance Lead approval' : b.status === 'approved' ? 'Approved — awaiting payment' : 'Paid'] }) }))] })] }) }));
}
function MatchCell({ label, value }) {
    return (_jsxs("div", { className: "rounded-xl bg-white/70 p-2 ring-1 ring-white/60", children: [_jsx("p", { className: "text-[9.5px] font-bold uppercase tracking-wider text-ink-muted", children: label }), value === null ? _jsx("p", { className: "text-[12px] font-semibold text-ink-muted", children: "\u2014" }) : _jsx(MoneyCell, { amount: M(value), size: "sm", className: "!text-[12.5px] font-bold" })] }));
}
function Meta({ label, value }) {
    return _jsxs("div", { children: [_jsx("dt", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsx("dd", { className: "text-[12.5px] font-semibold text-ink", children: value })] });
}
function Stat({ label, value, money, tone, active, onClick }) {
    return (_jsx(GlassSurface, { tone: "strong", className: cn('p-3.5', active && 'ring-2 ring-brand/40'), children: _jsxs("button", { type: "button", onClick: onClick, disabled: !onClick, className: cn('flex w-full flex-col gap-0.5 text-left', onClick && 'cursor-pointer'), children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), money ? _jsx(MoneyCell, { amount: money, size: "lg", className: cn('!text-2xl font-bold', tone) }) : _jsx("span", { className: cn('font-display text-2xl font-bold tabular', tone), children: value }), onClick ? _jsx("span", { className: "text-[10.5px] font-semibold text-brand", children: active ? 'Filtered · clear' : 'Filter' }) : null] }) }));
}
