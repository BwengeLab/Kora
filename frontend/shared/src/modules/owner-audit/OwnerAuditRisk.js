import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, ArrowRight, CheckCircle2, Download, FileText, ShieldCheck, TrendingDown, TrendingUp, UserPlus, X, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { acceptRisk, assignRisk, fetchOwnerRiskDashboard, mitigateRisk } from '../../api/governanceOps';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, MoneyCell, ProgressRing, cn } from '../../design-system';
import { openDoc } from '../../state/docViewerStore';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { useWorkflowStore } from '../../state/workflowStore';
import { seedBusinessRisks, seedCompliance, seedControlPosture } from '../../seed/ownerRisk';
const SEV_TONE = { low: 'bg-success-soft text-success', medium: 'bg-warning-soft text-warning', high: 'bg-danger-soft text-danger' };
export function OwnerAuditRisk() {
    const token = useSessionStore((s) => s.session?.token ?? '');
    const apiBaseUrl = getApiBaseUrl();
    const [controlPosture, setControlPosture] = useState(seedControlPosture);
    const [risks, setRisks] = useState(seedBusinessRisks);
    const [compliance, setCompliance] = useState(seedCompliance);
    const [selectedRiskID, setSelectedRiskID] = useState(null);
    useEffect(() => {
        if (!token)
            return;
        const controller = new AbortController();
        fetchOwnerRiskDashboard(apiBaseUrl, token, controller.signal)
            .then((payload) => {
            setControlPosture(payload.controlPosture);
            setRisks(payload.risks);
            setCompliance(payload.compliance);
        })
            .catch((error) => {
            if (!controller.signal.aborted) {
                toast({ tone: 'warning', title: 'Risk dashboard unavailable', body: error instanceof Error ? error.message : 'Could not load owner risk data.' });
            }
        });
        return () => controller.abort();
    }, [apiBaseUrl, token]);
    const selectedRisk = selectedRiskID ? risks.find((item) => item.id === selectedRiskID) ?? null : null;
    const syncRiskPayload = (payload) => {
        setControlPosture(payload.controlPosture);
        setRisks(payload.risks);
        setCompliance(payload.compliance);
    };
    const handleAssign = async (risk) => {
        if (token) {
            syncRiskPayload(await assignRisk(apiBaseUrl, token, risk.id));
        }
        toast({ tone: 'info', title: 'Assigned', body: `${risk.title} assigned to ${risk.owner} with a due date.` });
    };
    const handleMitigate = async (risk) => {
        if (token) {
            syncRiskPayload(await mitigateRisk(apiBaseUrl, token, risk.id));
        }
        else {
            setRisks((items) => items.map((item) => (item.id === risk.id ? { ...item, status: 'mitigating' } : item)));
        }
        toast({ tone: 'success', title: 'Mitigation tracked', body: `${risk.title} is now tracked to closure.` });
        setSelectedRiskID(null);
    };
    const handleAccept = async (risk) => {
        if (token) {
            syncRiskPayload(await acceptRisk(apiBaseUrl, token, risk.id));
        }
        else {
            setRisks((items) => items.map((item) => (item.id === risk.id ? { ...item, status: 'accepted' } : item)));
            setControlPosture((current) => ({ ...current, openRisks: Math.max(0, current.openRisks - 1) }));
        }
        toast({ tone: 'warning', title: 'Risk accepted', body: `${risk.title} accepted and logged with your sign-off.` });
        setSelectedRiskID(null);
    };
    return (_jsxs("div", { className: "flex flex-col", children: [_jsx(PageHeader, { title: "Audit & Risk", subtitle: _jsx(_Fragment, { children: "Your control posture, the top risks to act on, and a live trail of every sensitive action." }), right: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsxs("button", { type: "button", onClick: () => toast({ tone: 'info', title: 'Exporting', body: 'Board risk pack (PDF) is being prepared.' }), className: "inline-flex h-11 items-center gap-2 rounded-2xl bg-glass-strong px-4 text-[13px] font-semibold text-ink-soft ring-1 ring-white/70 backdrop-blur-glass hover:bg-white hover:text-ink", children: [_jsx(Download, { className: "size-4" }), " Board risk pack"] }), _jsx(DateRangePill, { label: "May 2025" })] }) }), _jsxs("div", { className: "@container flex flex-col gap-6 px-8 pb-8", children: [_jsxs("section", { className: "grid grid-cols-1 items-stretch gap-5 @5xl:grid-cols-12", children: [_jsx("div", { className: "@5xl:col-span-5", children: _jsx(ControlPostureCard, { posture: controlPosture }) }), _jsx("div", { className: "@5xl:col-span-7", children: _jsx(ComplianceCard, { items: compliance }) })] }), _jsxs("section", { className: "grid grid-cols-1 items-start gap-5 @5xl:grid-cols-12", children: [_jsx("div", { className: "@5xl:col-span-7", children: _jsx(TopRisksCard, { risks: risks, onOpen: (risk) => setSelectedRiskID(risk.id) }) }), _jsx("div", { className: "@5xl:col-span-5", children: _jsx(SensitiveActionsCard, {}) })] })] }), _jsx(RiskDrawer, { risk: selectedRisk, status: selectedRisk?.status ?? 'open', onClose: () => setSelectedRiskID(null), onAssign: handleAssign, onMitigate: handleMitigate, onAccept: handleAccept })] }));
}
function ControlPostureCard({ posture }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full items-center gap-5 p-6", children: [_jsx(ProgressRing, { value: posture.controlHealth / 100, size: 128, thickness: 13, color: "#16a37b", children: _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "font-display text-2xl font-bold text-ink tabular", children: posture.controlHealth }), _jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-ink-muted", children: "control" })] }) }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("span", { className: "inline-flex w-fit items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success", children: ["\u25B2 ", posture.controlTrend, " pts vs last month"] }), _jsxs("div", { children: [_jsx("span", { className: "text-[12px] font-semibold text-ink-muted", children: "Overall risk" }), _jsx("p", { className: "font-display text-xl font-bold text-ink", children: posture.riskScore })] }), _jsxs("span", { className: "inline-flex w-fit items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning", children: [_jsx(AlertTriangle, { className: "size-3.5" }), " ", posture.openRisks, " open risks to review"] })] })] }));
}
function ComplianceCard({ items }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center gap-2", children: [_jsx("span", { className: "grid size-7 place-items-center rounded-xl bg-success-soft text-success", children: _jsx(ShieldCheck, { className: "size-4" }) }), _jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Compliance posture" })] }), _jsx("ul", { className: "grid grid-cols-1 gap-2 @2xl:grid-cols-2", children: items.map((item) => _jsx(ComplianceRow, { c: item }, item.id)) })] }));
}
function ComplianceRow({ c }) {
    const onClick = () => c.ok
        ? toast({ tone: 'success', title: c.label, body: `${c.note}. Control is operating effectively.` })
        : toast({ tone: 'warning', title: c.label, body: `${c.note}. Document requests sent to Finance to close the gap.` });
    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: onClick, className: "flex w-full items-start gap-2.5 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 transition-colors hover:bg-white", children: [c.ok ? _jsx(CheckCircle2, { className: "mt-0.5 size-4 shrink-0 text-success" }) : _jsx(XCircle, { className: "mt-0.5 size-4 shrink-0 text-danger" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-[12.5px] font-bold text-ink", children: c.label }), _jsx("p", { className: "text-[11px] text-ink-muted", children: c.note })] }), !c.ok ? _jsx("span", { className: "shrink-0 rounded-lg bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger", children: "Fix \u2192" }) : null] }) }));
}
function TopRisksCard({ risks, onOpen }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Top risks to act on" }), _jsx("span", { className: "text-xs font-semibold text-ink-muted", children: risks.length })] }), _jsx("ul", { className: "flex flex-col gap-2.5", children: risks.map((risk) => {
                    const status = risk.status ?? 'open';
                    const Trend = risk.trend === 'up' ? TrendingUp : risk.trend === 'down' ? TrendingDown : null;
                    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => onOpen(risk), className: "w-full rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 transition-colors hover:bg-white", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', SEV_TONE[risk.severity]), children: risk.severity }), _jsx("p", { className: "flex-1 truncate text-[13.5px] font-bold text-ink", children: risk.title }), status !== 'open' ? _jsx("span", { className: cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', status === 'accepted' ? 'bg-ink/10 text-ink-muted' : 'bg-info-soft text-info'), children: status }) : null, Trend ? _jsx(Trend, { className: cn('size-3.5', risk.trend === 'up' ? 'text-danger' : 'text-success') }) : null, _jsx("span", { className: "text-[10.5px] font-semibold text-ink-muted", children: risk.category })] }), _jsx("p", { className: "mt-1 text-[12px] text-ink-soft", children: risk.detail }), _jsxs("p", { className: "mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-brand", children: [_jsx(ArrowRight, { className: "size-3.5" }), " ", risk.recommendation] })] }) }, risk.id));
                }) })] }));
}
function SensitiveActionsCard() {
    const auditLog = useWorkflowStore((s) => s.auditLog);
    const all = useMemo(() => auditLog.filter((e) => e.kind === 'approval' || e.kind === 'posting' || e.kind === 'config' || e.kind === 'consent'), [auditLog]);
    const [expanded, setExpanded] = useState(false);
    const shown = expanded ? all : all.slice(0, 7);
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex h-full min-h-0 flex-col gap-3 p-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "font-display text-base font-bold text-ink", children: "Sensitive actions" }), all.length > 7 ? _jsx("button", { type: "button", onClick: () => setExpanded((value) => !value), className: "text-xs font-semibold text-brand hover:text-brand-ink", children: expanded ? 'Show fewer' : `Show all ${all.length}` }) : null] }), _jsxs("ul", { className: "scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5", children: [shown.map((event) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => toast({ tone: 'info', title: event.action, body: `${event.actor} · ${event.role} · ${event.target ?? ''} · ${new Date(event.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` }), className: "flex w-full items-start gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 transition-colors hover:bg-white", children: [_jsx("span", { className: "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-ink/5 text-ink-soft", children: _jsx(ShieldCheck, { className: "size-3.5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12.5px] font-semibold text-ink", children: event.action }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [event.actor, " \u00B7 ", event.role, " \u00B7 ", new Date(event.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })] })] }), event.amount ? _jsx(MoneyCell, { amount: event.amount, size: "sm", className: "shrink-0 font-bold !text-[12px]" }) : null] }) }, event.id))), shown.length === 0 ? _jsx("li", { className: "grid place-items-center py-10 text-[12.5px] text-ink-muted", children: "No sensitive actions yet." }) : null] })] }));
}
function RiskDrawer({ risk, status, onClose, onAssign, onMitigate, onAccept }) {
    const item = risk;
    return (_jsx(Dialog.Root, { open: item !== null, onOpenChange: (open) => !open && onClose(), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsx(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: item ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-start justify-between gap-3 border-b border-white/55 px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: cn('grid size-11 place-items-center rounded-2xl', SEV_TONE[item.severity]), children: _jsx(AlertTriangle, { className: "size-5" }) }), _jsxs("div", { children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: item.title }), _jsxs("p", { className: "text-[11.5px] text-ink-muted", children: [item.category, " risk"] })] })] }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', SEV_TONE[item.severity]), children: [item.severity, " severity"] }), _jsxs("span", { className: "rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-soft ring-1 ring-white/60", children: ["Likelihood: ", item.likelihood] }), status !== 'open' ? _jsx("span", { className: cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', status === 'accepted' ? 'bg-ink/10 text-ink-muted' : 'bg-info-soft text-info'), children: status }) : null] }), _jsxs(GlassSurface, { noBlur: true, tone: "subtle", className: "bg-white/60 p-4", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "What's happening" }), _jsx("p", { className: "mt-1 text-[13.5px] text-ink", children: item.detail })] }), _jsxs("div", { className: "rounded-2xl bg-brand-soft/50 p-4 ring-1 ring-brand/15", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-brand-ink", children: "Recommended action" }), _jsx("p", { className: "mt-1 text-[13px] font-semibold text-ink", children: item.recommendation })] }), _jsxs("dl", { className: "grid grid-cols-2 gap-3", children: [_jsx(Meta, { label: "Potential impact", value: item.impact }), _jsx(Meta, { label: "Risk owner", value: item.owner })] }), _jsxs("button", { type: "button", onClick: () => openDoc({ name: item.evidenceName, kind: 'report', sizeText: '—', context: item.title }), className: "flex w-full items-center gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger", children: _jsx(FileText, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12.5px] font-semibold text-ink", children: item.evidenceName }), _jsx("p", { className: "text-[11px] text-ink-muted", children: "Supporting analysis" })] }), _jsx("span", { className: "rounded-lg bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-brand ring-1 ring-white/70", children: "View" })] })] }), _jsxs("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: [_jsx("button", { type: "button", onClick: () => void onAccept(item), className: "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white", children: "Accept risk" }), _jsxs("button", { type: "button", onClick: () => void onAssign(item), className: "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3.5 text-[12.5px] font-bold text-ink ring-1 ring-white/70 hover:bg-white", children: [_jsx(UserPlus, { className: "size-4" }), " Assign"] }), _jsx("button", { type: "button", onClick: () => void onMitigate(item), className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: "Track mitigation" })] })] })) : null })] }) }));
}
function Meta({ label, value }) {
    return _jsxs("div", { children: [_jsx("dt", { className: "text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: label }), _jsx("dd", { className: "text-[13px] font-semibold text-ink", children: value })] });
}
