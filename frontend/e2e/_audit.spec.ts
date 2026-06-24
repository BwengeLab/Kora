import { test } from '@playwright/test';

// Default preview role = Organization Owner. Capture each owner page as-is.
const PAGES: [string, string][] = [
  ['/', 'home'],
  ['/reconciliation', 'reconciliation'],
  ['/ledger', 'ledger'],
  ['/collections', 'collections'],
  ['/relationships', 'relationships'],
  ['/reports', 'reports'],
  ['/roi', 'roi'],
  ['/audit', 'audit'],
  ['/approvals', 'approvals'],
];

test('capture org owner pages', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 945 });
  for (const [path, name] of PAGES) {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `e2e/_owner_${name}.png` });
  }
});
