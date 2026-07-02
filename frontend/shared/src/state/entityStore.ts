import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EntityScope } from '../seed/entities';

// The currently-selected entity context, shared across the app and persisted.
// Default 'all' = consolidated group view. Pages that hold financial data read
// this to slice by entity.

interface EntityState {
  scope: EntityScope;
  setScope: (scope: EntityScope) => void;
}

export const useEntityStore = create<EntityState>()(
  persist(
    (set) => ({
      scope: 'all',
      setScope: (scope) => set({ scope }),
    }),
    { name: 'kora.entity' },
  ),
);
