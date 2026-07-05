import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AlertOctagon, ArrowLeftRight, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, FileText, Forward, Link2, Lock, MoreHorizontal, Scissors, Sparkles, SkipForward, UserPlus, X, } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { openDoc } from '../../state/docViewerStore';
import { StageStepper } from './StageStepper';
export function MatchDetail({ recons, selectedId, onSelect, onPrepare, onReject }) {
    const recon = useMemo(() => recons.find((r) => r.id === selectedId) ?? recons[0], [recons, selectedId]);
    const [tab, setTab] = useState('details');
    const idx = recons.findIndex((r) => r.id === recon.id);
    const prev = recons[idx - 1];
    const next = recons[idx + 1];
    const tierLabel = recon.tier === 'auto' ? 'High-confidence match' :
        recon.tier === 'suggested' ? 'Suggested match' :
            recon.tier === 'review' ? 'Needs your review' :
                recon.tier === 'duplicate' ? 'Likely duplicate' : 'Suspicious — needs escalation';
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col", children: [_jsxs("header", { className: "flex items-center justify-between gap-4 px-7 pt-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(PartyAvatar, { name: recon.transaction.counterparty, size: "lg" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("h2", { className: "font-display text-[20px] font-bold leading-tight text-ink", children: recon.transaction.counterparty }), _jsxs("p", { className: "text-[12.5px] text-ink-muted", children: [recon.transaction.source, " \u00B7", ' ', new Date(recon.transaction.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), ' · ', recon.ageText] })] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(QueueNavButton, { label: "Previous", disabled: !prev, onClick: () => prev && onSelect(prev.id), children: _jsx(ChevronLeft, { className: "size-4" }) }), _jsxs("span", { className: "px-1 text-[12px] font-semibold tabular text-ink-muted", children: [idx + 1, " / ", recons.length] }), _jsx(QueueNavButton, { label: "Next", disabled: !next, onClick: () => next && onSelect(next.id), children: _jsx(ChevronRight, { className: "size-4" }) })] })] }), _jsx("div", { className: "px-7 pt-5", children: _jsx(StageStepper, { current: recon.stage }) }), _jsxs("div", { className: "scrollbar-thin mt-5 flex-1 overflow-y-auto px-7", children: [_jsx(ConfidenceHeadline, { confidence: recon.confidence, tierLabel: tierLabel, record: recon.suggestedRecord, party: recon.transaction.counterparty }), _jsxs("div", { className: "mt-5 grid grid-cols-1 items-stretch gap-4 @3xl:grid-cols-[1fr_auto_1fr]", children: [_jsxs(SidePane, { title: "Money in / out", badge: recon.transaction.source, badgeTone: "neutral", children: [_jsx(MoneyCell, { amount: recon.transaction.amount, size: "xl" }), _jsx(PartyLine, { name: recon.transaction.counterparty }), _jsx(KVGrid, { rows: [
                                            ['Date', new Date(recon.transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })],
                                            ['Reference', recon.transaction.reference ?? '—'],
                                            ['Direction', recon.transaction.direction === 'inflow' ? 'Money in' : 'Money out'],
                                        ] })] }), _jsx("div", { className: "grid place-items-center", children: _jsx("span", { className: cn('grid size-11 place-items-center rounded-2xl text-white shadow-glass-soft', recon.suggestedRecord ? 'bg-gradient-to-br from-brand to-ai' : 'bg-ink/20'), children: _jsx(ArrowLeftRight, { className: "size-5" }) }) }), recon.suggestedRecord ? (_jsxs(SidePane, { title: "Business record", badge: recon.suggestedRecord.type, badgeTone: "brand", children: [_jsx(MoneyCell, { amount: recon.suggestedRecord.amount, size: "xl" }), _jsx(PartyLine, { name: recon.suggestedRecord.partyName }), _jsx(KVGrid, { rows: [
                                            ['Date', new Date(recon.suggestedRecord.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })],
                                            ['Reference', recon.suggestedRecord.reference],
                                            ['Type', recon.suggestedRecord.type.toUpperCase()],
                                        ] })] })) : (_jsx(NoMatchPane, { reason: recon.reason }))] }), _jsxs("section", { className: "mt-5 rounded-3xl bg-gradient-to-br from-ai-soft/80 to-white/40 p-5 ring-1 ring-ai/15", children: [_jsxs("header", { className: "mb-2 flex items-center gap-2", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white", children: _jsx(Sparkles, { className: "size-4" }) }), _jsx("span", { className: "text-[12px] font-bold uppercase tracking-wider text-ai", children: "Why Kora matched these" })] }), _jsx("p", { className: "text-[14px] leading-relaxed text-ink", children: recon.reason }), recon.unexplainedDifference ? (_jsxs("div", { className: "mt-3 inline-flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-1.5 text-[12px] font-bold text-warning", children: ["Unexplained difference: ", _jsx(MoneyCell, { amount: recon.unexplainedDifference, size: "sm", className: "!text-[12px]" })] })) : null, recon.duplicateOf ? (_jsxs("button", { type: "button", onClick: () => onSelect(recon.duplicateOf), className: "mt-3 inline-flex items-center gap-2 rounded-xl bg-info-soft px-3 py-1.5 text-[12px] font-bold text-info", children: [_jsx(Copy, { className: "size-3.5" }), " Duplicate of ", recon.duplicateOf, " \u2014 open original"] })) : null] }), _jsx("div", { className: "mt-6 flex gap-1 border-b border-white/55", children: [
                            ['details', 'Match details'],
                            ['evidence', `Evidence (${recon.evidence.length})`],
                            ['history', `History (${recon.history.length})`],
                            ['notes', 'Notes'],
                        ].map(([id, label]) => (_jsxs("button", { type: "button", onClick: () => setTab(id), className: cn('relative px-3 pb-2.5 text-[13px] font-semibold transition-colors', tab === id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'), children: [label, tab === id ? _jsx("span", { className: "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" }) : null] }, id))) }), _jsxs("div", { className: "py-4 pb-6", children: [tab === 'details' ? _jsx(MatchDetailsTab, { deltas: recon.deltas }) : null, tab === 'evidence' ? _jsx(EvidenceTab, { docs: recon.evidence, context: recon.transaction.counterparty }) : null, tab === 'history' ? _jsx(HistoryTab, { events: recon.history }) : null, tab === 'notes' ? _jsx(NotesTab, {}) : null] })] }), _jsx(ActionBar, { recon: recon, onPrepare: () => onPrepare(recon.id), onReject: () => onReject(recon.id) })] }));
}
// ─── Confidence headline ─────────────────────────────────────────────────────
function ConfidenceHeadline({ confidence, tierLabel, record, party, }) {
    const tone = confidence >= 95 ? 'success' : confidence >= 70 ? 'ai' : 'warning';
    const toneClasses = {
        success: 'from-success-soft/80 text-success',
        ai: 'from-ai-soft/80 text-ai',
        warning: 'from-warning-soft/80 text-warning',
    }[tone];
    return (_jsxs("div", { className: cn('flex items-center gap-4 rounded-3xl bg-gradient-to-r to-white/30 p-5 ring-1 ring-white/50', toneClasses), children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsxs("span", { className: "font-display text-4xl font-bold leading-none tabular", children: [confidence, "%"] }), _jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider", children: tierLabel.split(' ')[0] })] }), _jsx("div", { className: "h-10 w-px bg-current/20" }), _jsxs("p", { className: "text-[14px] font-medium leading-snug text-ink", children: [_jsxs("span", { className: "font-bold", children: [tierLabel, "."] }), ' ', record
                        ? `Kora is ${confidence}% sure this ${party} payment matches ${record.reference}.`
                        : `Kora could not find a matching record — review the evidence and decide.`] })] }));
}
// ─── Side panes ──────────────────────────────────────────────────────────────
function SidePane({ title, badge, badgeTone, children, }) {
    return (_jsxs("article", { className: "flex flex-col gap-3 rounded-3xl bg-white/55 p-5 ring-1 ring-white/65", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: title }), _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', badgeTone === 'brand' ? 'bg-brand-soft text-brand-ink' : 'bg-white/80 text-ink-soft ring-1 ring-white/80'), children: badge })] }), children] }));
}
function PartyLine({ name }) {
    return (_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(PartyAvatar, { name: name, size: "sm" }), _jsx("span", { className: "text-[13px] font-semibold text-ink", children: name })] }));
}
function KVGrid({ rows }) {
    return (_jsx("dl", { className: "grid grid-cols-2 gap-x-4 gap-y-2.5", children: rows.map(([k, v]) => (_jsxs("div", { children: [_jsx("dt", { className: "text-[10px] uppercase tracking-wider text-ink-muted", children: k }), _jsx("dd", { className: "truncate font-mono text-[12.5px] font-medium text-ink", children: v })] }, k))) }));
}
function NoMatchPane({ reason }) {
    return (_jsxs("article", { className: "flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-white/70 bg-white/30 p-6 text-center", children: [_jsx("span", { className: "grid size-11 place-items-center rounded-2xl bg-warning-soft text-warning", children: _jsx(FileText, { className: "size-5" }) }), _jsx("p", { className: "font-display text-[15px] font-bold text-ink", children: "No matching record" }), _jsx("p", { className: "text-[12px] leading-snug text-ink-muted", children: reason })] }));
}
// ─── Tabs ────────────────────────────────────────────────────────────────────
function MatchDetailsTab({ deltas }) {
    if (deltas.length === 0) {
        return _jsx("p", { className: "text-[13px] text-ink-muted", children: "No field comparison available for this item." });
    }
    return (_jsxs("div", { className: "overflow-hidden rounded-2xl ring-1 ring-white/60", children: [_jsxs("div", { className: "grid grid-cols-[90px_1fr_1fr_96px] gap-3 bg-white/55 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Field" }), _jsx("span", { children: "Money side" }), _jsx("span", { children: "Business side" }), _jsx("span", { className: "text-right", children: "Result" })] }), _jsx("ul", { children: deltas.map((d, i) => {
                    const tone = d.status === 'match' ? 'text-success' : d.status === 'near' ? 'text-warning' : 'text-danger';
                    const Icon = d.status === 'match' ? Check : d.status === 'near' ? ArrowLeftRight : X;
                    return (_jsxs("li", { className: cn('grid grid-cols-[90px_1fr_1fr_96px] items-center gap-3 px-4 py-2.5 text-[12.5px]', i > 0 && 'border-t border-white/55', i % 2 ? 'bg-white/25' : 'bg-white/40'), children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: d.field }), _jsx("span", { className: "truncate font-mono text-ink", children: d.bankValue }), _jsx("span", { className: "truncate font-mono text-ink", children: d.recordValue }), _jsxs("span", { className: cn('inline-flex items-center justify-end gap-1 text-[11.5px] font-bold', tone), children: [_jsx(Icon, { className: "size-3.5" }), " ", d.note ?? d.status] })] }, i));
                }) })] }));
}
function EvidenceTab({ docs, context }) {
    return (_jsx("ul", { className: "grid grid-cols-1 gap-2.5 @2xl:grid-cols-2", children: docs.map((d) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => openDoc({ name: d.name, kind: d.kind, sizeText: d.sizeText, pageRef: d.pageRef, context }), className: "flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/65 hover:bg-white", children: [_jsx("span", { className: "grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger", children: _jsx(FileText, { className: "size-5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: d.name }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [d.kind, " \u00B7 ", d.sizeText, d.pageRef ? ` · ${d.pageRef}` : ''] })] }), _jsx("span", { className: "rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-white/80", children: "View" })] }) }, d.id))) }));
}
function HistoryTab({ events }) {
    return (_jsx("ol", { className: "flex flex-col gap-0", children: events.map((e, i) => (_jsxs("li", { className: "flex gap-3", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: cn('mt-0.5 grid size-7 place-items-center rounded-full text-white', e.kind === 'agent' ? 'bg-gradient-to-br from-ai to-brand' : e.kind === 'user' ? 'bg-brand' : 'bg-ink/40'), children: e.kind === 'agent' ? _jsx(Sparkles, { className: "size-3.5" }) : _jsx(Check, { className: "size-3.5" }) }), i < events.length - 1 ? _jsx("span", { className: "my-1 w-px flex-1 bg-ink/10" }) : null] }), _jsxs("div", { className: "pb-4", children: [_jsx("p", { className: "text-[13px] font-semibold text-ink", children: e.action }), _jsxs("p", { className: "text-[11.5px] text-ink-muted", children: [e.actor, " \u00B7 ", e.actorRole, " \u00B7", ' ', new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })] })] })] }, e.id))) }));
}
function NotesTab() {
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("textarea", { rows: 3, placeholder: "Add a note for the Finance Lead or Auditor\u2026 (e.g. why you're preparing this match)", className: "w-full resize-none rounded-2xl bg-white/60 p-3.5 text-[13px] text-ink placeholder:text-ink-muted ring-1 ring-white/65 focus:outline-none focus:ring-2 focus:ring-brand/30" }), _jsx("button", { type: "button", className: "self-end rounded-xl bg-white/70 px-4 py-2 text-[12.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink", children: "Add note" })] }));
}
// ─── Action bar ────────────────────────────────────────────────────────────
function ActionBar({ recon, onPrepare, onReject }) {
    const isPrepared = recon.stage === 'prepared' || recon.stage === 'approved' || recon.stage === 'posted';
    return (_jsx("footer", { className: "border-t border-white/55 bg-white/45 px-7 py-4", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("span", { className: "inline-flex items-center gap-2 rounded-xl bg-white/55 px-3 py-2 text-[12px] font-semibold text-ink-muted ring-1 ring-white/60", children: [_jsx(Lock, { className: "size-3.5" }), " Approve & post \u00B7 Finance Lead"] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(MoreActionsMenu, {}), _jsxs("button", { type: "button", onClick: onReject, disabled: isPrepared, className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[13.5px] font-bold text-danger ring-1 ring-danger/25 transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-40", children: [_jsx(X, { className: "size-4" }), " Reject"] }), _jsxs("button", { type: "button", onClick: onPrepare, disabled: isPrepared, className: cn('inline-flex h-11 items-center gap-2.5 rounded-2xl px-5 text-[14px] font-bold text-white shadow-[0_8px_22px_rgba(67,97,238,0.45)] transition-all hover:brightness-110 disabled:cursor-default disabled:shadow-none', isPrepared ? 'bg-success' : 'bg-gradient-to-br from-brand to-brand-ink'), children: [_jsx(Check, { className: "size-[18px]" }), _jsxs("span", { className: "flex flex-col items-start leading-none", children: [_jsx("span", { children: isPrepared ? 'Prepared ✓' : 'Prepare match' }), _jsx("span", { className: "text-[10px] font-medium text-white/85", children: isPrepared ? 'sent to Finance Lead' : '→ Finance Lead approves' })] })] })] })] }) }));
}
function MoreActionsMenu() {
    const items = [
        { label: 'Split / partial match', icon: Scissors },
        { label: 'Manual match', icon: Link2 },
        { label: 'Request document', icon: FileText },
        { label: 'Mark as duplicate', icon: Copy, tone: 'info' },
        { label: 'Mark suspicious', icon: AlertOctagon, tone: 'danger' },
        { label: 'Assign to teammate', icon: UserPlus },
        { label: 'Escalate', icon: Forward },
    ];
    return (_jsxs(DropdownMenu.Root, { children: [_jsx(DropdownMenu.Trigger, { asChild: true, children: _jsxs("button", { type: "button", className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-white/65 px-4 text-[13.5px] font-bold text-ink-soft ring-1 ring-white/70 transition-colors hover:bg-white hover:text-ink", children: [_jsx(MoreHorizontal, { className: "size-4" }), " More ", _jsx(ChevronDown, { className: "size-3.5" })] }) }), _jsx(DropdownMenu.Portal, { children: _jsxs(DropdownMenu.Content, { side: "top", align: "end", sideOffset: 8, className: "z-50 flex w-60 flex-col gap-0.5 rounded-2xl border border-glass-border-strong bg-glass-strong p-1.5 shadow-glass-lg backdrop-blur-glass-lg", children: [items.map((it) => (_jsxs(DropdownMenu.Item, { className: cn('flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold outline-none transition-colors', it.tone === 'danger' ? 'text-danger hover:bg-danger-soft' : it.tone === 'info' ? 'text-info hover:bg-info-soft' : 'text-ink-soft hover:bg-white/80 hover:text-ink'), children: [_jsx(it.icon, { className: "size-4" }), " ", it.label] }, it.label))), _jsxs(DropdownMenu.Item, { className: "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-ink-soft outline-none hover:bg-white/80 hover:text-ink", children: [_jsx(SkipForward, { className: "size-4" }), " Skip for now"] })] }) })] }));
}
function QueueNavButton({ label, disabled, onClick, children }) {
    return (_jsx("button", { type: "button", "aria-label": label, title: label, disabled: disabled, onClick: onClick, className: "grid size-9 place-items-center rounded-xl bg-white/60 text-ink-soft ring-1 ring-white/70 transition-colors hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-40", children: children }));
}
