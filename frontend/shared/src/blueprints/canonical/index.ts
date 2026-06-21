import { registerBlueprint } from '../registry';
import { claimsOfficerBlueprint } from '../custom/claimsOfficer';
import { auditorBlueprint } from './auditor';
import { externalCollaboratorBlueprint } from './externalCollaborator';
import { financeLeadBlueprint } from './financeLead';
import { financeOperatorBlueprint } from './financeOperator';
import { orgAdminBlueprint } from './orgAdmin';
import { organizationOwnerBlueprint } from './organizationOwner';
import { superAdminBlueprint } from './superAdmin';

// Registers all 7 canonical blueprints. Idempotent — safe to call repeatedly.
let registered = false;
export function registerCanonicalBlueprints(): void {
  if (registered) return;
  registerBlueprint(superAdminBlueprint);
  registerBlueprint(organizationOwnerBlueprint);
  registerBlueprint(financeLeadBlueprint);
  registerBlueprint(financeOperatorBlueprint);
  registerBlueprint(auditorBlueprint);
  registerBlueprint(orgAdminBlueprint);
  registerBlueprint(externalCollaboratorBlueprint);
  // Custom / vertical-pack roles
  registerBlueprint(claimsOfficerBlueprint);
  registered = true;
}

export {
  auditorBlueprint,
  externalCollaboratorBlueprint,
  financeLeadBlueprint,
  financeOperatorBlueprint,
  orgAdminBlueprint,
  organizationOwnerBlueprint,
  superAdminBlueprint,
};
