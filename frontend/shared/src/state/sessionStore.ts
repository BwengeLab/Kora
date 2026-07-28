import { create } from 'zustand';
import type { Session } from '../auth/types';

interface SessionState {
  session: Session | null;
  setSession: (s: Session | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clear: () => set({ session: null }),
}));
