import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CANONICAL_ROLE_IDS } from '../auth/catalog';
import { seedSessions } from '../seed/sessions';
// Dev-only: which seed role the app should hydrate as. Persisted to
// localStorage so the chosen role survives a reload. In production this store
// is irrelevant — the real session comes from the identity service.
const STORAGE_KEY = 'kora.preview-role';
const envDefault = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PREVIEW_ROLE) ||
    CANONICAL_ROLE_IDS.ORG_OWNER;
// Read the persisted role synchronously (used to seed the session store before
// React mounts, so route guards see the right role on first paint).
export function readPersistedRoleId() {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (!raw)
            return null;
        const id = JSON.parse(raw)?.state?.roleId;
        return id && id in seedSessions ? id : null;
    }
    catch {
        return null;
    }
}
export const usePreviewRoleStore = create()(persist((set) => ({
    roleId: envDefault,
    setRoleId: (roleId) => set({ roleId }),
}), { name: STORAGE_KEY }));
