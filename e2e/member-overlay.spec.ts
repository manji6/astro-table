import { expect, test } from '@playwright/test';

// ログイン状態オーバーレイ。全ページ共通で表示され、ログイン/ログアウト/
// クイックスイッチがページ遷移なしで反映されることを検証する。

test.beforeEach(async ({ page }) => {
  await page.goto('/ja/sample-blocks');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('appears on an arbitrary page (not just /login or /member)', async ({ page }) => {
  await expect(page.locator('.member-overlay')).toBeVisible();
  await expect(page.locator('.member-overlay__logged-out')).toBeVisible();
  await expect(page.locator('.member-overlay__logged-in')).toBeHidden();
});

test('quick-switch dropdown is disabled with a placeholder when no members are registered', async ({ page }) => {
  await expect(page.locator('.member-overlay__quick-switch')).toBeDisabled();
  await expect(page.locator('.member-overlay__quick-login')).toBeDisabled();
});

test('logs in via the quick-switch dropdown without leaving the current page', async ({ page }) => {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__save').click();

  await page.goto('/ja/sample-blocks');
  await page.locator('.member-overlay__quick-switch').selectOption('member-001');
  await page.locator('.member-overlay__quick-login').click();

  await expect(page).toHaveURL(/\/ja\/sample-blocks\/?$/);
  await expect(page.locator('.member-overlay__logged-in')).toBeVisible();
  await expect(page.locator('.member-overlay__current-id')).toContainText('member-001');
});

test('logs out via the overlay without leaving the current page', async ({ page }) => {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__save').click();
  await page.locator('.member-page__members li[data-id="member-001"] .member-page__login').click();

  await page.goto('/ja/sample-blocks');
  await expect(page.locator('.member-overlay__logged-in')).toBeVisible();

  await page.locator('.member-overlay__logout').click();
  await expect(page.locator('.member-overlay__logged-out')).toBeVisible();
  await expect(page.locator('.member-overlay__logged-in')).toBeHidden();
});

// ログインページ操作(ページ遷移あり)がオーバーレイにも即座に反映されることを確認する。
test('reflects login performed on the /login page without a manual refresh', async ({ page }) => {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__save').click();

  await page.goto('/ja/login');
  await page.locator('.login-page__id').fill('member-001');
  await page.locator('.login-page__form button[type="submit"]').click();

  await expect(page.locator('.member-overlay__logged-in')).toBeVisible();
  await expect(page.locator('.member-overlay__current-id')).toContainText('member-001');
});
