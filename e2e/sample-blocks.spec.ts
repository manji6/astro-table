import { expect, test } from '@playwright/test';

// accordionの開閉でACDLパターンB(pushEvent)のイベントが
// pushされることを検証する。
test('accordion toggle pushes an ACDL event via pushEvent (pattern B)', async ({ page }) => {
  // ACDL本体読み込み前に、リスナー登録用の関数をpushしておく
  // (ACDLが対応する「関数push」= 読み込み後にdataLayerインスタンスを引数に実行される)。
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

  const firstItem = page.locator('.accordion__item').first();
  await firstItem.locator('summary').click();
  await expect(firstItem).toHaveJSProperty('open', true);

  const events = await page.evaluate(() => (window as unknown as { __acdlEvents: Array<Record<string, unknown>> }).__acdlEvents);
  const toggleEvent = events.find((event) => event.event === 'accordion_toggle');

  expect(toggleEvent).toMatchObject({
    event: 'accordion_toggle',
    blockName: 'accordion',
    state: 'open',
  });
});

// ACDL初期化(Base.astro)が"page loaded"というevent Objectとしてpushしていることを検証する
// (ACDL公式wiki記載の規約。eventキーが無いと単なる状態マージになりイベントが発火しない)。
// "page loaded"はbody末尾(user/view_item等の同ページ内コンテキストが揃った後)で発火する
// 設計のため、付随データを持たない(Issue #7)。付随データなしのイベントpushは
// 'adobeDataLayer:change'では拾えず'adobeDataLayer:event'で拾う必要がある(ACDLの仕様)。
test('page load pushes a "page loaded" ACDL event', async ({ page }) => {
  await page.addInitScript(() => {
    window.adobeDataLayer = window.adobeDataLayer || [];
    (window as unknown as { __acdlEvents: unknown[] }).__acdlEvents = [];
    window.adobeDataLayer.push(((dataLayer: {
      addEventListener: (event: string, handler: (e: unknown) => void) => void;
    }) => {
      const record = (event: unknown) => (window as unknown as { __acdlEvents: unknown[] }).__acdlEvents.push(event);
      dataLayer.addEventListener('adobeDataLayer:change', record);
      dataLayer.addEventListener('adobeDataLayer:event', record);
    }) as unknown as Record<string, unknown>);
  });

  await page.goto('/ja/sample-blocks');

  const events = await page.evaluate(() => (window as unknown as { __acdlEvents: Array<Record<string, unknown>> }).__acdlEvents);
  const pageLoadedEvent = events.find((event) => event.event === 'page loaded');

  expect(pageLoadedEvent).toMatchObject({ event: 'page loaded' });
});

// Issue #7: "page loaded"は、user(会員データ)等の全コンテキストがpushされた「後」に
// body末尾で発火する設計にする。page(状態)自体はhead最速のまま維持するので、
// タグマネージャーが誤ってpageのpushをトリガーにPage Viewを送出しても全コンテキストが
// 揃わない、という懸念に対する回避策。
test('page loaded is pushed after the user namespace when logged in', async ({ page }) => {
  await page.addInitScript(() => {
    window.adobeDataLayer = window.adobeDataLayer || [];
    (window as unknown as { __acdlEvents: unknown[] }).__acdlEvents = [];
    window.adobeDataLayer.push(((dataLayer: {
      addEventListener: (event: string, handler: (e: unknown) => void) => void;
    }) => {
      const record = (event: unknown) => (window as unknown as { __acdlEvents: unknown[] }).__acdlEvents.push(event);
      dataLayer.addEventListener('adobeDataLayer:change', record);
      dataLayer.addEventListener('adobeDataLayer:event', record);
    }) as unknown as Record<string, unknown>);
  });

  await page.goto('/ja/member');
  await page.locator('.member-page__id').fill('member-001');
  await page.locator('.member-page__email').fill('member-001@example.com');
  await page.locator('.member-page__attr-key').fill('plan');
  await page.locator('.member-page__attr-value').fill('gold');
  await page.locator('.member-page__save').click();
  await page.locator('.member-page__members li[data-id="member-001"] .member-page__login').click();
  await expect(page).toHaveURL(/\/ja\/login\/?$/);

  await page.goto('/ja/sample-blocks');
  await expect(page.locator('.member-overlay__logged-in')).toBeVisible();

  const events = await page.evaluate(() => (window as unknown as { __acdlEvents: Array<Record<string, unknown>> }).__acdlEvents);
  const userIndex = events.findIndex((event) => {
    const state = event as { user?: unknown };
    return state.user && typeof state.user === 'object';
  });
  const pageLoadedIndex = events.findIndex((event) => event.event === 'page loaded');

  expect(userIndex).toBeGreaterThanOrEqual(0);
  expect(pageLoadedIndex).toBeGreaterThan(userIndex);
});

