import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, CheckCircle2, FileWarning, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { fetchControlsClose, lockClosePeriod, requestEvidenceGap, toggleCloseTask } from '../../api/governanceOps';
import { DateRangePill, PageHeader } from '../../app/shell';
import { GlassSurface, ProgressRing, cn } from '../../design-system';
import { seedCloseTasks, seedControlChecks, seedEvidenceGaps } from '../../seed/financeLeadClose';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
export function ControlsClose() {
    const token = useSessionStore((s) => s.session?.token ?? '');
    const apiBaseUrl = getApiBaseUrl();
    const [tasks, setTasks] = useState(seedCloseTasks);
    const [evidenceGaps, setEvidenceGaps] = useState(seedEvidenceGaps);
    const [controlChecks, setControlChecks] = useState(seedControlChecks);
    const done = tasks.filter((t) => t.done).length;
    const pct = done / tasks.length;
    const allDone = done === tasks.length - 1;
    useEffect(() => {
        if (!token)
            return;
        const controller = new AbortController();
        fetchControlsClose(apiBaseUrl, token, controller.signal)
            .then((payload) => {
            setTasks(payload.tasks);
            setEvidenceGaps(payload.evidenceGaps);
            setControlChecks(payload.controlChecks);
        })
            .catch((error) => {
            if (!controller.signal.aborted) {
                toast({ tone: 'warning', title: 'Controls unavailable', body: error instanceof Error ? error.message : 'Could not load controls-close state.' });
            }
        });
        return () => controller.abort();
    }, [apiBaseUrl, token]);
    const toggle = async (id) => {
        const task = tasks.find((item) => item.id === id);
        if (task?.blocked) {
            toast({ tone: 'warning', title: 'Blocked', body: task.note ?? 'This task is blocked.' });
            return;
        }
        if (!token) {
            setTasks((items) => items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
            return;
        }
        const payload = await toggleCloseTask(apiBaseUrl, token, id);
        setTasks(payload.tasks);
        setEvidenceGaps(payload.evidenceGaps);
        setControlChecks(payload.controlChecks);
    };
    const requestGap = async (gap) => {
        if (token) {
            const payload = await requestEvidenceGap(apiBaseUrl, token, gap.id);
            setTasks(payload.tasks);
            setEvidenceGaps(payload.evidenceGaps);
            setControlChecks(payload.controlChecks);
        }
        toast({ tone: 'info', title: 'Document requested', body: `Asked ${gap.party} for support on ${gap.reference}.` });
    };
    const lockPeriod = async () => {
        if (token) {
            const payload = await lockClosePeriod(apiBaseUrl, token);
            setTasks(payload.tasks);
            setEvidenceGaps(payload.evidenceGaps);
            setControlChecks(payload.controlChecks);
        }
        toast({ tone: 'success', title: 'Period locked', body: 'May 2025 is closed and locked. Postings are now read-only.' });
    };
    const grouped = useMemo(() => {
        const map = new Map();
        for (const task of tasks) {
            const items = map.get(task.area) ?? [];
            items.push(task);
            map.set(task.area, items);
        }
        return [...map.entries()];
    }, [tasks]);
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsx(PageHeader, { title: "Controls & Close", subtitle: "Run the month-end close and keep controls green. Clear exceptions, chase evidence, then lock the period.", right: _jsx(DateRangePill, { label: "May 2025 close \u00B7 due in 3 days" }) }), _jsxs("div", { className: "@container flex min-h-0 flex-1 flex-col gap-4 px-8 pb-6", children: [_jsxs("section", { className: "grid grid-cols-1 gap-4 @3xl:grid-cols-[auto_1fr]", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex items-center gap-5 p-5", children: [_jsx(ProgressRing, { value: pct, size: 104, thickness: 11, color: "#4361ee", children: _jsxs("div", { className: "flex flex-col", children: [_jsxs("span", { className: "font-display text-xl font-bold text-ink tabular", children: [done, "/", tasks.length] }), _jsx("span", { className: "text-[9.5px] font-semibold uppercase tracking-wider text-ink-muted", children: "tasks" })] }) }), _jsxs("div", { children: [_jsxs("p", { className: "font-display text-[15px] font-bold text-ink", children: ["May close ", Math.round(pct * 100), "% complete"] }), _jsxs("p", { className: "text-[12px] text-ink-muted", children: [tasks.length - done, " tasks remaining \u00B7 ", tasks.filter((task) => task.blocked).length, " blocked"] }), _jsxs("button", { type: "button", disabled: !allDone, onClick: () => void lockPeriod(), className: cn('mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[12px] font-bold', allDone ? 'bg-gradient-to-br from-brand to-brand-ink text-white shadow-glass-soft hover:brightness-110' : 'cursor-not-allowed bg-white/50 text-ink-muted ring-1 ring-white/60'), children: [_jsx(Lock, { className: "size-3.5" }), " Lock the period"] })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsx(MiniMetric, { label: "Exceptions to clear", value: "2", tone: "text-danger", icon: _jsx(AlertTriangle, { className: "size-4" }) }), _jsx(MiniMetric, { label: "Evidence gaps", value: String(evidenceGaps.length), tone: "text-warning", icon: _jsx(FileWarning, { className: "size-4" }) }), _jsx(MiniMetric, { label: "Controls passing", value: `${controlChecks.filter((item) => item.ok).length}/${controlChecks.length}`, tone: "text-success", icon: _jsx(ShieldCheck, { className: "size-4" }) })] })] }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-5 @5xl:grid-cols-[1fr_320px]", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex min-h-0 flex-col p-5", children: [_jsx("h3", { className: "mb-3 font-display text-base font-bold text-ink", children: "Month-end close checklist" }), _jsx("div", { className: "scrollbar-thin -mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1", children: grouped.map(([area, items]) => (_jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: area }), _jsx("ul", { className: "flex flex-col gap-1.5", children: items.map((task) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => void toggle(task.id), className: cn('flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition-colors', task.done ? 'bg-success-soft/40 ring-success/15' : task.blocked ? 'bg-danger-soft/30 ring-danger/15' : 'bg-white/55 ring-white/60 hover:bg-white'), children: [task.done ? _jsx(CheckCircle2, { className: "size-5 shrink-0 text-success" }) : task.blocked ? _jsx(XCircle, { className: "size-5 shrink-0 text-danger" }) : _jsx("span", { className: "size-5 shrink-0 rounded-full border-2 border-ink/25" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: cn('text-[13px] font-semibold', task.done ? 'text-ink-soft line-through' : 'text-ink'), children: task.label }), _jsxs("p", { className: "text-[11px] text-ink-muted", children: [task.owner, task.note ? ` · ${task.note}` : ''] })] }), task.blocked ? _jsx("span", { className: "shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase text-danger", children: "blocked" }) : null] }) }, task.id))) })] }, area))) })] }), _jsxs("div", { className: "flex min-h-0 flex-col gap-4", children: [_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2.5 p-5", children: [_jsxs("header", { className: "flex items-center gap-1.5", children: [_jsx(FileWarning, { className: "size-3.5 text-warning" }), _jsx("h4", { className: "text-[12.5px] font-bold text-ink", children: "Evidence to chase" })] }), evidenceGaps.map((gap) => (_jsxs("div", { className: "flex items-center gap-2 rounded-xl bg-white/55 p-2.5 ring-1 ring-white/60", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12px] font-bold text-ink", children: gap.party }), _jsxs("p", { className: "font-mono text-[10.5px] text-ink-muted", children: [gap.reference, " \u00B7 ", gap.amount, " \u00B7 ", gap.age] })] }), _jsx("button", { type: "button", onClick: () => void requestGap(gap), className: "shrink-0 rounded-lg bg-brand px-2 py-1 text-[10.5px] font-bold text-white hover:brightness-110", children: "Request" })] }, gap.id)))] }), _jsxs(GlassSurface, { tone: "strong", className: "flex min-h-0 flex-col gap-2.5 p-5", children: [_jsxs("header", { className: "flex items-center gap-1.5", children: [_jsx(ShieldCheck, { className: "size-3.5 text-success" }), _jsx("h4", { className: "text-[12.5px] font-bold text-ink", children: "Control checks" })] }), _jsx("ul", { className: "scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto", children: controlChecks.map((check) => (_jsxs("li", { className: "flex items-start gap-2.5 rounded-xl bg-white/55 p-2.5 ring-1 ring-white/60", children: [check.ok ? _jsx(CheckCircle2, { className: "mt-0.5 size-4 shrink-0 text-success" }) : _jsx(XCircle, { className: "mt-0.5 size-4 shrink-0 text-danger" }), _jsxs("div", { children: [_jsx("p", { className: "text-[12px] font-bold text-ink", children: check.label }), _jsx("p", { className: "text-[10.5px] text-ink-muted", children: check.detail })] })] }, check.id))) })] })] })] })] })] }));
}
function MiniMetric({ label, value, tone, icon }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex items-center gap-3 p-4", children: [_jsx("span", { className: cn('grid size-10 place-items-center rounded-xl bg-white/70 ring-1 ring-white/60', tone), children: icon }), _jsxs("div", { children: [_jsx("span", { className: cn('block font-display text-2xl font-bold tabular leading-none', tone), children: value }), _jsx("span", { className: "text-[11px] font-semibold text-ink-muted", children: label })] })] }));
}
