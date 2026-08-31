---
title: "The commerce module (EC features)"
description: "An opt-in e-commerce module covering product data, PDP, cart, checkout, search, and categories"
pageType: "other"
---

# The commerce module (EC features)

The commerce module is an opt-in e-commerce layer that adds product pages, category listings, keyword search, cart, and checkout. It's designed to be removable: if a site doesn't need EC features, you can delete `src/modules/commerce/` and `src/pages/[locale]/commerce/` entirely.

The commerce module assumes i18n is opted in.

## Directory layout

```
src/modules/commerce/
  blocks/
    buy-box/            # "Add to cart" button (used on the PDP)
    product-gallery/     # Product image gallery (used on the PDP)
    related-products/    # Related products (reuses the cards Block internally)
  lib/
    cart.ts              # Cart state management (localStorage)
    favorites.ts          # Favorites state management (localStorage, members only)
    favorite-button.ts    # Shared favorite-button UI logic
    acdl-bridge.ts        # Converts cart:change into ACDL pushes
    locale.ts             # Maps route locale to product locale
content/
  products/*.yaml         # Product data (one file per product)
  taxonomy/categories-<locale>.yaml  # Category key → display name
src/pages/[locale]/commerce/
  index.astro
  detail/[slug].astro
  products-index.json.ts  # JSON index used for search
  category/index.astro
  category/[category].astro
  search.astro
  cart/index.astro
  cart/checkout/index.astro
  confirmation.astro
  order.astro
  member/index.astro      # My Page (only when member.enabled)
  member/favorites.astro  # Favorites list (only when member.enabled)
```

## Product data

One product = one YAML file, under `content/products/<slug>.yaml`.

```yaml
sku: WKDY-SHU-001
images:
  - /images/products/commute-running-shoes.png
categories: [shoes]
tags: [running, commute]
stock: in_stock
prices:
  ja-JP: { currency: JPY, amount: 18000 }
  en-US: { currency: USD, amount: 129.99 }
translations:
  ja-JP: { title: "コミュートランニングシューズ", description: "通勤ラン需要に応える軽量設計の..." }
  en-US: { title: "Commute Running Shoes", description: "Lightweight shoes built for the run-commute..." }
```

The schema (the `products` collection in `src/content.config.ts`) has these main fields:

- `sku` (string) — the product code, locale-independent
- `images` (string array, at least 1) — image paths
- `categories` (string array, at least 1) — category keys that map to the taxonomy dictionary
- `tags` (string array, default `[]`) — keywords used by search
- `stock` (`in_stock` | `out_of_stock`, default `in_stock`)
- `prices` (`{ [locale]: { currency, amount } }`) — per-locale pricing, keyed by `ja-JP`/`en-US`
- `translations` (`{ [locale]: { title, description? } }`) — per-locale product name and description

SKU, images, category keys, and stock status are locale-independent — only price and copy vary by locale, which keeps the one-file-per-product rule intact.

Run `npm run new:product -- <slug>` to scaffold a new product file.

## Category display names

`content/taxonomy/categories-<locale>.yaml` maps category keys to their display names.

```yaml
# categories-ja.yaml
wear: ウェア
shoes: シューズ
bags: バッグ
accessories: アクセサリー
```

## Pages

- `/<locale>/commerce` — commerce home, linking to search, categories, and cart
- `/<locale>/commerce/detail/[slug]` — the PDP (product detail page), a fixed Astro template
- `/<locale>/commerce/category` — category top, listing every category
- `/<locale>/commerce/category/[category]` — a single category's listing, rendered with the `cards` Block
- `/<locale>/commerce/campaign` — campaign top and individual campaign pages, written as regular Block-notation pages under `content/pages/` (not a fixed template)
- `/<locale>/commerce/search` — keyword search: a static page plus client-side JS
- `/<locale>/commerce/products-index.json` — the lightweight JSON index used by search (an API endpoint)
- `/<locale>/commerce/cart` — cart contents: list, quantity changes, removal
- `/<locale>/commerce/cart/checkout` — a dummy checkout form (no real payment processing)
- `/<locale>/commerce/confirmation` — order confirmation; the order isn't placed until you click "place order" here
- `/<locale>/commerce/order` — the order-complete (thank-you) page
- `/<locale>/commerce/member` — My Page (a hub of member-only links); only generated when `member.enabled` is true in `site.config.ts`
- `/<locale>/commerce/member/favorites` — favorites list and removal; also gated by `member.enabled`

The My Page and favorites list live in the commerce module, but the member system itself (login, member issuance) is a separate `member` module. See [Member features (the login sandbox)](/en/docs/member) for details.

