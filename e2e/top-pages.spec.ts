import { expect, test } from '@playwright/test';

// サイトi18nトップページ整備。
// "/"(起動確認・ロケール非依存)と"/ja/"(ライブラリ説明トップページ)からの導線を検証する。

test('root page confirms AstroTable is running and links to the library and commerce site', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Hello, AstroTable!');

  await page.click('a[href="/ja/block-library"]');
  await expect(page).toHaveURL(/\/ja\/block-library\/?$/);
});

test('ja top page introduces AstroTable and links to the block library and commerce site', async ({ page }) => {
  await page.goto('/ja/');
  await expect(page.locator('.hero__title')).toHaveText('AstroTableへようこそ');

  await page.click('a[href="/ja/block-library"]');
  await expect(page).toHaveURL(/\/ja\/block-library\/?$/);

  await page.goto('/ja/');
  await page.click('a[href="/ja/commerce"]');
  await expect(page).toHaveURL(/\/ja\/commerce\/?$/);
});

test('en top page renders translated content', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('.hero__title')).toHaveText('Welcome to AstroTable');

  await page.click('a[href="/en/commerce"]');
  await expect(page).toHaveURL(/\/en\/commerce\/?$/);
});
