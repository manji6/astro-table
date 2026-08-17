---
title: "Extending Existing Blocks"
description: "How to use variant syntax, customize a Block's CSS and script, and adjust styling per-section with the section-metadata Block."
pageType: "other"
---

# Extending Existing Blocks

You don't always need to write a new Block from scratch — a lot of look-and-feel or behavior changes come from tweaking an existing one. This page covers three approaches:

1. Switching visual variations with variant syntax
2. Customizing the CSS/script already inside a Block's `index.astro`
3. Adjusting styling per-section with the `section-metadata` Block

## 1. Using variant syntax

Write comma-separated values in parentheses after a Block name, and they're passed to the Block component as a `variants` string array.

```markdown
| quote (large) | |
| --- | --- |
| This site made checkout so much easier to navigate. | J. Smith (QA team) |
```

Looking at the `quote` Block, `variants` is written straight out to a `data-variants` attribute, and read back on the CSS side with an attribute selector (`~=` matches a whole word within the space-separated list).

```astro
const { rows, variants } = Astro.props;
```

```astro
<figure class="quote" data-variants={variants.join(' ')}>
  <blockquote class="quote__body">{body}</blockquote>
  {cite && <figcaption class="quote__cite">— {cite}</figcaption>}
</figure>

<style>
  .quote[data-variants~='large'] .quote__body {
    font-size: 1.75rem;
  }
</style>
```

`variants` → `data-variants` attribute → CSS attribute selector is the standard variant pattern across AstroTable's Blocks. Adding a new variation to an existing Block is usually just one more attribute-selector rule in that Block's CSS.

`variants` is always passed as a plain string array, so you're free to parse it yourself into `key:value` pairs or flag combinations, as with `carousel (autoplay:3)` or `video (autoplay, loop)`. Here's how `carousel` does it:

```astro
const autoplayVariant = variants.find((v) => /^autoplay(:\d+)?$/.test(v));
const autoplayEnabled = Boolean(autoplayVariant);
const autoplaySeconds = autoplayVariant?.includes(':') ? Number(autoplayVariant.split(':')[1]) : 5;
```

For a simple flag (a variant with no value attached), a plain `variants.includes('autoplay')` check, as `video` does, is all you need:

```astro
const autoplay = variants.includes('autoplay');
const loop = variants.includes('loop');
```

When adding a new variant, pick a name that won't collide with an existing one, and note the supported keys/variants in a comment in `index.astro` — future readers (including future you) will thank you.

## 2. Customizing CSS and script

Each Block's look and behavior is self-contained in the `<style>`/`<script>` blocks inside `src/blocks/<name>/index.astro`. Astro's scoped-style mechanism means one Block's CSS never leaks into another. So if you want to change how an existing Block looks, the first thing to consider is simply editing that Block's `index.astro` directly — there's no need to stack override CSS in a separate file the way you might with a third-party component library.

### Keeping a consistent site-wide look: use CSS variables

Rather than hard-coding colors in each individual Block, reach for the CSS custom properties defined in `src/styles/global.css`. That way a theme change is a single edit.

```css
:root {
  --color-text: #1a1a1a;
  --color-muted: #666;
  --color-border: #ddd;
  --color-accent: #2563eb;
  --color-accent-contrast: #fff;
}
```

The `carousel` Block's active-dot state, for example, is written against these variables:

```astro
<style>
  .carousel__dot {
    background: var(--color-border, #ddd);
  }
  .carousel__dot[aria-current='true'] {
    background: var(--color-accent, #2563eb);
  }
</style>
```

Change `--color-accent` once in `global.css` to update your brand color across every Block that references it. Conversely, if you want one Block to intentionally look different, just hard-code a color inside that Block's own `<style>` block — being scoped, it won't affect anything else.

### Customizing behavior: changing the carousel's default autoplay interval

`carousel` supports an `autoplay:<seconds>` variant, but if you want to change the underlying default (currently 5 seconds when no interval is given), edit the frontmatter script of `index.astro` directly.

```astro
// Before: defaults to 5 seconds when no variant is given
const autoplaySeconds = autoplayVariant?.includes(':') ? Number(autoplayVariant.split(':')[1]) : 5;

// After: default to 8 seconds instead
const autoplaySeconds = autoplayVariant?.includes(':') ? Number(autoplayVariant.split(':')[1]) : 8;
```

The `<script>` side is just as directly editable. For example, `accordion` pushes an ACDL event on every toggle — if you want to send that data somewhere else too, just add to the same `<script>` block.

```astro
<script>
  import { pushEvent } from '../../lib/acdl';

  document.querySelectorAll<HTMLDetailsElement>('.accordion__item').forEach((item) => {
    item.addEventListener('toggle', () => {
      const label = item.querySelector('.accordion__title')?.textContent ?? '';
      pushEvent('accordion_toggle', { blockName: 'accordion', label, state: item.open ? 'open' : 'closed' });
      // add your own tracking call here
    });
  });
</script>
```

A Block is just a plain Astro component, so there's no framework-specific extension point (plugin system, hooks) to go hunting for. Editing the file directly is the shortest path. After making a change, run `npm run build` (or `npm run dev`) and check `/en/block-library/<name>` to confirm the new look and behavior.

## 3. Per-section styling with the section-metadata Block

If you want to adjust just one section of one page — say, giving it a different background — without touching the Block itself, `section-metadata` is the tool for it. Placed inside a section, it adds a CSS class to that section's wrapping `<section>` element.

```markdown
## Highlighted section

| section-metadata | |
| --- | --- |
| style | highlight |

This section gets a background color.
```

The value of `style` (`highlight` in this example) is appended as-is, producing `<section class="block-section highlight">` — the class name itself carries no special meaning. You still need to define what it looks like yourself, in `src/styles/global.css`:

```css
.highlight {
  padding: 1.5rem;
  background: #f5f0ff;
  border-radius: 4px;
}
```

You can specify multiple classes, comma-separated (`highlight, no-padding` in the `style` cell adds both). This is a good fit for section-scoped adjustments rather than page-wide ones — emphasizing a single promo section, tightening the padding on one block, and similar cases.

`section-metadata` can technically go anywhere within its section, but since it renders nothing (it's stripped out at build time), placing it at the top or bottom of the section keeps the source easier to scan. If what you actually need is page-wide `<meta>` tags rather than section styling, use the `metadata` Block instead — see the [Built-in Block Reference](/en/docs/blocks) for the difference between the two.
