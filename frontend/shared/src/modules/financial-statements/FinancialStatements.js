import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckCircle2, Download, Scale, TrendingUp, Wallet2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { entityName } from '../../seed/entities';
import { balanceSheet, cashFlow, incomeStatement } from '../../state/glStore';
import { useEntityStore } from '../../state/entityStore';
import { useGLStore } from '../../state/glStore';
import { toast } from '../../state/toastStore';
const M = (amountMinor) => ({ amountMinor, currency: 'USD' });
// Financial statements — P&L, Balance Sheet and Cash Flow, all computed live from
// the posted journals. They tie out because the GL ties out: the balance sheet
// balances and net income flows from the P&L. This is the output of a real
// system of record, not seeded numbers.
export function FinancialStatements() {
    const scope = useEntityStore((s) => s.scope);
    const journals = useGLStore((s) => s.journals);
    const [tab, setTab] = useState('pl');
    const pl = useMemo(() => incomeStatement(journals, scope), [journals, scope]);
    const bs = useMemo(() => balanceSheet(journals, scope), [journals, scope]);
    const cf = useMemo(() => cashFlow(journals, scope), [journals, scope]);
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Financial Statements", subtitle: _jsxs(_Fragment, { children: ["Live from the ledger for ", _jsx("span", { className: "font-semibold text-ink", children: entityName(scope) }), scope === 'all' ? ' (consolidated)' : '', " \u2014 they tie out because the books do."] }), right: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs("button", { type: "button", onClick: () => toast({ tone: 'success', title: 'Exported', body: 'Statement pack (PDF) prepared from the ledger.' }), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink", children: [_jsx(Download, { className: "size-4" }), " Export"] }), _jsx(DateRangePill, { label: "May 2025" })] }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6", children: [_jsx("div", { className: "flex gap-1 border-b border-white/55", children: [['pl', 'Income statement', TrendingUp], ['bs', 'Balance sheet', Scale], ['cf', 'Cash flow', Wallet2]].map(([id, label, Icon]) => (_jsxs("button", { type: "button", onClick: () => setTab(id), className: cn('relative inline-flex items-center gap-1.5 px-3.5 pb-2.5 text-[13.5px] font-semibold transition-colors', tab === id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'), children: [_jsx(Icon, { className: "size-4" }), " ", label, tab === id ? _jsx("span", { className: "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" }) : null] }, id))) }), _jsxs("div", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto", children: [tab === 'pl' ? (_jsxs(Sheet, { title: "Income statement \u00B7 May 2025", children: [_jsx(Group, { label: "Revenue", lines: pl.revenue }), _jsx(Subtotal, { label: "Total revenue", amount: pl.totalRevenue }), _jsx(Group, { label: "Expenses", lines: pl.expenses }), _jsx(Subtotal, { label: "Total expenses", amount: pl.totalExpense }), _jsx(Total, { label: "Net income", amount: pl.netIncome, good: pl.netIncome >= 0n })] })) : null, tab === 'bs' ? (_jsxs(Sheet, { title: "Balance sheet \u00B7 as at May 31, 2025", children: [_jsx(Group, { label: "Assets", lines: bs.assets }), _jsx(Subtotal, { label: "Total assets", amount: bs.totalAssets }), _jsx(Group, { label: "Liabilities", lines: bs.liabilities }), _jsx(Subtotal, { label: "Total liabilities", amount: bs.totalLiabilities }), _jsx(Group, { label: "Equity", lines: bs.equity, extra: [{ code: 'NI', name: 'Net income (period)', amount: bs.netIncome }] }), _jsx(Subtotal, { label: "Total equity", amount: bs.totalEquity }), _jsx(Total, { label: "Liabilities + Equity", amount: bs.totalLiabilities + bs.totalEquity }), _jsxs("div", { className: cn('mt-3 flex items-center gap-2 rounded-2xl p-3.5 ring-1', bs.balances ? 'bg-success-soft/50 ring-success/20' : 'bg-danger-soft/50 ring-danger/20'), children: [_jsx(CheckCircle2, { className: cn('size-5', bs.balances ? 'text-success' : 'text-danger') }), _jsx("p", { className: cn('text-[13px] font-bold', bs.balances ? 'text-success' : 'text-danger'), children: bs.balances ? 'Balanced — Assets = Liabilities + Equity' : 'Out of balance' })] })] })) : null, tab === 'cf' ? (_jsxs(Sheet, { title: "Cash flow statement \u00B7 May 2025", children: [_jsx(Row, { label: "Opening cash", amount: cf.opening, muted: true }), _jsx("div", { className: "mt-2" }), _jsx(Row, { label: "Operating activities", amount: cf.operating }), _jsx(Row, { label: "Investing activities", amount: cf.investing }), _jsx(Row, { label: "Financing activities", amount: cf.financing }), _jsx(Subtotal, { label: "Net change in cash", amount: cf.netChange, signed: true }), _jsx(Total, { label: "Closing cash", amount: cf.closing })] })) : null] })] })] }));
}
function Sheet({ title, children }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "mx-auto max-w-3xl p-7", children: [_jsx("h3", { className: "mb-4 font-display text-lg font-bold text-ink", children: title }), children] }));
}
function Group({ label, lines, extra }) {
    const all = [...lines, ...(extra ?? [])];
    return (_jsxs("div", { className: "mt-4", children: [_jsx("p", { className: "text-[12px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsxs("ul", { children: [all.map((l) => (_jsxs("li", { className: "flex items-center justify-between gap-4 border-b border-white/40 py-2 text-[13px]", children: [_jsxs("span", { className: "text-ink-soft", children: [l.code !== 'NI' ? _jsxs("span", { className: "font-mono text-[11px] text-ink-muted", children: [l.code, " \u00B7 "] }) : null, l.name] }), _jsx(MoneyCell, { amount: M(l.amount), size: "sm", className: "font-semibold !text-[13px]" })] }, l.code))), all.length === 0 ? _jsx("li", { className: "py-2 text-[12.5px] text-ink-muted", children: "None." }) : null] })] }));
}
function Row({ label, amount, muted, signed }) {
    return (_jsxs("div", { className: "flex items-center justify-between gap-4 py-2 text-[13px]", children: [_jsx("span", { className: muted ? 'text-ink-muted' : 'font-medium text-ink', children: label }), _jsx(MoneyCell, { amount: M(amount), size: "sm", className: cn('font-semibold !text-[13px]', muted && 'text-ink-muted'), showSign: signed ?? false })] }));
}
function Subtotal({ label, amount, signed }) {
    return (_jsxs("div", { className: "mt-1 flex items-center justify-between gap-4 rounded-xl bg-white/55 px-3 py-2", children: [_jsx("span", { className: "text-[13px] font-bold text-ink", children: label }), _jsx(MoneyCell, { amount: M(amount), size: "sm", className: "font-bold !text-[13px]", showSign: signed ?? false })] }));
}
function Total({ label, amount, good }) {
    return (_jsxs("div", { className: "mt-2 flex items-center justify-between gap-4 border-t-2 border-ink/15 pt-3", children: [_jsx("span", { className: "font-display text-[15px] font-bold text-ink", children: label }), _jsx(MoneyCell, { amount: M(amount), size: "lg", className: cn('!text-xl font-bold', good === undefined ? 'text-ink' : good ? 'text-success' : 'text-danger'), showSign: true })] }));
}
