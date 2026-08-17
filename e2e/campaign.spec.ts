import { expect, test } from '@playwright/test';

// キャンペーンページ。TOPから各キャンペーンへの導線と、
// 関連商品(cards Block)への遷移を検証する。

test('campaign top links to both campaigns', async ({ page }) => {
  await page.goto('/ja/commerce/campaign');
  await expect(page.locator('h1')).toHaveText('キャンペーン');
  await expect(page.locator('.cards__item')).toHaveCount(2);

  await page.click('a[href="/ja/commerce/campaign/running-beginner"]');
  await expect(page).toHaveURL(/\/ja\/commerce\/campaign\/running-beginner\/?$/);
  await expect(page.locator('h1')).toHaveText('通勤ランからはじめよう');
});

test('running-beginner campaign links through to a recommended product', async ({ page }) => {
  await page.goto('/ja/commerce/campaign/running-beginner');

  await expect(page.locator('.hero__title')).toHaveText('通勤ランからはじめよう');
  await expect(page.locator('.cards__item')).toHaveCount(3);

  await page.click('a[href="/ja/commerce/detail/commute-running-shoes"]');
  await expect(page).toHaveURL(/\/ja\/commerce\/detail\/commute-running-shoes\/?$/);
});

test('pickleball campaign links through to a recommended product', async ({ page }) => {
  await page.goto('/ja/commerce/campaign/pickleball');

  await expect(page.locator('.hero__title')).toHaveText('週末はピックルボールを');
  await expect(page.locator('.cards__item')).toHaveCount(3);

  await page.click('a[href="/ja/commerce/detail/quick-dry-polo"]');
  await expect(page).toHaveURL(/\/ja\/commerce\/detail\/quick-dry-polo\/?$/);
});

test('en locale campaign pages render translated content', async ({ page }) => {
  await page.goto('/en/commerce/campaign');
  await expect(page.locator('h1')).toHaveText('Campaigns');

  await page.click('a[href="/en/commerce/campaign/pickleball"]');
  await expect(page.locator('.hero__title')).toHaveText('Take Your Weekend to the Court');
});

test('header nav links to the campaign top page', async ({ page }) => {
  await page.goto('/ja/');
  await page.click('a[href="/ja/commerce/campaign"]');
  await expect(page).toHaveURL(/\/ja\/commerce\/campaign\/?$/);
});
