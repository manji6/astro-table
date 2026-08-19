import { expect, test } from '@playwright/test';

// ログインページ(/login)。登録済み会員IDでのログイン成功、未登録IDでのエラー、
// ログアウト、他タブ相当のstorage同期(member:login/logout)を検証する。

test.beforeEach(async ({ page }) => {
  await page.goto('/ja/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('shows the login form when logged out', async ({ page }) => {
  await expect(page.locator('.login-page__form')).toBeVisible();
  await expect(page.locator('.login-page__status')).toBeHidden();
});

test('shows an error for an unregistered member id and does not log in', async ({ page }) => {
  await page.locator('.login-page__id').fill('unknown-member');
  await page.locator('.login-page__form button[type="submit"]').click();

  await expect(page.locator('.login-page__error')).toBeVisible();
  await expect(page.locator('.login-page__form')).toBeVisible();
});

test('logs in with a registered member id and shows the logged-in status', async ({ page }) => {
  // 会員発行ページで先に登録してから戻ってくる。
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__email').fill('member-001@example.com');
  await page.locator('.member-page__save').click();

  await page.goto('/ja/login');
  await page.locator('.login-page__id').fill('member-001');
  await page.locator('.login-page__form button[type="submit"]').click();

  await expect(page.locator('.login-page__status')).toBeVisible();
  await expect(page.locator('.login-page__current-id')).toContainText('member-001');
  await expect(page.locator('.login-page__form')).toBeHidden();
});

test('logout returns to the login form', async ({ page }) => {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__email').fill('member-001@example.com');
  await page.locator('.member-page__save').click();

  await page.goto('/ja/login');
  await page.locator('.login-page__id').fill('member-001');
  await page.locator('.login-page__form button[type="submit"]').click();
  await expect(page.locator('.login-page__status')).toBeVisible();

  await page.locator('.login-page__logout').click();
  await expect(page.locator('.login-page__form')).toBeVisible();
  await expect(page.locator('.login-page__status')).toBeHidden();
});

// 会員発行ページのクイックスイッチから/loginへ遷移すると、
// 既にログイン済みの状態として表示される(統合テスト)。
test('quick-switch from the member page logs the member in and lands on the login page already authenticated', async ({
  page,
}) => {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__email').fill('member-001@example.com');
  await page.locator('.member-page__save').click();

  await page.locator('.member-page__members li[data-id="member-001"] .member-page__login').click();
  await expect(page).toHaveURL(/\/ja\/login\/?$/);
  await expect(page.locator('.login-page__current-id')).toContainText('member-001');
});
