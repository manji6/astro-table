---
title: "Creating a New Block"
description: "How to go from npm run new:block to a working, tested Block visible in /en/block-library."
pageType: "other"
---

# Creating a New Block

Adding a new Block is, in practice, writing a single file: `src/blocks/<name>/index.astro`. For how Block syntax itself works (positional columns, variants, and so on), see the [Built-in Block Reference](/en/docs/blocks). This page walks through building one from scratch.

## 1. Generate the scaffold

```bash
npm run new:block -- <name> [columns]
```

`<name>` is the new Block's name, `[columns]` is how many columns it takes (2 if omitted). For example, a 3-column Block:

```bash
npm run new:block -- announcement-bar 3
```

The name is normalized the same way as at runtime (trim whitespace, lowercase, collapse internal whitespace to hyphens), then two files are created:

- `src/blocks/announcement-bar/index.astro` (implementation scaffold, with TODO comments)
- `src/blocks/announcement-bar/example.md` (a sample-content scaffold, automatically surfaced on the `/en/block-library` page)

The command also prints a Markdown example with the header row correctly padded with empty cells for that column count — worth keeping around for the build check later. If a directory with that name already exists, it exits with an error instead of overwriting anything.

## 2. Implement the row interpretation

The generated `index.astro` already declares this Props shape (don't change this part — it's the Block's basic contract):

```astro
export interface Props {
  name: string;       // normalized Block name
  variants: string[]; // values from variant syntax
  rows: Cell[][];      // each row/column of the body (header row excluded)
}
```

`Cell` looks like this:

```ts
type Cell = {
  html: string;                                  // inline Markdown in the cell, rendered to HTML
  text: string;                                  // plain-text extraction
  images: Array<{ src: string; alt: string }>;   // images in the cell (can be more than one)
  links: Array<{ href: string; text: string }>;  // links in the cell (can be more than one)
};
```

`Cell` carries `text`/`images`/`links` alongside `html` specifically so a Block can tell "is this cell an image, a link, or plain text?" without re-parsing HTML. Your implementation pulls cells out of `rows` positionally and gives them meaning.

`src/blocks/cards/index.astro` is a good model implementation to study — it interprets 3 columns (image, title, link target):

```astro
---
import type { Cell } from '../../lib/markdown/parse-page';

export interface Props {
  name: string;
  variants: string[];
  rows: Cell[][];
}

const { rows, variants } = Astro.props;
---

<ul class="cards" data-variants={variants.join(' ')}>
  {rows.map((row) => {
    const [imageCell, titleCell, linkCell] = row;
    const image = imageCell?.images[0];
    const href = linkCell?.links[0]?.href ?? linkCell?.text;
    return (
      <li class="cards__item">
        {image && <img class="cards__image" src={image.src} alt={image.alt} />}
        <p class="cards__title">{titleCell?.text}</p>
        {href && <a class="cards__link" href={href}>Learn more</a>}
      </li>
    );
  })}
</ul>

<style>
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
</style>
```

For a 2-column key-value Block (column 1 = key, column 2 = value), the pattern used by `hero` and `modal` — folding `rows` into a `Record<string, Cell>` — is convenient:

```astro
const config: Record<string, Cell> = {};
for (const row of rows) {
  const [keyCell, valueCell] = row;
  if (keyCell && valueCell) {
    config[keyCell.text.trim().toLowerCase()] = valueCell;
  }
}
```

## 3. Add interactive behavior if needed

For things like open/close toggles, tab switching, or carousel navigation, add a `<script>` tag. Astro bundles and scopes it automatically, so there's no risk of colliding with another Block's script.

If you want to track user interaction, call `pushEvent()` from `src/lib/acdl.ts`. The `accordion` Block is a good reference:

```astro
<script>
  import { pushEvent } from '../../lib/acdl';

  document.querySelectorAll<HTMLDetailsElement>('.accordion__item').forEach((item) => {
    item.addEventListener('toggle', () => {
      const label = item.querySelector('.accordion__title')?.textContent ?? '';
      pushEvent('accordion_toggle', { blockName: 'accordion', label, state: item.open ? 'open' : 'closed' });
    });
  });
</script>
```

If the same Block might appear more than once on a page (modals, tabs, and similar), generate a per-instance ID with something like `crypto.randomUUID().slice(0, 8)` so DOM element `id`s don't collide.

## 4. Fill in example.md

The `example.md` scaffold created alongside `index.astro` needs its `description` (one sentence on what the Block is for) and its sample table filled in to match real usage. Just having this file present is enough for the `/en/block-library` page to automatically show both the rendered result and the Markdown source.

```markdown
---
description: "One sentence describing what this Block is for"
category: "content"
---

| announcement-bar | | |
| --- | --- | --- |
| Sale is on | Learn more | /en/sale |
```

## 5. Verify the build

```bash
npm run build
```

Or run `npm run dev` and visit `/en/block-library/<name>` to see both the rendered output and the source side by side in the browser.

An unknown Block name (no `src/blocks/<name>/index.astro` matching the normalized name) is caught at build time with a clear error, and the error message lists the known Block names so a typo is easy to spot. There's no silent fallback to a plain rendered table.

## 6. Testing

Tests for the Block-syntax parsing itself (turning a table into a Block node) live in `tests/parse-page.test.ts`. Adding a new Block doesn't change parsing logic, so this suite is normally unaffected, but it's worth running anyway:

```bash
npm run test
```

Unit tests for a Block component's rendered output aren't required, but if a Block carries non-trivial state logic (carousel position math, for example), it's worth pulling that logic out and covering it with a test under `tests/`.
