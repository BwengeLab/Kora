import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
import { Layers, Plus, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { createSettingsUser, deleteSettingsUser, fetchSettingsUsers, updateSettingsUser } from '../../api/settingsAccess';
import { PartyAvatar, cn } from '../../design-system';
import { entityName, seedCostCenters, seedEntities } from '../../seed/entities';
import { ASSIGNABLE_ROLES, seedOrgUsers } from '../../seed/orgUsers';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { SettingsCard, StatPill } from './primitives';
const STATUS_TONE = { active: 'bg-success-soft text-success', invited: 'bg-warning-soft text-warning', suspended: 'bg-ink/10 text-ink-muted' };
const ROLE_TONE = {
    'Organization Owner': 'bg-brand-soft text-brand-ink',
    'Finance Lead': 'bg-success-soft text-success',
    'Finance Operator': 'bg-info-soft text-info',
    Auditor: 'bg-warning-soft text-warning',
    'Org Admin': 'bg-lavender-soft text-lavender',
    'Claims Officer': 'bg-ai-soft text-ai',
};
const DEPARTMENTS = ['All', ...seedCostCenters.map((c) => c.name)];
const blankUser = () => ({ id: `u-${Date.now()}`, name: '', email: '', role: 'Finance Operator', department: 'Finance & Admin', scope: 'ent-rw', status: 'invited', lastActive: '-' });
export function UsersRoles() {
    const token = useSessionStore((s) => s.session?.token ?? '');
    const apiBaseUrl = getApiBaseUrl();
    const [users, setUsers] = useState(seedOrgUsers);
    const [editing, setEditing] = useState(null);
    const [isNew, setIsNew] = useState(false);
    const [roleFilter, setRoleFilter] = useState('all');
    useEffect(() => {
        if (!token)
            return;
        const controller = new AbortController();
        fetchSettingsUsers(apiBaseUrl, token, controller.signal)
            .then(setUsers)
            .catch((error) => {
            if (!controller.signal.aborted) {
                toast({ tone: 'warning', title: 'Users unavailable', body: error instanceof Error ? error.message : 'Could not load users.' });
            }
        });
        return () => controller.abort();
    }, [apiBaseUrl, token]);
    const counts = useMemo(() => {
        const byRole = new Map();
        for (const user of users)
            byRole.set(user.role, (byRole.get(user.role) ?? 0) + 1);
        return { byRole, active: users.filter((user) => user.status === 'active').length, invited: users.filter((user) => user.status === 'invited').length };
    }, [users]);
    const shown = roleFilter === 'all' ? users : users.filter((user) => user.role === roleFilter);
    const save = async (user) => {
        if (!user.name.trim() || !user.email.trim()) {
            toast({ tone: 'warning', title: 'Name and email required' });
            return;
        }
        try {
            const items = token
                ? isNew
                    ? await createSettingsUser(apiBaseUrl, token, user)
                    : await updateSettingsUser(apiBaseUrl, token, user)
                : isNew
                    ? [user, ...users]
                    : users.map((item) => (item.id === user.id ? user : item));
            setUsers(items);
            setEditing(null);
            toast({ tone: 'success', title: isNew ? 'Invite sent' : 'User updated', body: `${user.name} · ${user.role} · ${entityName(user.scope)}` });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Save failed', body: error instanceof Error ? error.message : 'Could not save user.' });
        }
    };
    const remove = async (id) => {
        try {
            const items = token ? await deleteSettingsUser(apiBaseUrl, token, id) : users.filter((user) => user.id !== id);
            setUsers(items);
            setEditing(null);
            toast({ tone: 'warning', title: 'Removed', body: 'User access revoked.' });
        }
        catch (error) {
            toast({ tone: 'warning', title: 'Remove failed', body: error instanceof Error ? error.message : 'Could not remove user.' });
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 @3xl:grid-cols-4", children: [_jsx(StatPill, { label: "People", value: String(users.length) }), _jsx(StatPill, { label: "Active", value: String(counts.active), tone: "text-success" }), _jsx(StatPill, { label: "Pending invites", value: String(counts.invited), tone: "text-warning" }), _jsx(StatPill, { label: "Roles", value: String(ASSIGNABLE_ROLES.length), tone: "text-brand-ink" })] }), _jsx(SettingsCard, { title: "Roles", desc: "Each role is a least-privilege bundle. Click a role to filter its members.", children: _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(RoleChip, { label: "All roles", count: users.length, active: roleFilter === 'all', onClick: () => setRoleFilter('all'), tone: "bg-white/70 text-ink-soft" }), ASSIGNABLE_ROLES.map((role) => (_jsx(RoleChip, { label: role, count: counts.byRole.get(role) ?? 0, active: roleFilter === role, onClick: () => setRoleFilter(roleFilter === role ? 'all' : role), tone: ROLE_TONE[role] ?? 'bg-white/70 text-ink-soft' }, role)))] }) }), _jsxs(SettingsCard, { title: "People", desc: "Members, their role, and the entity / department their access is scoped to.", action: _jsxs("button", { type: "button", onClick: () => { setEditing(blankUser()); setIsNew(true); }, className: "inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110", children: [_jsx(Plus, { className: "size-3.5" }), " Invite"] }), children: [_jsxs("div", { className: "overflow-hidden rounded-2xl ring-1 ring-white/60", children: [_jsxs("div", { className: "grid grid-cols-[1.6fr_1.1fr_1.2fr_1fr_auto] gap-3 bg-white/60 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted", children: [_jsx("span", { children: "Person" }), _jsx("span", { children: "Role" }), _jsx("span", { children: "Scope" }), _jsx("span", { children: "Status" }), _jsx("span", {})] }), _jsx("ul", { children: shown.map((user) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => { setEditing(user); setIsNew(false); }, className: "grid w-full grid-cols-[1.6fr_1.1fr_1.2fr_1fr_auto] items-center gap-3 border-t border-white/45 bg-white/30 px-4 py-3 text-left transition-colors hover:bg-white/60", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2.5", children: [_jsx(PartyAvatar, { name: user.name || user.email, size: "sm" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-[13px] font-semibold text-ink", children: user.name || '—' }), _jsx("p", { className: "truncate text-[11px] text-ink-muted", children: user.email })] })] }), _jsx("span", { children: _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold', ROLE_TONE[user.role] ?? 'bg-white/70 text-ink-soft'), children: user.role }) }), _jsxs("span", { className: "inline-flex items-center gap-1.5 text-[12px] text-ink-soft", children: [user.scope === 'all' ? _jsx(Layers, { className: "size-3.5 text-brand" }) : _jsx("span", { children: seedEntities.find((entity) => entity.id === user.scope)?.flag }), user.scope === 'all' ? 'All entities' : entityName(user.scope), _jsxs("span", { className: "text-ink-muted", children: ["\u00B7 ", user.department] })] }), _jsx("span", { children: _jsx("span", { className: cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STATUS_TONE[user.status]), children: user.status }) }), _jsx("span", { className: "text-[11px] text-ink-muted tabular", children: user.lastActive })] }) }, user.id))) })] }), _jsxs("p", { className: "mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted", children: [_jsx(ShieldCheck, { className: "size-3.5" }), " Scope is enforced everywhere - a user only ever sees data for the entities and department assigned here."] })] }), editing ? _jsx(UserEditor, { user: editing, isNew: isNew, onCancel: () => setEditing(null), onSave: save, onRemove: remove }) : null] }));
}
function UserEditor({ user, isNew, onCancel, onSave, onRemove }) {
    const [draft, setDraft] = useState(user);
    const set = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
    return (_jsx(Dialog.Root, { open: true, onOpenChange: (value) => !value && onCancel(), children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" }), _jsxs(Dialog.Content, { "aria-describedby": undefined, className: "fixed right-0 top-0 z-[95] flex h-dvh w-[min(440px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none", children: [_jsxs("header", { className: "flex items-center justify-between gap-3 border-b border-white/55 px-5 py-4", children: [_jsx(Dialog.Title, { className: "font-display text-[15px] font-bold text-ink", children: isNew ? 'Invite user' : 'Edit user' }), _jsx(Dialog.Close, { className: "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink", children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { className: "scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5", children: [_jsx(Field, { label: "Full name", children: _jsx("input", { value: draft.name, onChange: (event) => set('name', event.target.value), className: inputCls, placeholder: "Jane Doe" }) }), _jsx(Field, { label: "Work email", children: _jsx("input", { value: draft.email, onChange: (event) => set('email', event.target.value), className: inputCls, placeholder: "jane@acme.local" }) }), _jsx(Field, { label: "Role", children: _jsx("select", { value: draft.role, onChange: (event) => set('role', event.target.value), className: inputCls, children: ASSIGNABLE_ROLES.map((role) => _jsx("option", { value: role, children: role }, role)) }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "Entity scope", children: _jsxs("select", { value: draft.scope, onChange: (event) => set('scope', event.target.value), className: inputCls, children: [_jsx("option", { value: "all", children: "All entities" }), seedEntities.map((entity) => _jsx("option", { value: entity.id, children: entity.name }, entity.id))] }) }), _jsx(Field, { label: "Department", children: _jsx("select", { value: draft.department, onChange: (event) => set('department', event.target.value), className: inputCls, children: DEPARTMENTS.map((dep) => _jsx("option", { value: dep, children: dep }, dep)) }) })] }), _jsx(Field, { label: "Status", children: _jsxs("select", { value: draft.status, onChange: (event) => set('status', event.target.value), className: inputCls, children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "invited", children: "Invited" }), _jsx("option", { value: "suspended", children: "Suspended" })] }) }), _jsxs("div", { className: "rounded-2xl bg-info-soft/40 p-3 text-[12px] text-ink ring-1 ring-info/15", children: [_jsx("span", { className: "font-bold", children: "Access preview: " }), draft.name || 'This user', " will see ", _jsx("span", { className: "font-semibold", children: draft.scope === 'all' ? 'all entities' : entityName(draft.scope) }), ", ", draft.department === 'All' ? 'all departments' : draft.department, ", as ", _jsx("span", { className: "font-semibold", children: draft.role }), "."] })] }), _jsxs("footer", { className: "flex items-center gap-2 border-t border-white/55 p-4", children: [!isNew ? _jsx("button", { type: "button", onClick: () => { void onRemove(draft.id); }, className: "inline-flex h-11 items-center justify-center rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-danger ring-1 ring-white/70 hover:bg-danger-soft", children: "Remove" }) : null, _jsx("button", { type: "button", onClick: () => { void onSave(draft); }, className: "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110", children: isNew ? 'Send invite' : 'Save changes' })] })] })] }) }));
}
function RoleChip({ label, count, active, onClick, tone }) {
    return (_jsxs("button", { type: "button", onClick: onClick, className: cn('inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] font-bold ring-1 transition-colors', active ? 'bg-white text-ink shadow-glass-soft ring-brand/30' : 'bg-white/55 text-ink-soft ring-white/60 hover:bg-white/80'), children: [_jsx("span", { className: cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', tone), children: count }), label] }));
}
const inputCls = 'h-11 w-full rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
function Field({ label, children }) {
    return _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-muted", children: label }), children] });
}
