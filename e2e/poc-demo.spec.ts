import { expect, test } from '@playwright/test';

// パース層+BlockRenderer方式の受け入れ確認。
test('poc-demo page renders mixed prose/block content with working card links', async ({ page }) => {
  await page.goto('/ja/poc-demo');

  await expect(page.locator('h1')).toHaveText('ようこそ');

  const cardItems = page.locator('.cards__item');
  await expect(cardItems).toHaveCount(2);
  const image = cardItems.first().locator('img');
  await expect(image).toHaveAttribute('src', '/images/shoes.svg');
  // src属性の値だけでなく、実際に画像が読み込めている(404でない)ことも確認する。
  await expect(image).toHaveJSProperty('complete', true);
  const naturalWidth = await image.evaluate((el: HTMLImageElement) => el.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(0);

  // カード全体がリンクなので、画像やタイトル部分をクリックしても遷移する。
  await cardItems.first().click();
  await expect(page).toHaveURL(/\/ja\/commerce\/detail\/commute-running-shoes\/?$/);
});
