import { test, expect } from '@playwright/test';

test('org owner: ledger, agents, audit pages', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[err] ${m.text()}`); });

  // default role is Org Owner
  await page.addInitScript(() => localStorage.removeItem('kora.preview-role'));
  await page.setViewportSize({ width: 1680, height: 945 });

  await page.goto('/ledger', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await expect(page.locator('h1', { hasText: 'Ledger & Cashflow' })).toBeVisible();
  await expect(page.getByText('Profit & loss')).toBeVisible();
  await expect(page.getByText('Receivables aging')).toBeVisible();
  await page.screenshot({ path: 'owner-ledger.png', fullPage: false });

  await page.goto('/agents', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await expect(page.locator('h1', { hasText: 'AI Agents' })).toBeVisible();
  await expect(page.getByText('Reconciliation Agent')).toBeVisible();
  await expect(page.getByText('Audit & Compliance Agent')).toBeVisible();
  await page.screenshot({ path: 'owner-agents.png', fullPage: false });

  await page.goto('/audit', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await expect(page.locator('h1', { hasText: 'Audit & Risk' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Top risks to act on' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compliance posture' })).toBeVisible();
  await page.screenshot({ path: 'owner-audit.png', fullPage: false });

  console.log('ERRORS:', errors.length);
  errors.slice(0, 8).forEach((e) => console.log(e));
  expect(errors).toEqual([]);
});
