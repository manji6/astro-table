---
title: "Deployment (Cloudflare Pages)"
description: "How to deploy AstroTable to Cloudflare Pages"
pageType: "other"
---

Deployment uses Cloudflare Pages' native Git integration. Quality gates (lint, typecheck, unit tests, build, e2e) run independently in GitHub Actions, so this repository doesn't include a separate deployment workflow YAML.

## Connecting the repository

1. Connect this repository from the Cloudflare dashboard
2. Configure the build settings as described below
3. Set environment variables if needed (for example, to swap marketing tag containers between production and preview — see the site configuration page)
4. Merging to `main` triggers a production deploy; opening a pull request automatically publishes a preview URL

## Build settings

- Build command: `npm run build`
- Output directory: `dist`

## Root redirect

When internationalization is opted in, `public/_redirects` issues a 302 redirect from the root `/` to the default locale (`/ja/`).

```
# public/_redirects
/  /ja/  302
```

This file only takes effect on Cloudflare Pages. It has no effect with local `npm run dev` or `npm run preview`, so access a locale-prefixed path like `/ja/` directly when checking locally.

## Relationship to CI

Quality gates run from `.github/workflows/ci.yml` on pull requests and on pushes to `main`. The pipeline installs dependencies, then runs lint, typecheck (`astro check`), unit tests (Vitest), the build, and e2e tests (Playwright), in that order. Since this runs on a different trigger than the Cloudflare Pages deploy, a Cloudflare Pages preview deploy can still be created independently even if CI is failing. If you want quality enforced before merging, configure this workflow as a required status check in your GitHub branch protection rules.
