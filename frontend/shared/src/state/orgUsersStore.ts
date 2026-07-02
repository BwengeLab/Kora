import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seedOrgUsers, type OrgUser } from '../seed/orgUsers';

// The tenant's user directory — multiple users per role, editable by Org Admin.

interface OrgUsersState {
  users: OrgUser[];
  invite: (user: OrgUser) => void;
  updateUser: (id: string, patch: Partial<OrgUser>) => void;
  removeUser: (id: string) => void;
}

export const useOrgUsersStore = create<OrgUsersState>()(
  persist(
    (set) => ({
      users: seedOrgUsers,
      invite: (user) => set((s) => ({ users: [user, ...s.users] })),
      updateUser: (id, patch) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
    }),
    { name: 'kora.org-users' },
  ),
);
