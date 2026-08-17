---
title: "AI Collaboration Workflows"
description: "The Skill and scaffold pattern for working with Claude Code"
pageType: "other"
---

# AI Collaboration Workflows

One of AstroTable's core design goals is letting a non-developer operator run the site through instructions to a coding AI (Claude Code and similar tools) alone. Common tasks are formalized as Skills under `.claude/skills/`.

## Approach

When an AI generates code freely, it tends to drift from convention — reinterpreting what a column means, putting a Block in the wrong place, and so on. To keep that in check, AstroTable pairs the repository's `CLAUDE.md` (a condensed entry point that's always loaded) with Skills and scaffold scripts that lock common tasks into a fixed shape, leaving the AI to fill in only the content.

## Skills

There are four Skills under `.claude/skills/`.

### `add-block` — add a new Block

Gathers the Block's name and purpose, generates a scaffold with `npm run new:block`, then implements the contents. A display sample (`example.md`) is generated alongside it — writing that file is all it takes for the new Block to automatically appear on the Block library page (`/en/block-library`). The last step is a build check and tests. See `.claude/skills/add-block/SKILL.md` for details.

### `translate-page` — expand a page into another locale

Used only when localization (i18n) is opted in. Given a source page, it translates only the human-readable text — Block structure (rows, columns, image paths, link URLs) is left completely untouched. It also checks whether navigation, footer, or taxonomy dictionaries need an entry for the new locale. See `.claude/skills/translate-page/SKILL.md` for details.

### `add-product` — add product data

Used when the commerce module is in use. Gathers the product name, category, price, and so on, generates a scaffold with `npm run new:product`, and points to `npx astro check` as the final line of defense for catching schema issues (a missing price, a missing required locale, etc.). See `.claude/skills/add-product/SKILL.md` for details.

### `add-acdl-event` — add an ACDL event

Determines whether the event you want to add is a "Block-local action" (pattern B) or a "cross-cutting state change" (pattern A), and walks through the right implementation for each. For pattern A, it flags the easy-to-forget step of explicitly importing the bridge module on every page where the event needs to fire, and calls for a real-browser push check as the final confirmation (see [Troubleshooting](/en/docs/troubleshooting) for why this wiring is easy to miss). See `.claude/skills/add-acdl-event/SKILL.md` for details.

## Scaffold scripts

These are the Node scripts the Skills call into, producing deterministic output.

```bash
npm run new:block -- <name> [columns]     # scaffolds src/blocks/<name>/index.astro
npm run new:product -- <slug>             # scaffolds content/products/<slug>.yaml
```

Generated scaffolds carry comments marking what to fill in and what must not be changed. The scripts themselves live at `scripts/new-block.mjs` and `scripts/new-product.mjs`.

## Reference Block

`src/blocks/cards/index.astro` is a heavily-commented reference implementation. Use it as a model when building a new Block.

## Relationship to testing

Once you assume the person writing the prompt can't read the generated code well enough to judge its correctness on their own, tests (see [Testing](/en/docs/testing)) become the only objective check left. Every Skill's final step always includes writing or running the corresponding test.
