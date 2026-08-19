---
title: "Adobe Client Data Layer integration"
description: "How the ACDL data layer is initialized and pushed to, and its page/user namespaces"
pageType: "other"
---

# Adobe Client Data Layer integration

To bridge page information and user actions to tag managers (Adobe Launch, GTM, and the like), the site uses [Adobe Client Data Layer](https://github.com/adobe/adobe-client-data-layer) (the official npm package, "ACDL" below) as its data layer.

## Initialization

ACDL is initialized inside `<head>` in `src/layouts/Base.astro`, before any other script runs.

```html
<script is:inline define:vars={{ pageContext }}>
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.adobeDataLayer.push({ page: pageContext });
</script>
<script>
  import '@adobe/adobe-client-data-layer/dist/adobe-client-data-layer.min.js';
</script>
```

`window.adobeDataLayer` is initialized as a plain array first, the `page` context is pushed onto it, and only then is the ACDL library itself loaded. The library detects the pre-existing array and upgrades it into the real object with `push`/`getState`/`addEventListener` (this is the officially recommended initialization pattern).

`pageContext` comes from the page's frontmatter (`title`/`pageType`). A push with no `event` key is merged in as state rather than recorded as history.

```js
window.adobeDataLayer.push({
  page: {
    pageName: string,
    pageType: string,   // "top" | "product" | "cart" | ... same enum as frontmatter's pageType
    locale: string,      // only when i18n is in use
  },
});
```

## Two patterns for pushing events

The deciding question is whether the change is cross-cutting (page, cart, member session) or local to a single Block.

### Pattern B: push directly from the Block (try this first)

For interactions that are fully contained within one Block — opening/closing a modal, switching tabs, toggling an accordion — push directly from that Block's `<script>`.

```ts
// src/lib/acdl.ts
export function pushEvent(eventName: string, payload: Record<string, unknown> = {}): void {
  window.adobeDataLayer.push({ event: eventName, ...payload });
}
```

```astro
<!-- example: src/blocks/accordion/index.astro -->
<script>
  import { pushEvent } from '../../lib/acdl';

  document.querySelectorAll('.accordion__item').forEach((item) => {
    item.addEventListener('toggle', () => {
      const label = item.querySelector('.accordion__title')?.textContent ?? '';
      pushEvent('accordion_toggle', { blockName: 'accordion', label, state: item.open ? 'open' : 'closed' });
    });
  });
</script>
```

There's no enforced naming format for events, but `<blockname>_<action>` (e.g. `accordion_toggle`) is recommended. This keeps changes local to the new Block — no central file needs editing — matching the "just add a directory" philosophy behind Blocks.

### Pattern A: the central bridge (cross-cutting state)

Changes that aren't scoped to a single Block — cart state, a member logging in or out, page-arrival lifecycle events (`view_item`/`begin_checkout`/`purchase`) — get funneled through one central location instead. The commerce module's `acdl-bridge.ts` and the member module's `acdl-bridge.ts` are both examples of this.

```
cart.ts (state management, vendor-agnostic)
   ↓ window.dispatchEvent(new CustomEvent('cart:change', ...))
acdl-bridge.ts (ACDL-specific mapping layer)
   ↓ window.adobeDataLayer.push({ event: 'add_to_cart', ... })
adobe-client-data-layer
```

The state-management module (`cart.ts`, `member.ts`) has no idea ACDL exists — it just dispatches a generic event (`cart:change`, `member:login`, etc.). If the site ever switches marketing tools, only the bridge layer needs to change.

A central-bridge module must be explicitly imported on every page where its triggering event can occur. Because this is a static site, all JS is reloaded on every navigation — nothing gets automatically pulled in by the shared layout. (The member module's `acdl-bridge.ts` is a notable exception: it's loaded from `MemberOverlay.astro`, which is itself injected into every page when `member.enabled` is true, so there's effectively no page where the import can be missed.)

## Commerce lifecycle events (the commerce module)

Sites using the commerce module fire these events:

- `view_item` — on PDP page load; pushed directly by the PDP's init script
- `add_to_cart` — on adding to cart / increasing quantity; pushed by commerce's `acdl-bridge.ts`
- `remove_from_cart` — on removing from cart / decreasing quantity; pushed by commerce's `acdl-bridge.ts`
- `begin_checkout` — on loading the checkout page (`/commerce/cart/checkout`); pushed directly by that page's init script
- `purchase` — on loading the order-complete page (`/commerce/order`); pushed directly by that page's init script

Example `add_to_cart` payload:

```js
window.adobeDataLayer.push({
  event: 'add_to_cart',
  product: { sku, name, categories, price, currency, quantity },
});
```

Example `purchase` payload:

```js
window.adobeDataLayer.push({
  event: 'purchase',
  order: { orderId, currency, total, items: [{ sku, name, price, quantity }] },
});
```

See [The commerce module](/en/docs/commerce) for more.

## The `user` namespace (the member module)

Sites using the member feature (`member.enabled` in `site.config.ts`) push the currently logged-in member's info under the `user` namespace. This is handled by `src/modules/member/lib/acdl-bridge.ts`, which subscribes to the vendor-agnostic `member:login`/`member:logout` custom events fired by `member.ts` and converts them.

- On login — `window.adobeDataLayer.push({ user: { id: member.id, ...member.attributes, email: member.email, emailSha256 } })`. `email` is a required field at registration, so it's always present; whatever attributes were set on the member issuance page also get spread directly into the `user` object. `emailSha256` is a SHA-256 hex digest of the email after normalizing it (trimmed, lowercased), for downstream integrations that can't accept a raw email address.
- On logout — `window.adobeDataLayer.push({ user: null })`

Like `page`, these pushes carry no `event` key, so they're merged in as state rather than recorded as history. The intent is for tag managers to read this as "who, if anyone, is currently logged in."

Because `window.adobeDataLayer` is scoped per page (a full navigation clears it), the bridge re-pushes the current `user` state at load time whenever someone is already logged in — the same reasoning that applies to the `page` context. Without this, navigating from, say, a quick-login on the member issuance page straight to another page would leave that new page's `adobeDataLayer` without the `user` push made on the previous page.

The member module's `acdl-bridge.ts` is loaded from `MemberOverlay.astro`, which is injected into every page whenever `member.enabled` is true. That means login/logout reaches ACDL reliably no matter where it originates — the member issuance page, the login page, or the overlay itself — a case where the usual "don't forget to import the bridge" risk of the central-bridge pattern structurally doesn't apply. See [Member features (the login sandbox)](/en/docs/member) for the full picture of the member system.

## Injecting marketing tags (the tag manager itself)

The tag manager's own script (Adobe Launch, GTM, etc.) is configured through `site.config.ts` rather than edited directly into the code. `Base.astro` emits this configuration *after* ACDL initialization but *before* any other script, guaranteeing `window.adobeDataLayer` already exists by the time the tag manager loads.

## Adding a new event

1. Decide whether it fits pattern A or pattern B.
2. For pattern B, add a `pushEvent()` call to the relevant Block's `<script>`. For pattern A, add a subscriber to the central bridge (and don't forget to wire up the import).
3. Confirm the push actually happens, e.g. via the browser devtools.

## Verifying pushes

When verifying pushes with a tool like Playwright, register a listener *before* the ACDL library loads, using a "function push" (ACDL recognizes any pushed item where `typeof item === 'function'` as an FCTN item and invokes it with the data-layer instance once the library initializes). Overwriting `window.adobeDataLayer.push` with your own function doesn't work — that override is lost when the library initializes.

```ts
await page.addInitScript(() => {
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.__acdlEvents = [];
  window.adobeDataLayer.push((dataLayer) => {
    dataLayer.addEventListener('adobeDataLayer:change', (event) => {
      window.__acdlEvents.push(event);
    });
  });
});
```

## Future extensions

CMP consent state can be added the same way, as a new `consent` namespace pushed alongside the existing ones — no change is needed to the existing `page`/`user`/event structure. That schema hasn't been designed yet.
