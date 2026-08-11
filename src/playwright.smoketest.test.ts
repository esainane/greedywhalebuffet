import { expect, test } from '@playwright/test';

test('built application initializes', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', error => errors.push(error));

  await page.goto('/');

  const app = page.locator('.app-layout');

  await expect(app).toBeVisible();
  await expect(app).not.toHaveClass(/\bis-loading\b/);

  expect(errors).toEqual([]);
});
