import { expect, test } from '@playwright/test';

// お気に入りUI。PDPへの追加ボタン、マイページ(/commerce/member/)からの
// 導線、/commerce/member/favorites/ 一覧ページ(削除含む)を検証する。
// カテゴリ一覧・検索結果への追加は当初実装したがレビューで不要と判断し削除した。

test.beforeEach(async ({ page }) => {
  await page.goto('/ja/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function registerAndLogin(page: import('@playwright/test').Page, memberId: string): Promise<void> {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill(memberId);
  await page.locator('.member-page__save').click();

  await page.goto('/ja/login');
  await page.locator('.login-page__id').fill(memberId);
  await page.locator('.login-page__form button[type="submit"]').click();
  await expect(page.locator('.login-page__status')).toBeVisible();
}

test('favorite button is hidden on the PDP when logged out', async ({ page }) => {
  await page.goto('/ja/commerce/detail/gym-backpack-2way');
  await expect(page.locator('.favorite-button')).toBeHidden();
});

test('logged-in member can add and remove a favorite from the PDP', async ({ page }) => {
  await registerAndLogin(page, 'member-001');

  await page.goto('/ja/commerce/detail/gym-backpack-2way');
  const button = page.locator('.favorite-button');
  await expect(button).toBeVisible();
  await expect(button).toHaveText('お気に入りに追加');

  await button.click();
  await expect(button).toHaveText('お気に入りから削除');
  await expect(button).toHaveClass(/is-active/);

  await button.click();
  await expect(button).toHaveText('お気に入りに追加');
  await expect(button).not.toHaveClass(/is-active/);
});

test('mypage prompts login when logged out, and shows the favorites link when logged in', async ({ page }) => {
  await page.goto('/ja/commerce/member');
  await expect(page.locator('.mypage__logged-out')).toBeVisible();
  await expect(page.locator('.mypage__logged-in')).toBeHidden();

  await registerAndLogin(page, 'member-001');
  await page.goto('/ja/commerce/member');
  await expect(page.locator('.mypage__logged-out')).toBeHidden();
  await expect(page.locator('.mypage__current-id')).toContainText('member-001');
  await expect(page.locator('.mypage__links a')).toHaveAttribute('href', '/ja/commerce/member/favorites');
});

test('header nav links to mypage, which links through to favorites', async ({ page }) => {
  await registerAndLogin(page, 'member-001');

  await page.goto('/ja/commerce/detail/gym-backpack-2way');
  await page.locator('.favorite-button').click();

  await page.click('a[href="/ja/commerce/member"]');
  await expect(page).toHaveURL(/\/ja\/commerce\/member\/?$/);

  await page.locator('.mypage__links a').click();
  await expect(page).toHaveURL(/\/ja\/commerce\/member\/favorites\/?$/);
  await expect(page.locator('.favorites-page__items li')).toHaveCount(1);
});

test('favorites page prompts login when logged out', async ({ page }) => {
  await page.goto('/ja/commerce/member/favorites');
  await expect(page.locator('.favorites-page__not-logged-in')).toBeVisible();
  await expect(page.locator('.favorites-page__items li')).toHaveCount(0);
});

test('favorites page lists added products and supports removal', async ({ page }) => {
  await registerAndLogin(page, 'member-001');

  await page.goto('/ja/commerce/detail/gym-backpack-2way');
  await page.locator('.favorite-button').click();

  await page.goto('/ja/commerce/member/favorites');
  await expect(page.locator('.favorites-page__not-logged-in')).toBeHidden();
  await expect(page.locator('.favorites-page__items li')).toHaveCount(1);
  await expect(page.locator('.favorites-page__items')).toContainText('2WAYジムバックパック');

  await page.locator('.favorites-page__remove').click();
  await expect(page.locator('.favorites-page__items li')).toHaveCount(0);
  await expect(page.locator('.favorites-page__empty')).toBeVisible();
});
