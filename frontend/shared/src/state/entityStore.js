import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useEntityStore = create()(persist((set) => ({
    scope: 'all',
    setScope: (scope) => set({ scope }),
}), { name: 'kora.entity' }));