// modalの開閉(トリガークリック・ネイティブcloseイベント)でACDLパターンB(pushEvent)の
// イベントがpushされることを検証する。
test('modal open/close pushes ACDL events via pushEvent (pattern B)', async ({ page }) => {
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

  const dialog = page.locator('dialog.modal');
  await page.locator('.modal__trigger', { hasText: 'サイズ表を見る' }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();

  const events = await page.evaluate(() => (window as unknown as { __acdlEvents: Array<Record<string, unknown>> }).__acdlEvents);
  const openEvent = events.find((event) => event.event === 'modal_toggle' && event.state === 'open');
  const closeEvent = events.find((event) => event.event === 'modal_toggle' && event.state === 'closed');

  expect(openEvent).toMatchObject({ event: 'modal_toggle', blockName: 'modal', state: 'open' });
  expect(closeEvent).toMatchObject({ event: 'modal_toggle', blockName: 'modal', state: 'closed' });
});

// tabsの切り替えでACDLパターンB(pushEvent)のイベントがpushされることを検証する。
test('tabs switch pushes an ACDL event via pushEvent (pattern B)', async ({ page }) => {
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

  const tabs = page.locator('.tabs').first();
  const secondTabLabel = await tabs.locator('.tabs__tab').nth(1).textContent();
  await tabs.locator('.tabs__tab').nth(1).click();

  const events = await page.evaluate(() => (window as unknown as { __acdlEvents: Array<Record<string, unknown>> }).__acdlEvents);
  const switchEvent = events.find((event) => event.event === 'tabs_switch');

  expect(switchEvent).toMatchObject({ event: 'tabs_switch', blockName: 'tabs', label: secondTabLabel?.trim() });
});

test('header/footer render nav links and cards/hero/table content on the sample page', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  await expect(page.locator('.site-header a', { hasText: 'ホーム' })).toBeVisible();
  await expect(page.locator('.site-footer')).toBeVisible();
  await expect(page.locator('.hero__title')).toHaveText('AstroTableへようこそ');
  await expect(page.locator('.cards__item')).toHaveCount(2);
  await expect(page.locator('.data-table td').first()).toBeVisible();
});

// section-metadata Blockのstyleキーが、そのセクションだけにCSSクラスとして
// 反映され(他のセクションには影響しない)、本文には何も描画されないことを確認する。
test('section-metadata applies a CSS class to only the section it is placed in', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  const highlighted = page.locator('.block-section.highlight');
  await expect(highlighted).toHaveCount(1);
  await expect(highlighted).toContainText('セクション背景');
  // section-metadata Block自体(1列目=style, 2列目=highlight)は本文に描画されない。
  await expect(highlighted).not.toContainText('highlight');

  await expect(page.locator('.block-section:not(.highlight)')).toHaveCount(14);
});

// embed Blockが、対応するURL(YouTube)から正しいiframeを生成することを確認する。
test('embed block renders a YouTube URL as an iframe with the expected src', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  const iframe = page.locator('.embed iframe');
  await expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
});

