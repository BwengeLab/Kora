import { redirect } from '@tanstack/react-router';
import { useSessionStore } from '../state/sessionStore';
import { can } from '../auth/permissions';
import type { Permission, Scope } from '../auth/types';

// Use inside a route's `beforeLoad` to gate it on permissions.
export function requirePermission(permission: Permission, scope?: Scope) {
  return () => {
    const session = useSessionStore.getState().session;
    if (!can(session, permission, scope)) {
      throw redirect({ to: '/' });
    }
  };
}

export function requireSession() {
  return () => {
    const session = useSessionStore.getState().session;
    if (!session) {
      throw redirect({ to: '/' });
    }
  };
}
