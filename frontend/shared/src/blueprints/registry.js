// Blueprints are registered here at boot. Concrete blueprints live next to
// the role's modules — this registry just maps blueprintId → definition.
const registry = new Map();
export function registerBlueprint(bp) {
    registry.set(bp.id, bp);
}
export function getBlueprint(id) {
    return registry.get(id);
}
export function listBlueprints() {
    return Array.from(registry.values());
}
