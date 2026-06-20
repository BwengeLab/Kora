import type { Permission, Scope, Session } from './types';

function scopeCovers(granted: Scope, requested: Scope | undefined): boolean {
  if (!requested) return true;
  if (granted.kind === 'global') return true;
  if (granted.kind === requested.kind) {
    if (granted.kind === 'tenant' && requested.kind === 'tenant') {
      return granted.tenantId === requested.tenantId;
    }
    if (granted.kind === 'workspace' && requested.kind === 'workspace') {
      return granted.workspaceId === requested.workspaceId;
    }
  }
  return false;
}

export function can(
  session: Session | null,
  permission: Permission,
  scope?: Scope,
): boolean {
  if (!session) return false;
  return session.permissions.some(
    (p) => p.permission === permission && scopeCovers(p.scope, scope),
  );
}

export function canAny(session: Session | null, permissions: Permission[], scope?: Scope): boolean {
  return permissions.some((p) => can(session, p, scope));
}

export function canAll(session: Session | null, permissions: Permission[], scope?: Scope): boolean {
  return permissions.every((p) => can(session, p, scope));
}