The PDP generates the locale × product cross product in `getStaticPaths()`:

```ts
export async function getStaticPaths() {
  const products = await getCollection('products');
  return ['ja', 'en'].flatMap((locale) =>
    products.map((product) => ({ params: { locale, slug: product.id }, props: { product } })),
  );
}
```

## The cart (`cart.ts`)

`src/modules/commerce/lib/cart.ts` manages cart state in `localStorage`. It has zero dependency on any marketing tool — ACDL integration lives in a separate layer.

```ts
type CartItem = {
  slug: string; title: string; price: number; currency: 'JPY' | 'USD';
  image: string; quantity: number; sku: string; categories: string[];
};

getCart(locale: string): Cart
addItem(locale: string, item: Omit<CartItem, 'quantity'>, quantity?: number): Cart
updateQuantity(locale: string, slug: string, quantity: number): Cart  // quantity <= 0 removes the item
removeItem(locale: string, slug: string): Cart
clearCart(locale: string): Cart
```

- The `locale` argument uses product-locale notation (`ja-JP`/`en-US`). The `localStorage` key is `astro-table:cart:<locale>`, so each locale gets its own independent cart (this keeps currencies from mixing).
- Every mutation dispatches `window.dispatchEvent(new CustomEvent('cart:change', { detail }))`. `detail.action` is one of `add` / `update` / `remove` / `clear` / `sync`.
- To handle multiple open tabs, changes made in another tab are picked up via the `storage` event and re-dispatched with `action: 'sync'`.

A typical subscriber, following the pattern used in `cart/index.astro`:

```ts
window.addEventListener('cart:change', (event) => {
  if (event.detail.locale === cartLocale) render();
});
```

## ACDL integration (the central bridge)

`src/modules/commerce/lib/acdl-bridge.ts` subscribes to `cart:change` and converts it into Adobe Client Data Layer (ACDL) pushes. `cart.ts` itself has no knowledge that ACDL exists.

```
cart.ts (state management, vendor-agnostic)
   ↓ window.dispatchEvent('cart:change', ...)
acdl-bridge.ts (ACDL-specific mapping layer)
   ↓ window.adobeDataLayer.push({ event: 'add-to-cart', ... })
adobe-client-data-layer
```

`add` maps to `add-to-cart`, `remove` maps to `remove-from-cart`, and `update` looks at the before/after quantity delta to decide which of the two to push. `clear` and `sync` push nothing. See [Adobe Client Data Layer integration](/en/docs/analytics-acdl) for the payload details (the `productListItems` array, `commerce.cart.cartID`, etc.).

`acdl-bridge.ts` is never auto-loaded — it must be explicitly imported on every page where a cart change can happen (currently `commerce/detail/[slug].astro` and `commerce/cart/index.astro`). If you add a new page that mutates the cart, don't forget this import. See [Adobe Client Data Layer integration](/en/docs/analytics-acdl) for the full ACDL design.

## The buy-box Block

This is the "add to cart" button on the PDP. It calls `addItem()` from `cart.ts`, and on success shows a brief visual change plus an "Added to cart" feedback message (`aria-live="polite"`) for a few seconds. Locale-aware price formatting uses `Intl.NumberFormat`.

## Favorites (`favorites.ts`)

A members-only feature. `src/modules/commerce/lib/favorites.ts` reads `getCurrentMemberId()` from the `member` module (a one-way dependency from commerce to member — the only place in the commerce module that depends on member). When nobody is logged in, `addFavorite`/`removeFavorite` return `null` and refuse to act.

```ts
getFavorites(memberId: string): string[]
isFavorite(memberId: string, slug: string): boolean
addFavorite(slug: string): string[] | null   // null when nobody is logged in
removeFavorite(slug: string): string[] | null
```

`favorite-button.ts` provides the shared UI logic ("only shown when logged in, toggles on click") and is used on the PDP (`commerce/detail/[slug].astro`). Listing and removing favorites is handled by `commerce/member/favorites.astro`, positioned under My Page (`commerce/member/index.astro`).

When the member feature (`member.enabled`) is off, the pages under `commerce/member` aren't generated at all, so favorites become effectively unavailable.

## Removing the commerce module

If a site doesn't need EC features, delete the following:

1. `src/modules/commerce/`
2. `src/pages/[locale]/commerce/`
3. `content/products/` and `content/taxonomy/`, then remove the `products`/`taxonomy` collection registrations from `src/content.config.ts`
4. The cart/search/category links in `nav/<locale>.md`

The `@adobe/adobe-client-data-layer` package itself and the ACDL `page` namespace initialization stay in place — they're core, EC-independent functionality.
