import { create } from 'zustand';
import { CANONICAL_ROLE_IDS } from '../auth/catalog';
import { getSeedSession, type SeedRoleId } from '../seed/sessions';
import { readPersistedRoleId } from './previewRoleStore';
import type { Session } from '../auth/types';

// Initial seed role — picked synchronously at module load so route guards
// (which run before any `useEffect`) see a populated session on first paint.
// Prefers the persisted preview role so a reload keeps you on the same role.
// In production this becomes `null` and real auth fills it from the identity
// service over gRPC.
const initialRoleId: SeedRoleId =
  readPersistedRoleId() ??
  (((typeof import.meta !== 'undefined' && import.meta.env?.VITE_PREVIEW_ROLE) ||
    CANONICAL_ROLE_IDS.ORG_OWNER) as SeedRoleId);

interface SessionState {
  session: Session | null;
  setSession: (s: Session | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: getSeedSession(initialRoleId),
  setSession: (session) => set({ session }),
  clear: () => set({ session: null }),
}));
