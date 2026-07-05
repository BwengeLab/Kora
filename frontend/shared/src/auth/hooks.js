import { useCallback } from 'react';
import { useSessionStore } from '../state/sessionStore';
import { can, canAll, canAny } from './permissions';
export function useSession() {
    return useSessionStore((s) => s.session);
}
export function useSetSession() {
    return useSessionStore((s) => s.setSession);
}
export function usePermissions() {
    const session = useSession();
    return {
        can: useCallback((p, s) => can(session, p, s), [session]),
        canAny: useCallback((p, s) => canAny(session, p, s), [session]),
        canAll: useCallback((p, s) => canAll(session, p, s), [session]),
    };
}
