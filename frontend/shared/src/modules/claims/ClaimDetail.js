import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, FileText, Forward, Lock, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { GlassSurface, MoneyCell, PartyAvatar, cn } from '../../design-system';
import { useSession } from '../../auth/hooks';
import { CLAIM_STAGES } from '../../seed/claims';
import { useClaimsStore } from '../../state/claimsStore';
import { openDoc } from '../../state/docViewerStore';
import { toast } from '../../state/toastStore';
import { ClaimsAgentPanel } from './ClaimsAgentPanel';
import { SEVERITY_TONE, TYPE_ICON, TYPE_TONE } from './claimMeta';
const STAGE_ORDER = ['fnol', 'triage', 'adjusting', 'approval', 'settlement', 'closed'];
const SETTLE_LIMIT = 10000000n; // $100,000 in minor units → above this needs dual approval
export function ClaimDetail({ claimId }) {
    const claim = useClaimsStore((s) => s.claims.find((c) => c.id === claimId));
    const advance = useClaimsStore((s) => s.advance);
    const referSIU = useClaimsStore((s) => s.referSIU);
    const session = useSession();
    const Icon = useMemo(() => (claim ? TYPE_ICON[claim.type] : FileText), [claim]);
    if (!claim)
        return _jsx(GlassSurface, { tone: "strong", className: "grid h-full place-items-center text-ink-muted", children: "Select a claim" });
    const stageIdx = STAGE_ORDER.indexOf(claim.stage);
    const overLimit = claim.suggestedSettlement.amountMinor > SETTLE_LIMIT;
    const doAdvance = () => {
        const next = advance(claim.id);
        if (next) {
            const labels = {
                fnol: 'FNOL', triage: 'Triage', adjusting: 'Adjusting', approval: 'Approval', settlement: 'Settlement', closed: 'Closed',
            };
            toast({ tone: next === 'closed' ? 'success' : 'info', title: `Moved to ${labels[next]}`, body: `${claim.claimant} · ${claim.id}` });
        }
    };
    // The primary action label depends on the current stage.
    const primary = {
        fnol: { label: 'Register & triage', sub: 'validate policy → triage' },
        triage: { label: 'Accept AI triage', sub: claim.triageFastTrack ? 'fast-track → adjusting' : '→ adjusting' },
        adjusting: { label: 'Recommend settlement', sub: '→ approval' },
        approval: { label: overLimit ? 'Approve & settle (dual)' : 'Approve & settle', sub: overLimit ? 'over limit → 2 approvers' : '→ settlement' },
        settlement: { label: 'Confirm payment & close', sub: 'reconcile → closed' },
        closed: null,
    };
    const p = primary[claim.stage];
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col", children: [_jsxs("header", { className: "flex items-center gap-3 px-7 pt-6", children: [_jsx(PartyAvatar, { name: claim.claimant, size: "lg" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "truncate font-display text-[19px] font-bold text-ink", children: claim.claimant }), _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_TONE[claim.triageSeverity]), children: claim.triageSeverity })] }), _jsxs("p", { className: "text-[12.5px] text-ink-muted", children: [claim.id, " \u00B7 ", claim.policyNumber, " \u00B7 reported ", new Date(claim.reportedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] })] }), _jsx("span", { className: cn('grid size-11 shrink-0 place-items-center rounded-2xl', TYPE_TONE[claim.type]), children: _jsx(Icon, { className: "size-5" }) })] }), _jsx("div", { className: "px-7 pt-5", children: _jsx("ol", { className: "flex items-center gap-1", children: CLAIM_STAGES.map((st, i) => {
                        const done = i < stageIdx;
                        const current = i === stageIdx;
                        return (_jsxs("li", { className: "flex flex-1 items-center gap-1", children: [_jsxs("div", { className: cn('flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5', current ? 'border-brand/30 bg-brand-soft/70' : done ? 'border-success/20 bg-success-soft/50' : 'border-white/60 bg-white/35'), children: [_jsx("span", { className: cn('grid size-5 shrink-0 place-items-center rounded text-[10px] font-bold', done ? 'bg-success text-white' : current ? 'bg-brand text-white' : 'bg-white/70 text-ink-muted'), children: done ? _jsx(Check, { className: "size-3" }) : i + 1 }), _jsx("span", { className: cn('truncate text-[11px] font-bold', current ? 'text-brand-ink' : done ? 'text-success' : 'text-ink-muted'), children: st.label })] }), i < CLAIM_STAGES.length - 1 ? _jsx("span", { className: cn('h-0.5 w-2 shrink-0 rounded-full', done ? 'bg-success/40' : 'bg-ink/10') }) : null] }, st.id));
                    }) }) }), _jsxs("div", { className: "scrollbar-thin mt-5 flex-1 space-y-5 overflow-y-auto px-7 pb-6", children: [_jsx(ClaimsAgentPanel, { claim: claim }), _jsxs("section", { className: "grid grid-cols-2 gap-3 @2xl:grid-cols-4", children: [_jsx(Amount, { label: "Claimed", money: claim.claimedAmount }), _jsx(Amount, { label: "Deductible", money: claim.deductible }), _jsx(Amount, { label: "Reserve", money: claim.reserve }), _jsx(Amount, { label: "Recommended", money: claim.suggestedSettlement, highlight: true })] }), _jsxs("section", { className: "flex flex-wrap gap-3", children: [_jsx(Status, { ok: claim.coverageOk, okText: "Coverage confirmed", badText: "Coverage in question" }), claim.paymentReconciled !== null ? (_jsx(Status, { ok: claim.paymentReconciled, okText: "Payment reconciled to bank", badText: "Payment reconciling\u2026" })) : null] }), _jsxs("section", { children: [_jsxs("h4", { className: "mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: ["Evidence (", claim.evidence.length, ")"] }), _jsx("ul", { className: "grid grid-cols-1 gap-2 @2xl:grid-cols-2", children: claim.evidence.map((d) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => openDoc({ name: d.name, kind: d.kind, sizeText: d.sizeText, context: `${claim.id} · ${claim.claimant}` }), className: "flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger", children: _jsx(FileText, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12.5px] font-semibold text-ink", children: d.name }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [d.kind, " \u00B7 ", d.sizeText] })] }), _jsx("span", { className: "rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70", children: "View" })] }) }, d.id))) })] })] }), _jsxs("footer", { className: "flex flex-wrap items-center justify-between gap-3 border-t border-white/55 bg-white/45 px-7 py-4", children: [_jsxs("span", { className: "inline-flex items-center gap-2 rounded-xl bg-white/55 px-3 py-2 text-[11.5px] font-semibold text-ink-muted ring-1 ring-white/60", children: [_jsx(Lock, { className: "size-3.5" }), " Settlement is approval-gated \u00B7 every step audited"] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [claim.fraudScore >= 70 ? (_jsxs("button", { type: "button", onClick: () => { referSIU(claim.id); toast({ tone: 'danger', title: 'Referred to SIU', body: `${claim.id} flagged for fraud investigation.` }); }, className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[13.5px] font-bold text-danger ring-1 ring-danger/25 hover:bg-danger-soft", children: [_jsx(ShieldAlert, { className: "size-4" }), " Refer to SIU"] })) : null, _jsxs("button", { type: "button", onClick: () => toast({ tone: 'info', title: 'Documents requested', body: 'Request sent to the claimant.' }), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-white/65 px-4 text-[13.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink", children: [_jsx(Forward, { className: "size-4" }), " Request docs"] }), p ? (_jsxs("button", { type: "button", onClick: doAdvance, className: "inline-flex h-11 items-center gap-2.5 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 text-[14px] font-bold text-white shadow-[0_8px_22px_rgba(67,97,238,0.45)] hover:brightness-110", children: [_jsx(Check, { className: "size-[18px] shrink-0" }), _jsxs("span", { className: "flex flex-col items-start leading-none", children: [_jsx("span", { children: p.label }), _jsx("span", { className: "text-[10px] font-medium text-white/85", children: p.sub })] })] })) : (_jsxs("span", { className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-success-soft px-5 text-[14px] font-bold text-success", children: [_jsx(Check, { className: "size-[18px]" }), " Closed"] }))] })] })] }));
}
function Amount({ label, money, highlight }) {
    return (_jsxs("div", { className: cn('rounded-2xl p-3.5 ring-1', highlight ? 'bg-brand-soft/60 ring-brand/20' : 'bg-white/55 ring-white/60'), children: [_jsx("p", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsx(MoneyCell, { amount: money, size: "lg", className: cn('!text-lg', highlight && 'text-brand-ink') })] }));
}
function Status({ ok, okText, badText }) {
    return (_jsxs("span", { className: cn('inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-bold', ok ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'), children: [_jsx(Check, { className: "size-3.5" }), " ", ok ? okText : badText] }));
}
