import { test, expect } from '@playwright/test';

test('Org Owner Home matches reference layout', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 945 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Wait for charts (SVGs render after ECharts mount)
  await page.waitForTimeout(800);

  // Brand + Org Owner specifics
  await expect(page.getByText('KORA', { exact: true })).toBeVisible();
  await expect(page.getByText('Business Command Center', { exact: false })).toHaveCount(0); // not a literal label, just confirming we don't accidentally render it
  await expect(page.getByText('Good', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Total Cash Position')).toBeVisible();
  await expect(page.getByText('Cash Flow Overview')).toBeVisible();
  await expect(page.getByText('AI Insights')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Action Center' })).toBeVisible();
  await expect(page.getByText('Reconciliation Snapshot')).toBeVisible();
  await expect(page.getByText('External Relationships')).toBeVisible();
  await expect(page.getByText('Credit Passport', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('AI Agent Activity')).toBeVisible();
  await expect(page.getByText('Recent Documents')).toBeVisible();
  await expect(page.getByText('Aline Mukamana')).toBeVisible();

  // Take the screenshot regardless of console-error state so we can debug visually
  await page.screenshot({ path: 'org-owner-home.png', fullPage: true });
  expect(errors).toEqual([]);

});
