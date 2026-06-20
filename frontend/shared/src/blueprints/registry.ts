import type { RoleBlueprint } from './types';

// Blueprints are registered here at boot. Concrete blueprints live next to
// the role's modules — this registry just maps blueprintId → definition.
const registry = new Map<string, RoleBlueprint>();

export function registerBlueprint(bp: RoleBlueprint): void {
  registry.set(bp.id, bp);
}

export function getBlueprint(id: string): RoleBlueprint | undefined {
  return registry.get(id);
}

export function listBlueprints(): RoleBlueprint[] {
  return Array.from(registry.values());
}
