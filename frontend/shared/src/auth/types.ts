// Auth/session types. These mirror what the backend will return via gRPC
// (identity service). Until proto codegen is wired, we model them locally.

export type Permission = string; // e.g. "ledger.read", "reconciliation.approve"

export type Scope =
  | { kind: 'global' }
  | { kind: 'tenant'; tenantId: string }
  | { kind: 'workspace'; workspaceId: string };

export interface Role {
  id: string;
  name: string;
  blueprintId: string; // which role blueprint this role uses
}

export interface Tenant {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Session {
  user: User;
  tenant: Tenant;
  roles: Role[];
  // Flattened effective permissions with their scopes. Rendering reads this.
  permissions: { permission: Permission; scope: Scope }[];
  token: string;
  issuedAt: string; // ISO
  expiresAt: string; // ISO
}
