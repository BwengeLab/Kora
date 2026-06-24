import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSession } from '../auth/hooks';

// PERSONAL settings — per user, never shared. Profile, preferences, notification
// choices and security toggles belong to one person and are keyed by their email.
// (Distinct from the org-wide Admin Console at /settings.)

export interface PersonalSettings {
  displayName: string;
  jobTitle: string;
  phone: string;
  language: 'en' | 'fr' | 'rw';
  theme: 'system' | 'light';
  dateFormat: 'DMY' | 'MDY' | 'ISO';
  notifyApprovals: boolean;
  notifyMentions: boolean;
  notifyDigest: boolean;
  notifyAgent: boolean;
  twoFactor: boolean;
}

const defaults = (name: string, role: string): PersonalSettings => ({
  displayName: name,
  jobTitle: role,
  phone: '+250 7•• ••• •••',
  language: 'en',
  theme: 'system',
  dateFormat: 'DMY',
  notifyApprovals: true,
  notifyMentions: true,
  notifyDigest: true,
  notifyAgent: false,
  twoFactor: true,
});

interface State {
  byUser: Record<string, PersonalSettings>;
  ensure: (email: string, name: string, role: string) => void;
  update: (email: string, patch: Partial<PersonalSettings>) => void;
}

export const usePersonalSettingsStore = create<State>()(
  persist(
    (set, get) => ({
      byUser: {},
      ensure: (email, name, role) => {
        if (get().byUser[email]) return;
        set((s) => ({ byUser: { ...s.byUser, [email]: defaults(name, role) } }));
      },
      update: (email, patch) => set((s) => ({ byUser: { ...s.byUser, [email]: { ...(s.byUser[email] ?? defaults('You', '')), ...patch } } })),
    }),
    { name: 'kora.personal', partialize: (s) => ({ byUser: s.byUser }) },
  ),
);

export function useMyPersonalSettings() {
  const session = useSession();
  const email = session?.user.email ?? 'guest@kora.local';
  const name = session?.user.displayName ?? 'You';
  const role = session?.roles[0]?.name ?? '';
  const ensure = usePersonalSettingsStore((s) => s.ensure);
  useEffect(() => { ensure(email, name, role); }, [email, name, role, ensure]);
  const settings = usePersonalSettingsStore((s) => s.byUser[email]) ?? defaults(name, role);
  return { email, settings };
}
