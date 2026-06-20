import { test, expect } from '@playwright/test';

test('shell renders with sidebar + greeting + glass surfaces', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Sidebar brand
  await expect(page.getByText('Kora', { exact: true }).first()).toBeVisible();

  // Greeting (Finance Lead is the default preview role → Eric Habimana)
  await expect(page.getByText(/Good (morning|afternoon|evening), Eric/)).toBeVisible();

  // Tenant chip
  await expect(page.getByText('Acme Insurance (seed)')).toBeVisible();

  // A nav item that Finance Lead has
  await expect(page.getByRole('link', { name: /Reconciliation/ }).first()).toBeVisible();

  // No console errors
  expect(errors).toEqual([]);

  await page.screenshot({ path: 'e2e-smoke.png', fullPage: false });
});
