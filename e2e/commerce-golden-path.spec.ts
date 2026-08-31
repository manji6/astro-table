import { expect, test, type Page } from '@playwright/test';

// ゴールデンパスE2E。
// TOP → カテゴリ一覧 or キーワード検索 → PDP → カートに追加 → /commerce/cart → /commerce/cart/checkout
// → /commerce/confirmation → /commerce/order
// を、ACDLの`view_item`/`add-to-cart`/`start-checkout`/`purchase-complete`の各pushとあわせて検証する。
// 商品発見の2経路(カテゴリ一覧・キーワード検索)を、ja/en2ロケールに振り分けてカバーする。

async function captureAcdlEvents(page: Page): Promise<void> {
  // ACDL本体読み込み前に「関数push」でリスナー登録を仕込む
  // (push自体を上書きる方式は、ライブラリ初期化時に上書きが失われるため使えない)。
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
}

async function getAcdlEvents(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(() => (window as unknown as { __acdlEvents: Array<Record<string, unknown>> }).__acdlEvents);
}

async function findEvent(
  page: Page,
  eventName: string,
): Promise<Record<string, unknown> | undefined> {
  const events = await getAcdlEvents(page);
  return events.find((event) => event.event === eventName);
}

test.describe('commerce golden path (ja, via category listing)', () => {
  test('TOP -> category -> PDP -> cart -> checkout -> confirmation -> order', async ({ page }) => {
    await captureAcdlEvents(page);

    await page.goto('/ja/');
    await expect(page).toHaveTitle(/AstroTable/);

    await page.click('a[href="/ja/commerce/category"]');
    await expect(page).toHaveURL(/\/ja\/commerce\/category\/?$/);

    await page.click('a[href="/ja/commerce/category/shoes"]');
    await expect(page).toHaveURL(/\/ja\/commerce\/category\/shoes\/?$/);
    await expect(page.locator('h1')).toHaveText('シューズ');
    await expect(page.locator('.cards__item')).toHaveCount(2);

    await page.click('a[href="/ja/commerce/detail/commute-running-shoes"]');
    await expect(page).toHaveURL(/\/ja\/commerce\/detail\/commute-running-shoes\/?$/);
    await expect(page.locator('.buy-box__price')).toHaveText('￥18,000');
    await expect(page.locator('.buy-box__stock')).toHaveText('在庫あり');

    const viewItem = await findEvent(page, 'view_item');
    expect(viewItem).toMatchObject({
      commerce: { productViews: { value: 1, id: expect.any(String) } },
      productListItems: [
        expect.objectContaining({
          SKU: 'WKDY-SHU-001',
          currencyCode: 'JPY',
          priceTotal: 18000,
          productImageUrl: '/images/products/commute-running-shoes.png',
        }),
      ],
    });

    await page.click('.buy-box__submit');
    await page.waitForTimeout(200);
    const addToCart = await findEvent(page, 'add-to-cart');
    expect(addToCart).toMatchObject({
      commerce: { cart: { cartSource: 'product_detail' } },
      productListItems: [expect.objectContaining({ SKU: 'WKDY-SHU-001', quantity: 1, priceTotal: 18000 })],
    });

    await page.goto('/ja/commerce/cart');
    await expect(page.locator('.cart-page__items li')).toHaveCount(1);
    await expect(page.locator('.cart-page__subtotal')).toHaveText('小計: ￥18,000');

    await page.goto('/ja/commerce/cart/checkout');
    await expect(page).toHaveURL(/\/ja\/commerce\/cart\/checkout\/?$/); // カートが空でないのでリダイレクトされない
    const startCheckout = await findEvent(page, 'start-checkout');
    expect(startCheckout).toMatchObject({
      commerce: {
        checkouts: { value: 1 },
        cart: { cartID: expect.any(String), cartSource: 'cart_page' },
      },
      productListItems: [
        expect.objectContaining({ SKU: 'WKDY-SHU-001', quantity: 1, priceTotal: 18000, currencyCode: 'JPY' }),
      ],
    });

    await page.fill('input[name="name"]', 'テスト太郎');
    await page.fill('input[name="address"]', '東京都渋谷区1-2-3');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/ja\/commerce\/confirmation\/?$/);
    await expect(page.locator('.confirmation-page__name')).toHaveText('テスト太郎');
    await expect(page.locator('.confirmation-page__address')).toHaveText('東京都渋谷区1-2-3');
    await expect(page.locator('.confirmation-page__items')).toContainText('コミュートランニングシューズ');
    await page.click('.confirmation-page__submit');

    await expect(page).toHaveURL(/\/ja\/commerce\/order\/?$/);
    await expect(page.locator('.complete-page__order-id')).toContainText('注文番号: ORD-');
    await expect(page.locator('.complete-page__items')).toContainText('コミュートランニングシューズ');
    await expect(page.locator('.complete-page__total')).toHaveText('合計: ￥18,000');
    const purchaseComplete = await findEvent(page, 'purchase-complete');
    expect(purchaseComplete).toMatchObject({
      commerce: {
        purchases: { value: 1, id: expect.stringMatching(/^purchase-event-ORD-/) },
        order: {
          purchaseID: expect.stringMatching(/^ORD-/),
          currencyCode: 'JPY',
          priceTotal: 18000,
          payments: [expect.objectContaining({ paymentAmount: 18000, paymentType: 'credit_card' })],
        },
        cart: { cartID: expect.any(String) },
      },
      productListItems: [expect.objectContaining({ SKU: 'WKDY-SHU-001', quantity: 1, priceTotal: 18000 })],
    });

    await page.goto('/ja/commerce/cart');
    await expect(page.locator('.cart-page__empty')).toBeVisible();
  });
});

