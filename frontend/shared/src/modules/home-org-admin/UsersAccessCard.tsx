import { Link } from '@tanstack/react-router';
import { AlertTriangle, Plus, Wand2 } from 'lucide-react';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { seedAdminUsers, type AdminUser } from '../../seed/adminHome';

const STATUS_TONE: Record<AdminUser['status'], string> = {
  active: 'bg-success-soft text-success',
  invited: 'bg-warning-soft text-warning',
  suspended: 'bg-danger-soft text-danger',
};

export function UsersAccessCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full min-h-0 flex-col gap-3 p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-ink">Users &amp; access</h3>
        <div className="flex items-center gap-2">
          <Link to="/settings/users-and-roles" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/65 px-3 text-[12px] font-bold text-ink-soft ring-1 ring-white/70 hover:bg-white hover:text-ink">
            <Wand2 className="size-3.5" /> Role builder
          </Link>
          <Link to="/settings/users-and-roles" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-3 text-[12px] font-bold text-white shadow-glass-soft">
            <Plus className="size-3.5" /> Invite user
          </Link>
        </div>
      </header>

      <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {seedAdminUsers.map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-white/60">
            <PartyAvatar name={u.name} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-bold text-ink">{u.name}</p>
                {u.sodConflict ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-1.5 py-0.5 text-[9px] font-bold text-danger">
                    <AlertTriangle className="size-2.5" /> SoD
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[11px] text-ink-muted">{u.roles.join(', ')} · {u.lastActive}</p>
            </div>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STATUS_TONE[u.status])}>
              {u.status}
            </span>
          </li>
        ))}
      </ul>
    </GlassSurface>
  );
}
