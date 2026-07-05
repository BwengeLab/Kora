import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, HandCoins, Mail, MessageSquare, Phone, ShieldCheck, TrendingDown, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { collectionsAction, exportCollectionsSummary, fetchOverdueItems } from '../../api/collections';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { seedOverdue } from '../../seed/ownerExtra';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
const RISK_TONE = { low: 'bg-success-soft text-success', medium: 'bg-warning-soft text-warning', high: 'bg-danger-soft text-danger' };
const bucketOf = (days) => (days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+');
export function CollectionsOverview() {
    const apiBaseUrl = getApiBaseUrl();
    const token = useSessionStore((s) => s.session?.token ?? '');
    const queryClient = useQueryClient();
    const { data } = useQuery({
        queryKey: ['collections-overdue', token],
        queryFn: ({ signal }) => fetchOverdueItems(apiBaseUrl, token, signal),
        enabled: Boolean(token),
    });
    const overdue = data ?? seedOverdue;
    const [selected, setSelected] = useState(null);
    const actionMutation = useMutation({
        mutationFn: ({ itemID, action }) => collectionsAction(apiBaseUrl, token, itemID, action),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['collections-overdue', token] }),
    });
    const exportMutation = useMutation({
        mutationFn: () => exportCollectionsSummary(apiBaseUrl, token),
        onSuccess: (result) => toast({ tone: 'success', title: 'Exporting', body: `${result.fileName} is being prepared.` }),
        onError: (error) => toast({ tone: 'danger', title: 'Export failed', body: error.message }),
    });
    const totalOverdue = { amountMinor: overdue.reduce((sum, item) => sum + item.amount.amountMinor, 0n), currency: 'USD' };
    const buckets = useMemo(() => {
        const map = { '0-30': { count: 0, sum: 0n }, '31-60': { count: 0, sum: 0n }, '61-90': { count: 0, sum: 0n }, '90+': { count: 0, sum: 0n } };
        for (const item of overdue) {
            const bucketKey = bucketOf(item.daysOverdue);
            map[bucketKey].count++;
            map[bucketKey].sum += item.amount.amountMinor;
        }
        return map;
    }, [overdue]);
    const worst = useMemo(() => [...overdue].sort((a, b) => b.daysOverdue - a.daysOverdue), [overdue]);
    const atRisk90 = { amountMinor: overdue.filter((item) => item.daysOverdue > 90).reduce((sum, item) => sum + item.amount.amountMinor, 0n), currency: 'USD' };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Collections", subtitle: _jsx(_Fragment, { children: "How much you're owed and whether it threatens cash. Finance runs the day-to-day chasing - you watch the health and step in on key accounts." }), right: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs("button", { type: "button", onClick: () => exportMutation.mutate(), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink", children: [_jsx(HandCoins, { className: "size-4" }), " Receivables summary"] }), _jsx(DateRangePill, { label: "May 2025" })] }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-5 px-8 pb-8", children: [_jsxs("section", { className: "grid grid-cols-2 gap-4 @5xl:grid-cols-4", children: [_jsxs(GlassSurface, { tone: "strong", className: "p-5", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "Total owed" }), _jsx(MoneyCell, { amount: totalOverdue, size: "lg", className: "!text-3xl font-bold text-danger" }), _jsx("span", { className: "text-[11.5px] text-ink-muted", children: "Cash tied up in receivables" })] }), _jsx(BigStat, { label: "Days sales outstanding", value: "41d", sub: "down 4d vs last month", tone: "text-ink", trendOk: true }), _jsx(BigStat, { label: "90+ days at risk", money: atRisk90, sub: "Hand to finance for final notice", tone: "text-danger" }), _jsx(BigStat, { label: "Collected this month", value: "$128,400", sub: "recovered via the team", tone: "text-success", trendOk: true })] }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-12", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex min-h-0 flex-col p-6 @5xl:col-span-8", children: [_jsxs("header", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Accounts to watch" }), _jsxs("span", { className: "inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted", children: [_jsx(ShieldCheck, { className: "size-3.5" }), " Finance chases - you oversee and escalate"] })] }), _jsx("ul", { className: "scrollbar-thin -mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-2", children: worst.map((item) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setSelected(item), className: "flex w-full items-center gap-3 border-b border-white/40 py-3 text-left transition-colors hover:bg-white/55", children: [_jsx(PartyAvatar, { name: item.customer, size: "md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: item.customer }), _jsx("span", { className: cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', RISK_TONE[item.risk]), children: item.risk })] }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [item.invoice, " \u00B7 ", item.daysOverdue, " days overdue \u00B7 ", item.reminderCount, " reminders by finance"] })] }), _jsxs("span", { className: cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', item.daysOverdue > 90 ? 'bg-danger-soft text-danger' : item.daysOverdue > 60 ? 'bg-warning-soft text-warning' : 'bg-info-soft text-info'), children: [bucketOf(item.daysOverdue), "d"] }), _jsx(MoneyCell, { amount: item.amount, size: "sm", className: "shrink-0 font-bold !text-[13px] text-danger" })] }) }, item.id))) })] }), _jsxs("div", { className: "flex flex-col gap-5 @5xl:col-span-4", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 p-5", children: [_jsx("h4", { className: "text-[12.5px] font-bold text-ink", children: "Aging distribution" }), ['0-30', '31-60', '61-90', '90+'].map((bucketKey) => {
                                                const pct = overdue.length === 0 ? 0 : (buckets[bucketKey].count / overdue.length) * 100;
                                                return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between text-[11.5px]", children: [_jsxs("span", { className: "font-medium text-ink-soft", children: [bucketKey, " days"] }), _jsx(MoneyCell, { amount: { amountMinor: buckets[bucketKey].sum, currency: 'USD' }, size: "sm", className: "!text-[11.5px] font-bold text-ink" })] }), _jsx("div", { className: "mt-1 h-2 overflow-hidden rounded-full bg-ink/8", children: _jsx("div", { className: cn('h-full rounded-full', bucketKey === '90+' ? 'bg-danger' : bucketKey === '61-90' ? 'bg-warning' : 'bg-brand'), style: { width: `${pct}%` } }) })] }, bucketKey));
                                            })] }), _jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 bg-gradient-to-br from-warning-soft/50 to-white/40 p-5 ring-1 ring-warning/15", children: [_jsxs("header", { className: "flex items-center gap-1.5", children: [_jsx(TrendingDown, { className: "size-3.5 text-warning" }), _jsx("h4", { className: "text-[12.5px] font-bold text-ink", children: "What needs you" })] }), _jsxs("p", { className: "text-[12px] text-ink", children: ["Two accounts are ", _jsx("span", { className: "font-bold text-danger", children: "90+ days" }), " overdue and high-risk. Hand them to finance for final notice, or call the relationship yourself."] }), _jsx("button", { type: "button", onClick: () => setSelected(worst[0] ?? null), className: "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/70 text-[12px] font-bold text-ink ring-1 ring-white/70 hover:bg-white", children: "Review worst account" })] })] })] })] }), _jsx(OversightDrawer, { item: selected, onClose: () => setSelected(null), onHand: async (item) => {
                    try {
                        await actionMutation.mutateAsync({ itemID: item.id, action: 'hand-to-finance' });
                        toast({ tone: 'info', title: 'Handed to finance', body: `${item.customer} (${item.invoice}) escalated to the finance team to action.` });
                        setSelected(null);
                    }
                    catch (error) {
                        toast({ tone: 'danger', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not hand item to finance.' });
                    }
                }, onFlag: async (item) => {
                    try {
                        await actionMutation.mutateAsync({ itemID: item.id, action: 'flag-owner-call' });
                        toast({ tone: 'warning', title: 'Flagged for your call', body: `${item.customer} marked for a personal call from you.` });
                    }
                    catch (error) {
                        toast({ tone: 'danger', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not flag owner call.' });
                    }
                }, onMessage: async (item) => {
                    try {
                        await actionMutation.mutateAsync({ itemID: item.id, action: 'request-update' });
                        toast({ tone: 'info', title: 'Message to finance', body: `Asked finance for an update on ${item.customer}.` });
                    }
                    catch (error) {
                        toast({ tone: 'danger', title: 'Action failed', body: error instanceof Error ? error.message : 'Could not request update.' });
                    }
                } })] }));
}
function OversightDrawer({ item, onClose, onHand, onFlag, onMessage }) {
    return (_jsx(Dialog.Root, { open: item !== null, onOpenChange: (value) => !value && onClose(), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsx(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: item ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(PartyAvatar, { name: item.customer, size: "lg" }), _jsxs("div", { children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: item.customer }), _jsxs("p", { className: "text-[11.5px] text-ink-muted", children: [item.invoice, " \u00B7 ", item.daysOverdue, " days overdue"] })] })] }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wider text-ink-muted", children: "Amount owed" }), _jsx(MoneyCell, { amount: item.amount, size: "xl", className: "!text-3xl font-bold text-danger" })] }), _jsxs("span", { className: cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', RISK_TONE[item.risk]), children: [item.risk, " risk"] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("span", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: "Contact" }), _jsx("p", { className: "text-[13px] font-semibold text-ink", children: item.contact }), _jsxs("p", { className: "inline-flex items-center gap-1 text-[11px] text-ink-soft", children: [_jsx(Mail, { className: "size-3" }), item.email] })] }), _jsxs("div", { className: "rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("span", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: "Finance activity" }), _jsxs("p", { className: "text-[13px] font-semibold text-ink", children: [item.reminderCount, " reminders"] }), _jsxs("p", { className: "inline-flex items-center gap-1 text-[11px] text-ink-soft", children: [_jsx(Clock, { className: "size-3" }), "last ", new Date(item.lastContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] })] })] }), _jsx("p", { className: "rounded-2xl bg-white/45 p-3 text-[11.5px] text-ink-muted ring-1 ring-white/50", children: "This is your oversight view - finance sends the reminders. You can hand this account to them to action, ask for an update, or flag it for a personal call." })] }), _jsxs("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: [_jsxs("button", { type: "button", onClick: () => onFlag(item), className: "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white", children: [_jsx(Phone, { className: "size-4" }), " My call"] }), _jsxs("button", { type: "button", onClick: () => onMessage(item), className: "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink ring-1 ring-white/70 hover:bg-white", children: [_jsx(MessageSquare, { className: "size-4" }), " Ask finance"] }), _jsxs("button", { type: "button", onClick: () => onHand(item), className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(UserPlus, { className: "size-4" }), " Hand to finance"] })] })] })) : null })] }) }));
}
function BigStat({ label, value, money, sub, tone, trendOk }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "p-5", children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: label }), money ? _jsx(MoneyCell, { amount: money, size: "lg", className: cn('!text-3xl font-bold', tone) }) : _jsx("span", { className: cn('block font-display text-3xl font-bold tabular', tone), children: value }), _jsx("span", { className: cn('text-[11.5px]', trendOk ? 'font-semibold text-success' : 'text-ink-muted'), children: sub })] }));
}
