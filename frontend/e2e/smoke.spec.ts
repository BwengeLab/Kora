import { test, expect } from '@playwright/test';

test('shell + Org Owner home render without console errors', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 945 });
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);

  // Default preview role = Organization Owner → Business Command Center content
  await expect(page.getByText('Total Cash Position')).toBeVisible();
  await expect(page.getByText('Cash Flow Overview')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Action Center' })).toBeVisible();
  await expect(page.getByText('Reconciliation Snapshot')).toBeVisible();
  await expect(page.getByText('Recent Documents')).toBeVisible();

  // Sidebar starts collapsed (avatar only); expanding reveals the user name + labels
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.waitForTimeout(300);
  await expect(page.getByText('Aline Mukamana')).toBeVisible();
  await expect(page.getByRole('link', { name: /Reconciliation/ }).first()).toBeVisible();

  expect(errors).toEqual([]);
});
