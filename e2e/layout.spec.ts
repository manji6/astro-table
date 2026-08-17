import { expect, test } from '@playwright/test';

// retrospective (post #9/#26): ヘッダー/パンくず/本文/フッターの共通コンテナが、
// 独自の横方向paddingを二重に持ってしまい左右位置がズレていた実バグの再発防止。
// (troubleshooting.md「ヘッダー/フッター/パンくずの左右位置がズレる」参照)
test('the shared page containers (header row, breadcrumbs, main, footer) share the same left/right edges', async ({
  page,
}) => {
  await page.goto('/ja/about/company/profile');

  const rects = await page.evaluate(() => {
    const rect = (selector: string) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right };
    };
    return {
      headerRow: rect('.site-header-row'),
      breadcrumbs: rect('.breadcrumbs'),
      main: rect('main'),
      footer: rect('.site-footer'),
    };
  });

  const values = Object.values(rects);
  expect(values.every((v) => v !== null)).toBe(true);

  const lefts = new Set(values.map((v) => v?.left));
  const rights = new Set(values.map((v) => v?.right));
  expect(lefts.size).toBe(1);
  expect(rights.size).toBe(1);
});
