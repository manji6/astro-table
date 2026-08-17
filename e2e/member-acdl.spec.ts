import { expect, test } from '@playwright/test';

// 会員ログイン/ログアウトでACDLのuser名前空間へpushされることを、
// 実際にブラウザ上でMemberOverlay経由の配線を通して確認する(CLAUDE.md記載の過去バグ
// - ACDLブリッジの配線漏れでイベントが一切pushされなかった実績 - の再発防止)。

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.adobeDataLayer = window.adobeDataLayer || [];
    (window as unknown as { __acdlEvents: unknown[] }).__acdlEvents = [];
    window.adobeDataLayer.push(((dataLayer: {
      addEventListener: (event: string, handler: (e: unknown) => void) => void;
    }) => {
      dataLayer.addEventListener('adobeDataLayer:change', (event) => {
        (window as unknown as { __acdlEvents: unknown[] }).__acdlEvents.push(event);
      });
    }) as unknown as Record<string, unknown>);
  });

  await page.goto('/ja/sample-blocks');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function getAcdlEvents(page: import('@playwright/test').Page) {
  return page.evaluate(
    () => (window as unknown as { __acdlEvents: Array<Record<string, unknown>> }).__acdlEvents,
  );
}

test('logging in via the overlay pushes the user namespace to ACDL', async ({ page }) => {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__attr-key').fill('plan');
  await page.locator('.member-page__attr-value').fill('gold');
  await page.locator('.member-page__save').click();

  await page.goto('/ja/sample-blocks');
  await page.locator('.member-overlay__quick-switch').selectOption('member-001');
  await page.locator('.member-overlay__quick-login').click();
  await expect(page.locator('.member-overlay__logged-in')).toBeVisible();

  const events = await getAcdlEvents(page);
  const userEvent = events.find((e) => {
    const state = e as { user?: unknown };
    return state.user && typeof state.user === 'object';
  });
  expect(userEvent).toMatchObject({ user: { id: 'member-001', plan: 'gold' } });
});

test('logging out via the overlay pushes user: null to ACDL', async ({ page }) => {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__save').click();
  await page.locator('.member-page__members li[data-id="member-001"] .member-page__login').click();

  await page.goto('/ja/sample-blocks');
  await expect(page.locator('.member-overlay__logged-in')).toBeVisible();

  await page.locator('.member-overlay__logout').click();
  await expect(page.locator('.member-overlay__logged-out')).toBeVisible();

  const events = await getAcdlEvents(page);
  const logoutEvent = events.find((e) => 'user' in e && e.user === null);
  expect(logoutEvent).toBeTruthy();
});

// 実際に発生した不具合の再現テスト: 会員発行ページの「ログインする」ボタンは
// login()を呼んだ直後にフルページ遷移する。window.adobeDataLayerはページ単位なので、
// 遷移前のpushが失われ、遷移後のページのgetState()にuserが反映されない不具合があった。
test('user namespace survives a full-page navigation triggered by the quick-switch login button', async ({
  page,
}) => {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__attr-key').fill('plan');
  await page.locator('.member-page__attr-value').fill('gold');
  await page.locator('.member-page__save').click();

  await page.locator('.member-page__members li[data-id="member-001"] .member-page__login').click();
  await expect(page).toHaveURL(/\/ja\/login\/?$/);

  const state = await page.evaluate(() =>
    (window.adobeDataLayer as unknown as { getState: () => Record<string, unknown> }).getState(),
  );
  expect(state).toMatchObject({ user: { id: 'member-001', plan: 'gold' } });
});

// ログインページ(#39)から直接ログインした場合もACDLへ届くことを確認する
// (発生源に関わらずMemberOverlay側の1箇所で確実に配線されていることの検証)。
test('logging in via the login page (not the overlay) still pushes to ACDL', async ({ page }) => {
  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__save').click();

  await page.goto('/ja/login');
  await page.locator('.login-page__id').fill('member-001');
  await page.locator('.login-page__form button[type="submit"]').click();
  await expect(page.locator('.login-page__status')).toBeVisible();

  const events = await getAcdlEvents(page);
  const userEvent = events.find((e) => {
    const state = e as { user?: unknown };
    return state.user && typeof state.user === 'object';
  });
  expect(userEvent).toMatchObject({ user: { id: 'member-001' } });
});
