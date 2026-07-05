import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seedOrgUsers } from '../seed/orgUsers';
export const useOrgUsersStore = create()(persist((set) => ({
    users: seedOrgUsers,
    invite: (user) => set((s) => ({ users: [user, ...s.users] })),
    updateUser: (id, patch) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
    removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
}), { name: 'kora.org-users' }));
