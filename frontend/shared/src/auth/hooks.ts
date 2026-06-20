import { useCallback } from 'react';
import { useSessionStore } from '../state/sessionStore';
import { can, canAll, canAny } from './permissions';
import type { Permission, Scope, Session } from './types';

export function useSession(): Session | null {
  return useSessionStore((s) => s.session);
}

export function useSetSession() {
  return useSessionStore((s) => s.setSession);
}

export interface PermissionsApi {
  can: (permission: Permission, scope?: Scope) => boolean;
  canAny: (permissions: Permission[], scope?: Scope) => boolean;
  canAll: (permissions: Permission[], scope?: Scope) => boolean;
}

export function usePermissions(): PermissionsApi {
  const session = useSession();
  return {
    can: useCallback((p, s) => can(session, p, s), [session]),
    canAny: useCallback((p, s) => canAny(session, p, s), [session]),
    canAll: useCallback((p, s) => canAll(session, p, s), [session]),
  };
}