test.describe('commerce golden path (en, via keyword search)', () => {
  test('TOP -> search -> PDP -> cart -> checkout -> confirmation -> order', async ({ page }) => {
    await captureAcdlEvents(page);

    await page.goto('/en/');
    await expect(page).toHaveTitle(/AstroTable/);

    await page.click('a[href="/en/commerce/search"]');
    await page.fill('.search-form__input', 'Briefcase');
    await page.click('.search-form button[type="submit"]');
    await expect(page).toHaveURL(/\/en\/commerce\/search\?q=Briefcase/);
    await expect(page.locator('.search-status')).toHaveText('1 result(s) found');

    await page.click('.search-results a');
    await expect(page).toHaveURL(/\/en\/commerce\/detail\/commuter-briefcase\/?$/);
    await expect(page.locator('.buy-box__price')).toHaveText('$149.99');
    await expect(page.locator('.buy-box__stock')).toHaveText('In stock');

    const viewItem = await findEvent(page, 'view_item');
    expect(viewItem).toMatchObject({
      commerce: { productViews: { value: 1, id: expect.any(String) } },
      productListItems: [
        expect.objectContaining({
          SKU: 'WKDY-BAG-002',
          currencyCode: 'USD',
          priceTotal: 149.99,
          productImageUrl: '/images/products/commuter-briefcase.png',
        }),
      ],
    });

    await page.click('.buy-box__submit');
    await page.waitForTimeout(200);
    const addToCart = await findEvent(page, 'add-to-cart');
    expect(addToCart).toMatchObject({
      commerce: { cart: { cartSource: 'product_detail' } },
      productListItems: [expect.objectContaining({ SKU: 'WKDY-BAG-002', quantity: 1, priceTotal: 149.99 })],
    });

    await page.goto('/en/commerce/cart');
    await expect(page.locator('.cart-page__items li')).toHaveCount(1);
    await expect(page.locator('.cart-page__subtotal')).toHaveText('Subtotal: $149.99');

    await page.goto('/en/commerce/cart/checkout');
    await expect(page).toHaveURL(/\/en\/commerce\/cart\/checkout\/?$/);
    const startCheckout = await findEvent(page, 'start-checkout');
    expect(startCheckout).toMatchObject({
      commerce: {
        checkouts: { value: 1 },
        cart: { cartID: expect.any(String), cartSource: 'cart_page' },
      },
      productListItems: [
        expect.objectContaining({ SKU: 'WKDY-BAG-002', quantity: 1, priceTotal: 149.99, currencyCode: 'USD' }),
      ],
    });

    await page.fill('input[name="name"]', 'Jane Doe');
    await page.fill('input[name="address"]', '123 Main St');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/en\/commerce\/confirmation\/?$/);
    await expect(page.locator('.confirmation-page__name')).toHaveText('Jane Doe');
    await expect(page.locator('.confirmation-page__address')).toHaveText('123 Main St');
    await expect(page.locator('.confirmation-page__items')).toContainText('Commuter Briefcase');
    await page.click('.confirmation-page__submit');

    await expect(page).toHaveURL(/\/en\/commerce\/order\/?$/);
    await expect(page.locator('.complete-page__order-id')).toContainText('Order number: ORD-');
    await expect(page.locator('.complete-page__items')).toContainText('Commuter Briefcase');
    await expect(page.locator('.complete-page__total')).toHaveText('Total: $149.99');
    const purchaseComplete = await findEvent(page, 'purchase-complete');
    expect(purchaseComplete).toMatchObject({
      commerce: {
        purchases: { value: 1, id: expect.stringMatching(/^purchase-event-ORD-/) },
        order: {
          purchaseID: expect.stringMatching(/^ORD-/),
          currencyCode: 'USD',
          priceTotal: 149.99,
          payments: [expect.objectContaining({ paymentAmount: 149.99, paymentType: 'credit_card' })],
        },
        cart: { cartID: expect.any(String) },
      },
      productListItems: [expect.objectContaining({ SKU: 'WKDY-BAG-002', quantity: 1, priceTotal: 149.99 })],
    });

    await page.goto('/en/commerce/cart');
    await expect(page.locator('.cart-page__empty')).toBeVisible();
  });
});

