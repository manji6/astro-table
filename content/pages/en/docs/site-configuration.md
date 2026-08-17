---
title: "Site Configuration"
description: "Configuration options in site.config.ts and astro.config.mjs"
pageType: "other"
---

AstroTable's site-wide configuration lives in two files at the repository root. `astro.config.mjs` holds Astro's own settings, while `site.config.ts` covers configuration specific to this CMS: marketing tag injection and the member feature toggle.

## `site.config.ts`

`site.config.ts` simply default-exports an object that conforms to the `SiteConfig` type. The shared layout (`Base.astro`) reads this value at build time and reflects it in each page's `<head>` and in site-wide behavior.

```ts
export interface SiteConfig {
  tags: {
    // External scripts (e.g. a tag manager loader)
    scripts: Array<{ src: string; async?: boolean; defer?: boolean }>;
    // Inline code snippets (the contents of a <script> tag, as strings)
    inlineHead: string[];
  };
  // Toggles the member feature as a whole: member ID/attribute management,
  // login/logout, the login-state overlay, and the ACDL user-namespace
  // integration. Off by default.
  member: {
    enabled: boolean;
  };
  // Site-specific prefix prepended to localStorage keys for cart, member, and
  // favorites data.
  storagePrefix: string;
}
```

### `tags` — injecting marketing tags

The shared layout outputs `scripts` and `inlineHead` into `<head>` after the ACDL (data layer) initialization but before any other script. If you're testing behavior that depends on tag-manager load order, keep this ordering in mind.

- `scripts`: an array of external scripts. Each entry takes a `src` URL and optional `async`/`defer` flags, and is rendered as-is as `<script src="...">`.
- `inlineHead`: an array of inline code snippets as strings. Each entry is rendered as its own `<script>` tag.

Example:

```ts
const siteConfig: SiteConfig = {
  tags: {
    scripts: [
      { src: 'https://assets.example.com/launch-xxx.min.js', async: true },
    ],
    inlineHead: [
      // e.g. a GTM snippet you want to inline
    ],
  },
  member: {
    enabled: true,
  },
  storagePrefix: 'astro-table',
};

export default siteConfig;
```

If you need to swap tag containers between production and preview, reference an environment variable from your deployment platform inside this file and branch on it. Since AstroTable targets sites where tag IDs and snippets aren't considered secrets, it's fine to commit them directly to the repository.

### `member` — toggling the member feature

`member.enabled` is a single switch that enables or disables the login/member-signup pages, the login-state overlay, and the ACDL user-namespace integration together. Setting it to `false` excludes all of these member-related features from the build. Keeping it `false` is the safer default for verification sites that don't handle real user data, or for sites that don't need a member feature at all.

### `storagePrefix` — the localStorage key prefix

Cart (`cart.ts`), member (`member.ts`), favorites (`favorites.ts`), and checkout-related localStorage keys are all stored with this value prepended, e.g. `${storagePrefix}:cart:...`. If you're running multiple sites built on this template locally at once, or want to keep this site's localStorage namespace separate from another site's, change this to something specific to your site (its real name or a project code name, for example).

## `astro.config.mjs`

Astro's own configuration file. In AstroTable, it's mainly used to configure internationalization (i18n).

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en'],
    routing: { prefixDefaultLocale: true },
  },
});
```

i18n is an opt-in feature in AstroTable. If left unconfigured, the site behaves as a single-language site with unprefixed URLs. See the internationalization page for details on the settings and directory layout.
