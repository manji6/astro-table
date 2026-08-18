---
title: "Deployment (Cloudflare Workers)"
description: "How to deploy AstroTable to Cloudflare Workers (static assets)"
pageType: "other"
---

Deployment uses Cloudflare Workers with static asset serving. Cloudflare deprecated Pages (the static-site-only hosting product) in 2025 and now recommends Workers as the default for new projects, so this repository ships a `wrangler.jsonc` targeting Workers. It's a pure static-asset configuration with no server-side Worker code. Quality gates (lint, typecheck, unit tests, build, e2e) run independently in GitHub Actions, so this repository doesn't include a separate deployment workflow YAML.

## Connecting the repository (Git integration)

1. Connect this repository from the Cloudflare dashboard under "Compute (Workers)"
2. `wrangler.jsonc` is auto-detected. Configure the build settings as described below
3. Make sure `name` in `wrangler.jsonc` matches the Worker project name on Cloudflare's side (rewrite it if you created the site via "Use this template")
4. Set environment variables if needed (for example, to swap marketing tag containers between production and preview — see the site configuration page)
5. Merging to `main` triggers a production deploy; opening a pull request automatically publishes a preview URL

## Build settings

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Output directory: nothing to configure in the dashboard (`wrangler.jsonc`'s `assets.directory` already points to `./dist`)

## Manual deployment from your machine

If you're not using Git integration and want to deploy directly:

```bash
npm run build
npx wrangler deploy
```

The first run requires authenticating your Cloudflare account with `npx wrangler login`.

## Root redirect

When internationalization is opted in, `public/_redirects` issues a 302 redirect from the root `/` to the default locale (`/ja/`).

```
# public/_redirects
/  /ja/  302
```

`_redirects` is natively supported by both Cloudflare Pages and Workers static assets, but it has no effect with local `npm run dev` or `npm run preview`, so access a locale-prefixed path like `/ja/` directly when checking locally.

## Relationship to CI

Quality gates run from `.github/workflows/ci.yml` on pull requests and on pushes to `main`. The pipeline installs dependencies, then runs lint, typecheck (`astro check`), unit tests (Vitest), the build, and e2e tests (Playwright), in that order. Since this runs on a different trigger than the Cloudflare deploy, a Cloudflare preview deploy can still be created independently even if CI is failing. If you want quality enforced before merging, configure this workflow as a required status check in your GitHub branch protection rules.
