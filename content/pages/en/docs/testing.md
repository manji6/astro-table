---
title: "Testing"
description: "How to write and run unit tests (Vitest) and E2E tests (Playwright)"
pageType: "other"
---

# Testing

AstroTable's tests split into four layers.

## Test layers

- **Unit** — logic like the parser layer (`parse-page.ts`), cart logic (`cart.ts`), and the ACDL bridge (`acdl-bridge.ts`), tested with [Vitest](https://vitest.dev/).
- **Type checking** — the whole project, via `astro check`.
- **Lint** — the whole project, via ESLint.
- **E2E** — the golden path (a full flow driven in a real browser), tested with [Playwright](https://playwright.dev/).

Unit tests for Astro components (Blocks) themselves are out of scope. Block appearance and behavior are covered by E2E tests instead; unit-testing individual Blocks is something to revisit if the need arises.

## Unit tests (Vitest)

Configuration lives in `vitest.config.ts`. Because some tests use DOM APIs (`localStorage` and friends), the project uses `environment: 'node'` plus `tests/setup.ts`, which registers a global DOM environment via `@happy-dom/global-registrator`.

```ts
// tests/setup.ts
import { GlobalRegistrator } from '@happy-dom/global-registrator';
GlobalRegistrator.register({ url: 'http://localhost:4321/' });
```

Test files live under `tests/**/*.test.ts`. Here's an example testing `cart.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { addItem, getCart } from '../src/modules/commerce/lib/cart';

beforeEach(() => {
  localStorage.clear();
});

describe('cart.ts', () => {
  it('addItem adds a new item', () => {
    const cart = addItem('ja-JP', { slug: 'shoes', title: 'Shoes', price: 1000, currency: 'JPY', image: '', sku: 'S1', categories: [] }, 1);
    expect(cart.items).toHaveLength(1);
  });
});
```

Run them with:

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

The tests for `parse-page.ts` matter most. It's the foundational logic every page build depends on, so a regression there breaks the whole site in ways that are easy to miss. Make sure these cases are covered:

- Multi-row, multi-column list-style Blocks
- Two-column key-value config-style Blocks
- Regular prose mixed with Blocks
- Block name normalization and variant notation
- Cell extraction for `text`/`images`/`links`
- Fallback behavior for malformed markup (empty header row, inconsistent column counts across rows, etc.)

See `tests/parse-page.test.ts` for concrete examples.

## E2E tests (Playwright)

Configuration lives in `playwright.config.ts`. Its `webServer` entry runs `npm run preview`, so you need to run `npm run build` before running E2E tests.

```bash
npm run build
npm run e2e
```

`playwright.config.ts` sets `webServer.reuseExistingServer` to `true` outside of CI. That means **if you have `npm run dev` (port 4321) running in another terminal while you run E2E tests, Playwright will silently connect to that dev server instead** — which may be on a different branch or in a different state than you expect. If you need to verify things while `npm run dev` is running, temporarily override `webServer.command`/`url` and `use.baseURL` to use a different port.

The initial scope covers only the golden path:

```
Home → category list or keyword search → PDP → add to cart
  → /cart (check quantity) → /checkout (fill form) → /checkout/complete (order confirmed)
```

If localization (i18n) is opted in, run the golden path for both the `ja` and `en` locales. At every step, verify both the on-screen content and the push to the Adobe Client Data Layer (`window.adobeDataLayer`).

Examples: `e2e/commerce-golden-path.spec.ts`, `e2e/sample-blocks.spec.ts`, `e2e/poc-demo.spec.ts`.

### Verifying images actually load

A correct `src` attribute doesn't guarantee the file actually exists (it could still 404). For images that matter, also check `naturalWidth`.

```ts
const image = page.locator('img').first();
await expect(image).toHaveJSProperty('complete', true);
const naturalWidth = await image.evaluate((el: HTMLImageElement) => el.naturalWidth);
expect(naturalWidth).toBeGreaterThan(0);
```

## Test-first workflow

When adding a new Block, page, or feature, follow this order:

1. Write down the behavior you need as a success criterion (e.g. "adding one item to the cart fires a `cart:change` event").
2. Write the corresponding test first and confirm it fails.
3. Implement the feature until the test passes.
4. Confirm you haven't broken the existing E2E golden path.

## CI

CI (GitHub Actions) runs the following steps in order on every PR and on every push to main:

```
install → lint → typecheck (astro check) → unit test → build → Playwright install → e2e test
```

The install step uses `npm install` rather than `npm ci` — see [Troubleshooting](/en/docs/troubleshooting) for why. It runs independently of deployment.
