import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { ACCOUNTS, CATEGORY_META, } from '../../seed/cashLedger';
import { entityName } from '../../seed/entities';
import { useEntityStore } from '../../state/entityStore';
import { MovementDrawer } from './MovementDrawer';
function useRunningBalances(base, openingBalance) {
    return useMemo(() => {
        const asc = [...base].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
        const map = new Map();
        let balance = openingBalance.amountMinor;
        for (const movement of asc) {
            balance += movement.direction === 'in' ? movement.amount.amountMinor : -movement.amount.amountMinor;
            map.set(movement.id, balance);
        }
        return map;
    }, [base, openingBalance]);
}
export function CashMovementsTab({ mode = 'oversight', movements, openingBalance, onReconcile, onHold, onPost, onFlag, }) {
    const scope = useEntityStore((s) => s.scope);
    const [query, setQuery] = useState('');
    const [dir, setDir] = useState('all');
    const [category, setCategory] = useState('all');
    const [account, setAccount] = useState('all');
    const [onlyUnreconciled, setOnlyUnreconciled] = useState(false);
    const [selected, setSelected] = useState(null);
    const base = useMemo(() => (scope === 'all' ? movements : movements.filter((item) => item.entity === scope)), [movements, scope]);
    const balances = useRunningBalances(base, openingBalance);
    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return base
            .filter((item) => (dir === 'all' ? true : item.direction === dir))
            .filter((item) => (category === 'all' ? true : item.category === category))
            .filter((item) => (account === 'all' ? true : item.account === account))
            .filter((item) => (onlyUnreconciled ? !item.reconciled : true))
            .filter((item) => normalized === '' ? true : [item.description, item.counterparty, item.purpose, item.reference].some((value) => value.toLowerCase().includes(normalized)))
            .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    }, [base, query, dir, category, account, onlyUnreconciled]);
    const totalIn = { amountMinor: filtered.filter((item) => item.direction === 'in').reduce((sum, item) => sum + item.amount.amountMinor, 0n), currency: 'USD' };
    const totalOut = { amountMinor: filtered.filter((item) => item.direction === 'out').reduce((sum, item) => sum + item.amount.amountMinor, 0n), currency: 'USD' };
    const net = { amountMinor: totalIn.amountMinor - totalOut.amountMinor, currency: 'USD' };
    const unreconciledCount = base.filter((item) => !item.reconciled).length;
    return (_jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex min-h-0 flex-col", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b border-white/55 p-4", children: [_jsxs("div", { className: "flex h-10 min-w-[220px] flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70", children: [_jsx(Search, { className: "size-4 text-ink-muted" }), _jsx("input", { value: query, onChange: (event) => setQuery(event.target.value), type: "search", placeholder: "Search description, party, purpose, ref...", className: "w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" })] }), _jsx("div", { className: "flex h-10 items-center gap-0.5 rounded-xl bg-white/55 p-0.5 ring-1 ring-white/60", children: ['all', 'in', 'out'].map((value) => (_jsx("button", { type: "button", onClick: () => setDir(value), className: cn('h-9 rounded-lg px-3 text-[12px] font-bold capitalize transition-colors', dir === value ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-muted hover:text-ink'), children: value === 'all' ? 'All' : value === 'in' ? 'Money in' : 'Money out' }, value))) }), _jsxs("select", { value: category, onChange: (event) => setCategory(event.target.value), className: "h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none", children: [_jsx("option", { value: "all", children: "All categories" }), Object.entries(CATEGORY_META).map(([key, meta]) => _jsx("option", { value: key, children: meta.label }, key))] }), _jsxs("select", { value: account, onChange: (event) => setAccount(event.target.value), className: "h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none", children: [_jsx("option", { value: "all", children: "All accounts" }), ACCOUNTS.map((value) => _jsx("option", { value: value, children: value }, value))] })] }), _jsxs("div", { className: "grid grid-cols-[1fr_104px_120px_120px_28px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Movement" }), _jsx("span", { className: "text-right", children: "Amount" }), _jsx("span", { className: "text-right", children: "Balance" }), _jsx("span", { className: "text-right", children: "Status" }), _jsx("span", {})] }), _jsxs("ul", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto", children: [filtered.map((movement) => (_jsx(Row, { movement: movement, balance: { amountMinor: balances.get(movement.id) ?? 0n, currency: 'USD' }, onClick: () => setSelected(movement) }, movement.id))), filtered.length === 0 ? _jsx("li", { className: "grid place-items-center py-16 text-[13px] text-ink-muted", children: "No movements match your filters." }) : null] }), _jsxs("footer", { className: "flex flex-wrap items-center justify-between gap-3 border-t border-white/55 bg-white/45 px-4 py-3", children: [_jsxs("span", { className: "text-[12px] font-semibold text-ink-muted", children: [_jsx("span", { className: "tabular text-ink", children: filtered.length }), " movements \u00B7 ", _jsx("span", { className: "font-bold text-ink", children: entityName(scope) }), scope === 'all' ? ' (consolidated)' : ''] }), _jsxs("div", { className: "flex items-center gap-4 text-[12.5px]", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5 font-bold text-success", children: [_jsx(ArrowDownLeft, { className: "size-3.5" }), " ", _jsx(MoneyCell, { amount: totalIn, size: "sm", className: "!text-[12.5px] text-success" })] }), _jsxs("span", { className: "inline-flex items-center gap-1.5 font-bold text-danger", children: [_jsx(ArrowUpRight, { className: "size-3.5" }), " ", _jsx(MoneyCell, { amount: totalOut, size: "sm", className: "!text-[12.5px] text-danger" })] }), _jsxs("span", { className: "inline-flex items-center gap-1.5 font-bold text-ink", children: ["Net ", _jsx(MoneyCell, { amount: net, size: "sm", className: "!text-[12.5px]", showSign: true })] })] })] })] }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(CategoryBreakdown, { movements: base }), _jsx(UnreconciledCard, { count: unreconciledCount, active: onlyUnreconciled, onToggle: () => setOnlyUnreconciled((value) => !value) }), _jsx(AgentFlags, { hasSuspicious: base.some((item) => item.counterparty === 'OFFSHORE LTD'), onFilterSuspicious: () => { setQuery('OFFSHORE'); setOnlyUnreconciled(false); } })] }), _jsx(MovementDrawer, { movement: selected, onClose: () => setSelected(null), mode: mode, ...(onReconcile ? { onReconcile } : {}), ...(onHold ? { onHold } : {}), ...(onPost ? { onPost } : {}), ...(onFlag ? { onFlag } : {}) })] }));
}
function Row({ movement, balance, onClick }) {
    const isIn = movement.direction === 'in';
    const meta = CATEGORY_META[movement.category];
    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: onClick, className: "grid w-full grid-cols-[1fr_104px_120px_120px_28px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [_jsx("span", { className: cn('grid size-9 shrink-0 place-items-center rounded-xl', isIn ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'), children: isIn ? _jsx(ArrowDownLeft, { className: "size-4" }) : _jsx(ArrowUpRight, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: movement.counterparty }), _jsx("span", { className: cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', meta.tone), children: meta.label })] }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [movement.purpose, " \u00B7 ", movement.account, " \u00B7 ", new Date(movement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] })] })] }), _jsxs("span", { className: cn('text-right text-[13px] font-bold tabular', isIn ? 'text-success' : 'text-danger'), children: [isIn ? '+' : '-', _jsx(MoneyCell, { amount: movement.amount, size: "sm", className: cn('!text-[13px]', isIn ? 'text-success' : 'text-danger') })] }), _jsx(MoneyCell, { amount: balance, size: "sm", className: "text-right font-semibold !text-[12.5px] text-ink-soft" }), _jsx("span", { className: "flex justify-end", children: _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', movement.reconciled ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'), children: movement.reconciled ? 'Reconciled' : 'Unreconciled' }) }), _jsx(ChevronRight, { className: "size-4 justify-self-end text-ink-muted" })] }) }));
}
function CategoryBreakdown({ movements }) {
    const totals = useMemo(() => {
        const map = new Map();
        for (const movement of movements) {
            const entry = map.get(movement.category) ?? { in: 0n, out: 0n };
            if (movement.direction === 'in')
                entry.in += movement.amount.amountMinor;
            else
                entry.out += movement.amount.amountMinor;
            map.set(movement.category, entry);
        }
        const rows = [...map.entries()].map(([category, value]) => ({ category, net: value.in - value.out, gross: value.in + value.out }));
        const max = Math.max(...rows.map((row) => Number(row.gross)), 1);
        return rows.sort((a, b) => Number(b.gross - a.gross)).slice(0, 6).map((row) => ({ ...row, pct: (Number(row.gross) / max) * 100 }));
    }, [movements]);
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 p-4", children: [_jsx("h4", { className: "text-[12px] font-bold text-ink", children: "Flow by category" }), totals.length === 0 ? _jsx("p", { className: "text-[11.5px] text-ink-muted", children: "No movements in this view." }) : null, totals.map((row) => (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between text-[11.5px]", children: [_jsx("span", { className: "font-medium text-ink-soft", children: CATEGORY_META[row.category].label }), _jsx("span", { className: cn('font-bold tabular', row.net >= 0n ? 'text-success' : 'text-danger'), children: _jsx(MoneyCell, { amount: { amountMinor: row.net, currency: 'USD' }, size: "sm", className: cn('!text-[11.5px]', row.net >= 0n ? 'text-success' : 'text-danger'), showSign: true }) })] }), _jsx("div", { className: "mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8", children: _jsx("div", { className: cn('h-full rounded-full', row.net >= 0n ? 'bg-success' : 'bg-danger'), style: { width: `${row.pct}%` } }) })] }, row.category)))] }));
}
function UnreconciledCard({ count, active, onToggle }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2 p-4", children: [_jsx("h4", { className: "text-[12px] font-bold text-ink", children: "Needs reconciling" }), _jsx("span", { className: "font-display text-3xl font-bold text-warning tabular", children: count }), _jsx("button", { type: "button", onClick: onToggle, className: cn('inline-flex h-9 items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold transition-colors', active ? 'bg-brand text-white' : 'bg-white/70 text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink'), children: active ? 'Showing unreconciled' : 'Filter to unreconciled' })] }));
}
function AgentFlags({ hasSuspicious, onFilterSuspicious }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15", children: [_jsxs("header", { className: "flex items-center gap-1.5", children: [_jsx(Sparkles, { className: "size-3.5 text-ai" }), _jsx("h4", { className: "text-[12px] font-bold text-ink", children: "CFO agent flags" })] }), hasSuspicious ? (_jsxs("button", { type: "button", onClick: onFilterSuspicious, className: "rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white", children: [_jsx("span", { className: "font-bold text-danger", children: "Suspicious $15,400" }), " transfer to OFFSHORE LTD is unreconciled with no contract. ", _jsx("span", { className: "font-semibold text-brand", children: "Review \u2192" })] })) : (_jsx("div", { className: "rounded-xl bg-white/55 p-2.5 text-[11.5px] text-ink-muted ring-1 ring-white/60", children: "No suspicious activity flagged in this view." })), _jsxs("div", { className: "rounded-xl bg-white/55 p-2.5 text-[11.5px] text-ink ring-1 ring-white/60", children: [_jsx("span", { className: "font-bold text-warning", children: "Software & subscriptions up 22%" }), " MoM ($4,100). Worth a supplier review."] })] }));
}
