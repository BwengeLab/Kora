import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { CalendarClock, FileText, Flag, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { getApiBaseUrl } from '../../api/client';
import { fetchContractsOverview, flagContractRenewal, renewContract } from '../../api/governanceOps';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { CONTRACT_STATUS_META, CONTRACT_TYPE_META, seedContracts } from '../../seed/contracts';
import { openDoc } from '../../state/docViewerStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
const TODAY = new Date('2025-05-18');
const daysToExpiry = (end) => Math.round((new Date(end).getTime() - TODAY.getTime()) / 86400000);
const SUBTITLE = {
    manage: 'Policies, leases and vendor agreements. Track renewals before they lapse.',
    oversight: 'What the business is committed to — value, terms and renewals. Finance manages the detail; you oversee the obligations.',
    read: 'Every obligation the business is committed to — read-only, with signed evidence.',
};
// Full standalone page (Finance Lead / Auditor routes).
export function ContractsPage({ variant = 'manage' }) {
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Contracts", subtitle: SUBTITLE[variant], right: _jsx(DateRangePill, { label: "As of May 18, 2025" }) }), _jsx(ContractsView, { variant: variant })] }));
}
// The contracts register body — reused both as a standalone page and embedded as
// the "Contracts" tab of the owner's Relationships page. `initialQuery` lets a
// caller deep-link to one party's contracts.
export function ContractsView({ variant = 'manage', initialQuery = '' }) {
    const token = useSessionStore((s) => s.session?.token ?? '');
    const apiBaseUrl = getApiBaseUrl();
    const [contracts, setContracts] = useState(seedContracts);
    const [query, setQuery] = useState(initialQuery);
    const [type, setType] = useState('all');
    const [status, setStatus] = useState('all');
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        if (!token)
            return;
        const controller = new AbortController();
        fetchContractsOverview(apiBaseUrl, token, controller.signal)
            .then((payload) => setContracts(payload.items))
            .catch((error) => {
            if (!controller.signal.aborted) {
                toast({ tone: 'warning', title: 'Contracts unavailable', body: error instanceof Error ? error.message : 'Could not load contracts.' });
            }
        });
        return () => controller.abort();
    }, [apiBaseUrl, token]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return contracts
            .filter((c) => (type === 'all' ? true : c.type === type))
            .filter((c) => (status === 'all' ? true : c.status === status))
            .filter((c) => (q === '' ? true : [c.title, c.counterparty, c.reference].some((s) => s.toLowerCase().includes(q))))
            .sort((a, b) => daysToExpiry(a.endDate) - daysToExpiry(b.endDate));
    }, [contracts, query, type, status]);
    const renew = async (id) => {
        if (!token) {
            setContracts((cs) => cs.map((c) => (c.id === id ? { ...c, status: 'active', startDate: c.endDate, endDate: new Date(new Date(c.endDate).setFullYear(new Date(c.endDate).getFullYear() + 1)).toISOString().slice(0, 10) } : c)));
        }
        else {
            const snapshot = await renewContract(apiBaseUrl, token, id);
            setContracts(snapshot.items);
        }
        setSelected(null);
        toast({ tone: 'success', title: 'Renewed', body: 'Contract renewed for another term and logged.' });
    };
    const flagRenewal = async (id, title) => {
        if (!token) {
            setContracts((items) => items.map((item) => (item.id === id && item.status === 'active' ? { ...item, status: 'renewal-due' } : item)));
        }
        else {
            const snapshot = await flagContractRenewal(apiBaseUrl, token, id);
            setContracts(snapshot.items);
        }
        setSelected(null);
        toast({ tone: 'info', title: 'Flagged for renewal', body: `${title} sent to finance to action the renewal.` });
    };
    const renewalDue = contracts.filter((c) => c.status === 'renewal-due' || c.status === 'expiring').length;
    const annualValue = { amountMinor: contracts.filter((c) => c.status !== 'expired' && c.status !== 'draft').reduce((a, c) => a + c.value.amountMinor, 0n), currency: 'USD' };
    return (_jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(MetricCard, { label: "Active contracts", value: String(contracts.filter((c) => c.status === 'active').length), tone: "text-success" }), _jsx(MetricCard, { label: "Renewal / expiring", value: String(renewalDue), tone: "text-warning", active: status === 'renewal-due', onClick: () => setStatus(status === 'renewal-due' ? 'all' : 'renewal-due') }), _jsx(MetricCard, { label: "Annual value", money: annualValue, tone: "text-ink" }), _jsx(MetricCard, { label: "Drafts", value: String(contracts.filter((c) => c.status === 'draft').length), tone: "text-info" })] }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex min-h-0 flex-col", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b border-white/55 p-4", children: [_jsxs("div", { className: "flex h-10 min-w-[200px] flex-1 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70", children: [_jsx(Search, { className: "size-4 text-ink-muted" }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), type: "search", placeholder: "Search title, party, reference\u2026", className: "w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" })] }), _jsxs("select", { value: type, onChange: (e) => setType(e.target.value), className: "h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none", children: [_jsx("option", { value: "all", children: "All types" }), Object.entries(CONTRACT_TYPE_META).map(([k, v]) => _jsx("option", { value: k, children: v.label }, k))] }), _jsxs("select", { value: status, onChange: (e) => setStatus(e.target.value), className: "h-10 rounded-xl bg-white/70 px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none", children: [_jsx("option", { value: "all", children: "All statuses" }), Object.entries(CONTRACT_STATUS_META).map(([k, v]) => _jsx("option", { value: k, children: v.label }, k))] })] }), _jsxs("ul", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto", children: [filtered.map((c) => {
                                        const days = daysToExpiry(c.endDate);
                                        return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setSelected(c), className: "flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55", children: [_jsx(PartyAvatar, { name: c.counterparty, size: "md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: c.title }), _jsx("span", { className: cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', CONTRACT_TYPE_META[c.type].tone), children: CONTRACT_TYPE_META[c.type].label })] }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [c.counterparty, " \u00B7 ", c.reference, " \u00B7 ", days < 0 ? 'expired' : `${days}d to expiry`] })] }), _jsx(MoneyCell, { amount: c.value, size: "sm", className: "!text-[12.5px] font-semibold text-ink-soft" }), _jsx("span", { className: cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', CONTRACT_STATUS_META[c.status].tone), children: CONTRACT_STATUS_META[c.status].label })] }) }, c.id));
                                    }), filtered.length === 0 ? _jsx("li", { className: "grid place-items-center py-16 text-[13px] text-ink-muted", children: "No contracts match." }) : null] })] }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(RenewalRadar, { contracts: contracts, onPick: (c) => setSelected(c) }), _jsx(ProRataTool, {})] })] }), _jsx(Dialog.Root, { open: selected !== null, onOpenChange: (o) => !o && setSelected(null), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsx(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: selected ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(PartyAvatar, { name: selected.counterparty, size: "lg" }), _jsxs("div", { className: "min-w-0", children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: selected.title }), _jsx("p", { className: "text-[11.5px] text-ink-muted", children: selected.counterparty })] })] }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-ink-muted", children: "Annual value" }), _jsx(MoneyCell, { amount: selected.value, size: "xl", className: "!text-3xl font-bold text-ink" })] }), _jsx("span", { className: cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', CONTRACT_STATUS_META[selected.status].tone), children: CONTRACT_STATUS_META[selected.status].label })] }), _jsxs(GlassSurface, { noBlur: true, tone: "subtle", className: "bg-white/60 p-4", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Key terms" }), _jsx("p", { className: "mt-1 text-[13.5px] text-ink", children: selected.terms })] }), _jsxs("dl", { className: "grid grid-cols-2 gap-3", children: [_jsx(Meta, { label: "Type", value: CONTRACT_TYPE_META[selected.type].label }), _jsx(Meta, { label: "Reference", value: selected.reference, mono: true }), _jsx(Meta, { label: "Start", value: new Date(selected.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }), _jsx(Meta, { label: "End", value: new Date(selected.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }), _jsx(Meta, { label: "Owner", value: selected.owner }), _jsx(Meta, { label: "Auto-renew", value: selected.autoRenew ? 'Yes' : 'No', tone: selected.autoRenew ? 'success' : undefined })] }), _jsxs("button", { type: "button", onClick: () => openDoc({ name: selected.evidenceName, kind: 'contract', sizeText: '—', context: selected.reference }), className: "flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger", children: _jsx(FileText, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12.5px] font-semibold text-ink", children: selected.evidenceName }), _jsx("p", { className: "text-[11px] text-ink-muted", children: "Signed contract" })] }), _jsx("span", { className: "rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70", children: "View" })] })] }), variant === 'read' ? null : (_jsxs("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: [_jsxs("button", { type: "button", onClick: () => toast({ tone: 'info', title: 'Reminder set', body: `You'll be alerted 30 days before ${selected.reference} expires.` }), className: "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white", children: [_jsx(CalendarClock, { className: "size-4" }), " Remind me"] }), variant === 'manage' ? (_jsxs("button", { type: "button", onClick: () => void renew(selected.id), className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(RefreshCw, { className: "size-4" }), " Renew contract"] })) : (_jsxs("button", { type: "button", onClick: () => void flagRenewal(selected.id, selected.title), className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Flag, { className: "size-4" }), " Flag for renewal"] }))] }))] })) : null })] }) })] }));
}
function MetricCard({ label, value, money, tone, active, onClick }) {
    const Comp = onClick ? 'button' : 'div';
    return (_jsx(GlassSurface, { tone: "strong", className: cn('p-3.5', active && 'ring-2 ring-brand/40'), children: _jsxs(Comp, { type: onClick ? 'button' : undefined, onClick: onClick, className: cn('flex w-full flex-col gap-0.5 text-left', onClick && 'cursor-pointer'), children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), money ? _jsx(MoneyCell, { amount: money, size: "lg", className: cn('!text-2xl font-bold', tone) }) : _jsx("span", { className: cn('font-display text-2xl font-bold tabular', tone), children: value })] }) }));
}
function Meta({ label, value, mono, tone }) {
    return _jsxs("div", { children: [_jsx("dt", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsx("dd", { className: cn('text-[13px] font-semibold', mono && 'font-mono', tone === 'success' ? 'text-success' : 'text-ink'), children: value })] });
}
function RenewalRadar({ contracts, onPick }) {
    const soon = contracts.filter((c) => daysToExpiry(c.endDate) >= 0 && daysToExpiry(c.endDate) <= 60).sort((a, b) => daysToExpiry(a.endDate) - daysToExpiry(b.endDate));
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 bg-gradient-to-br from-warning-soft/50 to-white/40 p-4 ring-1 ring-warning/15", children: [_jsxs("header", { className: "flex items-center gap-1.5", children: [_jsx(Sparkles, { className: "size-3.5 text-warning" }), _jsx("h4", { className: "text-[12px] font-bold text-ink", children: "Renewal radar" })] }), soon.length === 0 ? _jsx("p", { className: "text-[11.5px] text-ink-muted", children: "Nothing expiring in the next 60 days." }) : soon.map((c) => (_jsxs("button", { type: "button", onClick: () => onPick(c), className: "rounded-xl bg-white/65 p-2.5 text-left text-[11.5px] text-ink ring-1 ring-white/60 hover:bg-white", children: [_jsxs("span", { className: "font-bold text-warning", children: [daysToExpiry(c.endDate), "d"] }), " \u00B7 ", c.title, " ", _jsx("span", { className: "font-semibold text-brand", children: "Open \u2192" })] }, c.id)))] }));
}
function ProRataTool() {
    const [annual, setAnnual] = useState('');
    const [days, setDays] = useState('90');
    const a = parseFloat(annual || '0');
    const d = parseFloat(days || '0');
    const prorata = (a / 365) * d;
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 p-4", children: [_jsxs("header", { className: "flex items-center gap-1.5", children: [_jsx(CalendarClock, { className: "size-3.5 text-brand" }), _jsx("h4", { className: "text-[12px] font-bold text-ink", children: "Pro-rata calculator" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: "Annual value" }), _jsx("input", { value: annual, onChange: (e) => setAnnual(e.target.value.replace(/[^0-9.]/g, '')), inputMode: "decimal", className: "h-9 rounded-lg bg-white/70 px-3 text-[12.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: "Days" }), _jsx("input", { value: days, onChange: (e) => setDays(e.target.value.replace(/[^0-9]/g, '')), inputMode: "numeric", className: "h-9 rounded-lg bg-white/70 px-3 text-[12.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30" })] }), _jsxs("div", { className: "rounded-xl bg-brand-soft/50 p-2.5 text-center ring-1 ring-brand/15", children: [_jsx("p", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: "Pro-rata" }), _jsx("p", { className: "font-display text-xl font-bold text-brand-ink tabular", children: prorata.toLocaleString(undefined, { maximumFractionDigits: 2 }) })] })] }));
}
