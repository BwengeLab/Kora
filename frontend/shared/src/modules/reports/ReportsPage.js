import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Briefcase, Clock, CreditCard, Download, FileStack, FileWarning, Inbox, RefreshCw, ShieldCheck, Sparkles, Truck, X } from 'lucide-react';
import { useState } from 'react';
import { DateRangePill, PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { buildBoardPack, exportReport, fetchReportDetail, fetchReports, generateReport, scheduleReport } from '../../api/reports';
import { GlassSurface, cn } from '../../design-system';
import { seedReports } from '../../seed/ownerExtra';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
const ICON = { executive: Briefcase, board: BarChart3, exception: FileWarning, collections: Inbox, supplier: Truck, credit: CreditCard, audit: ShieldCheck };
const TONE = { executive: 'bg-brand-soft text-brand-ink', board: 'bg-ai-soft text-ai', exception: 'bg-warning-soft text-warning', collections: 'bg-info-soft text-info', supplier: 'bg-lavender-soft text-lavender', credit: 'bg-success-soft text-success', audit: 'bg-danger-soft text-danger' };
export function ReportsPage({ variant = 'read' }) {
    const apiBaseUrl = getApiBaseUrl();
    const token = useSessionStore((s) => s.session?.token ?? '');
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(null);
    const { data } = useQuery({
        queryKey: ['reports', token],
        queryFn: ({ signal }) => fetchReports(apiBaseUrl, token, signal),
        enabled: Boolean(token),
    });
    const reports = data ?? seedReports;
    const produce = variant === 'produce';
    const generateMutation = useMutation({
        mutationFn: (reportID) => generateReport(apiBaseUrl, token, reportID),
        onSuccess: (_, reportID) => {
            void queryClient.invalidateQueries({ queryKey: ['reports', token] });
            void queryClient.invalidateQueries({ queryKey: ['report-detail', token, reportID] });
            toast({ tone: 'success', title: 'Generated', body: 'Report regenerated from backend data.' });
        },
        onError: (error) => toast({ tone: 'danger', title: 'Generate failed', body: error.message }),
    });
    const boardPackMutation = useMutation({
        mutationFn: () => buildBoardPack(apiBaseUrl, token),
        onSuccess: (result) => {
            toast({ tone: 'success', title: 'Board pack building', body: `${result.fileName} is being compiled from backend data.` });
        },
        onError: (error) => toast({ tone: 'danger', title: 'Board pack failed', body: error.message }),
    });
    const scheduleMutation = useMutation({
        mutationFn: ({ reportID, schedule }) => scheduleReport(apiBaseUrl, token, reportID, schedule),
        onSuccess: (report) => {
            void queryClient.invalidateQueries({ queryKey: ['reports', token] });
            toast({ tone: 'success', title: 'Scheduled', body: `${report.name} now runs ${report.schedule}.` });
        },
        onError: (error) => toast({ tone: 'danger', title: 'Schedule failed', body: error.message }),
    });
    return (_jsxs("div", { className: "flex flex-col", children: [_jsx(PageHeader, { title: "Reports", subtitle: produce ? 'Produce the numbers the business runs on - generate, schedule and build the board pack from backend data.' : 'Decision-ready outputs, generated from backend data. Open one to read it; export to share.', right: _jsxs("div", { className: "flex items-center gap-2.5", children: [produce ? _jsxs("button", { type: "button", onClick: () => boardPackMutation.mutate(), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(FileStack, { className: "size-4" }), " Build board pack"] }) : null, _jsx(DateRangePill, { label: "May 2025" })] }) }), _jsxs("div", { className: "@container flex flex-col gap-6 px-8 pb-8", children: [produce ? (_jsxs("section", { className: "grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(ProdStat, { label: "Reports", value: String(reports.length) }), _jsx(ProdStat, { label: "Scheduled", value: String(reports.filter((r) => r.schedule !== 'On demand').length), tone: "text-brand-ink" }), _jsx(ProdStat, { label: "Generated today", value: "3", tone: "text-success" }), _jsx(ProdStat, { label: "On demand", value: String(reports.filter((r) => r.schedule === 'On demand').length), tone: "text-ink-soft" })] })) : null, _jsx("section", { className: "grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3", children: reports.map((report) => {
                            const Icon = ICON[report.kind];
                            return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-3 p-5", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: cn('grid size-11 place-items-center rounded-2xl', TONE[report.kind]), children: _jsx(Icon, { className: "size-5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate font-display text-[14.5px] font-bold text-ink", children: report.name }), _jsxs("p", { className: "truncate text-[11.5px] text-ink-muted", children: [report.schedule, " \u00B7 last ", report.lastGenerated] })] })] }), produce ? (_jsxs("div", { className: "mt-auto flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: () => generateMutation.mutate(report.id), className: "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(RefreshCw, { className: "size-3.5" }), " Generate"] }), _jsx("button", { type: "button", onClick: () => scheduleMutation.mutate({ reportID: report.id, schedule: nextSchedule(report.schedule) }), className: "inline-flex size-9 items-center justify-center rounded-xl bg-white/70 text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink", title: "Schedule", children: _jsx(Clock, { className: "size-4" }) }), _jsx("button", { type: "button", onClick: () => setOpen(report), className: "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-3 text-[12px] font-bold text-ink ring-1 ring-white/70 hover:bg-white", children: "Open" })] })) : (_jsx("button", { type: "button", onClick: () => setOpen(report), className: "mt-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink text-[12.5px] font-bold text-white shadow-glass-soft hover:brightness-110", children: "Open report" }))] }, report.id));
                        }) })] }), _jsx(Dialog.Root, { open: open !== null, onOpenChange: (value) => !value && setOpen(null), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/25 backdrop-blur-sm" }), _jsx(Dialog.Content, { "aria-describedby": undefined, className: "fixed left-1/2 top-1/2 z-[95] flex h-[min(82vh,760px)] w-[min(780px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: open ? _jsx(ReportView, { report: open }) : null })] }) })] }));
}
function ProdStat({ label, value, tone = 'text-ink' }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "p-3.5", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsx("span", { className: cn('block font-display text-2xl font-bold tabular', tone), children: value })] }));
}
function ReportView({ report }) {
    const apiBaseUrl = getApiBaseUrl();
    const token = useSessionStore((s) => s.session?.token ?? '');
    const [period, setPeriod] = useState('May 2025');
    const exportMutation = useMutation({
        mutationFn: () => exportReport(apiBaseUrl, token, report.id, period),
        onSuccess: (result) => toast({ tone: 'success', title: 'Exported', body: `${result.fileName} for ${result.period} is ready.` }),
        onError: (error) => toast({ tone: 'danger', title: 'Export failed', body: error.message }),
    });
    const { data } = useQuery({
        queryKey: ['report-detail', token, report.id],
        queryFn: ({ signal }) => fetchReportDetail(apiBaseUrl, token, report.id, signal),
        enabled: Boolean(token),
    });
    const content = data?.content ?? { kpis: [], columns: [], rows: [], narrative: '' };
    const periods = data?.periods ?? ['May 2025'];
    const Icon = ICON[report.kind];
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-center gap-3 border-b border-white/55 px-6 py-4", children: [_jsx("span", { className: cn('grid size-10 place-items-center rounded-2xl', TONE[report.kind]), children: _jsx(Icon, { className: "size-5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx(Dialog.Title, { className: "font-display text-[16px] font-bold text-ink", children: report.name }), _jsxs("p", { className: "text-[11.5px] text-ink-muted", children: [report.schedule, " \u00B7 evidence-backed"] })] }), _jsx("select", { value: period, onChange: (e) => setPeriod(e.target.value), className: "h-9 rounded-xl bg-white/70 px-3 text-[12px] font-semibold text-ink-soft ring-1 ring-white/70 focus:outline-none", children: periods.map((entry) => _jsx("option", { children: entry }, entry)) }), _jsxs("button", { type: "button", onClick: () => exportMutation.mutate(), className: "inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Download, { className: "size-3.5" }), " Export"] }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 overflow-y-auto p-6", children: [_jsxs("p", { className: "mb-4 text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: [report.name, " \u00B7 ", period] }), _jsx("div", { className: cn('mb-5 grid gap-3', content.kpis.length === 4 ? 'grid-cols-4' : 'grid-cols-3'), children: content.kpis.map((kpi) => (_jsxs("div", { className: "rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60", children: [_jsx("span", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: kpi.label }), _jsx("p", { className: cn('font-display text-2xl font-bold tabular', kpi.tone ?? 'text-ink'), children: kpi.value })] }, kpi.label))) }), _jsx("div", { className: "overflow-hidden rounded-2xl ring-1 ring-white/60", children: _jsxs("table", { className: "w-full text-left text-[12.5px]", children: [_jsx("thead", { className: "bg-white/60", children: _jsx("tr", { children: content.columns.map((column, index) => _jsx("th", { className: cn('px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted', index > 0 && index === content.columns.length - 1 && 'text-right'), children: column }, column)) }) }), _jsx("tbody", { children: content.rows.map((row, rowIndex) => (_jsx("tr", { className: "border-t border-white/45 bg-white/30", children: row.map((cell, cellIndex) => _jsx("td", { className: cn('px-3.5 py-2.5', cellIndex === 0 ? 'font-semibold text-ink' : 'text-ink-soft', cellIndex === row.length - 1 && cellIndex > 0 && 'text-right font-semibold tabular'), children: cell }, cellIndex)) }, rowIndex))) })] }) }), _jsxs("div", { className: "mt-5 flex items-start gap-2.5 rounded-2xl bg-ai-soft/40 p-4 ring-1 ring-ai/15", children: [_jsx(Sparkles, { className: "mt-0.5 size-4 shrink-0 text-ai" }), _jsxs("div", { children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-ai", children: "Summary" }), _jsx("p", { className: "mt-0.5 text-[13px] leading-relaxed text-ink", children: content.narrative })] })] })] })] }));
}
function nextSchedule(current) {
    if (current === 'On demand')
        return 'Weekly - Mon';
    if (current.startsWith('Weekly'))
        return 'Monthly';
    if (current === 'Monthly')
        return 'Daily';
    return 'On demand';
}
