---
title: "Writing Pages in Markdown"
description: "How to write a page: frontmatter, body content, Block notation, and section breaks"
pageType: "other"
---

# Writing Pages in Markdown

An AstroTable page is a Markdown file under `content/pages/`. When multi-language support (i18n) is opted in, pages live under per-locale directories (`ja/`, `en/`).

```
content/pages/
  ja/
    index.md         → /ja/ (the top page)
    about.md         → /ja/about
  en/
    index.md         → /en/
    about.md         → /en/about
```

The file path (minus the extension and the locale directory) becomes the URL path as-is. The filename `index.md` is treated specially and routes to that directory's "/" (for example, `ja/index.md` → `/ja/`).

---

## Frontmatter

Every page starts with YAML frontmatter like this:

```yaml
---
title: "Page title"
description: "A description used for the meta description (optional)"
pageType: "other"
---
```

The available fields are:

- `title` (required) — used in the `<title>` tag
- `description` (optional) — used for the meta description and og:description
- `pageType` (optional, defaults to `other`) — the kind of page this is. One of `top`, `campaign`, `category`, `search`, `product`, `cart`, `checkout`, `confirmation`, `order-complete`, or `other`
- `ogImage` (optional) — the path to an OGP image
- `noindex` (optional, defaults to `false`) — when `true`, outputs `<meta name="robots" content="noindex">`

An invalid frontmatter value causes `npm run build` to fail.

---

## Body content: regular content and Blocks

The body is plain GFM (GitHub Flavored Markdown). Headings, paragraphs, lists, images, and links all render as-is.

```markdown
# Heading

This is a regular paragraph. You can use **emphasis** and [links](/en/about) too.

- List item 1
- List item 2
```

GFM tables are the one exception: they're treated specially and expanded into a reusable component called a Block. The first cell of the first row is the Block's name, and the rows that follow are the data passed to it.

```markdown
| cards | | |
| --- | --- | --- |
| ![shoes](/images/shoes.svg) | Running shoes | /en/detail/running-shoes |
```

This example calls the Block named `cards`, passing each row's data (image, product name, link target) to it. Once the dev server is running, visit `/en/block-library` to see the full list of available Blocks and how to write them.

**Note: a table can only reference a Block that already exists.** Writing a table whose name doesn't match any Block component causes a build error.

---

## Buttons (CTA links)

To place a CTA button inside a paragraph, write raw HTML directly in the body — this is standard CommonMark, not a custom extension. There's no dedicated notation or dedicated Block for it.

```markdown
New arrivals are in. <a href="/sale" class="button button--primary">Shop the sale</a> Check them out.
```

The classes `button` (base), `button--primary` (emphasized), and `button--secondary` (subtle) are available. For actions that don't navigate (opening a modal, for example), use a Block built for that behavior instead.

---

## Section breaks

`---` (a thematic break, standard Markdown's HR notation) splits a page into multiple sections. It's plain CommonMark, not a custom extension.

```markdown
# Hero

This is the first section.

---

## Second section

Everything from here is a separate section.
```

After the build, each section is output as its own `<section>` element. This page itself is written with a `---` break before each heading.

---

## Adding meta elements to a page (the metadata Block)

Beyond the fixed frontmatter fields (`title`, `description`, `ogImage`), you can add arbitrary `<meta>` elements by placing a Block named `metadata` in the body. It renders nothing and can go anywhere in the page.

```markdown
| metadata | |
| --- | --- |
| og:type | article |
| twitter:card | summary_large_image |
```

Names starting with `og:` or `twitter:` are output using the `property` attribute; everything else uses `name`.

---

## Styling a single section (the section-metadata Block)

To style just one section, place a Block named `section-metadata` inside it. Its scope is limited to the section it's placed in.

```markdown
## Section with a background

| section-metadata | |
| --- | --- |
| style | highlight |

This section gets a background style.
```

The `style` value is added to the section as a CSS class as-is. The look of the class itself is defined in the site's CSS.

---

## A note on internal links (locale prefixes)

When multi-language support is opted in, you need to write the locale prefix (`/ja/...`, `/en/...`) yourself on every internal link and image path. Blocks and the parsing layer don't auto-fill the locale.

```markdown
<!-- content/pages/en/about.md -->
[Back to top](/en/)
```

---

## Editing the header and footer

The header (`content/nav/<locale>.md`) and footer (`content/footer/<locale>.md`) are written with the same Block notation as regular pages. A table whose first cell is `header` or `footer` is used directly as that Block.

```markdown
<!-- content/nav/en.md -->
| header | | |
| --- | --- | --- |
| Home | /en/ | |
| Contact | /en/contact | |
```

---

## Breadcrumbs (automatic)

A breadcrumb trail is shown automatically below the header, based on a page's directory hierarchy. There's nothing you need to write. Each level's label is pulled from the `title` of the corresponding `index.md`. The top page (`content/pages/en/index.md`) shows no breadcrumb.

---

## How routing works (for reference)

Content pages are routed by a generic route that maps every file under `content/pages/` to a URL based on its file path (locale included). Adding a new page requires no code changes — dropping a Markdown file in place is enough to publish it at a new URL.
