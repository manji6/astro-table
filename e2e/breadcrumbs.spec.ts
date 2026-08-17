import { expect, test } from '@playwright/test';

// パンくずリスト。通常ページ(pagesコレクション)は自動組み立て、
// PDP/カテゴリ一覧・commerceの固定テンプレート全般(commerceの固定テンプレート)は
// 手動trailを検証する。commerce配下の7ページは、当初pathのみ渡していて
// 自動モードのフォールバック(未翻訳の生スラッグ)になっていた不具合の再発防止も兼ねる。

test('auto mode: nested content pages build a breadcrumb trail from ancestor page titles', async ({ page }) => {
  await page.goto('/ja/about/company/profile');

  const crumbs = page.locator('.breadcrumbs__item');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0).locator('a')).toHaveText('ホーム');
  await expect(crumbs.nth(1).locator('a')).toHaveText('企業情報');
  await expect(crumbs.nth(1).locator('a')).toHaveAttribute('href', '/ja/about');
  await expect(crumbs.nth(2).locator('a')).toHaveText('会社概要');
  await expect(crumbs.nth(2).locator('a')).toHaveAttribute('href', '/ja/about/company');
  // 現在ページ自身はリンクにしない。
  await expect(crumbs.nth(3).locator('span[aria-current="page"]')).toHaveText('プロフィール');
});

// 祖先セグメント(orphan/)にindex.mdが無い場合、そのレベルを黙って消さず、
// raw slugをリンクなしテキストとして表示することを確認する(retrospective post-#9〜#27)。
test('auto mode: falls back to the raw slug (no link) for an ancestor segment with no index page', async ({
  page,
}) => {
  await page.goto('/ja/orphan/deep');

  const crumbs = page.locator('.breadcrumbs__item');
  await expect(crumbs).toHaveCount(3);
  await expect(crumbs.nth(0).locator('a')).toHaveText('ホーム');
  // orphan/index.mdが無いので、リンクなしのraw slugとして表示される。
  await expect(crumbs.nth(1).locator('a')).toHaveCount(0);
  await expect(crumbs.nth(1)).toHaveText('orphan');
  await expect(crumbs.nth(2).locator('span[aria-current="page"]')).toHaveText('深いページ');
});

test('the top page has no breadcrumbs', async ({ page }) => {
  await page.goto('/ja/');
  await expect(page.locator('.breadcrumbs')).toHaveCount(0);
});

test('manual mode: PDP shows category > product name using taxonomy display names', async ({ page }) => {
  await page.goto('/ja/commerce/detail/commute-running-shoes');

  const crumbs = page.locator('.breadcrumbs__item');
  await expect(crumbs).toHaveCount(3);
  await expect(crumbs.nth(0).locator('a')).toHaveText('ホーム');
  await expect(crumbs.nth(1).locator('a')).toHaveText('シューズ');
  await expect(crumbs.nth(1).locator('a')).toHaveAttribute('href', '/ja/commerce/category/shoes');
  await expect(crumbs.nth(2).locator('span[aria-current="page"]')).toHaveText('コミュートランニングシューズ');
});

test('manual mode: category page shows only the category name', async ({ page }) => {
  await page.goto('/ja/commerce/category/shoes');

  const crumbs = page.locator('.breadcrumbs__item');
  await expect(crumbs).toHaveCount(2);
  await expect(crumbs.nth(0).locator('a')).toHaveText('ホーム');
  await expect(crumbs.nth(1).locator('span[aria-current="page"]')).toHaveText('シューズ');
});

// commerce配下の固定テンプレートページで「commerce」segmentが未翻訳の
// 生スラッグ表示になっていた不具合の修正確認。
test('manual mode: commerce top has a single crumb (no "commerce" raw slug)', async ({ page }) => {
  await page.goto('/ja/commerce');

  const crumbs = page.locator('.breadcrumbs__item');
  await expect(crumbs).toHaveCount(2);
  await expect(crumbs.nth(0).locator('a')).toHaveText('ホーム');
  await expect(crumbs.nth(1).locator('span[aria-current="page"]')).toHaveText('コマースサイト');
});

test('manual mode: search/category-top/cart/confirmation/order link back through commerce top', async ({ page }) => {
  const cases: Array<{ path: string; label: string }> = [
    { path: '/ja/commerce/search', label: 'キーワード検索' },
    { path: '/ja/commerce/category', label: '商品カテゴリ' },
    { path: '/ja/commerce/cart', label: 'カート' },
    { path: '/ja/commerce/confirmation', label: 'ご注文内容の確認' },
    { path: '/ja/commerce/order', label: 'ご注文ありがとうございました' },
  ];

  for (const { path, label } of cases) {
    await page.goto(path);
    const crumbs = page.locator('.breadcrumbs__item');
    await expect(crumbs).toHaveCount(3);
    await expect(crumbs.nth(1).locator('a')).toHaveText('コマースサイト');
    await expect(crumbs.nth(1).locator('a')).toHaveAttribute('href', '/ja/commerce');
    await expect(crumbs.nth(2).locator('span[aria-current="page"]')).toHaveText(label);
  }
});

test('manual mode: checkout links back through both commerce top and cart', async ({ page }) => {
  // checkoutはカートが空だと/commerce/cartへリダイレクトされる仕様のため、先に1点追加する。
  await page.goto('/ja/commerce/detail/commute-running-shoes');
  await page.click('.buy-box__submit');
  await page.waitForTimeout(200);

  await page.goto('/ja/commerce/cart/checkout');

  const crumbs = page.locator('.breadcrumbs__item');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(1).locator('a')).toHaveText('コマースサイト');
  await expect(crumbs.nth(1).locator('a')).toHaveAttribute('href', '/ja/commerce');
  await expect(crumbs.nth(2).locator('a')).toHaveText('カート');
  await expect(crumbs.nth(2).locator('a')).toHaveAttribute('href', '/ja/commerce/cart');
  await expect(crumbs.nth(3).locator('span[aria-current="page"]')).toHaveText('ご購入手続き');
});
