import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSession } from '../auth/hooks';
const defaults = (name, role) => ({
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
export const usePersonalSettingsStore = create()(persist((set, get) => ({
    byUser: {},
    ensure: (email, name, role) => {
        if (get().byUser[email])
            return;
        set((s) => ({ byUser: { ...s.byUser, [email]: defaults(name, role) } }));
    },
    update: (email, patch) => set((s) => ({ byUser: { ...s.byUser, [email]: { ...(s.byUser[email] ?? defaults('You', '')), ...patch } } })),
}), { name: 'kora.personal', partialize: (s) => ({ byUser: s.byUser }) }));
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
