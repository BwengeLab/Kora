import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { Calculator, Coins, Landmark, Percent, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../design-system';
import { useToolsStore } from '../../state/toolsStore';
const TOOLS = [
    { id: 'calc', label: 'Calculator', icon: Calculator },
    { id: 'currency', label: 'Currency', icon: Coins },
    { id: 'margin', label: 'Margin & %', icon: Percent },
    { id: 'loan', label: 'Loan', icon: Landmark },
];
// A global tools drawer — quick calculators so users never leave Kora to do a
// sum, convert a currency, check a margin, or size a loan.
export function ToolsLauncher() {
    const isOpen = useToolsStore((s) => s.isOpen);
    const setOpen = useToolsStore((s) => s.setOpen);
    const [tool, setTool] = useState('calc');
    return (_jsx(Dialog.Root, { open: isOpen, onOpenChange: setOpen, children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsxs(Dialog.Content, { "aria-describedby": undefined, className: "fixed left-1/2 top-1/2 z-[95] flex h-[540px] w-[min(440px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-white/55 px-5 py-3.5", children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: "Tools" }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsx("div", { className: "flex gap-1 px-4 pt-3", children: TOOLS.map((t) => (_jsxs("button", { type: "button", onClick: () => setTool(t.id), className: cn('inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-colors', tool === t.id ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-muted hover:bg-white/55 hover:text-ink'), children: [_jsx(t.icon, { className: "size-3.5" }), " ", t.label] }, t.id))) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4", children: [tool === 'calc' ? _jsx(CalcTool, {}) : null, tool === 'currency' ? _jsx(CurrencyTool, {}) : null, tool === 'margin' ? _jsx(MarginTool, {}) : null, tool === 'loan' ? _jsx(LoanTool, {}) : null] })] })] }) }));
}
// ── Calculator (immediate-execution) ────────────────────────────────────────
function CalcTool() {
    const [display, setDisplay] = useState('0');
    const [acc, setAcc] = useState(null);
    const [op, setOp] = useState(null);
    const [fresh, setFresh] = useState(true);
    const apply = (a, b, o) => (o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : a / b);
    const num = (d) => { setDisplay(fresh ? d : display === '0' ? d : display + d); setFresh(false); };
    const dot = () => { if (!display.includes('.'))
        setDisplay(fresh ? '0.' : display + '.'); setFresh(false); };
    const setOper = (o) => { const v = parseFloat(display); if (acc !== null && op && !fresh) {
        const r = apply(acc, v, op);
        setAcc(r);
        setDisplay(String(r));
    }
    else
        setAcc(v); setOp(o); setFresh(true); };
    const equals = () => { if (acc !== null && op) {
        const r = apply(acc, parseFloat(display), op);
        setDisplay(String(Number(r.toFixed(6))));
        setAcc(null);
        setOp(null);
        setFresh(true);
    } };
    const clear = () => { setDisplay('0'); setAcc(null); setOp(null); setFresh(true); };
    const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'];
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("div", { className: "rounded-2xl bg-white/70 p-4 text-right ring-1 ring-white/70", children: _jsx("p", { className: "truncate font-mono text-3xl font-bold text-ink tabular", children: display }) }), _jsx("button", { type: "button", onClick: clear, className: "h-10 rounded-xl bg-danger-soft text-[13px] font-bold text-danger", children: "Clear" }), _jsx("div", { className: "grid grid-cols-4 gap-2", children: keys.map((k) => {
                    const isOp = ['÷', '×', '−', '+'].includes(k);
                    return (_jsx("button", { type: "button", onClick: () => (k === '=' ? equals() : k === '.' ? dot() : isOp ? setOper(k) : num(k)), className: cn('h-12 rounded-xl text-[16px] font-bold transition-colors', k === '=' ? 'bg-gradient-to-br from-brand to-brand-ink text-white' : isOp ? 'bg-brand-soft text-brand-ink' : 'bg-white/70 text-ink ring-1 ring-white/70 hover:bg-white'), children: k }, k));
                }) })] }));
}
// ── Currency converter ──────────────────────────────────────────────────────
const RATES = { USD: 1, RWF: 1330, EUR: 0.92, KES: 129, GBP: 0.79 };
function CurrencyTool() {
    const [amount, setAmount] = useState('1000');
    const [from, setFrom] = useState('USD');
    const [to, setTo] = useState('RWF');
    const result = (parseFloat(amount || '0') / RATES[from]) * RATES[to];
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx(Field, { label: "Amount", children: _jsx("input", { value: amount, onChange: (e) => setAmount(e.target.value.replace(/[^0-9.]/g, '')), className: inputCls, inputMode: "decimal" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "From", children: _jsx("select", { value: from, onChange: (e) => setFrom(e.target.value), className: inputCls, children: Object.keys(RATES).map((c) => _jsx("option", { children: c }, c)) }) }), _jsx(Field, { label: "To", children: _jsx("select", { value: to, onChange: (e) => setTo(e.target.value), className: inputCls, children: Object.keys(RATES).map((c) => _jsx("option", { children: c }, c)) }) })] }), _jsxs("div", { className: "rounded-2xl bg-success-soft/60 p-4 text-center ring-1 ring-success/20", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Converted" }), _jsxs("p", { className: "font-display text-2xl font-bold text-success tabular", children: [result.toLocaleString(undefined, { maximumFractionDigits: 2 }), " ", to] }), _jsxs("p", { className: "text-[11px] text-ink-muted", children: ["1 ", from, " = ", (RATES[to] / RATES[from]).toLocaleString(undefined, { maximumFractionDigits: 4 }), " ", to, " \u00B7 indicative"] })] })] }));
}
// ── Margin & percentage ─────────────────────────────────────────────────────
function MarginTool() {
    const [cost, setCost] = useState('100');
    const [price, setPrice] = useState('140');
    const c = parseFloat(cost || '0');
    const p = parseFloat(price || '0');
    const profit = p - c;
    const margin = p ? (profit / p) * 100 : 0;
    const markup = c ? (profit / c) * 100 : 0;
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "Cost", children: _jsx("input", { value: cost, onChange: (e) => setCost(e.target.value.replace(/[^0-9.]/g, '')), className: inputCls, inputMode: "decimal" }) }), _jsx(Field, { label: "Price", children: _jsx("input", { value: price, onChange: (e) => setPrice(e.target.value.replace(/[^0-9.]/g, '')), className: inputCls, inputMode: "decimal" }) })] }), _jsx(Result, { rows: [['Profit', profit.toLocaleString(undefined, { maximumFractionDigits: 2 })], ['Gross margin', `${margin.toFixed(1)}%`], ['Markup', `${markup.toFixed(1)}%`]] })] }));
}
// ── Loan / monthly payment ──────────────────────────────────────────────────
function LoanTool() {
    const [principal, setPrincipal] = useState('100000');
    const [rate, setRate] = useState('14');
    const [term, setTerm] = useState('24');
    const P = parseFloat(principal || '0');
    const r = parseFloat(rate || '0') / 100 / 12;
    const n = parseFloat(term || '0');
    const monthly = r > 0 ? (P * r) / (1 - Math.pow(1 + r, -n)) : n ? P / n : 0;
    const total = monthly * n;
    const interest = total - P;
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx(Field, { label: "Principal", children: _jsx("input", { value: principal, onChange: (e) => setPrincipal(e.target.value.replace(/[^0-9.]/g, '')), className: inputCls, inputMode: "decimal" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "Annual rate %", children: _jsx("input", { value: rate, onChange: (e) => setRate(e.target.value.replace(/[^0-9.]/g, '')), className: inputCls, inputMode: "decimal" }) }), _jsx(Field, { label: "Term (months)", children: _jsx("input", { value: term, onChange: (e) => setTerm(e.target.value.replace(/[^0-9.]/g, '')), className: inputCls, inputMode: "numeric" }) })] }), _jsx(Result, { rows: [['Monthly payment', monthly.toLocaleString(undefined, { maximumFractionDigits: 2 })], ['Total interest', interest.toLocaleString(undefined, { maximumFractionDigits: 2 })], ['Total repayable', total.toLocaleString(undefined, { maximumFractionDigits: 2 })]], highlight: true })] }));
}
const inputCls = 'h-11 w-full rounded-xl bg-white/70 px-3.5 text-[14px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
function Field({ label, children }) {
    return _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), children] });
}
function Result({ rows, highlight }) {
    return (_jsx("div", { className: cn('rounded-2xl p-4 ring-1', highlight ? 'bg-brand-soft/60 ring-brand/20' : 'bg-white/55 ring-white/60'), children: rows.map(([k, v], i) => (_jsxs("div", { className: cn('flex items-center justify-between py-1.5', i === 0 && highlight && 'border-b border-brand/15 pb-2'), children: [_jsx("span", { className: "text-[12.5px] font-semibold text-ink-soft", children: k }), _jsx("span", { className: cn('font-display tabular', i === 0 ? 'text-xl font-bold text-ink' : 'text-[13.5px] font-bold text-ink-soft'), children: v })] }, k))) }));
}
