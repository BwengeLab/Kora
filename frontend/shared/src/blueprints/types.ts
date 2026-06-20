import type { Permission, Scope } from '../auth/types';

// A nav entry rendered for the user IFF they have at least one of `requires`.
export interface BlueprintNavEntry {
  id: string;
  // i18n key — never a hardcoded string.
  labelKey: string;
  path: string;
  iconId?: string; // resolved by the design system later
  requires: { permission: Permission; scope?: Scope }[];
  children?: BlueprintNavEntry[];
}

// A module the blueprint may mount on the user's Home / dashboard.
export interface BlueprintModule {
  id: string;
  requires: { permission: Permission; scope?: Scope }[];
  // Size hint for grid placement — the renderer interprets it later.
  span?: 1 | 2 | 3 | 4;
}

export interface RoleBlueprint {
  id: string; // e.g. "blueprint.admin", "blueprint.accountant"
  // Order matters — first nav entry whose `requires` matches becomes the Home landing.
  nav: BlueprintNavEntry[];
  homeModules: BlueprintModule[];
}
