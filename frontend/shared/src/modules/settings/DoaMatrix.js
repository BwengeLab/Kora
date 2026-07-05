import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Pencil, Plus, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { createApprovalRule, deleteApprovalRule, fetchApprovalRules, updateApprovalRule } from '../../api/settingsAccess';
import { cn } from '../../design-system';
import { entityName, seedEntities } from '../../seed/entities';
import { APPROVER_ROLES, RULE_CATEGORIES, fmtBand } from '../../seed/approvalPolicy';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { SettingsCard } from './primitives';
const blankRule = () => ({ id: `r-${Date.now()}`, label: 'New rule', scope: 'all', category: 'all', minAmount: 0, maxAmount: null, approvers: ['Finance Lead'], requireEvidence: true });
export function DoaMatrix() {
    const token = useSessionStore((s) => s.session?.token ?? '');
    const apiBaseUrl = getApiBaseUrl();
    const [rules, setRules] = useState([]);
    const [editing, setEditing] = useState(null);
    const [isNew, setIsNew] = useState(false);
    useEffect(() => {
        if (!token)
            return;
        const controller = new AbortController();
        fetchApprovalRules(apiBaseUrl, token, controller.signal)
            .then(setRules)
            .catch((error) => {
            if (!controller.signal.aborted) {
                toast({ tone: 'warning', title: 'Rules unavailable', body: error instanceof Error ? error.message : 'Could not load approval rules.' });
            }
        });
        return () => controller.abort();
    }, [apiBaseUrl, token]);
    const openNew = () => { setEditing(blankRule()); setIsNew(true); };
    const openEdit = (rule) => { setEditing(rule); setIsNew(false); };
    const save = async (rule) => {
        try {
            const items = token
                ? isNew
                    ? await createApprovalRule(apiBaseUrl, token, rule)
                    : await updateApprovalRule(apiBaseUrl, token, rule)
                : isNew
                    ? [...rules, rule]
                    : rules.map((item) => (item.id === rule.id ? rule : item));
            setRules(items);
            setEditing(null);
            toast({ tone: 'success', title: isNew ? 'Rule added' : 'Rule saved', body: `"${rule.label}" is now active in the approval matrix.` });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Rule save failed', body: error instanceof Error ? error.message : 'Could not save approval rule.' });
        }
    };
    const remove = async (id, label) => {
        try {
            const items = token ? await deleteApprovalRule(apiBaseUrl, token, id) : rules.filter((rule) => rule.id !== id);
            setRules(items);
            toast({ tone: 'warning', title: 'Rule removed', body: `"${label}" deleted from the matrix.` });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Rule delete failed', body: error instanceof Error ? error.message : 'Could not remove approval rule.' });
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs(SettingsCard, { title: "Delegation of Authority", desc: "Who must approve what, up to which amount, for which entity. The workflow engine enforces these rules - change them here, no code.", action: _jsxs("button", { type: "button", onClick: openNew, className: "inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Plus, { className: "size-3.5" }), " Add rule"] }), children: [_jsxs("div", { className: "overflow-hidden rounded-2xl ring-1 ring-white/60", children: [_jsxs("div", { className: "grid grid-cols-[1.4fr_1fr_1fr_1.6fr_auto] gap-3 bg-white/60 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Rule" }), _jsx("span", { children: "Applies to" }), _jsx("span", { children: "Amount band" }), _jsx("span", { children: "Approval chain" }), _jsx("span", {})] }), _jsx("ul", { children: rules.map((rule) => (_jsxs("li", { className: "grid grid-cols-[1.4fr_1fr_1fr_1.6fr_auto] items-center gap-3 border-t border-white/45 bg-white/30 px-4 py-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-[13px] font-bold text-ink", children: rule.label }), _jsx("p", { className: "text-[10.5px] text-ink-muted", children: rule.requireEvidence ? 'Evidence required' : 'No evidence rule' })] }), _jsxs("span", { className: "text-[12px] text-ink-soft", children: [rule.category === 'all' ? 'All types' : cap(rule.category), " \u00B7 ", rule.scope === 'all' ? 'All entities' : entityName(rule.scope)] }), _jsx("span", { className: "text-[12.5px] font-semibold tabular text-ink", children: fmtBand(rule) }), _jsxs("div", { className: "flex items-center gap-1", children: [rule.approvers.map((approver, index) => (_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold', index === 0 ? 'bg-brand-soft text-brand-ink' : 'bg-lavender-soft text-lavender'), children: shortRole(approver) }), index < rule.approvers.length - 1 ? _jsx(ArrowRight, { className: "size-3 text-ink-muted" }) : null] }, approver))), rule.approvers.length >= 2 ? _jsx("span", { className: "ml-1 rounded-full bg-warning-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning", children: "dual" }) : null] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", onClick: () => openEdit(rule), className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", title: "Edit", children: _jsx(Pencil, { className: "size-3.5" }) }), _jsx("button", { type: "button", onClick: () => { void remove(rule.id, rule.label); }, className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger", title: "Delete", children: _jsx(Trash2, { className: "size-3.5" }) })] })] }, rule.id))) })] }), _jsxs("p", { className: "mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted", children: [_jsx(ShieldCheck, { className: "size-3.5" }), " Segregation of duties always applies - a preparer can never approve their own item, whatever the matrix says."] })] }), _jsx(PolicySimulator, { rules: rules }), editing ? _jsx(RuleEditor, { rule: editing, isNew: isNew, onCancel: () => setEditing(null), onSave: save }) : null] }));
}
function PolicySimulator({ rules }) {
    const [amount, setAmount] = useState('120000');
    const [category, setCategory] = useState('all');
    const [scope, setScope] = useState('all');
    const result = resolveChainFromRules(rules, parseFloat(amount || '0'), { category, scope });
    return (_jsx(SettingsCard, { title: "Test the policy", desc: "Enter a transaction and see exactly who would need to approve it.", children: _jsxs("div", { className: "grid grid-cols-1 gap-4 @2xl:grid-cols-[1fr_1fr_1fr_1.4fr]", children: [_jsx(Field, { label: "Amount (USD)", children: _jsx("input", { value: amount, onChange: (event) => setAmount(event.target.value.replace(/[^0-9.]/g, '')), inputMode: "decimal", className: inputCls }) }), _jsx(Field, { label: "Category", children: _jsx("select", { value: category, onChange: (event) => setCategory(event.target.value), className: inputCls, children: RULE_CATEGORIES.map((item) => _jsx("option", { value: item, children: item === 'all' ? 'All types' : cap(item) }, item)) }) }), _jsx(Field, { label: "Entity", children: _jsxs("select", { value: scope, onChange: (event) => setScope(event.target.value), className: inputCls, children: [_jsx("option", { value: "all", children: "All entities" }), seedEntities.map((entity) => _jsx("option", { value: entity.id, children: entity.name }, entity.id))] }) }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Requires" }), _jsxs("div", { className: "flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl bg-brand-soft/50 px-3 py-2 ring-1 ring-brand/15", children: [result.approvers.map((approver, index) => (_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[11px] font-bold', index === 0 ? 'bg-white text-brand-ink' : 'bg-lavender-soft text-lavender'), children: approver }), index < result.approvers.length - 1 ? _jsx(ArrowRight, { className: "size-3.5 text-brand-ink" }) : null] }, approver))), _jsxs("span", { className: "ml-1 text-[11px] font-semibold text-ink-muted", children: [result.requiresDual ? '· dual approval' : '· single approval', result.rule ? ` · ${result.rule.label}` : ''] })] })] })] }) }));
}
function RuleEditor({ rule, isNew, onCancel, onSave }) {
    const [draft, setDraft] = useState(rule);
    const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    const toggleApprover = (role) => {
        const has = draft.approvers.includes(role);
        const next = has ? draft.approvers.filter((item) => item !== role) : [...draft.approvers, role];
        set('approvers', APPROVER_ROLES.filter((item) => next.includes(item)));
    };
    return (_jsx(Dialog.Root, { open: true, onOpenChange: (value) => !value && onCancel(), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsxs(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(460px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: [_jsxs("header", { className: "flex items-center justify-between gap-3 border-b border-white/55 px-5 py-4", children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: isNew ? 'New approval rule' : 'Edit approval rule' }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5", children: [_jsx(Field, { label: "Rule name", children: _jsx("input", { value: draft.label, onChange: (event) => set('label', event.target.value), className: inputCls }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "Category", children: _jsx("select", { value: draft.category, onChange: (event) => set('category', event.target.value), className: inputCls, children: RULE_CATEGORIES.map((item) => _jsx("option", { value: item, children: item === 'all' ? 'All types' : cap(item) }, item)) }) }), _jsx(Field, { label: "Entity", children: _jsxs("select", { value: draft.scope, onChange: (event) => set('scope', event.target.value), className: inputCls, children: [_jsx("option", { value: "all", children: "All entities" }), seedEntities.map((entity) => _jsx("option", { value: entity.id, children: entity.name }, entity.id))] }) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "Min amount (USD)", children: _jsx("input", { value: String(draft.minAmount), onChange: (event) => set('minAmount', parseFloat(event.target.value.replace(/[^0-9.]/g, '')) || 0), inputMode: "decimal", className: inputCls }) }), _jsx(Field, { label: "Max amount (blank = \u221E)", children: _jsx("input", { value: draft.maxAmount === null ? '' : String(draft.maxAmount), onChange: (event) => { const value = event.target.value.replace(/[^0-9.]/g, ''); set('maxAmount', value === '' ? null : parseFloat(value)); }, inputMode: "decimal", className: inputCls }) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: "Approval chain (in order)" }), _jsx("div", { className: "mt-1.5 flex flex-col gap-2", children: APPROVER_ROLES.map((role) => {
                                                const on = draft.approvers.includes(role);
                                                const pos = draft.approvers.indexOf(role);
                                                return (_jsxs("button", { type: "button", onClick: () => toggleApprover(role), className: cn('flex items-center justify-between gap-3 rounded-2xl p-3 text-left ring-1 transition-colors', on ? 'bg-white ring-brand/30' : 'bg-white/55 ring-white/60 hover:bg-white/70'), children: [_jsxs("span", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: cn('grid size-6 place-items-center rounded-full text-[11px] font-bold', on ? 'bg-brand text-white' : 'bg-ink/10 text-ink-muted'), children: on ? pos + 1 : '-' }), _jsx("span", { className: "text-[13px] font-semibold text-ink", children: role })] }), _jsx("span", { className: cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-brand' : 'bg-ink/15'), children: _jsx("span", { className: cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5') }) })] }, role));
                                            }) }), draft.approvers.length >= 2 ? _jsxs("p", { className: "mt-1.5 text-[11px] font-semibold text-warning", children: ["Dual/multi approval - ", draft.approvers.length, " signatures required."] }) : _jsx("p", { className: "mt-1.5 text-[11px] text-ink-muted", children: "Single approval." })] }), _jsxs("button", { type: "button", onClick: () => set('requireEvidence', !draft.requireEvidence), className: "flex w-full items-center justify-between gap-3 rounded-2xl bg-white/55 p-3 text-left ring-1 ring-white/60 hover:bg-white/70", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[13px] font-semibold text-ink", children: "Require evidence" }), _jsx("p", { className: "text-[11px] text-ink-muted", children: "Supporting document needed before approval." })] }), _jsx("span", { className: cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', draft.requireEvidence ? 'bg-brand' : 'bg-ink/15'), children: _jsx("span", { className: cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', draft.requireEvidence ? 'left-[18px]' : 'left-0.5') }) })] })] }), _jsxs("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: [_jsx("button", { type: "button", onClick: onCancel, className: "inline-flex h-11 items-center justify-center rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white", children: "Cancel" }), _jsxs("button", { type: "button", disabled: draft.approvers.length === 0, onClick: () => { void onSave(draft); }, className: cn('inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold shadow-glass-soft', draft.approvers.length === 0 ? 'cursor-not-allowed bg-ink/15 text-ink-muted' : 'bg-gradient-to-br from-brand to-brand-ink text-white hover:brightness-110'), children: [_jsx(Sparkles, { className: "size-4" }), " ", isNew ? 'Add rule' : 'Save rule'] })] })] })] }) }));
}
function resolveChainFromRules(rules, amount, opts) {
    const category = opts?.category ?? 'all';
    const scope = opts?.scope ?? 'all';
    const candidates = rules.filter((rule) => amount >= rule.minAmount &&
        (rule.maxAmount === null || amount < rule.maxAmount) &&
        (rule.category === 'all' || rule.category === category) &&
        (rule.scope === 'all' || rule.scope === scope));
    if (candidates.length === 0)
        return { approvers: ['Finance Lead'], requiresDual: false, rule: null };
    const specificity = (rule) => (rule.category !== 'all' ? 1 : 0) + (rule.scope !== 'all' ? 1 : 0);
    const best = candidates.sort((a, b) => b.approvers.length - a.approvers.length || specificity(b) - specificity(a))[0];
    return { approvers: best.approvers, requiresDual: best.approvers.length >= 2, rule: best };
}
const inputCls = 'h-11 w-full rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
function Field({ label, children }) {
    return _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), children] });
}
const cap = (value) => value[0].toUpperCase() + value.slice(1);
const shortRole = (role) => (role === 'Finance Lead' ? 'Lead' : role === 'Organization Owner' ? 'Owner' : 'Board');
