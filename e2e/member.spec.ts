import { expect, test } from '@playwright/test';

// 会員発行ページ(/member)。新規作成・一覧表示・編集・Export/Import・
// クイックスイッチ(一覧からのログイン)を検証する。

test.beforeEach(async ({ page }) => {
  await page.goto('/ja/member');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('creates a new member with attributes and lists it', async ({ page }) => {
  // フォームには起動時から空の属性行が1つ用意されているので、追加クリックは不要。
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__attr-key').fill('plan');
  await page.locator('.member-page__attr-value').fill('gold');
  await page.locator('.member-page__save').click();

  await expect(page.locator('.member-page__message')).toHaveText('会員を登録しました。');
  const item = page.locator('.member-page__members li[data-id="member-001"]');
  await expect(item).toContainText('member-001');
  await expect(item).toContainText('plan=gold');
});

test('editing an existing member loads its attributes back into the form', async ({ page }) => {
  // フォームには起動時から空の属性行が1つ用意されているので、追加クリックは不要。
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__attr-key').fill('plan');
  await page.locator('.member-page__attr-value').fill('gold');
  await page.locator('.member-page__save').click();

  await page.locator('.member-page__members li[data-id="member-001"] .member-page__edit').click();
  await expect(page.locator('.member-page__id')).toHaveValue('member-001');
  await expect(page.locator('.member-page__attr-value')).toHaveValue('gold');

  await page.locator('.member-page__attr-value').fill('platinum');
  await page.locator('.member-page__save').click();
  await expect(page.locator('.member-page__message')).toHaveText('会員情報を更新しました。');
  await expect(page.locator('.member-page__members li[data-id="member-001"]')).toContainText('plan=platinum');
});

test('deletes a member from the list', async ({ page }) => {
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__save').click();
  await expect(page.locator('.member-page__members li[data-id="member-001"]')).toBeVisible();

  await page.locator('.member-page__members li[data-id="member-001"] .member-page__delete').click();
  await expect(page.locator('.member-page__members li[data-id="member-001"]')).toHaveCount(0);
  await expect(page.locator('.member-page__empty')).toBeVisible();
});

// クイックスイッチ(一覧の「ログインする」ボタンからのログイン)は/loginページの存在が
// 前提のため、両ページが揃うe2e/login.spec.ts側で統合的に検証する。

test('export downloads the roster as JSON and import restores it', async ({ page }) => {
  // フォームには起動時から空の属性行が1つ用意されているので、追加クリックは不要。
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__attr-key').fill('plan');
  await page.locator('.member-page__attr-value').fill('gold');
  await page.locator('.member-page__save').click();

  const downloadPromise = page.waitForEvent('download');
  await page.locator('.member-page__export').click();
  const download = await downloadPromise;
  const exportPath = await download.path();
  expect(exportPath).toBeTruthy();

  // インポート: エクスポートされたファイルをそのままアップロードして復元できることを確認する。
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.member-page__members li')).toHaveCount(0);

  await page.locator('.member-page__import').setInputFiles(exportPath as string);
  await expect(page.locator('.member-page__members li[data-id="member-001"]')).toContainText('plan=gold');
});
