import { useMemo } from 'react';
import { usePermissions, useSession } from '../auth/hooks';
import { getBlueprint } from './registry';
import type { BlueprintNavEntry, BlueprintModule, RoleBlueprint } from './types';

interface ResolvedBlueprint {
  blueprint: RoleBlueprint | null;
  nav: BlueprintNavEntry[];
  homeModules: BlueprintModule[];
}

// Permission-driven blueprint resolution. Concrete rendering (sidebar, grid,
// etc.) is the design system's job — this hook only filters by permission.
export function useResolvedBlueprint(): ResolvedBlueprint {
  const session = useSession();
  const { canAny } = usePermissions();

  return useMemo<ResolvedBlueprint>(() => {
    if (!session || session.roles.length === 0) {
      return { blueprint: null, nav: [], homeModules: [] };
    }

    // Multiple roles → first one's blueprint wins for now. Real merging logic
    // lands when role-merge semantics are specified.
    const firstRole = session.roles[0];
    if (!firstRole) return { blueprint: null, nav: [], homeModules: [] };

    const blueprint = getBlueprint(firstRole.blueprintId);
    if (!blueprint) return { blueprint: null, nav: [], homeModules: [] };

    const matchesReqs = (reqs: { permission: string; scope?: import('../auth/types').Scope }[]) =>
      reqs.length === 0 || canAny(reqs.map((r) => r.permission));

    const filterNav = (entries: BlueprintNavEntry[]): BlueprintNavEntry[] =>
      entries
        .filter((e) => matchesReqs(e.requires))
        .map((e) => {
          const next: BlueprintNavEntry = { ...e };
          if (e.children) next.children = filterNav(e.children);
          return next;
        });

    return {
      blueprint,
      nav: filterNav(blueprint.nav),
      homeModules: blueprint.homeModules.filter((m) => matchesReqs(m.requires)),
    };
  }, [session, canAny]);
}