// video Blockが自前ホストの動画ファイルを<video>タグで再生できることを確認する。
test('video block plays a self-hosted video file', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  const video = page.locator('video.video');
  await expect(video).toHaveAttribute('src', '/videos/demo.mp4');
  await video.evaluate((el: HTMLVideoElement) => el.play());
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0);
});

// video BlockがYouTube等の外部URLの場合はembed Blockと同じロジックでiframe埋め込みになることを確認する。
test('video block renders an external URL (YouTube) as an iframe, reusing the embed logic', async ({ page }) => {
  await page.goto('/en/sample-blocks');

  const iframe = page.locator('.video--embed iframe');
  await expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
});

// tabs Blockのクリック切替・キーボード操作(矢印キー)を検証する。
test('tabs block switches panels on click and supports arrow-key navigation', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  const tabs = page.locator('.tabs').first();
  const tabButtons = tabs.locator('.tabs__tab');
  const panels = tabs.locator('.tabs__panel');

  await expect(tabButtons.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(panels.nth(0)).toBeVisible();
  await expect(panels.nth(1)).toBeHidden();

  await tabButtons.nth(1).click();
  await expect(tabButtons.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(panels.nth(1)).toBeVisible();
  await expect(panels.nth(0)).toBeHidden();

  await tabButtons.nth(1).press('ArrowRight');
  await expect(tabButtons.nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(panels.nth(2)).toBeVisible();
});

// modal Blockのトリガー→開閉・ESCキー・背景クリックでの閉じる操作を検証する。
test('modal block opens via its trigger button and closes via ESC or backdrop click', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  const dialog = page.locator('dialog.modal');
  await expect(dialog).not.toBeVisible();

  await page.locator('.modal__trigger', { hasText: 'サイズ表を見る' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.modal__body')).toContainText('S/M/Lをご用意しています。');

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();

  // 背景(::backdrop)クリックでも閉じる。dialogの端(コンテンツ外)をクリックする。
  await page.locator('.modal__trigger', { hasText: 'サイズ表を見る' }).click();
  await expect(dialog).toBeVisible();
  await dialog.click({ position: { x: 2, y: 2 } });
  await expect(dialog).not.toBeVisible();
});

// carousel Blockのボタン操作・キーボード操作(矢印キー)を検証する。
test('carousel block navigates via buttons and arrow keys, wrapping around', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  const carousel = page.locator('.carousel').first();
  const dots = carousel.locator('.carousel__dot');
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');

  await carousel.locator('.carousel__next').click();
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');

  await carousel.focus();
  await carousel.press('ArrowLeft');
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');

  // 前へボタンで先頭からラップアラウンドして最後のスライドへ。
  await carousel.locator('.carousel__prev').click();
  await expect(dots.last()).toHaveAttribute('aria-current', 'true');
});

// コンテンツ列(2列目)はcolumnsと同様に自由記述のHTMLとして
// 描画されることを確認する(太字・改行・リンクなど)。
test('carousel block renders the content column as free-form HTML (bold, line break, link)', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  // 先頭/末尾には「リール」ループ用の複製スライド(data-clone)があるため、実スライドだけに絞る。
  const firstSlideContent = page
    .locator('.carousel')
    .first()
    .locator('.carousel__slide:not([data-clone])')
    .first()
    .locator('.carousel__content');
  await expect(firstSlideContent.locator('strong')).toHaveText('ランニングシューズ');
  await expect(firstSlideContent.locator('a')).toHaveAttribute('href', '/ja/commerce/detail/commute-running-shoes');
});

// 行が1つだけの場合はSingleモードとして扱われ、
// 前後ボタン・ドット・自動再生を一切出さないことを確認する(AEMのisSingleSlideと同じ考え方)。
test('carousel block with a single row renders no navigation controls (single mode)', async ({ page }) => {
  await page.goto('/ja/carousel-single-slide');

  const carousel = page.locator('.carousel');
  await expect(carousel.locator('.carousel__slide')).toHaveCount(1);
  await expect(carousel.locator('.carousel__prev')).toHaveCount(0);
  await expect(carousel.locator('.carousel__next')).toHaveCount(0);
  await expect(carousel.locator('.carousel__dot')).toHaveCount(0);
});

// prefers-reduced-motion設定時は自動再生が動かないことを確認する。
// サンプルは `carousel (autoplay:2)` (2秒間隔)。
test('carousel block does not autoplay when prefers-reduced-motion is set', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ja/sample-blocks');

  const dots = page.locator('.carousel').first().locator('.carousel__dot');
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');
  await page.waitForTimeout(2500);
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');
});

