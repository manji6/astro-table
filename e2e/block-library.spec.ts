import { expect, test } from '@playwright/test';

// Blockライブラリ。1ページ1Block(アトミックな情報構造)。
// /ja/block-library が一覧(メニューのみ)、/ja/block-library/<name> が各Blockの個別ページ。

test('the index page lists all blocks that have an example.md, grouped by category', async ({ page }) => {
  await page.goto('/ja/block-library');

  await expect(page.locator('.block-library__menu-group')).toHaveCount(3);
  await expect(page.locator('.block-library__menu a')).toHaveCount(13);

  const quoteLink = page.locator('.block-library__menu a', { hasText: 'quote' });
  await expect(quoteLink).toHaveAttribute('href', '/ja/block-library/quote');

  const tabsLink = page.locator('.block-library__menu a', { hasText: 'tabs' });
  await expect(tabsLink).toHaveAttribute('href', '/ja/block-library/tabs');

  const modalLink = page.locator('.block-library__menu a', { hasText: 'modal' });
  await expect(modalLink).toHaveAttribute('href', '/ja/block-library/modal');

  const carouselLink = page.locator('.block-library__menu a', { hasText: 'carousel' });
  await expect(carouselLink).toHaveAttribute('href', '/ja/block-library/carousel');

  const embedLink = page.locator('.block-library__menu a', { hasText: 'embed' });
  await expect(embedLink).toHaveAttribute('href', '/ja/block-library/embed');

  const videoLink = page.locator('.block-library__menu a', { hasText: 'video' });
  await expect(videoLink).toHaveAttribute('href', '/ja/block-library/video');
});

test('a block detail page renders a live preview and the raw source, and links back to the index', async ({
  page,
}) => {
  await page.goto('/ja/block-library/quote');

  await expect(page.locator('h1')).toHaveText('quote');
  // プレビュー: 実際にquote Blockがレンダリングされている(実装と同じ経路)。
  await expect(page.locator('.quote__body')).toHaveText(
    'このサイトのおかげでチェックアウトまでの導線がとても分かりやすくなりました。',
  );
  // ソース: example.mdの生Markdownがそのまま表示されている。
  await expect(page.locator('.block-library__source')).toContainText('| quote (large) | |');

  await page.locator('a', { hasText: 'Block一覧に戻る' }).click();
  await expect(page).toHaveURL(/\/ja\/block-library\/?$/);
});

test('an interactive block (accordion) is fully functional on its own detail page', async ({ page }) => {
  await page.goto('/ja/block-library/accordion');

  const item = page.locator('.accordion__item').first();
  await item.locator('summary').click();
  await expect(item).toHaveJSProperty('open', true);
});

test('a second interactive block (tabs) is fully functional on its own detail page', async ({ page }) => {
  await page.goto('/ja/block-library/tabs');

  const tabButtons = page.locator('.tabs__tab');
  await tabButtons.nth(1).click();
  await expect(tabButtons.nth(1)).toHaveAttribute('aria-selected', 'true');
});

test('the embed preview route renders the Block alone, with no shared header/footer/breadcrumbs', async ({
  page,
}) => {
  await page.goto('/ja/block-library/embed/hero');

  await expect(page.locator('.hero__title')).toHaveText('AstroTableへようこそ');
  await expect(page.locator('.site-header-row')).toHaveCount(0);
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.locator('.breadcrumbs')).toHaveCount(0);
});

test('the embed preview route picks the example matching its own locale segment', async ({ page }) => {
  await page.goto('/ja/block-library/embed/hero');
  await expect(page.locator('.hero__title')).toHaveText('AstroTableへようこそ');

  await page.goto('/en/block-library/embed/hero');
  await expect(page.locator('.hero__title')).toHaveText('Welcome to AstroTable');
});
