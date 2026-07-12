import { describe, expect, it } from 'vitest';
import {
  auditorBlueprint,
  externalCollaboratorBlueprint,
  financeLeadBlueprint,
  financeOperatorBlueprint,
  orgAdminBlueprint,
  organizationOwnerBlueprint,
  superAdminBlueprint,
} from '../blueprints/canonical';
import { claimsOfficerBlueprint } from '../blueprints/custom/claimsOfficer';
import type { BlueprintNavEntry, RoleBlueprint } from '../blueprints/types';
import { hasRolePage } from './RolePage';

const tenantRouteKeys: Record<string, string> = {
  '/': 'home',
  '/approvals': 'approvals',
  '/ledger': 'ledger',
  '/general-ledger': 'gl',
  '/statements': 'statements',
  '/payables': 'payables',
  '/collections': 'collections',
  '/reports': 'reports',
  '/roi': 'roi',
  '/relationships': 'relationships',
  '/contracts': 'contracts',
  '/credit-passport': 'credit_passport',
  '/agents': 'agents',
  '/audit': 'audit',
  '/consent': 'consent',
  '/data-intake': 'data_intake',
  '/transactions': 'transactions',
  '/reconciliation': 'reconciliation',
  '/claims': 'claims',
};

const blueprints: RoleBlueprint[] = [
  organizationOwnerBlueprint,
  financeLeadBlueprint,
  financeOperatorBlueprint,
  auditorBlueprint,
  claimsOfficerBlueprint,
];

function flatten(items: BlueprintNavEntry[]): BlueprintNavEntry[] {
  return items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

describe('role route coverage', () => {
  it.each(blueprints)('$id has an implemented page for every visible tenant route', (blueprint) => {
    for (const item of flatten(blueprint.nav)) {
      const pageKey = tenantRouteKeys[item.path];
      expect(pageKey, `route ${item.path} must have a tenant page key`).toBeDefined();
      if (!pageKey) throw new Error(`route ${item.path} has no tenant page key`);
      expect(hasRolePage(pageKey, blueprint.id), `${blueprint.id} is missing ${item.path}`).toBe(true);
    }
  });

  it('keeps single-role planes outside the tenant role registry', () => {
    expect(flatten(orgAdminBlueprint.nav).every((item) => item.path === '/' || item.path.startsWith('/settings'))).toBe(true);
    expect(flatten(superAdminBlueprint.nav).every((item) => item.path.startsWith('/platform'))).toBe(true);
    expect(flatten(externalCollaboratorBlueprint.nav).every((item) => item.path.startsWith('/portal'))).toBe(true);
  });
});
