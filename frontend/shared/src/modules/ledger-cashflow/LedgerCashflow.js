import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUpRight, Banknote, Download, Info, Percent, TrendingUp, Wallet2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { fetchFinanceCashflowView, flagCashMovement, holdCashMovement, postCashMovement, reconcileCashMovement } from '../../api/financeAuditViews';
import { DateRangePill, PageHeader } from '../../app/shell';
import { AreaChart, GlassSurface, KpiCard, MoneyCell, cn } from '../../design-system';
import { seedCashMovements } from '../../seed/cashLedger';
import { seedLedgerCashflow, seedLedgerKpis, seedMarginBySegment, seedPnl } from '../../seed/ownerLedger';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { CashMovementsTab } from './CashMovementsTab';
const KPI_ICON = {
    cash: _jsx(Banknote, {}),
    netflow: _jsx(TrendingUp, {}),
    margin: _jsx(Percent, {}),
    workingCapital: _jsx(Wallet2, {}),
};
const TABS = [
    { id: 'movements', label: 'Cash movements' },
    { id: 'statement', label: 'Cashflow statement' },
    { id: 'pnl', label: 'Profit & loss' },
    { id: 'forecast', label: 'Forecast' },
];
const LEDGER_SUBTITLE = {
    operate: 'Every cash movement - record and reconcile each one against the bank, none missed.',
    post: 'Every cash movement - review and post each entry to the ledger. You commit; the operator reconciles.',
    oversight: 'Every cash movement in the business - what came in, what went out, and why.',
    read: 'Every cash movement in the business - read-only, with full purpose and evidence.',
};
export function LedgerCashflow({ mode = 'oversight' }) {
    const token = useSessionStore((s) => s.session?.token ?? '');
    const apiBaseUrl = getApiBaseUrl();
    const tabs = mode === 'operate' ? TABS.filter((item) => item.id === 'movements' || item.id === 'statement') : TABS;
    const [tab, setTab] = useState('movements');
    const [view, setView] = useState(null);
    useEffect(() => {
        if (!token)
            return;
        const controller = new AbortController();
        fetchFinanceCashflowView(apiBaseUrl, token, controller.signal)
            .then(setView)
            .catch((error) => {
            if (!controller.signal.aborted) {
                toast({ tone: 'warning', title: 'Cashflow unavailable', body: error instanceof Error ? error.message : 'Could not load ledger cashflow.' });
            }
        });
        return () => controller.abort();
    }, [apiBaseUrl, token]);
    const kpis = view?.kpis ?? seedLedgerKpis;
    const forecast = view?.forecast ?? seedLedgerCashflow;
    const pnl = view?.pnl ?? seedPnl;
    const marginBySegment = view?.marginBySegment ?? seedMarginBySegment;
    const movements = view?.movements ?? seedCashMovements;
    const openingBalance = view?.openingBalance ?? { amountMinor: 198000000n, currency: 'USD' };
    const refresh = async (runner, success) => {
        try {
            const payload = await runner();
            setView(payload);
            toast({ tone: 'success', title: success.title, body: success.body });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not update the cash movement.' });
        }
    };
    const handleReconcile = async (movement) => {
        if (!token) {
            toast({ tone: 'success', title: 'Marked reconciled', body: `${movement.reference} matched and reconciled.` });
            return;
        }
        await refresh(() => reconcileCashMovement(apiBaseUrl, token, movement.id), {
            title: 'Marked reconciled',
            body: `${movement.reference} matched and reconciled.`,
        });
    };
    const handleHold = async (movement) => {
        if (!token) {
            toast({ tone: 'warning', title: 'Held for query', body: `${movement.reference} held - sent back to the operator with a query.` });
            return;
        }
        await refresh(() => holdCashMovement(apiBaseUrl, token, movement.id, 'Held for operator follow-up.'), {
            title: 'Held for query',
            body: `${movement.reference} held - sent back to the operator with a query.`,
        });
    };
    const handlePost = async (movement) => {
        if (!token) {
            toast({ tone: 'success', title: 'Posted to ledger', body: `${movement.reference} committed to the general ledger and audited.` });
            return;
        }
        await refresh(() => postCashMovement(apiBaseUrl, token, movement.id), {
            title: 'Posted to ledger',
            body: `${movement.reference} committed to the general ledger and audited.`,
        });
    };
    const handleFlag = async (movement) => {
        if (!token) {
            toast({ tone: 'warning', title: 'Flagged for review', body: `${movement.reference} flagged for finance to check.` });
            return;
        }
        await refresh(() => flagCashMovement(apiBaseUrl, token, movement.id, 'Flagged from cashflow oversight.'), {
            title: 'Flagged for review',
            body: `${movement.reference} flagged for finance to check.`,
        });
    };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Cash Flow", subtitle: LEDGER_SUBTITLE[mode], right: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs("button", { type: "button", onClick: () => toast({ tone: 'info', title: 'Exporting', body: 'Cash ledger (Excel) is being prepared.' }), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink", children: [_jsx(Download, { className: "size-4" }), " Export"] }), _jsx(DateRangePill, { label: "May 2025" })] }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-5 px-8 pb-6", children: [_jsx("section", { className: "grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4", children: kpis.map((kpi) => kpi.money ? (_jsx(KpiCard, { label: kpi.label, money: kpi.money, icon: KPI_ICON[kpi.id], delta: kpi.delta, positiveDirection: kpi.positiveDirection }, kpi.id)) : (_jsx(KpiCard, { label: kpi.label, valueText: kpi.valueText, icon: KPI_ICON[kpi.id], delta: kpi.delta, positiveDirection: kpi.positiveDirection }, kpi.id))) }), _jsx("div", { className: "flex gap-1 border-b border-white/55", children: tabs.map((item) => (_jsxs("button", { type: "button", onClick: () => setTab(item.id), className: cn('relative px-3.5 pb-2.5 text-[13.5px] font-semibold transition-colors', tab === item.id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'), children: [item.label, tab === item.id ? _jsx("span", { className: "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" }) : null] }, item.id))) }), tab === 'movements' ? _jsx(CashMovementsTab, { mode: mode, movements: movements, openingBalance: openingBalance, onReconcile: handleReconcile, onHold: handleHold, onPost: handlePost, onFlag: handleFlag }) : null, tab === 'statement' ? _jsx(StatementTab, { movements: movements, openingBalance: openingBalance }) : null, tab === 'pnl' ? _jsx(PnlTab, { lines: pnl, marginBySegment: marginBySegment }) : null, tab === 'forecast' ? _jsx(ForecastTab, { forecast: forecast }) : null] })] }));
}
function StatementTab({ movements, openingBalance }) {
    const rows = useMemo(() => {
        const map = new Map();
        for (const movement of movements) {
            const entry = map.get(movement.category) ?? { inflow: 0n, outflow: 0n };
            if (movement.direction === 'in')
                entry.inflow += movement.amount.amountMinor;
            else
                entry.outflow += movement.amount.amountMinor;
            map.set(movement.category, entry);
        }
        return [...map.entries()].map(([category, value]) => ({ category, inflow: value.inflow, outflow: value.outflow, net: value.inflow - value.outflow }));
    }, [movements]);
    const financingCats = ['loan'];
    const operating = rows.filter((row) => !financingCats.includes(row.category));
    const financing = rows.filter((row) => financingCats.includes(row.category));
    const opNet = operating.reduce((sum, row) => sum + row.net, 0n);
    const finNet = financing.reduce((sum, row) => sum + row.net, 0n);
    const netChange = opNet + finNet;
    const closing = openingBalance.amountMinor + netChange;
    const money = (value) => ({ amountMinor: value, currency: 'USD' });
    return (_jsx("div", { className: "min-h-0 flex-1 overflow-y-auto", children: _jsxs(GlassSurface, { tone: "strong", className: "mx-auto max-w-3xl p-7", children: [_jsx("h3", { className: "font-display text-lg font-bold text-ink", children: "Cashflow statement \u00B7 May 2025" }), _jsxs("div", { className: "mt-4 grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", {}), _jsx("span", { className: "text-right", children: "In" }), _jsx("span", { className: "text-right", children: "Out" }), _jsx("span", { className: "text-right", children: "Net" })] }), _jsx(Section, { title: "Operating activities", rows: operating }), _jsx(SubtotalRow, { label: "Net cash from operations", amount: money(opNet) }), _jsx(Section, { title: "Financing activities", rows: financing }), _jsx(SubtotalRow, { label: "Net cash from financing", amount: money(finNet) }), _jsxs("div", { className: "mt-4 space-y-1.5 border-t-2 border-ink/15 pt-3", children: [_jsx(BalanceRow, { label: "Opening balance", amount: openingBalance }), _jsx(BalanceRow, { label: "Net change in cash", amount: money(netChange), signed: true }), _jsx(BalanceRow, { label: "Closing balance", amount: money(closing), bold: true })] })] }) }));
}
function Section({ title, rows }) {
    const categoryLabels = {
        premium: 'Premium',
        claim: 'Claim payout',
        commission: 'Commission',
        payroll: 'Payroll',
        supplier: 'Supplier',
        rent: 'Rent',
        software: 'Software',
        tax: 'Tax',
        loan: 'Loan',
        refund: 'Refund',
        fee: 'Fee income',
        reinsurance: 'Reinsurance',
    };
    return (_jsxs("div", { className: "mt-4", children: [_jsx("p", { className: "text-[12px] font-bold uppercase tracking-wider text-ink-muted", children: title }), _jsx("ul", { children: rows.map((row) => (_jsxs("li", { className: "grid grid-cols-[1fr_auto_auto_auto] gap-x-6 border-b border-white/45 py-2 text-[13px]", children: [_jsx("span", { className: "font-medium text-ink", children: categoryLabels[row.category] ?? row.category }), _jsx("span", { className: "text-right tabular text-success", children: row.inflow > 0n ? _jsx(MoneyCell, { amount: { amountMinor: row.inflow, currency: 'USD' }, size: "sm", className: "!text-[12.5px] text-success" }) : '—' }), _jsx("span", { className: "text-right tabular text-danger", children: row.outflow > 0n ? _jsx(MoneyCell, { amount: { amountMinor: row.outflow, currency: 'USD' }, size: "sm", className: "!text-[12.5px] text-danger" }) : '—' }), _jsx("span", { className: cn('text-right font-semibold tabular', row.net >= 0n ? 'text-ink' : 'text-danger'), children: _jsx(MoneyCell, { amount: { amountMinor: row.net, currency: 'USD' }, size: "sm", className: "!text-[12.5px]", showSign: true }) })] }, row.category))) })] }));
}
function SubtotalRow({ label, amount }) {
    return (_jsxs("div", { className: "mt-1 flex items-center justify-between rounded-xl bg-white/55 px-3 py-2", children: [_jsx("span", { className: "text-[13px] font-bold text-ink", children: label }), _jsx(MoneyCell, { amount: amount, size: "sm", className: "font-bold !text-[13px]", showSign: true })] }));
}
function BalanceRow({ label, amount, signed, bold }) {
    return (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: cn('text-[13.5px]', bold ? 'font-bold text-ink' : 'font-medium text-ink-soft'), children: label }), _jsx(MoneyCell, { amount: amount, size: "sm", className: cn('!text-[13.5px]', bold && 'font-bold'), showSign: signed ?? false })] }));
}
function PnlTab({ lines, marginBySegment }) {
    return (_jsx("div", { className: "min-h-0 flex-1 overflow-y-auto", children: _jsxs("div", { className: "grid grid-cols-1 gap-5 @5xl:grid-cols-2", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-3 p-6", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Profit & loss \u00B7 May 2025" }), _jsxs("div", { className: "grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", {}), _jsx("span", { className: "text-right", children: "This period" }), _jsx("span", { className: "text-right", children: "Prior" })] }), _jsx("ul", { className: "flex flex-col", children: lines.map((line) => (_jsxs("li", { className: cn('grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-2.5', line.emphasis && 'border-t border-white/55', line.emphasis === 'total' && 'mt-1 rounded-xl bg-white/55 px-3 ring-1 ring-white/60'), children: [_jsx("span", { className: cn('text-[13px]', line.emphasis ? 'font-bold text-ink' : 'font-medium text-ink-soft'), children: line.label }), _jsx(MoneyCell, { amount: line.amount, size: "sm", className: cn('text-right !text-[13px]', line.emphasis === 'total' && 'font-bold') }), _jsx(MoneyCell, { amount: line.prior, size: "sm", className: "text-right !text-[12px] text-ink-muted" })] }, line.label))) })] }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-3 p-6", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Margin by segment" }), _jsx("ul", { className: "flex flex-col gap-3", children: marginBySegment.map((segment) => (_jsxs("li", { children: [_jsxs("div", { className: "flex items-center justify-between text-[12.5px]", children: [_jsx("span", { className: "font-semibold text-ink", children: segment.segment }), _jsxs("span", { className: "flex items-center gap-1.5 font-bold text-ink", children: [segment.marginPct, "%", _jsxs("span", { className: cn('text-[10.5px] font-bold', segment.trendPts >= 0 ? 'text-success' : 'text-danger'), children: [segment.trendPts >= 0 ? '+' : '', segment.trendPts, "pp"] })] })] }), _jsx("div", { className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8", children: _jsx("div", { className: "h-full rounded-full bg-gradient-to-r from-brand to-ai", style: { width: `${segment.marginPct}%` } }) })] }, segment.segment))) })] })] }) }));
}
function ForecastTab({ forecast }) {
    return (_jsx("div", { className: "min-h-0 flex-1 overflow-y-auto", children: _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-4 p-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Cashflow forecast" }), _jsx(Info, { className: "size-3.5 text-ink-muted" })] }), _jsxs("div", { className: "flex items-center gap-3 text-[11px] font-semibold text-ink-muted", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: "h-0.5 w-4 rounded bg-brand" }), " Inflow"] }), _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: "h-0.5 w-4 rounded bg-lavender" }), " Outflow"] }), _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: "h-0.5 w-4 rounded border-t-2 border-dashed border-ai" }), " Forecast"] })] })] }), _jsxs("div", { className: "flex flex-wrap items-end gap-6", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-ink-muted", children: "Today" }), _jsx(MoneyCell, { amount: forecast.current, size: "xl", className: "!text-[26px]" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-ink-muted", children: "Projected EOM" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MoneyCell, { amount: forecast.projected, size: "lg", className: "!text-xl text-brand-ink" }), _jsxs("span", { className: "inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success", children: [_jsx(ArrowUpRight, { className: "size-3" }), " 23%"] })] })] })] }), _jsx("div", { className: "h-[300px]", children: _jsx(AreaChart, { xLabels: [...forecast.labels], height: "100%", series: [{ name: 'Inflow', color: '#4361ee', data: [...forecast.inflow] }, { name: 'Outflow', color: '#9a8ce8', data: [...forecast.outflow] }, { name: 'Forecast', color: '#8b5cf6', data: [...forecast.forecast], dashed: true }] }) })] }) }));
}
