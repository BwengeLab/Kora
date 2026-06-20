import { test, expect } from '@playwright/test';

test('app base-zoom fills the window, no bottom gap', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 945 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);

  // The zoomed shell should still cover the full window height.
  const metrics = await page.evaluate(() => {
    const zoom = getComputedStyle(document.documentElement).zoom;
    const shell = document.querySelector('main')?.closest('div[style]') as HTMLElement | null;
    const rect = shell?.getBoundingClientRect();
    return { zoom, bottom: rect?.bottom ?? 0, innerH: window.innerHeight };
  });
  expect(metrics.zoom).toBe('0.8');
  // rendered bottom should reach the window height (within a few px)
  expect(Math.abs(metrics.bottom - metrics.innerH)).toBeLessThan(8);

  await page.screenshot({ path: 'zoom-default.png', fullPage: false });
});
