---
title: "ディレクトリ構成"
description: "AstroTableリポジトリの主要ディレクトリの役割"
pageType: "other"
---

# ディレクトリ構成

リポジトリのトップレベルは大きく3つに分かれます。

- `/content` — サイトコンテンツ(Markdown・YAML)。運用者が日常的に編集する場所
- `/src` — フレームワークのコード(Astroコンポーネント・パース処理など)
- `/public` — 画像やダウンロードファイルなど、そのまま配信される静的ファイル

以下、それぞれの中身を説明します。

---

## /content(コンテンツ)

### pages/

各ページのMarkdownファイルです。多言語対応をオプトインしている場合、ロケール別ディレクトリ(`ja/`・`en/`)に分かれます。

- `pages/<locale>/*.md` — 各ページの本文。ファイルパスがそのままURLになります
- `pages/<locale>/index.md` — そのディレクトリの「/」にあたるトップページ

### nav/・footer/

ヘッダーナビゲーションとフッターも、ページ本文と同じBlock記法のMarkdownで管理します。

- `nav/<locale>.md` — ヘッダーのリンク一覧
- `footer/<locale>.md` — フッターのリンク一覧

### products/・taxonomy/

commerceモジュール(EC機能)を使う場合のみ使われます。

- `products/*.yaml` — 商品データ(SKU、価格、在庫、カテゴリなど)
- `taxonomy/*.yaml` — カテゴリキーから表示名への対訳辞書

---

## /src(フレームワークコード)

### blocks/

汎用Block(hero・cards・columns・tableなど)の実装です。ECや多言語対応に依存しない、コア部分のBlockが並びます。各Block配下の`example.md`は、そのBlockの表示サンプルであり`/ja/block-library`ページのソースにもなっています。

### modules/

オプトイン機能一式です。使わないサイトでは丸ごと削除できるように、コア(`blocks/`)とは独立した場所に置かれています。

- `modules/commerce/` — ECモジュール(商品詳細・カート・チェックアウトなどのBlock・ロジック)
- `modules/member/` — 会員機能モジュール(ログイン・会員情報など)

### layouts/・components/

- `layouts/Base.astro` — 全ページ共通のレイアウト(`<head>`要素、ヘッダー・フッターの組み込みなど)
- `components/BlockRenderer.astro` — パース済みのページ構造をBlockコンポーネントへ変換するレンダリング層
- `components/Breadcrumbs.astro` — パンくずリスト
- `components/LanguageSwitcher.astro` — 言語切り替えUI

### lib/markdown/

Markdownのパース処理です。GFMの表を`{ name, variants, rows }`という構造に変換する`parse-page.ts`が中心になります。

### pages/

Astroのファイルベースルーティングによるページ群です。

- `pages/[...slug].astro` — `content/pages/`配下の全ファイルを拾う汎用ルート(catch-all)
- `pages/[locale]/...` — commerceモジュールなど、固定テンプレートを使うページ。`block-library/`(Block一覧・個別ページ・埋め込みプレビュー)もこの配下にある

---

## その他のディレクトリ

- `/public` — 画像・動画・`favicon`など、ビルドを介さずそのまま配信される静的ファイル
- `/scripts` — `new:block`・`new:product`など、雛形を生成するスクリプト
- `/tests` — Unit test(Vitest)
- `/e2e` — E2E test(Playwright)
- `/.claude/skills` — Claude Code向けのSkill(定型作業の手順)

---

## テンプレートリポジトリとしての使い方

AstroTableは「1サイト=1リポジトリ」を前提にしています。「1つのリポジトリ・1つのビルドで複数サイトを同居させる」というモノレポ型の構成は採用していません(Astro組み込みのi18nルーティングがアプリ全体に対してグローバルであり、モノレポ型にすると自前のcatch-allルートで大改修が必要になるため)。複数サイトが必要になった場合は、以下のいずれかで対応します。

**サイト間で共有すべきデザイン・独自Blockが無い場合**: AstroTableテンプレートから素朴に複数回「Use this template」します。各サイトは上記の「テンプレート更新の取り込み」手順でAstroTableコア本体の更新のみを取り込みます。

**複数サイトで同じブランドデザイン・独自Blockを共有し続けたい場合**: AstroTableコアとサイト実体の間に、もう1段「ブランド共通テンプレート」を挟みます。

```
AstroTable(汎用コア)
    ↓ Use this template
ブランド共通テンプレート(共有デザイン・ブランド独自Blockのみ。個別サイトの固有コンテンツは持たない)
    ↓ Use this template          ↓ Use this template
Site A(固有コンテンツ)      Site B(固有コンテンツ)
```

- ブランド共通テンプレートに含めるもの: 共有CSS(`src/styles/global.css`相当のブランド版)、ブランド独自Block、`site.config.ts`のデフォルト値
- 含めないもの: 実際のページMarkdown(`content/pages/`)、商品データ、nav/footerの実際のテキスト、各サイト固有のドメイン・ロゴ画像
- ブランド共通テンプレート自身もAstroTableコアをupstreamに持ち、Site A・Site Bはブランド共通テンプレートをupstreamに持ちます(2段階のupstream構成)。共有したいデザイン変更は、まずブランド共通テンプレートへPRを出します
- サイトが増えても同じ構造をそのまま横展開できます