test.describe('multi-item purchase', () => {
  test('start-checkout/purchase-complete carry productListItems for every item in a multi-item order', async ({
    page,
  }) => {
    await captureAcdlEvents(page);

    await page.goto('/ja/commerce/detail/commute-running-shoes');
    await page.click('.buy-box__submit');
    await page.waitForTimeout(200);

    await page.goto('/ja/commerce/detail/performance-dress-shirt');
    await page.click('.buy-box__submit');
    await page.waitForTimeout(200);

    await page.goto('/ja/commerce/cart');
    await expect(page.locator('.cart-page__items li')).toHaveCount(2);

    await page.goto('/ja/commerce/cart/checkout');
    const startCheckout = await findEvent(page, 'start-checkout');
    const checkoutItems = startCheckout?.productListItems as Array<{ SKU: string }> | undefined;
    expect(checkoutItems?.map((item) => item.SKU).sort()).toEqual(['WKDY-SHT-001', 'WKDY-SHU-001']);

    await page.fill('input[name="name"]', 'テスト太郎');
    await page.fill('input[name="address"]', '東京都渋谷区1-2-3');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/ja\/commerce\/confirmation\/?$/);
    await page.click('.confirmation-page__submit');
    await expect(page).toHaveURL(/\/ja\/commerce\/order\/?$/);

    const purchaseComplete = await findEvent(page, 'purchase-complete');
    const purchaseItems = purchaseComplete?.productListItems as Array<{ SKU: string }> | undefined;
    expect(purchaseItems?.map((item) => item.SKU).sort()).toEqual(['WKDY-SHT-001', 'WKDY-SHU-001']);
    expect(purchaseComplete).toMatchObject({ commerce: { order: { priceTotal: 18000 + 9800 } } });
  });
});

test.describe('purchase-complete de-duplication', () => {
  test('reloading the order-complete page does not push purchase-complete again', async ({ page }) => {
    await captureAcdlEvents(page);

    await page.goto('/ja/commerce/detail/commute-running-shoes');
    await page.click('.buy-box__submit');
    await page.waitForTimeout(200);

    await page.goto('/ja/commerce/cart/checkout');
    await page.fill('input[name="name"]', 'テスト太郎');
    await page.fill('input[name="address"]', '東京都渋谷区1-2-3');
    await page.click('button[type="submit"]');
    await page.click('.confirmation-page__submit');
    await expect(page).toHaveURL(/\/ja\/commerce\/order\/?$/);

    const firstLoadEvents = await getAcdlEvents(page);
    expect(firstLoadEvents.filter((event) => event.event === 'purchase-complete')).toHaveLength(1);

    await page.reload();
    const reloadEvents = await getAcdlEvents(page);
    expect(reloadEvents.filter((event) => event.event === 'purchase-complete')).toHaveLength(0);
  });
});

test.describe('search scope', () => {
  test('matches on description text, not just title/tags', async ({ page }) => {
    // "reflective" only appears in commute-running-shoes' description, not in its title
    // ("Commute Running Shoes") or tags (["running", "commute"]).
    await page.goto('/en/commerce/search?q=reflective');
    await expect(page.locator('.search-status')).toHaveText('1 result(s) found');
    await expect(page.locator('.search-results a')).toHaveAttribute('href', '/en/commerce/detail/commute-running-shoes');
  });
});
