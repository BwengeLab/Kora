import { create } from 'zustand';
import { CANONICAL_ROLE_IDS } from '../auth/catalog';
import type { SeedRoleId } from '../seed/sessions';

// Dev-only: which seed role the app should hydrate as. The eventual role
// switcher in the design system reads/writes this. Default comes from a Vite
// env var so different developers can boot into different roles.
//
// Note: in production this store is irrelevant — the real session comes from
// the identity service and `seedSessions` is not loaded at all.

const envDefault =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PREVIEW_ROLE) ||
  CANONICAL_ROLE_IDS.ORG_OWNER;

interface PreviewRoleState {
  roleId: SeedRoleId;
  setRoleId: (id: SeedRoleId) => void;
}

export const usePreviewRoleStore = create<PreviewRoleState>((set) => ({
  roleId: envDefault as SeedRoleId,
  setRoleId: (roleId) => set({ roleId }),
}));
