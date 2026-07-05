import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, Check, CheckCircle2, Layers, Plus, Scale, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { createJournalEntry } from '../../api/financeOperations';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { ACCOUNT_TYPE_META, accountByCode, seedChartOfAccounts } from '../../seed/chartOfAccounts';
import { entityName, seedCostCenters } from '../../seed/entities';
import { displayBalance, linesBalanced, trialBalance, useGLStore } from '../../state/glStore';
import { useEntityStore } from '../../state/entityStore';
import { usePayablesStore } from '../../state/payablesStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { useTransactionsStore } from '../../state/transactionsStore';
const M = (amountMinor) => ({ amountMinor, currency: 'USD' });
const SOURCE_TONE = {
    opening: 'bg-ink/10 text-ink-soft', manual: 'bg-brand-soft text-brand-ink', AP: 'bg-info-soft text-info', AR: 'bg-success-soft text-success',
    bank: 'bg-lavender-soft text-lavender', payroll: 'bg-warning-soft text-warning', tax: 'bg-danger-soft text-danger', claims: 'bg-ai-soft text-ai',
};
// The General Ledger — Kora as a system of record. Chart of Accounts with live
// balances, the journal (double-entry), and a trial balance that ties out. The
// creator enforces Σdebits = Σcredits before anything posts.
export function GeneralLedger({ canEdit = false }) {
    const scope = useEntityStore((s) => s.scope);
    const journals = useGLStore((s) => s.journals);
    const [tab, setTab] = useState('journals');
    const [creating, setCreating] = useState(false);
    const [openEntry, setOpenEntry] = useState(null);
    const tb = useMemo(() => trialBalance(journals, scope), [journals, scope]);
    const posted = useMemo(() => journals.filter((j) => (scope === 'all' || j.entity === scope)).sort((a, b) => b.date.localeCompare(a.date)), [journals, scope]);
    const balanced = tb.totalDebit === tb.totalCredit;
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "General Ledger", subtitle: _jsxs(_Fragment, { children: ["Double-entry books for ", _jsx("span", { className: "font-semibold text-ink", children: entityName(scope) }), scope === 'all' ? ' (consolidated)' : '', " \u2014 every entry balanced, the trial balance ties out."] }), right: _jsxs("div", { className: "flex items-center gap-2.5", children: [canEdit ? _jsxs("button", { type: "button", onClick: () => setCreating(true), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Plus, { className: "size-4" }), " New journal entry"] }) : null, _jsx(DateRangePill, { label: "May 2025" })] }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(Stat, { label: "Total debits", money: M(tb.totalDebit) }), _jsx(Stat, { label: "Total credits", money: M(tb.totalCredit) }), _jsxs(GlassSurface, { tone: "strong", className: cn('flex items-center gap-3 p-3.5', balanced ? '' : 'ring-2 ring-danger/40'), children: [_jsx("span", { className: cn('grid size-10 place-items-center rounded-xl', balanced ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'), children: balanced ? _jsx(CheckCircle2, { className: "size-5" }) : _jsx(Scale, { className: "size-5" }) }), _jsxs("div", { children: [_jsx("span", { className: cn('block font-display text-[15px] font-bold leading-none', balanced ? 'text-success' : 'text-danger'), children: balanced ? 'In balance' : 'Out of balance' }), _jsx("span", { className: "text-[11px] font-semibold text-ink-muted", children: "Trial balance" })] })] }), _jsx(Stat, { label: "Posted entries", value: String(posted.filter((p) => p.status === 'posted').length) })] }), _jsx("div", { className: "flex gap-1 border-b border-white/55", children: [['journals', 'Journal entries', BookOpen], ['accounts', 'Chart of accounts', Layers], ['trial', 'Trial balance', Scale]].map(([id, label, Icon]) => (_jsxs("button", { type: "button", onClick: () => setTab(id), className: cn('relative inline-flex items-center gap-1.5 px-3.5 pb-2.5 text-[13.5px] font-semibold transition-colors', tab === id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'), children: [_jsx(Icon, { className: "size-4" }), " ", label, tab === id ? _jsx("span", { className: "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" }) : null] }, id))) }), tab === 'journals' ? _jsx(JournalsTab, { entries: posted, onOpen: setOpenEntry }) : null, tab === 'accounts' ? _jsx(AccountsTab, { journals: journals, scope: scope }) : null, tab === 'trial' ? _jsx(TrialTab, { tb: tb }) : null] }), creating ? _jsx(JournalCreator, { scope: scope, onClose: () => setCreating(false) }) : null, _jsx(EntryDrawer, { entry: openEntry, onClose: () => setOpenEntry(null) })] }));
}
function JournalsTab({ entries, onOpen }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex min-h-0 flex-1 flex-col", children: [_jsxs("div", { className: "grid grid-cols-[90px_1fr_110px_120px_90px] gap-3 border-b border-white/45 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Date" }), _jsx("span", { children: "Entry" }), _jsx("span", { children: "Source" }), _jsx("span", { className: "text-right", children: "Amount" }), _jsx("span", { className: "text-right", children: "Status" })] }), _jsxs("ul", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto", children: [entries.map((e) => {
                        const total = e.lines.reduce((a, l) => a + l.debit, 0n);
                        return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => onOpen(e), className: "grid w-full grid-cols-[90px_1fr_110px_120px_90px] items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55", children: [_jsx("span", { className: "text-[12px] tabular text-ink-soft", children: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: e.memo }), _jsxs("p", { className: "truncate font-mono text-[11px] text-ink-muted", children: [e.ref, " \u00B7 ", e.lines.length, " lines"] })] }), _jsx("span", { children: _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SOURCE_TONE[e.source]), children: e.source }) }), _jsx(MoneyCell, { amount: M(total), size: "sm", className: "text-right font-bold !text-[13px]" }), _jsx("span", { className: "flex justify-end", children: _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', e.status === 'posted' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'), children: e.status }) })] }) }, e.id));
                    }), entries.length === 0 ? _jsx("li", { className: "grid place-items-center py-16 text-[13px] text-ink-muted", children: "No journal entries for this entity." }) : null] })] }));
}
function AccountsTab({ journals, scope }) {
    const groups = useMemo(() => {
        return Object.keys(ACCOUNT_TYPE_META).map((type) => ({
            type,
            accounts: seedChartOfAccounts.filter((a) => a.type === type).map((a) => ({ ...a, bal: displayBalance(a.code, journals, scope) })),
        }));
    }, [journals, scope]);
    return (_jsx("div", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto", children: _jsx("div", { className: "grid grid-cols-1 gap-4 @3xl:grid-cols-2", children: groups.map((g) => (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col p-5", children: [_jsx("h3", { className: "mb-2 font-display text-[14px] font-bold text-ink", children: ACCOUNT_TYPE_META[g.type].label }), _jsx("ul", { className: "flex flex-col", children: g.accounts.map((a) => (_jsxs("li", { className: "flex items-center gap-3 border-b border-white/40 py-2 last:border-0", children: [_jsx("span", { className: "font-mono text-[11px] text-ink-muted", children: a.code }), _jsx("span", { className: "flex-1 truncate text-[12.5px] font-medium text-ink", children: a.name }), _jsx(MoneyCell, { amount: M(a.bal), size: "sm", className: cn('font-semibold !text-[12.5px]', a.bal < 0n ? 'text-danger' : 'text-ink-soft') })] }, a.code))) })] }, g.type))) }) }));
}
function TrialTab({ tb }) {
    return (_jsx("div", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto", children: _jsxs(GlassSurface, { tone: "strong", className: "mx-auto max-w-3xl p-6", children: [_jsx("h3", { className: "font-display text-lg font-bold text-ink", children: "Trial balance \u00B7 May 2025" }), _jsxs("div", { className: "mt-4 grid grid-cols-[1fr_140px_140px] gap-x-4 border-b border-white/45 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Account" }), _jsx("span", { className: "text-right", children: "Debit" }), _jsx("span", { className: "text-right", children: "Credit" })] }), _jsx("ul", { children: tb.rows.map((r) => (_jsxs("li", { className: "grid grid-cols-[1fr_140px_140px] gap-x-4 border-b border-white/40 py-2 text-[12.5px]", children: [_jsxs("span", { className: "text-ink", children: [_jsx("span", { className: "font-mono text-ink-muted", children: r.code }), " \u00B7 ", r.name] }), _jsx("span", { className: "text-right tabular text-ink-soft", children: r.debit > 0n ? _jsx(MoneyCell, { amount: M(r.debit), size: "sm", className: "!text-[12.5px]" }) : '—' }), _jsx("span", { className: "text-right tabular text-ink-soft", children: r.credit > 0n ? _jsx(MoneyCell, { amount: M(r.credit), size: "sm", className: "!text-[12.5px]" }) : '—' })] }, r.code))) }), _jsxs("div", { className: "mt-2 grid grid-cols-[1fr_140px_140px] gap-x-4 rounded-xl bg-white/55 px-2 py-2.5 ring-1 ring-white/60", children: [_jsx("span", { className: "inline-flex items-center gap-1.5 text-[13px] font-bold text-ink", children: tb.totalDebit === tb.totalCredit ? _jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "size-4 text-success" }), " Totals \u2014 in balance"] }) : 'Totals' }), _jsx(MoneyCell, { amount: M(tb.totalDebit), size: "sm", className: "text-right font-bold !text-[13px]" }), _jsx(MoneyCell, { amount: M(tb.totalCredit), size: "sm", className: "text-right font-bold !text-[13px]" })] })] }) }));
}
function EntryDrawer({ entry: e, onClose }) {
    return (_jsx(Dialog.Root, { open: e !== null, onOpenChange: (o) => !o && onClose(), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsx(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(520px,95vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: e ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4", children: [_jsxs("div", { children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: e.memo }), _jsxs("p", { className: "font-mono text-[11.5px] text-ink-muted", children: [e.ref, " \u00B7 ", new Date(e.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })] })] }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 overflow-y-auto p-5", children: [_jsxs("div", { className: "grid grid-cols-[1fr_120px_120px] gap-x-3 border-b border-white/45 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Account" }), _jsx("span", { className: "text-right", children: "Debit" }), _jsx("span", { className: "text-right", children: "Credit" })] }), _jsx("ul", { children: e.lines.map((l, i) => (_jsxs("li", { className: "grid grid-cols-[1fr_120px_120px] gap-x-3 border-b border-white/40 py-2.5 text-[12.5px]", children: [_jsxs("span", { className: "min-w-0", children: [_jsx("span", { className: "font-mono text-ink-muted", children: l.account }), " \u00B7 ", accountByCode(l.account)?.name, l.costCenter ? _jsx("span", { className: "ml-1 rounded bg-white/70 px-1 text-[9.5px] font-bold text-ink-muted", children: seedCostCenters.find((c) => c.id === l.costCenter)?.name }) : null] }), _jsx("span", { className: "text-right tabular text-ink", children: l.debit > 0n ? _jsx(MoneyCell, { amount: M(l.debit), size: "sm", className: "!text-[12.5px]" }) : '' }), _jsx("span", { className: "text-right tabular text-ink", children: l.credit > 0n ? _jsx(MoneyCell, { amount: M(l.credit), size: "sm", className: "!text-[12.5px]" }) : '' })] }, i))) }), _jsxs("div", { className: "mt-2 grid grid-cols-[1fr_120px_120px] gap-x-3 rounded-xl bg-success-soft/40 px-2 py-2 ring-1 ring-success/20 text-[12.5px] font-bold", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5 text-success", children: [_jsx(Check, { className: "size-3.5" }), " Balanced"] }), _jsx(MoneyCell, { amount: M(e.lines.reduce((a, l) => a + l.debit, 0n)), size: "sm", className: "text-right !text-[12.5px]" }), _jsx(MoneyCell, { amount: M(e.lines.reduce((a, l) => a + l.credit, 0n)), size: "sm", className: "text-right !text-[12.5px]" })] })] })] })) : null })] }) }));
}
const blankLine = () => ({ account: '1010', debit: '', credit: '', costCenter: '' });
function JournalCreator({ scope, onClose }) {
    const hydrateGL = useGLStore((s) => s.hydrate);
    const postJournal = useGLStore((s) => s.postJournal);
    const hydratePayables = usePayablesStore((s) => s.hydrate);
    const hydrateTransactions = useTransactionsStore((s) => s.hydrate);
    const token = useSessionStore((s) => s.session?.token ?? '');
    const [memo, setMemo] = useState('');
    const [ref, setRef] = useState('');
    const [source, setSource] = useState('manual');
    const [lines, setLines] = useState([blankLine(), blankLine()]);
    const toMinor = (s) => BigInt(Math.round((parseFloat(s || '0') || 0) * 100));
    const drTotal = lines.reduce((a, l) => a + toMinor(l.debit), 0n);
    const crTotal = lines.reduce((a, l) => a + toMinor(l.credit), 0n);
    const diff = drTotal - crTotal;
    const jLines = lines
        .filter((l) => toMinor(l.debit) > 0n || toMinor(l.credit) > 0n)
        .map((l) => ({ account: l.account, debit: toMinor(l.debit), credit: toMinor(l.credit), ...(l.costCenter ? { costCenter: l.costCenter } : {}) }));
    const canPost = linesBalanced(jLines) && memo.trim() !== '';
    const setLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    const post = async () => {
        const entity = scope === 'all' ? 'ent-rw' : scope;
        if (token) {
            try {
                const snapshot = await createJournalEntry(getApiBaseUrl(), token, {
                    date: new Date().toISOString().slice(0, 10),
                    ref: ref || `JE-${Date.now().toString().slice(-5)}`,
                    memo,
                    source,
                    entity,
                    lines: jLines.map((line) => ({
                        account: line.account,
                        debit: line.debit.toString(),
                        credit: line.credit.toString(),
                        ...(line.costCenter ? { costCenter: line.costCenter } : {}),
                    })),
                });
                hydrateGL(snapshot.journals);
                hydratePayables(snapshot.bills);
                hydrateTransactions(snapshot.transactions);
                toast({ tone: 'success', title: 'Journal posted', body: `${memo} posted to the ledger - debits = credits.` });
                onClose();
                return;
            }
            catch (error) {
                toast({ tone: 'danger', title: 'Journal failed', body: error instanceof Error ? error.message : 'Unable to post journal.' });
                return;
            }
        }
        const ok = postJournal({ date: new Date().toISOString().slice(0, 10), ref: ref || `JE-${Date.now().toString().slice(-5)}`, memo, source, entity, lines: jLines });
        if (ok) {
            toast({ tone: 'success', title: 'Journal posted', body: `${memo} posted to the ledger — debits = credits.` });
            onClose();
        }
        else
            toast({ tone: 'danger', title: 'Not balanced', body: 'Debits must equal credits before posting.' });
    };
    return (_jsx(Dialog.Root, { open: true, onOpenChange: (o) => !o && onClose(), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/25 backdrop-blur-sm" }), _jsxs(Dialog.Content, { "aria-describedby": undefined, className: "fixed left-1/2 top-1/2 z-[95] flex h-[min(86vh,720px)] w-[min(820px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: [_jsxs("header", { className: "flex items-center justify-between gap-3 border-b border-white/55 px-6 py-4", children: [_jsx(Dialog.Title, { className: "font-display text-[16px] font-bold text-ink", children: "New journal entry" }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 overflow-y-auto p-6", children: [_jsxs("div", { className: "grid grid-cols-1 gap-3 @2xl:grid-cols-[2fr_1fr_1fr]", children: [_jsx(Field, { label: "Memo", children: _jsx("input", { value: memo, onChange: (e) => setMemo(e.target.value), placeholder: "What is this entry for?", className: inp }) }), _jsx(Field, { label: "Reference", children: _jsx("input", { value: ref, onChange: (e) => setRef(e.target.value), placeholder: "auto", className: inp }) }), _jsx(Field, { label: "Source", children: _jsx("select", { value: source, onChange: (e) => setSource(e.target.value), className: inp, children: ['manual', 'AP', 'AR', 'bank', 'payroll', 'tax', 'claims'].map((s) => _jsx("option", { value: s, children: s }, s)) }) })] }), _jsxs("div", { className: "mt-4 overflow-hidden rounded-2xl ring-1 ring-white/60", children: [_jsxs("div", { className: "grid grid-cols-[1fr_130px_130px_130px_36px] gap-2 bg-white/60 px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Account" }), _jsx("span", { className: "text-right", children: "Debit" }), _jsx("span", { className: "text-right", children: "Credit" }), _jsx("span", { children: "Cost center" }), _jsx("span", {})] }), lines.map((l, i) => (_jsxs("div", { className: "grid grid-cols-[1fr_130px_130px_130px_36px] items-center gap-2 border-t border-white/45 bg-white/30 px-3 py-2", children: [_jsx("select", { value: l.account, onChange: (e) => setLine(i, { account: e.target.value }), className: inpSm, children: seedChartOfAccounts.map((a) => _jsxs("option", { value: a.code, children: [a.code, " \u00B7 ", a.name] }, a.code)) }), _jsx("input", { value: l.debit, onChange: (e) => setLine(i, { debit: e.target.value.replace(/[^0-9.]/g, ''), credit: '' }), inputMode: "decimal", placeholder: "0.00", className: cn(inpSm, 'text-right') }), _jsx("input", { value: l.credit, onChange: (e) => setLine(i, { credit: e.target.value.replace(/[^0-9.]/g, ''), debit: '' }), inputMode: "decimal", placeholder: "0.00", className: cn(inpSm, 'text-right') }), _jsxs("select", { value: l.costCenter, onChange: (e) => setLine(i, { costCenter: e.target.value }), className: inpSm, children: [_jsx("option", { value: "", children: "\u2014" }), seedCostCenters.map((c) => _jsx("option", { value: c.id, children: c.name }, c.id))] }), _jsx("button", { type: "button", onClick: () => setLines((ls) => ls.length > 2 ? ls.filter((_, idx) => idx !== i) : ls), className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger", title: "Remove line", children: _jsx(Trash2, { className: "size-3.5" }) })] }, i))), _jsxs("button", { type: "button", onClick: () => setLines((ls) => [...ls, blankLine()]), className: "flex w-full items-center gap-1.5 border-t border-white/45 bg-white/40 px-3 py-2 text-[12px] font-bold text-brand hover:bg-white/60", children: [_jsx(Plus, { className: "size-3.5" }), " Add line"] })] }), _jsxs("div", { className: "mt-3 flex items-center justify-end gap-6 text-[13px]", children: [_jsxs("span", { className: "text-ink-muted", children: ["Debits ", _jsx(MoneyCell, { amount: M(drTotal), size: "sm", className: "ml-1 font-bold !text-[13px] text-ink" })] }), _jsxs("span", { className: "text-ink-muted", children: ["Credits ", _jsx(MoneyCell, { amount: M(crTotal), size: "sm", className: "ml-1 font-bold !text-[13px] text-ink" })] }), _jsx("span", { className: cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold', diff === 0n && drTotal > 0n ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'), children: diff === 0n && drTotal > 0n ? _jsxs(_Fragment, { children: [_jsx(Check, { className: "size-3.5" }), " Balanced"] }) : `Difference ${(Number(diff) / 100).toLocaleString()}` })] })] }), _jsxs("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: [_jsx(Dialog.Close, { className: "inline-flex h-11 items-center justify-center rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white", children: "Cancel" }), _jsxs("button", { type: "button", disabled: !canPost, onClick: post, className: cn('inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold shadow-glass-soft', canPost ? 'bg-gradient-to-br from-brand to-brand-ink text-white hover:brightness-110' : 'cursor-not-allowed bg-ink/15 text-ink-muted'), children: [_jsx(Check, { className: "size-4" }), " Post entry"] })] })] })] }) }));
}
function Stat({ label, money, value }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "p-3.5", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), money ? _jsx(MoneyCell, { amount: money, size: "lg", className: "!text-2xl font-bold text-ink" }) : _jsx("span", { className: "block font-display text-2xl font-bold tabular text-ink", children: value })] }));
}
const inp = 'h-11 w-full rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
const inpSm = 'h-9 w-full rounded-lg bg-white/70 px-2.5 text-[12.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
function Field({ label, children }) {
    return _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), children] });
}
