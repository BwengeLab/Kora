import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Banknote, Check, Clock, Gavel, HandCoins, Scale, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchCollectionsManagement } from '../../api/collectionsManagement';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { seedOverdue } from '../../seed/ownerExtra';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
const ESC_META = {
    'write-off': { label: 'Write-off', icon: Banknote, tone: 'bg-danger-soft text-danger' },
    'payment-plan': { label: 'Payment plan', icon: Scale, tone: 'bg-info-soft text-info' },
    legal: { label: 'Legal notice', icon: Gavel, tone: 'bg-warning-soft text-warning' },
    agency: { label: 'Debt agency', icon: HandCoins, tone: 'bg-lavender-soft text-lavender' },
};
const FALLBACK_ESCALATIONS = [
    { id: 'e1', customer: 'Umoja SACCO', invoice: 'INV-10231', amount: { amountMinor: 5359000n, currency: 'USD' }, days: 95, requested: 'write-off', by: 'Diane Uwase', note: 'No response after 4 reminders; debtor insolvent per public filing.' },
    { id: 'e2', customer: 'PT Imports', invoice: 'INV-10221', amount: { amountMinor: 4860000n, currency: 'USD' }, days: 62, requested: 'payment-plan', by: 'Diane Uwase', note: 'Promised settlement by Friday; proposes 3-month plan.' },
    { id: 'e3', customer: 'Vendor 7741', invoice: 'INV-10255', amount: { amountMinor: 1920000n, currency: 'USD' }, days: 31, requested: 'legal', by: 'Diane Uwase', note: 'Disputed invoice, no PO; recommend formal notice.' },
];
const bucketOf = (d) => (d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+');
export function CollectionsManagement() {
    const apiBaseUrl = getApiBaseUrl();
    const token = useSessionStore((s) => s.session?.token ?? '');
    const { data } = useQuery({
        queryKey: ['collections-management', token],
        queryFn: ({ signal }) => fetchCollectionsManagement(apiBaseUrl, token, signal),
        enabled: Boolean(token),
    });
    const overdue = data?.overdue ?? seedOverdue;
    const escalations = data?.escalations ?? FALLBACK_ESCALATIONS;
    const policy = data?.policy ?? { reminderCadence: 'Day 7, 14, 30', dsoTarget: '<= 35 days', autoEscalateAt: '90 days' };
    const [decided, setDecided] = useState({});
    const [query, setQuery] = useState('');
    const pending = escalations.filter((e) => !decided[e.id]);
    const totalOverdue = { amountMinor: overdue.reduce((a, o) => a + o.amount.amountMinor, 0n), currency: 'USD' };
    const escalatedValue = { amountMinor: pending.reduce((a, e) => a + e.amount.amountMinor, 0n), currency: 'USD' };
    const buckets = useMemo(() => {
        const m = { '0-30': { count: 0, sum: 0n }, '31-60': { count: 0, sum: 0n }, '61-90': { count: 0, sum: 0n }, '90+': { count: 0, sum: 0n } };
        for (const o of overdue) {
            const b = bucketOf(o.daysOverdue);
            m[b].count++;
            m[b].sum += o.amount.amountMinor;
        }
        return m;
    }, [overdue]);
    const list = pending.filter((e) => (query.trim() === '' ? true : [e.customer, e.invoice].some((s) => s.toLowerCase().includes(query.trim().toLowerCase()))));
    const decide = (e, d) => {
        setDecided((p) => ({ ...p, [e.id]: d }));
        toast(d === 'approved'
            ? { tone: 'success', title: `${ESC_META[e.requested].label} approved`, body: `${e.customer} · ${e.invoice} - authorised and logged.` }
            : { tone: 'warning', title: 'Escalation declined', body: `${e.customer} sent back to the collections desk to keep chasing.` });
    };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Collections", subtitle: "Manage the receivables book - review aging, approve the escalations your team raises, and set the chase policy. The desk does the chasing.", right: _jsx(DateRangePill, { label: "May 2025" }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(Stat, { label: "Total overdue", money: totalOverdue, tone: "text-danger" }), _jsx(Stat, { label: "DSO", value: "41 days", tone: "text-warning" }), _jsx(Stat, { label: "Escalations pending", value: String(pending.length), tone: "text-brand-ink" }), _jsx(Stat, { label: "Value escalated", money: escalatedValue, tone: "text-ink" })] }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_300px]", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex min-h-0 flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-white/55 p-4", children: [_jsx(ShieldCheck, { className: "size-4 text-brand" }), _jsx("h3", { className: "text-[13px] font-bold text-ink", children: "Escalations to approve" }), _jsxs("span", { className: "ml-auto rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-ink", children: [pending.length, " pending"] })] }), _jsx("div", { className: "border-b border-white/45 p-3", children: _jsxs("div", { className: "flex h-9 items-center gap-2.5 rounded-xl bg-white/70 px-3 ring-1 ring-white/70", children: [_jsx(Search, { className: "size-4 text-ink-muted" }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search customer or invoice...", className: "w-full bg-transparent text-[12.5px] text-ink placeholder:text-ink-muted focus:outline-none" })] }) }), _jsxs("ul", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3", children: [list.map((e) => {
                                                const meta = ESC_META[e.requested];
                                                return (_jsxs("li", { className: "mb-2 rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(PartyAvatar, { name: e.customer, size: "md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: e.customer }), _jsxs("span", { className: cn('shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', meta.tone), children: [_jsx(meta.icon, { className: "size-3" }), " ", meta.label] })] }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [e.invoice, " \u00B7 ", e.days, "d overdue \u00B7 raised by ", e.by] })] }), _jsx(MoneyCell, { amount: e.amount, size: "sm", className: "shrink-0 font-bold !text-[13px] text-danger" })] }), _jsxs("p", { className: "mt-2 rounded-xl bg-white/60 p-2.5 text-[11.5px] text-ink-soft ring-1 ring-white/50", children: [_jsx("span", { className: "font-bold text-ink", children: "Operator's note: " }), e.note] }), _jsxs("div", { className: "mt-2.5 flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => decide(e, 'declined'), className: "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-3.5 text-[12px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white", children: "Decline" }), _jsxs("button", { type: "button", onClick: () => decide(e, 'approved'), className: "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-[12.5px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Check, { className: "size-3.5" }), " Approve ", meta.label.toLowerCase()] })] })] }, e.id));
                                            }), list.length === 0 ? _jsx("li", { className: "grid place-items-center py-16 text-[13px] text-ink-muted", children: "No escalations awaiting you." }) : null] })] }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 p-4", children: [_jsx("h4", { className: "text-[12px] font-bold text-ink", children: "Aging of the book" }), ['0-30', '31-60', '61-90', '90+'].map((b) => {
                                                const pct = overdue.length === 0 ? 0 : (buckets[b].count / overdue.length) * 100;
                                                return (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-[11.5px]", children: [_jsxs("span", { className: "font-medium text-ink-soft", children: [b, " days"] }), _jsx(MoneyCell, { amount: { amountMinor: buckets[b].sum, currency: 'USD' }, size: "sm", className: "!text-[11px] font-bold text-ink-soft" })] }), _jsx("div", { className: "mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8", children: _jsx("div", { className: cn('h-full rounded-full', b === '90+' ? 'bg-danger' : b === '61-90' ? 'bg-warning' : 'bg-brand'), style: { width: `${pct}%` } }) })] }, b));
                                            })] }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 p-4", children: [_jsxs("header", { className: "flex items-center gap-1.5", children: [_jsx(Clock, { className: "size-3.5 text-brand" }), _jsx("h4", { className: "text-[12px] font-bold text-ink", children: "Chase policy" })] }), _jsx(Policy, { label: "Reminder cadence", value: policy.reminderCadence }), _jsx(Policy, { label: "DSO target", value: policy.dsoTarget }), _jsx(Policy, { label: "Auto-escalate at", value: policy.autoEscalateAt }), _jsx("button", { type: "button", onClick: () => toast({ tone: 'success', title: 'Policy saved', body: 'Collections agent will chase on the new cadence.' }), className: "mt-1 inline-flex h-9 items-center justify-center rounded-xl bg-white/70 text-[12px] font-bold text-ink ring-1 ring-white/70 hover:bg-white", children: "Update policy" })] }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2 bg-gradient-to-br from-ai-soft/60 to-white/40 p-4 ring-1 ring-ai/15", children: [_jsxs("header", { className: "flex items-center gap-1.5", children: [_jsx(Sparkles, { className: "size-3.5 text-ai" }), _jsx("h4", { className: "text-[12px] font-bold text-ink", children: "Collections agent" })] }), _jsxs("p", { className: "rounded-xl bg-white/65 p-2.5 text-[11.5px] text-ink ring-1 ring-white/60", children: ["Recommend approving the ", _jsx("span", { className: "font-bold text-danger", children: "Umoja SACCO write-off" }), " - debtor insolvent, recovery unlikely."] })] })] })] })] })] }));
}
function Stat({ label, money, value, tone }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "p-3.5", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), money ? _jsx(MoneyCell, { amount: money, size: "lg", className: cn('!text-2xl font-bold', tone) }) : _jsx("span", { className: cn('block font-display text-2xl font-bold tabular', tone), children: value })] }));
}
function Policy({ label, value }) {
    return _jsxs("div", { className: "flex items-center justify-between rounded-xl bg-white/55 px-3 py-2 ring-1 ring-white/60", children: [_jsx("span", { className: "text-[11.5px] font-medium text-ink-soft", children: label }), _jsx("span", { className: "text-[12px] font-bold text-ink", children: value })] });
}
