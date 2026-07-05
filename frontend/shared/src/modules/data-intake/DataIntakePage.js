import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, Inbox, Link2, Loader2, Mail, Plus, Scan, Smartphone, Sparkles, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../app/shell';
import { getApiBaseUrl } from '../../api/client';
import { fetchIntakeDocs, matchIntakeDoc, postIntakeDoc, uploadIntakeDoc } from '../../api/intake';
import { GlassSurface, cn } from '../../design-system';
import { SOURCE_META, seedIntake } from '../../seed/intake';
import { openDoc } from '../../state/docViewerStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
const STAGE_META = {
    extracting: { label: 'Extracting', tone: 'bg-ai-soft text-ai' },
    'needs-review': { label: 'Needs review', tone: 'bg-warning-soft text-warning' },
    matched: { label: 'Matched', tone: 'bg-info-soft text-info' },
    posted: { label: 'Recorded', tone: 'bg-success-soft text-success' },
};
const SOURCE_ICON = { 'bank-feed': Link2, email: Mail, scan: Smartphone, upload: Upload };
export function DataIntakePage() {
    const apiBaseUrl = getApiBaseUrl();
    const token = useSessionStore((s) => s.session?.token ?? '');
    const queryClient = useQueryClient();
    const { data } = useQuery({
        queryKey: ['intake-docs', token],
        queryFn: ({ signal }) => fetchIntakeDocs(apiBaseUrl, token, signal),
        enabled: Boolean(token),
    });
    const docs = data ?? seedIntake;
    const [selectedId, setSelectedId] = useState(null);
    useEffect(() => {
        if (!docs.some((d) => d.id === selectedId)) {
            setSelectedId(docs.find((d) => d.stage === 'needs-review')?.id ?? docs[0]?.id ?? null);
        }
    }, [docs, selectedId]);
    const uploadMutation = useMutation({
        mutationFn: (name) => uploadIntakeDoc(apiBaseUrl, token, name),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['intake-docs', token] });
            toast({ tone: 'info', title: 'Uploaded', body: 'Kora is extracting the fields...' });
        },
        onError: (error) => toast({ tone: 'danger', title: 'Upload failed', body: error.message }),
    });
    const selected = docs.find((d) => d.id === selectedId) ?? null;
    const pending = docs.filter((d) => d.stage === 'needs-review' || d.stage === 'extracting').length;
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Data Intake", subtitle: _jsxs(_Fragment, { children: [_jsx("span", { className: "font-semibold text-ink", children: pending }), " documents waiting to be reviewed and posted. Bank feeds, email-in, scans and uploads land here."] }), right: _jsxs("button", { type: "button", onClick: () => uploadMutation.mutate('Dropped file.pdf'), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Plus, { className: "size-4" }), " Upload document"] }) }), _jsxs("div", { className: "flex min-h-0 flex-1 gap-5 px-8 pb-6", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex w-[360px] shrink-0 flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-white/55 px-4 py-3", children: [_jsx(Inbox, { className: "size-4 text-ink-soft" }), _jsx("h3", { className: "text-[13px] font-bold text-ink", children: "Intake queue" }), _jsxs("span", { className: "ml-auto rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning", children: [pending, " pending"] })] }), _jsx("ul", { className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto", children: docs.map((doc) => {
                                    const Icon = SOURCE_ICON[doc.source];
                                    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setSelectedId(doc.id), className: cn('flex w-full items-start gap-3 border-b border-white/40 px-4 py-3 text-left transition-colors', selected?.id === doc.id ? 'bg-white' : 'hover:bg-white/55'), children: [_jsx("span", { className: "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white/70 text-ink-soft ring-1 ring-white/60", children: _jsx(Icon, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: doc.name }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [SOURCE_META[doc.source].label, " \u00B7 ", new Date(doc.receivedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })] })] }), _jsx("span", { className: cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STAGE_META[doc.stage].tone), children: STAGE_META[doc.stage].label })] }) }, doc.id));
                                }) }), _jsx("div", { className: "grid grid-cols-3 gap-2 border-t border-white/55 p-3", children: [['bank-feed', Link2], ['email', Mail], ['scan', Scan]].map(([source, Icon]) => (_jsxs("button", { type: "button", onClick: () => toast({ tone: 'info', title: `${SOURCE_META[source].label} connected`, body: 'New documents will arrive automatically.' }), className: "flex flex-col items-center gap-1 rounded-xl bg-white/55 py-2.5 text-[10.5px] font-bold text-ink-soft ring-1 ring-white/60 hover:bg-white hover:text-ink", children: [_jsx(Icon, { className: "size-4" }), " ", SOURCE_META[source].label] }, source))) })] }), _jsx(GlassSurface, { tone: "strong", className: "flex min-w-0 flex-1 flex-col", children: selected ? _jsx(IntakeDetail, { doc: selected }) : _jsx("div", { className: "grid flex-1 place-items-center text-ink-muted", children: "Select a document" }) })] })] }));
}
function IntakeDetail({ doc }) {
    const apiBaseUrl = getApiBaseUrl();
    const token = useSessionStore((s) => s.session?.token ?? '');
    const queryClient = useQueryClient();
    const matchMutation = useMutation({
        mutationFn: () => matchIntakeDoc(apiBaseUrl, token, doc.id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['intake-docs', token] });
            toast({ tone: 'success', title: 'Matched', body: `${doc.name} linked to ${doc.suggestedMatch?.ref ?? 'the selected record'}.` });
        },
        onError: (error) => toast({ tone: 'danger', title: 'Match failed', body: error.message }),
    });
    const postMutation = useMutation({
        mutationFn: () => postIntakeDoc(apiBaseUrl, token, doc.id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['intake-docs', token] });
            toast({ tone: 'success', title: 'Recorded', body: `${doc.name} recorded to the books with evidence - ready for reconciliation.` });
        },
        onError: (error) => toast({ tone: 'danger', title: 'Record failed', body: error.message }),
    });
    const extracting = doc.stage === 'extracting';
    const done = doc.stage === 'posted';
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-center gap-3 border-b border-white/55 px-6 py-4", children: [_jsx("span", { className: "grid size-11 place-items-center rounded-2xl bg-danger-soft text-danger", children: _jsx(FileText, { className: "size-5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h2", { className: "truncate font-display text-lg font-bold text-ink", children: doc.name }), _jsxs("p", { className: "text-[12px] text-ink-muted", children: [SOURCE_META[doc.source].label, " \u00B7 ", doc.kind, " \u00B7 ", doc.sizeText] })] }), _jsx("button", { type: "button", onClick: () => openDoc({ name: doc.name, kind: doc.kind, sizeText: doc.sizeText, context: SOURCE_META[doc.source].label }), className: "rounded-xl bg-white/70 px-3 py-2 text-[12px] font-bold text-brand ring-1 ring-white/70 hover:bg-white", children: "View original" })] }), _jsx("div", { className: "scrollbar-thin flex-1 overflow-y-auto p-6", children: extracting ? (_jsxs("div", { className: "flex flex-col items-center gap-3 py-16 text-center", children: [_jsx(Loader2, { className: "size-8 animate-spin text-ai" }), _jsx("p", { className: "text-[14px] font-semibold text-ink", children: "Kora is extracting fields..." }), _jsx("p", { className: "text-[12px] text-ink-muted", children: "OCR + field detection usually takes a few seconds." })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4 inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-2.5 py-1 text-[11px] font-bold text-ai", children: [_jsx(Sparkles, { className: "size-3.5" }), " Extracted by Kora"] }), _jsx("dl", { className: "grid grid-cols-2 gap-3", children: doc.fields.map((field) => (_jsxs("div", { className: "rounded-2xl bg-white/55 p-3 ring-1 ring-white/60", children: [_jsx("dt", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: field.label }), _jsx("dd", { className: "mt-0.5 text-[13.5px] font-semibold text-ink", children: field.value }), _jsx(ConfidenceBar, { value: field.confidence })] }, field.label))) }), doc.suggestedMatch ? (_jsxs("div", { className: "mt-5 rounded-2xl bg-brand-soft/50 p-4 ring-1 ring-brand/15", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-brand-ink", children: "Suggested match" }), _jsxs("div", { className: "mt-1.5 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[13.5px] font-bold text-ink", children: doc.suggestedMatch.party }), _jsx("p", { className: "font-mono text-[11.5px] text-ink-muted", children: doc.suggestedMatch.ref })] }), _jsx("span", { className: "font-display text-lg font-bold text-ink tabular", children: doc.suggestedMatch.amount })] })] })) : (_jsx("p", { className: "mt-5 rounded-2xl bg-warning-soft/50 p-3 text-[12.5px] font-medium text-warning ring-1 ring-warning/20", children: "No confident match found - review the fields and post as a new transaction, or escalate." }))] })) }), !extracting ? (_jsx("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: done ? (_jsxs("span", { className: "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success-soft text-[13px] font-bold text-success", children: [_jsx(CheckCircle2, { className: "size-4" }), " Recorded to the books"] })) : (_jsxs(_Fragment, { children: [doc.suggestedMatch ? (_jsxs("button", { type: "button", onClick: () => matchMutation.mutate(), className: cn('inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-[13px] font-bold ring-1 ring-white/70', doc.stage === 'matched' ? 'bg-info-soft text-info' : 'bg-white/70 text-ink hover:bg-white'), children: [_jsx(Link2, { className: "size-4" }), " ", doc.stage === 'matched' ? 'Matched' : 'Confirm match'] })) : null, _jsxs("button", { type: "button", onClick: () => postMutation.mutate(), className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(CheckCircle2, { className: "size-4" }), " Record transaction"] })] })) })) : null] }));
}
function ConfidenceBar({ value }) {
    const pct = Math.round(value * 100);
    const tone = value >= 0.85 ? 'bg-success' : value >= 0.6 ? 'bg-warning' : 'bg-danger';
    return (_jsxs("div", { className: "mt-1.5 flex items-center gap-2", children: [_jsx("div", { className: "h-1 flex-1 overflow-hidden rounded-full bg-ink/8", children: _jsx("div", { className: cn('h-full rounded-full', tone), style: { width: `${pct}%` } }) }), _jsxs("span", { className: "text-[10px] font-bold text-ink-muted tabular", children: [pct, "%"] })] }));
}
