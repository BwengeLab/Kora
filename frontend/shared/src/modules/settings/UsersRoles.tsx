import * as Dialog from '@radix-ui/react-dialog';
import { Layers, Plus, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../api/client';
import { createSettingsUser, deleteSettingsUser, fetchSettingsUsers, updateSettingsUser } from '../../api/settingsAccess';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { entityName, seedCostCenters, seedEntities, type EntityScope } from '../../seed/entities';
import { ASSIGNABLE_ROLES, seedOrgUsers, type OrgUser, type UserStatus } from '../../seed/orgUsers';
import { useSessionStore } from '../../state/sessionStore';
import { toast } from '../../state/toastStore';
import { SettingsCard, StatPill } from './primitives';

const STATUS_TONE: Record<UserStatus, string> = { active: 'bg-success-soft text-success', invited: 'bg-warning-soft text-warning', suspended: 'bg-ink/10 text-ink-muted' };
const ROLE_TONE: Record<string, string> = {
  'Organization Owner': 'bg-brand-soft text-brand-ink',
  'Finance Lead': 'bg-success-soft text-success',
  'Finance Operator': 'bg-info-soft text-info',
  Auditor: 'bg-warning-soft text-warning',
  'Org Admin': 'bg-lavender-soft text-lavender',
  'Claims Officer': 'bg-ai-soft text-ai',
};
const DEPARTMENTS = ['All', ...seedCostCenters.map((c) => c.name)];

const blankUser = (): OrgUser => ({ id: `u-${Date.now()}`, name: '', email: '', role: 'Finance Operator', department: 'Finance & Admin', scope: 'ent-rw', status: 'invited', lastActive: '-' });

export function UsersRoles() {
  const token = useSessionStore((s) => s.session?.token ?? '');
  const apiBaseUrl = getApiBaseUrl();
  const [users, setUsers] = useState<OrgUser[]>(seedOrgUsers);
  const [editing, setEditing] = useState<OrgUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchSettingsUsers(apiBaseUrl, token, controller.signal)
      .then(setUsers)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          toast({ tone: 'warning', title: 'Users unavailable', body: error instanceof Error ? error.message : 'Could not load users.' });
        }
      });
    return () => controller.abort();
  }, [apiBaseUrl, token]);

  const counts = useMemo(() => {
    const byRole = new Map<string, number>();
    for (const user of users) byRole.set(user.role, (byRole.get(user.role) ?? 0) + 1);
    return { byRole, active: users.filter((user) => user.status === 'active').length, invited: users.filter((user) => user.status === 'invited').length };
  }, [users]);

  const shown = roleFilter === 'all' ? users : users.filter((user) => user.role === roleFilter);

  const save = async (user: OrgUser) => {
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
    } catch (error) {
      toast({ tone: 'warning', title: 'Save failed', body: error instanceof Error ? error.message : 'Could not save user.' });
    }
  };

  const remove = async (id: string) => {
    try {
      const items = token ? await deleteSettingsUser(apiBaseUrl, token, id) : users.filter((user) => user.id !== id);
      setUsers(items);
      setEditing(null);
      toast({ tone: 'warning', title: 'Removed', body: 'User access revoked.' });
    } catch (error) {
      toast({ tone: 'warning', title: 'Remove failed', body: error instanceof Error ? error.message : 'Could not remove user.' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <StatPill label="People" value={String(users.length)} />
        <StatPill label="Active" value={String(counts.active)} tone="text-success" />
        <StatPill label="Pending invites" value={String(counts.invited)} tone="text-warning" />
        <StatPill label="Roles" value={String(ASSIGNABLE_ROLES.length)} tone="text-brand-ink" />
      </div>

      <SettingsCard title="Roles" desc="Each role is a least-privilege bundle. Click a role to filter its members.">
        <div className="flex flex-wrap gap-2">
          <RoleChip label="All roles" count={users.length} active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} tone="bg-white/70 text-ink-soft" />
          {ASSIGNABLE_ROLES.map((role) => (
            <RoleChip key={role} label={role} count={counts.byRole.get(role) ?? 0} active={roleFilter === role} onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)} tone={ROLE_TONE[role] ?? 'bg-white/70 text-ink-soft'} />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="People"
        desc="Members, their role, and the entity / department their access is scoped to."
        action={<button type="button" onClick={() => { setEditing(blankUser()); setIsNew(true); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3.5 text-[12px] font-bold text-white shadow-glass-soft hover:brightness-110"><Plus className="size-3.5" /> Invite</button>}
      >
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/60">
          <div className="grid grid-cols-[1.6fr_1.1fr_1.2fr_1fr_auto] gap-3 bg-white/60 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
            <span>Person</span><span>Role</span><span>Scope</span><span>Status</span><span />
          </div>
          <ul>
            {shown.map((user) => (
              <li key={user.id}>
                <button type="button" onClick={() => { setEditing(user); setIsNew(false); }} className="grid w-full grid-cols-[1.6fr_1.1fr_1.2fr_1fr_auto] items-center gap-3 border-t border-white/45 bg-white/30 px-4 py-3 text-left transition-colors hover:bg-white/60">
                  <div className="flex min-w-0 items-center gap-2.5"><PartyAvatar name={user.name || user.email} size="sm" /><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{user.name || '—'}</p><p className="truncate text-[11px] text-ink-muted">{user.email}</p></div></div>
                  <span><span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold', ROLE_TONE[user.role] ?? 'bg-white/70 text-ink-soft')}>{user.role}</span></span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">{user.scope === 'all' ? <Layers className="size-3.5 text-brand" /> : <span>{seedEntities.find((entity) => entity.id === user.scope)?.flag}</span>}{user.scope === 'all' ? 'All entities' : entityName(user.scope)}<span className="text-ink-muted">· {user.department}</span></span>
                  <span><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STATUS_TONE[user.status])}>{user.status}</span></span>
                  <span className="text-[11px] text-ink-muted tabular">{user.lastActive}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted"><ShieldCheck className="size-3.5" /> Scope is enforced everywhere - a user only ever sees data for the entities and department assigned here.</p>
      </SettingsCard>

      {editing ? <UserEditor user={editing} isNew={isNew} onCancel={() => setEditing(null)} onSave={save} onRemove={remove} /> : null}
    </div>
  );
}

function UserEditor({ user, isNew, onCancel, onSave, onRemove }: { user: OrgUser; isNew: boolean; onCancel: () => void; onSave: (u: OrgUser) => void | Promise<void>; onRemove: (id: string) => void | Promise<void> }) {
  const [draft, setDraft] = useState<OrgUser>(user);
  const set = <K extends keyof OrgUser>(key: K, value: OrgUser[K]) => setDraft((prev) => ({ ...prev, [key]: value }));
  return (
    <Dialog.Root open onOpenChange={(value) => !value && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/20 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed right-0 top-0 z-[95] flex h-dvh w-[min(440px,94vw)] flex-col border-l border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          <header className="flex items-center justify-between gap-3 border-b border-white/55 px-5 py-4">
            <Dialog.Title className="font-display text-[15px] font-bold text-ink">{isNew ? 'Invite user' : 'Edit user'}</Dialog.Title>
            <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
          </header>
          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
            <Field label="Full name"><input value={draft.name} onChange={(event) => set('name', event.target.value)} className={inputCls} placeholder="Jane Doe" /></Field>
            <Field label="Work email"><input value={draft.email} onChange={(event) => set('email', event.target.value)} className={inputCls} placeholder="jane@acme.local" /></Field>
            <Field label="Role"><select value={draft.role} onChange={(event) => set('role', event.target.value)} className={inputCls}>{ASSIGNABLE_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Entity scope"><select value={draft.scope} onChange={(event) => set('scope', event.target.value as EntityScope)} className={inputCls}><option value="all">All entities</option>{seedEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></Field>
              <Field label="Department"><select value={draft.department} onChange={(event) => set('department', event.target.value)} className={inputCls}>{DEPARTMENTS.map((dep) => <option key={dep} value={dep}>{dep}</option>)}</select></Field>
            </div>
            <Field label="Status"><select value={draft.status} onChange={(event) => set('status', event.target.value as UserStatus)} className={inputCls}><option value="active">Active</option><option value="invited">Invited</option><option value="suspended">Suspended</option></select></Field>
            <div className="rounded-2xl bg-info-soft/40 p-3 text-[12px] text-ink ring-1 ring-info/15"><span className="font-bold">Access preview: </span>{draft.name || 'This user'} will see <span className="font-semibold">{draft.scope === 'all' ? 'all entities' : entityName(draft.scope)}</span>, {draft.department === 'All' ? 'all departments' : draft.department}, as <span className="font-semibold">{draft.role}</span>.</div>
          </div>
          <footer className="flex items-center gap-2 border-t border-white/55 p-4">
            {!isNew ? <button type="button" onClick={() => { void onRemove(draft.id); }} className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-danger ring-1 ring-white/70 hover:bg-danger-soft">Remove</button> : null}
            <button type="button" onClick={() => { void onSave(draft); }} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">{isNew ? 'Send invite' : 'Save changes'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RoleChip({ label, count, active, onClick, tone }: { label: string; count: number; active: boolean; onClick: () => void; tone: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] font-bold ring-1 transition-colors', active ? 'bg-white text-ink shadow-glass-soft ring-brand/30' : 'bg-white/55 text-ink-soft ring-white/60 hover:bg-white/80')}>
      <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', tone)}>{count}</span>
      {label}
    </button>
  );
}

const inputCls = 'h-11 w-full rounded-xl bg-white/70 px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>{children}</label>;
}
