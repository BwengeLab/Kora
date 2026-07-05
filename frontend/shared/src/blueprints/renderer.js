import { useMemo } from 'react';
import { usePermissions, useSession } from '../auth/hooks';
import { getBlueprint } from './registry';
// Permission-driven blueprint resolution. Concrete rendering (sidebar, grid,
// etc.) is the design system's job — this hook only filters by permission.
export function useResolvedBlueprint() {
    const session = useSession();
    const { canAny } = usePermissions();
    return useMemo(() => {
        if (!session || session.roles.length === 0) {
            return { blueprint: null, nav: [], homeModules: [] };
        }
        // Multiple roles → first one's blueprint wins for now. Real merging logic
        // lands when role-merge semantics are specified.
        const firstRole = session.roles[0];
        if (!firstRole)
            return { blueprint: null, nav: [], homeModules: [] };
        const blueprint = getBlueprint(firstRole.blueprintId);
        if (!blueprint)
            return { blueprint: null, nav: [], homeModules: [] };
        const matchesReqs = (reqs) => reqs.length === 0 || canAny(reqs.map((r) => r.permission));
        const filterNav = (entries) => entries
            .filter((e) => matchesReqs(e.requires))
            .map((e) => {
            const next = { ...e };
            if (e.children)
                next.children = filterNav(e.children);
            return next;
        });
        return {
            blueprint,
            nav: filterNav(blueprint.nav),
            homeModules: blueprint.homeModules.filter((m) => matchesReqs(m.requires)),
        };
    }, [session, canAny]);
}
