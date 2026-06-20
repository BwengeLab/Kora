import { test } from '@playwright/test';

const roles = [
  { id: 'role.org_owner', label: 'Organization Owner', file: 'shell-org-owner.png' },
  { id: 'role.finance_lead', label: 'Finance Lead', file: 'shell-finance-lead.png' },
  { id: 'role.finance_operator', label: 'Finance Operator', file: 'shell-finance-operator.png' },
  { id: 'role.auditor', label: 'Auditor', file: 'shell-auditor.png' },
  { id: 'role.org_admin', label: 'Org Admin', file: 'shell-org-admin.png' },
  { id: 'role.external_collaborator', label: 'External Collaborator (Lender)', file: 'shell-external.png' },
  { id: 'role.super_admin', label: 'Super Admin', file: 'shell-super-admin.png' },
];

for (const role of roles) {
  test(`shell renders for ${role.label}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open role switcher
    await page.getByText('Preview as').click();
    await page.getByRole('button', { name: new RegExp(role.label.replace(/[()]/g, '\\$&')) }).click();

    // Let switch settle + the new role's nav render
    await page.waitForTimeout(300);

    await page.screenshot({ path: role.file, fullPage: false });
  });
}
