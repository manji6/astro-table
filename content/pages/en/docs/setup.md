---
title: "Setup"
description: "How to set up AstroTable locally and the main commands"
pageType: "other"
---

# Setup

Here's how to get AstroTable running locally.

## Prerequisites

Node.js 22.12.0 or later is required.

## Install

```bash
npm install
```

If you plan to run the E2E tests (Playwright), also run this once:

```bash
npx playwright install chromium
```

## Start the dev server

```bash
npm run dev
```

The site is available at `http://localhost:4321`. Editing a Markdown file triggers an automatic reload.

Once the dev server is running, visit `/en/block-library` to see every Block currently available, how it renders, and the Markdown source that produces it. It's a handy reference to keep open while writing pages.

---

## Main commands

### Build and preview

- `npm run build` — runs a production build and outputs static files to `dist/`
- `npm run preview` — serves the build output locally so you can check it

### Tests

- `npm run test` — runs the unit tests (Vitest)
- `npm run test:watch` — runs the unit tests in watch mode
- `npm run e2e` — runs the end-to-end tests (Playwright)

### Quality checks

- `npm run lint` — lints the codebase with ESLint
- `npm run typecheck` — type-checks the project with `astro check`

### Scaffolding

- `npm run new:block` — scaffolds a new Block
- `npm run new:product` — scaffolds a new product entry (when the commerce module is in use)

---

## Where to go next

- To learn how pages are written, see [Writing pages in Markdown](/en/docs/content-authoring).
- For an overview of the repository layout, see [Directory structure](/en/docs/directory-structure).
