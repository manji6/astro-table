---
title: "Directory Structure"
description: "What each major directory in the AstroTable repository is for"
pageType: "other"
---

# Directory Structure

The repository's top level splits into three broad areas.

- `/content` — site content (Markdown and YAML), the place site operators edit day to day
- `/src` — the framework code (Astro components, parsing logic, and so on)
- `/public` — images, downloadable files, and other static assets served as-is

Here's a closer look at each.

---

## /content (content)

### pages/

The Markdown file for each page. When multi-language support is opted in, pages live under per-locale directories (`ja/`, `en/`).

- `pages/<locale>/*.md` — a page's body; the file path becomes the URL
- `pages/<locale>/index.md` — the top page for that directory's "/"

### nav/ and footer/

The header navigation and footer are also managed as Markdown using the same Block notation as page content.

- `nav/<locale>.md` — the header's link list
- `footer/<locale>.md` — the footer's link list

### products/ and taxonomy/

These are only used when the commerce module is enabled.

- `products/*.yaml` — product data (SKU, prices, stock, categories, and so on)
- `taxonomy/*.yaml` — a dictionary mapping category keys to display names

---

## /src (framework code)

### blocks/

The implementation of general-purpose Blocks (hero, cards, columns, table, and more). These are core Blocks that don't depend on commerce or i18n. Each Block's `example.md` doubles as its display sample and as the source for the `/en/block-library` page.

### modules/

Opt-in feature sets. They live separately from the core `blocks/` directory so a site that doesn't need them can delete the whole folder.

- `modules/commerce/` — the commerce module (Blocks and logic for product detail, cart, checkout, and more)
- `modules/member/` — the membership module (login, member profile, and related features)

### layouts/ and components/

- `layouts/Base.astro` — the shared layout for every page (`<head>` elements, header/footer wiring, and so on)
- `components/BlockRenderer.astro` — the rendering layer that turns a parsed page tree into Block components
- `components/Breadcrumbs.astro` — the breadcrumb trail
- `components/LanguageSwitcher.astro` — the language switcher UI

### lib/markdown/

Markdown parsing logic. The core piece is `parse-page.ts`, which turns a GFM table into a `{ name, variants, rows }` structure.

### pages/

Pages built with Astro's file-based routing.

- `pages/[...slug].astro` — the catch-all route that picks up every file under `content/pages/`
- `pages/[locale]/...` — fixed-template pages such as those used by the commerce module. `block-library/` (the listing, individual Block pages, and embeddable previews) lives here too

---

## Other directories

- `/public` — images, videos, favicons, and other static files served without going through the build pipeline
- `/scripts` — scaffolding scripts such as `new:block` and `new:product`
- `/tests` — unit tests (Vitest)
- `/e2e` — end-to-end tests (Playwright)
- `/.claude/skills` — Claude Code skills that codify routine tasks

---

## Using AstroTable as a template repository

AstroTable assumes "one site = one repository." It does not support a monorepo-style setup where a single repository and a single build serve multiple sites (Astro's built-in i18n routing is global to the app, and a monorepo layout would require a heavy custom rewrite of the catch-all route to decide per-site whether i18n applies). When you need multiple sites, handle it one of two ways instead.

**No shared design or custom Blocks across sites**: simply click "Use this template" from AstroTable multiple times. Each site pulls in AstroTable core updates only, using the "Pulling in template updates" steps above.

**Multiple sites that should keep sharing the same brand design and custom Blocks**: insert one more layer, a "shared brand template," between AstroTable core and each site.

```
AstroTable (generic core)
    ↓ Use this template
Shared brand template (shared design and brand-specific Blocks only; no per-site content)
    ↓ Use this template          ↓ Use this template
Site A (its own content)    Site B (its own content)
```

- What the shared brand template holds: shared CSS (a branded version of `src/styles/global.css`), brand-specific Blocks, default values for `site.config.ts`
- What it does not hold: actual page Markdown (`content/pages/`), product data, the real nav/footer text, or any site-specific domain/logo assets
- The shared brand template itself tracks AstroTable core as its upstream, and Site A / Site B track the shared brand template as their upstream (the same upstream steps applied twice). Shared design changes go to the brand template first via PR
- This structure scales out cleanly as more sites are added