// `autoplay:<秒数>`variantで指定した間隔で自動的に次のスライドへ進むことを確認する。
test('carousel block auto-advances at the interval given by the autoplay:<seconds> variant', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  const dots = page.locator('.carousel').first().locator('.carousel__dot');
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true', { timeout: 3000 });
});

// 最後のスライドから次へループする際も、通常のスライドと同じ方向に
// アニメーションし続け(逆再生しない)、ループ後も操作を継続できることを確認する
// (先頭/末尾に複製スライドを置き、複製到達時にtransitionなしで実スライドへ戻す「リール」方式)。
test('carousel block loops forward past the last slide in the same direction and remains operable', async ({
  page,
}) => {
  await page.goto('/ja/sample-blocks');

  const carousel = page.locator('.carousel').first();
  const dots = carousel.locator('.carousel__dot');
  const next = carousel.locator('.carousel__next');
  const slideCount = await dots.count();

  for (let i = 1; i < slideCount; i += 1) {
    await next.click();
    await expect(dots.nth(i)).toHaveAttribute('aria-current', 'true');
  }

  // 最後のスライドから次へ: 先頭へループする。
  await next.click();
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');

  // transitionend後の瞬時スナップバック(実スライド位置への復帰)が完了するのを待つ。
  await page.waitForTimeout(500);

  // ループ後もボタン操作が正常に継続できる(スナップバックで壊れていない)。
  await next.click();
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
});

// quote Blockが本文・出典をレンダリングし、variant記法(large)が反映されることを確認する。
test('quote block renders body/citation and applies the large variant', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  const quote = page.locator('.quote');
  await expect(quote).toHaveAttribute('data-variants', 'large');
  await expect(quote.locator('.quote__body')).toHaveText(
    'このサイトのおかげでチェックアウトまでの導線がとても分かりやすくなりました。',
  );
  await expect(quote.locator('.quote__cite')).toHaveText('— 佐藤様(検証チーム)');
});

// 本文中に書いた生HTML(<a class="button ...">)がリンクとして正しく描画されることを確認する。
test('buttons: raw HTML in prose renders as a real link with the button class', async ({ page }) => {
  await page.goto('/ja/sample-blocks');

  const primary = page.locator('a.button.button--primary', { hasText: 'セールを見る' });
  await expect(primary).toHaveAttribute('href', '/ja/sample-blocks');

  const secondary = page.locator('a.button.button--secondary', { hasText: '詳しく見る' });
  await expect(secondary).toHaveAttribute('href', '/ja/sample-blocks');
});

// 言語切り替えUIで対応ページ間を行き来できることを検証する。
test('language switcher navigates between the ja and en versions of the same page', async ({ page }) => {
  await page.goto('/ja/sample-blocks');
  await expect(page.locator('.hero__title')).toHaveText('AstroTableへようこそ');

  await page.locator('.lang-switcher a', { hasText: 'EN' }).click();
  await expect(page).toHaveURL(/\/en\/sample-blocks\/?$/);
  await expect(page.locator('.hero__title')).toHaveText('Welcome to AstroTable');

  await page.locator('.lang-switcher a', { hasText: 'JA' }).click();
  await expect(page).toHaveURL(/\/ja\/sample-blocks\/?$/);
  await expect(page.locator('.hero__title')).toHaveText('AstroTableへようこそ');
});
