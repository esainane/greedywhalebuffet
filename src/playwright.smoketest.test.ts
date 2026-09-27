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

test('responsive layouts do not overflow horizontally', async ({ page }) => {
  await page.goto('/');

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);

    const dimensions = await page.evaluate(() => {
      const heading = document.querySelector<HTMLElement>('h1')!;
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        headingRight: heading.getBoundingClientRect().right,
      };
    });

    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    expect(dimensions.headingRight).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});
