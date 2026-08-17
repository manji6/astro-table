---
title: "Troubleshooting"
description: "Common pitfalls hit during development, and how to work around them"
pageType: "other"
---

# Troubleshooting

This page collects pitfalls actually hit during development. If you run into the same issue while customizing the site, check here first.

## A table isn't recognized as a Block

Per the GFM spec, a table where the header row and the delimiter row (the `---` line) don't have the same number of cells **isn't recognized as a table at all** — it's treated as plain text instead. Pad the header row with empty cells to match the number of columns used in the body.

```markdown
<!-- Wrong: meant to be 3 columns, but the header only has 1 cell → not recognized as a table -->
| cards |
| --- | --- | --- |
| a | b | c |

<!-- Right: pad the header with empty cells -->
| cards | | |
| --- | --- | --- |
| a | b | c |
```

## Block/page CSS doesn't apply to elements inserted by client JS

Astro's scoped styles (`<style>`) work by attaching a `data-astro-cid-*` attribute to elements that exist statically at build time. Elements inserted dynamically by client JS via `innerHTML` (a search results list, cart line items, etc.) never get that attribute, so a normal `<style>` block **won't apply to them at all**.

```astro
<!-- Wrong: dynamically-inserted .cart-page__items li won't be styled -->
<style>
  .cart-page__items li { display: flex; }
</style>

<!-- Right: use is:global -->
<style is:global>
  .cart-page__items li { display: flex; }
</style>
```

If a page's styling isn't applying the way you expect, check first whether that page builds its DOM via `innerHTML`.

## Adobe Client Data Layer events aren't pushed in a real browser

Centralized bridge modules that handle cross-cutting state changes (`acdl-bridge.ts` and similar) **must be explicitly imported on every page where that event can occur**. A static site reloads all of its JS on every page navigation, so nothing gets pulled in automatically just because it's used from a shared layout.

Forgetting this wiring produces a bug that's easy to miss: unit tests still pass (because they import and call the module directly), but nothing ever gets pushed in an actual browser. Whenever you add or start using a new centralized bridge on a page, confirm the push actually happens in a real browser (manual check or E2E).

## Overwriting ACDL's `push` directly doesn't capture events

If you replace `window.adobeDataLayer.push` with your own function in an E2E test, ACDL overwrites that `push` method with its own implementation during library initialization, so your replacement stops receiving events partway through. Use the officially supported "function push" idiom instead.

```ts
await page.addInitScript(() => {
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.adobeDataLayer.push((dataLayer) => {
    dataLayer.addEventListener('adobeDataLayer:change', (event) => {
      // capture the event here
    });
  });
});
```

## Internal links 404 (when localization is enabled)

When localization (i18n) is opted in, page links and image paths **need the locale prefix written explicitly**. There's no mechanism where a Block (like cards) auto-detects the current page's locale and fills in the prefix for you.

```markdown
<!-- in content/pages/ja/about.md -->
[トップに戻る](/ja/)

<!-- in content/pages/en/about.md -->
[Back to top](/en/)
```

This is a deliberate design choice — it keeps the basic contract that a Block only receives `{name, variants, rows}`. When adding or translating a page, always double-check that link targets carry the correct locale prefix.

## Two dots in a Content Collections filename produce an unexpected ID

A filename with an extra dot beyond the extension, like `categories.ja.yaml`, causes the Content Collections glob loader to strip every dot when generating the entry ID, producing `categoriesja` (not `categories.ja` as you might expect). Use a hyphen instead for locale-specific filenames, e.g. `categories-ja.yaml`.

## A constant declared outside `getStaticPaths()` throws "is not defined"

```astro
---
const ROUTE_LOCALES = ['ja', 'en'];

export async function getStaticPaths() {
  return ROUTE_LOCALES.map((locale) => ({ params: { locale } })); // build fails: "ROUTE_LOCALES is not defined"
}
---
```

Astro's build process sometimes evaluates `getStaticPaths()` in an isolated execution context, so a constant declared outside the function (and only used inside it) may not be captured correctly. Write array literals directly inside `getStaticPaths()` instead.

```astro
---
export async function getStaticPaths() {
  return ['ja', 'en'].map((locale) => ({ params: { locale } })); // OK
}
---
```

## `npm ci` fails in CI

`npm ci` requires an exact match between `package-lock.json` and `package.json`. In this project, environment differences between local machines and CI around rolldown's (Vite's bundler) wasm32-wasi optional dependencies (`@emnapi/*`) have caused false-positive lockfile integrity failures. CI here uses `npm install` instead of `npm ci`. It's slightly less strict about reproducibility, but more practical during early development when dependencies change frequently.

## Header/footer/breadcrumbs are misaligned (padding applied twice)

`global.css` defines shared horizontal padding (`padding-inline`) on `.site-header-row`, `.site-footer`, `.breadcrumbs`, and `main` to keep the page's left/right edges aligned. If a header or footer Block's implementation (e.g. `src/blocks/header/index.astro`) also applies its own horizontal padding, that padding stacks on top of the shared container's padding, and just that element ends up visibly misaligned.

```css
/* Wrong: .site-header's own horizontal padding stacks with .site-header-row's padding */
.site-header {
  padding: 1rem 1.5rem;
}

/* Right: leave horizontal spacing to the shared container (global.css), only set vertical padding */
.site-header {
  padding-block: 1rem;
}
```

When building a custom header, footer, or top-level page element, keep horizontal spacing exclusively in the shared container (`global.css`). This kind of misalignment isn't caught by builds or tests — you only notice it by actually looking at the page in a browser.

## An element hidden via the `hidden` attribute doesn't disappear

The `hidden` attribute normally works through the UA stylesheet's `display: none`. But if that same element (not an ancestor — the element itself) has a CSS rule setting `display: flex`, `display: grid`, etc., the author stylesheet overrides the UA default, so setting `element.hidden = true` has no visible effect (the `hidden=""` attribute is present in the DOM, but the element still renders). Watch out for this on tags with generic `display` rules in `global.css` (like `<form>`) or on components that lay themselves out with `display: flex` (cards, badges, etc.) when toggling visibility with `hidden`.

```css
/* Wrong: display: flex on form wins over [hidden], so .login-page__form never disappears */
form {
  display: flex;
}

/* Right: explicitly re-override display when [hidden] is set */
.login-page__form[hidden] {
  display: none;
}
```

Builds and unit tests can't catch this kind of bug — you only find it in a real browser (or with Playwright's `toBeHidden()`). Any class that toggles visibility via `hidden` should ship with this override rule alongside it.

## `localStorage` is broken in Vitest (`.clear is not a function`, etc.)

Passing `environment: 'happy-dom'` as a string to Vitest requires a separate adapter package (`vitest-environment-happy-dom`). If that package isn't available, the `environment` setting is silently ignored, and DOM APIs like `localStorage` end up as broken objects. This project instead uses `environment: 'node'` plus `tests/setup.ts`, which calls `GlobalRegistrator.register()` from `@happy-dom/global-registrator` (see [Testing](/en/docs/testing) for details).
