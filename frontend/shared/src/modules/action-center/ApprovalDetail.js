import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, FileText, Forward, Info, MessageSquareWarning, MoreHorizontal, ShieldCheck, Sparkles, UserPlus, X, } from 'lucide-react';
import { ArrowUpFromLine } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GlassSurface, MoneyCell, cn } from '../../design-system';
import { useSession } from '../../auth/hooks';
import { openDoc } from '../../state/docViewerStore';
import { approvalBlockReason } from '../../state/workflowStore';
import { ApprovalChain } from './ApprovalChain';
import { RISK_LABEL, RISK_TONE, TYPE_ICON, TYPE_TONE } from './typeMeta';
import { routedUpReason } from './variant';
export function ApprovalDetail({ items, variant, track = false, selectedId, onSelect, onApprove, onReject, onAction, }) {
    const item = useMemo(() => items.find((a) => a.id === selectedId) ?? items[0], [items, selectedId]);
    const [tab, setTab] = useState('summary');
    const Icon = TYPE_ICON[item.type];
    const session = useSession();
    const actorRole = session?.roles[0]?.name ?? '';
    const actorName = session?.user.displayName ?? '';
    const idx = items.findIndex((a) => a.id === item.id);
    const prev = items[idx - 1];
    const next = items[idx + 1];
    const ownerReason = variant === 'org_owner' ? routedUpReason(item) : null;
    const done = item.stage === 'approved' || item.stage === 'rejected';
    const block = approvalBlockReason(item, actorRole, actorName); // null = allowed
    const canApprove = !done && block === null;
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col", children: [_jsxs("header", { className: "flex items-center justify-between gap-4 px-7 pt-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: cn('grid size-12 shrink-0 place-items-center rounded-2xl', TYPE_TONE[item.type]), children: _jsx(Icon, { className: "size-6" }) }), _jsxs("div", { className: "flex flex-col", children: [_jsx("h2", { className: "font-display text-[20px] font-bold leading-tight text-ink", children: item.title }), _jsx("p", { className: "text-[12.5px] text-ink-muted", children: item.subtitle })] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(NavBtn, { label: "Previous", disabled: !prev, onClick: () => prev && onSelect(prev.id), children: _jsx(ChevronLeft, { className: "size-4" }) }), _jsxs("span", { className: "px-1 text-[12px] font-semibold tabular text-ink-muted", children: [idx + 1, " / ", items.length] }), _jsx(NavBtn, { label: "Next", disabled: !next, onClick: () => next && onSelect(next.id), children: _jsx(ChevronRight, { className: "size-4" }) })] })] }), _jsxs("div", { className: "mx-7 mt-4 flex items-center justify-between gap-4 rounded-3xl bg-white/55 px-5 py-4 ring-1 ring-white/60", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: "Amount" }), _jsx(MoneyCell, { amount: item.amount, size: "xl" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold', RISK_TONE[item.risk]), children: RISK_LABEL[item.risk] }), _jsx("span", { className: cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold', item.urgent ? 'bg-danger-soft text-danger' : 'bg-white/70 text-ink-soft ring-1 ring-white/70'), children: item.deadlineText })] })] }), ownerReason ? (_jsxs("div", { className: "mx-7 mt-4 flex items-center gap-2.5 rounded-2xl bg-brand-soft/70 px-4 py-2.5 ring-1 ring-brand/15", children: [_jsx(ArrowUpFromLine, { className: "size-4 shrink-0 text-brand-ink" }), _jsxs("span", { className: "text-[12.5px] font-bold text-brand-ink", children: ["Routed up to you \u00B7 ", ownerReason] })] })) : null, _jsx("div", { className: "px-7 pt-5", children: _jsx(ApprovalChain, { item: item }) }), _jsxs("div", { className: "scrollbar-thin mt-5 flex-1 overflow-y-auto px-7", children: [track ? _jsx(TrackNote, {}) : _jsx(PolicyCheck, { item: item, block: block }), item.agentRecommendation ? (_jsxs("section", { className: "mt-4 rounded-3xl bg-gradient-to-br from-ai-soft/80 to-white/40 p-5 ring-1 ring-ai/15", children: [_jsxs("header", { className: "mb-2 flex items-center gap-2", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-xl bg-gradient-to-br from-ai to-brand text-white", children: _jsx(Sparkles, { className: "size-4" }) }), _jsx("span", { className: "text-[12px] font-bold uppercase tracking-wider text-ai", children: "Kora's recommendation" })] }), _jsx("p", { className: "text-[14px] leading-relaxed text-ink", children: item.agentRecommendation })] })) : null, _jsx("div", { className: "mt-6 flex gap-1 border-b border-white/55", children: [
                            ['summary', 'Summary'],
                            ['evidence', `Evidence (${item.evidence.length})`],
                            ['history', `History (${item.history.length})`],
                        ].map(([id, label]) => (_jsxs("button", { type: "button", onClick: () => setTab(id), className: cn('relative px-3 pb-2.5 text-[13px] font-semibold transition-colors', tab === id ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'), children: [label, tab === id ? _jsx("span", { className: "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" }) : null] }, id))) }), _jsxs("div", { className: "py-4 pb-6", children: [tab === 'summary' ? _jsx(SummaryTab, { item: item }) : null, tab === 'evidence' ? _jsx(EvidenceTab, { docs: item.evidence, context: item.title }) : null, tab === 'history' ? _jsx(HistoryTab, { events: item.history }) : null] })] }), track ? _jsx(TrackBar, { item: item, onAction: onAction }) : _jsx(ActionBar, { item: item, canApprove: canApprove, done: done, block: block, onApprove: () => onApprove(item.id), onReject: () => onReject(item.id), onAction: onAction })] }));
}
// The preparer (Finance Operator) cannot approve — they prepared it. This note
// replaces the approver's policy/SoD panel.
function TrackNote() {
    return (_jsxs("div", { className: "mt-1 flex items-start gap-3 rounded-3xl bg-info-soft/60 p-4 ring-1 ring-info/20", children: [_jsx(ShieldCheck, { className: "mt-0.5 size-5 shrink-0 text-info" }), _jsxs("div", { children: [_jsx("p", { className: "text-[13.5px] font-bold text-info", children: "You prepared this \u2014 it's with the approver" }), _jsx("p", { className: "text-[12.5px] text-ink-soft", children: "You prepare & propose; a Finance Lead signs off. You can't approve your own work (segregation of duties). Track its status below." })] })] }));
}
// Status + light follow-up actions for the preparer — never approve/reject.
function TrackBar({ item, onAction }) {
    const status = item.stage === 'approved' ? { label: 'Approved & posted', tone: 'bg-success-soft text-success' }
        : item.stage === 'rejected' ? { label: 'Sent back to you', tone: 'bg-danger-soft text-danger' }
            : item.stage === 'partial' ? { label: 'Approved 1 of 2 · awaiting final', tone: 'bg-info-soft text-info' }
                : { label: 'Awaiting Finance Lead', tone: 'bg-warning-soft text-warning' };
    const pending = item.stage === 'awaiting' || item.stage === 'partial';
    return (_jsx("footer", { className: "border-t border-white/55 bg-white/45 px-7 py-4", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("span", { className: cn('inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-bold', status.tone), children: [_jsx(Clock, { className: "size-3.5" }), " ", status.label] }), _jsx("div", { className: "flex items-center gap-2", children: pending ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => void onAction(item.id, 'withdraw'), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[13.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white/80", children: "Withdraw" }), _jsxs("button", { type: "button", onClick: () => void onAction(item.id, 'nudge'), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 text-[13.5px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Forward, { className: "size-4" }), " Nudge approver"] })] })) : item.stage === 'rejected' ? (_jsx("button", { type: "button", onClick: () => void onAction(item.id, 'resubmit'), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 text-[13.5px] font-bold text-white shadow-glass-soft hover:brightness-110", children: "Fix & resubmit" })) : (_jsxs("span", { className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-success-soft px-5 text-[14px] font-bold text-success", children: [_jsx(Check, { className: "size-[18px]" }), " Done"] })) })] }) }));
}
// ─── Policy / SoD ────────────────────────────────────────────────────────
function PolicyCheck({ item, block }) {
    if (block === 'sod' || item.isOwnItem) {
        return (_jsxs("div", { className: "mt-1 flex items-start gap-3 rounded-3xl bg-danger-soft/60 p-4 ring-1 ring-danger/20", children: [_jsx(ShieldCheck, { className: "mt-0.5 size-5 shrink-0 text-danger" }), _jsxs("div", { children: [_jsx("p", { className: "text-[13.5px] font-bold text-danger", children: "Segregation of duties \u2014 you can't approve this" }), _jsx("p", { className: "text-[12.5px] text-ink-soft", children: "You prepared this item, so another approver must sign off. You can reassign or request a colleague to approve." })] })] }));
    }
    if (block === 'needs-first') {
        return (_jsxs("div", { className: "mt-1 flex items-start gap-3 rounded-3xl bg-warning-soft/60 p-4 ring-1 ring-warning/20", children: [_jsx(Info, { className: "mt-0.5 size-5 shrink-0 text-warning" }), _jsxs("div", { children: [_jsx("p", { className: "text-[13.5px] font-bold text-warning", children: "You approve last \u2014 waiting for the first approval" }), _jsx("p", { className: "text-[12.5px] text-ink-soft", children: "As Organization Owner you give the final signature on dual-approval items. This one still needs its first approval (Finance Lead) before it reaches you." })] })] }));
    }
    if (block === 'duplicate') {
        return (_jsxs("div", { className: "mt-1 flex items-start gap-3 rounded-3xl bg-info-soft/60 p-4 ring-1 ring-info/20", children: [_jsx(Info, { className: "mt-0.5 size-5 shrink-0 text-info" }), _jsxs("div", { children: [_jsx("p", { className: "text-[13.5px] font-bold text-info", children: "You already approved this" }), _jsx("p", { className: "text-[12.5px] text-ink-soft", children: "A second, different approver is required to complete it." })] })] }));
    }
    if (!item.withinLimit) {
        return (_jsxs("div", { className: "mt-1 flex items-start gap-3 rounded-3xl bg-info-soft/60 p-4 ring-1 ring-info/20", children: [_jsx(Info, { className: "mt-0.5 size-5 shrink-0 text-info" }), _jsxs("div", { children: [_jsx("p", { className: "text-[13.5px] font-bold text-info", children: "Over your approval limit \u2014 dual approval required" }), _jsxs("p", { className: "text-[12.5px] text-ink-soft", children: ["This exceeds your", ' ', _jsx(MoneyCell, { amount: item.policyLimit, size: "sm", className: "!text-[12.5px] font-bold" }), " limit.", item.approvals.length > 0
                                    ? ` ${item.approvals[0].name} approved (1 of 2) — your approval completes it.`
                                    : ' Two approvers are required before it executes.'] })] })] }));
    }
    return (_jsxs("div", { className: "mt-1 flex items-center gap-3 rounded-3xl bg-success-soft/60 p-4 ring-1 ring-success/20", children: [_jsx(ShieldCheck, { className: "size-5 shrink-0 text-success" }), _jsxs("p", { className: "text-[13.5px] font-semibold text-success", children: ["Within your approval limit (", _jsx(MoneyCell, { amount: item.policyLimit, size: "sm", className: "!text-[13px] font-bold" }), "). You can approve this on your own."] })] }));
}
// ─── Tabs ────────────────────────────────────────────────────────────────
function SummaryTab({ item }) {
    return (_jsxs("dl", { className: "grid grid-cols-2 gap-x-6 gap-y-4 @2xl:grid-cols-3", children: [_jsx(KV, { label: "Type", value: item.type[0].toUpperCase() + item.type.slice(1) }), _jsx(KV, { label: "Prepared by", value: `${item.preparedBy.name} · ${item.preparedBy.role}` }), _jsx(KV, { label: "Prepared", value: new Date(item.preparedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }), item.confidence !== undefined ? _jsx(KV, { label: "Match confidence", value: `${item.confidence}%` }) : null, _jsx(KV, { label: "Deadline", value: item.deadlineText }), _jsx(KV, { label: "Approvals so far", value: item.requiresDualApproval ? `${item.approvals.length} of 2` : '1 required' })] }));
}
function KV({ label, value }) {
    return (_jsxs("div", { children: [_jsx("dt", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsx("dd", { className: "mt-0.5 text-[13.5px] font-semibold text-ink", children: value })] }));
}
function EvidenceTab({ docs, context }) {
    return (_jsx("ul", { className: "grid grid-cols-1 gap-2.5 @2xl:grid-cols-2", children: docs.map((d) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => openDoc({ name: d.name, kind: d.kind, sizeText: d.sizeText, pageRef: d.pageRef, context }), className: "flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/65 hover:bg-white", children: [_jsx("span", { className: "grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger", children: _jsx(FileText, { className: "size-5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: d.name }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [d.kind, " \u00B7 ", d.sizeText, d.pageRef ? ` · ${d.pageRef}` : ''] })] }), _jsx("span", { className: "rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-white/80", children: "View" })] }) }, d.id))) }));
}
function HistoryTab({ events }) {
    return (_jsx("ol", { className: "flex flex-col gap-0", children: events.map((e, i) => (_jsxs("li", { className: "flex gap-3", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: cn('mt-0.5 grid size-7 place-items-center rounded-full text-white', e.kind === 'agent' ? 'bg-gradient-to-br from-ai to-brand' : e.kind === 'user' ? 'bg-brand' : 'bg-ink/40'), children: e.kind === 'agent' ? _jsx(Sparkles, { className: "size-3.5" }) : _jsx(Check, { className: "size-3.5" }) }), i < events.length - 1 ? _jsx("span", { className: "my-1 w-px flex-1 bg-ink/10" }) : null] }), _jsxs("div", { className: "pb-4", children: [_jsx("p", { className: "text-[13px] font-semibold text-ink", children: e.action }), _jsxs("p", { className: "text-[11.5px] text-ink-muted", children: [e.actor, " \u00B7 ", e.actorRole, " \u00B7 ", new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })] })] })] }, e.id))) }));
}
// ─── Action bar ────────────────────────────────────────────────────────────
function ActionBar({ item, canApprove, done, block, onApprove, onReject, onAction }) {
    const approveLabel = item.requiresDualApproval
        ? item.approvals.length === 0
            ? 'Approve (1 of 2)'
            : 'Approve & post (final)'
        : 'Approve & post';
    const blockedSub = block === 'needs-first'
        ? 'waiting for first approval'
        : block === 'duplicate'
            ? 'you already approved'
            : 'segregation of duties';
    const statusLabel = item.stage === 'approved' ? 'Approved ✓' : item.stage === 'rejected' ? 'Rejected' : null;
    return (_jsx("footer", { className: "border-t border-white/55 bg-white/45 px-7 py-4", children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("span", { className: "inline-flex items-center gap-2 rounded-xl bg-white/55 px-3 py-2 text-[12px] font-semibold text-ink-muted ring-1 ring-white/60", children: [_jsx(ShieldCheck, { className: "size-3.5" }), " Every decision is logged to the audit trail"] }), _jsx("div", { className: "flex flex-wrap items-center gap-2", children: done ? (_jsxs("span", { className: cn('inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-[14px] font-bold', item.stage === 'approved' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'), children: [_jsx(Check, { className: "size-[18px]" }), " ", statusLabel] })) : (_jsxs(_Fragment, { children: [_jsx(MoreMenu, { approvalID: item.id, onAction: onAction }), _jsxs("button", { type: "button", onClick: () => void onReject(), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[13.5px] font-bold text-danger ring-1 ring-danger/25 transition-colors hover:bg-danger-soft", children: [_jsx(X, { className: "size-4" }), " Reject"] }), _jsxs("button", { type: "button", disabled: !canApprove, onClick: () => void onApprove(), className: cn('inline-flex h-11 items-center gap-2.5 rounded-2xl px-5 text-[14px] font-bold transition-all', canApprove
                                    ? 'bg-gradient-to-br from-success to-[#0e7a5b] text-white shadow-[0_8px_22px_rgba(22,163,123,0.45)] hover:brightness-110'
                                    : 'cursor-not-allowed bg-ink/15 text-ink-muted'), children: [_jsx(Check, { className: "size-[18px]" }), _jsxs("span", { className: "flex flex-col items-start leading-none", children: [_jsx("span", { children: canApprove ? approveLabel : 'Approval blocked' }), _jsx("span", { className: cn('text-[10px] font-medium', canApprove ? 'text-white/85' : 'text-ink-muted'), children: canApprove ? 'executes + writes to audit log' : blockedSub })] })] })] })) })] }) }));
}
function MoreMenu({ approvalID, onAction }) {
    const items = [
        { label: 'Request more info', icon: MessageSquareWarning, action: 'request-info' },
        { label: 'Reassign approver', icon: UserPlus, action: 'reassign' },
        { label: 'Escalate to Owner', icon: Forward, action: 'escalate' },
    ];
    return (_jsxs(DropdownMenu.Root, { children: [_jsx(DropdownMenu.Trigger, { asChild: true, children: _jsxs("button", { type: "button", className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-white/65 px-4 text-[13.5px] font-bold text-ink-soft ring-1 ring-white/70 transition-colors hover:bg-white hover:text-ink", children: [_jsx(MoreHorizontal, { className: "size-4" }), " More ", _jsx(ChevronDown, { className: "size-3.5" })] }) }), _jsx(DropdownMenu.Portal, { children: _jsx(DropdownMenu.Content, { side: "top", align: "end", sideOffset: 8, className: "z-50 flex w-56 flex-col gap-0.5 rounded-2xl border border-glass-border-strong bg-glass-strong p-1.5 shadow-glass-lg backdrop-blur-glass-lg", children: items.map((it) => (_jsxs(DropdownMenu.Item, { onSelect: () => void onAction(approvalID, it.action), className: "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-ink-soft outline-none transition-colors hover:bg-white/80 hover:text-ink", children: [_jsx(it.icon, { className: "size-4" }), " ", it.label] }, it.label))) }) })] }));
}
function NavBtn({ label, disabled, onClick, children }) {
    return (_jsx("button", { type: "button", "aria-label": label, title: label, disabled: disabled, onClick: onClick, className: "grid size-9 place-items-center rounded-xl bg-white/60 text-ink-soft ring-1 ring-white/70 transition-colors hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-40", children: children }));
}
