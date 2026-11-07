---
title: "サイト設定"
description: "site.config.tsとastro.config.mjsの設定項目"
pageType: "other"
---

AstroTableのサイト全体設定は、リポジトリルートの2つのファイルに分かれています。`astro.config.mjs`はAstro本体の設定、`site.config.ts`はこのCMS固有のサイト設定(マーケティングタグ注入・会員機能のOn/Off)です。

## `site.config.ts`

`site.config.ts`は`SiteConfig`型に沿ったオブジェクトをデフォルトエクスポートするだけのファイルです。共通レイアウト(`Base.astro`)がビルド時にこの値を読み込み、ページの`<head>`やサイト全体の挙動に反映します。

```ts
import type { HTMLAttributes } from 'astro/types';

export interface SiteConfig {
  head?: { links?: Array<HTMLAttributes<'link'>> };
  tags: {
    // 外部スクリプト(タグマネージャー本体など)
    scripts: Array<{ src: string; async?: boolean; defer?: boolean }>;
    // インラインで貼るコード片(<script>タグの中身の文字列)
    inlineHead: string[];
  };
  // 会員機能(会員ID/属性の管理、ログイン/ログアウト、ログイン状態オーバーレイ、
  // ACDLへのuserネームスペース連携)を一括でOn/Offする。既定はOff。
  member: {
    enabled: boolean;
  };
  // カート・会員・お気に入り等、localStorageキーの先頭に付けるサイト固有のプレフィックス。
  storagePrefix: string;
}
```

### `tags` — マーケティングタグの注入

`scripts`と`inlineHead`は、共通レイアウトがACDL(データレイヤー)の初期化より後、かつ他のどのスクリプトよりも前に`<head>`へ出力します。タグマネージャーの読み込み順序に依存する検証を行う際は、この順序を前提にしてください。

- `scripts`: 外部スクリプトの配列。各要素は`src`(URL)と、任意で`async`/`defer`を指定します。`<script src="...">`としてそのまま出力されます。
- `inlineHead`: インラインで貼りたいコード片の文字列を配列で並べます。要素ごとに個別の`<script>`として出力されます。

設定例:

```ts
const siteConfig: SiteConfig = {
  tags: {
    scripts: [
      { src: 'https://assets.example.com/launch-xxx.min.js', async: true },
    ],
    inlineHead: [
      // GTMスニペットなど、インラインで貼りたいコード片の文字列
    ],
  },
  member: {
    enabled: true,
  },
  storagePrefix: 'astro-table',
};

export default siteConfig;
```

本番/プレビューでタグコンテナを出し分けたい場合は、デプロイ環境の環境変数をこのファイル内で参照して条件分岐します。タグID・スニペット自体は秘匿情報ではないサイトを前提としているため、リポジトリへ直接コミットして構いません。

### `member` — 会員機能のOn/Off

`member.enabled`は、ログイン/会員発行ページ、ログイン状態オーバーレイ、ACDLへのuserネームスペース連携をまとめて有効化・無効化するスイッチです。`false`にすると、これらの会員関連機能は組み込まれません。実データを扱わない検証用サイトや、会員機能が不要なサイトでは`false`のままにしておくのが安全です。

### `storagePrefix` — localStorageキーのプレフィックス

カート(`cart.ts`)・会員(`member.ts`)・お気に入り(`favorites.ts`)・チェックアウト関連のlocalStorageキーは、すべて`${storagePrefix}:cart:...`のように、この値を先頭に付けて保存されます。このテンプレートを使って複数のサイトをローカルで並行して動かす場合や、他のサイトとlocalStorageの名前空間を分けたい場合は、サイトごとに固有の値(例: 実際のサイト名やプロジェクトコード名)に変更してください。

## `astro.config.mjs`

Astro本体の設定ファイルです。AstroTableでは主に多言語対応(i18n)の設定に使います。

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

i18nはAstroTableではオプトイン機能です。設定しなければ単一言語サイトとして、ロケールプレフィックスなしのURLで動作します。設定項目の詳細やディレクトリ構成については、多言語対応のページを参照してください。

## head内のlink要素とSEO

`site.config.ts` の省略可能な `head.links` でWebフォントやfaviconを追加できます。属性は `astro/types` の `HTMLAttributes<'link'>` に準拠します。省略時は追加しません。ACDL初期化・マーケティングタグより前に出力します。

```ts
head: {
  links: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP&display=swap' },
    { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  ],
},
```

`astro.config.mjs` に本番URLを `site: 'https://example.com'` として設定すると、共通レイアウトが各ページのcanonicalを自動出力します。`site` が未設定ならcanonical・hreflangは出力しません。i18nが無効ならcanonicalのみです。

i18nが有効な場合、pagesコレクション内の同じ相対パス（`ja/about.md` と `en/about.md`、ディレクトリの `index.md` も含む）を翻訳として扱います。実在する翻訳ページだけにhreflangを出力し、デフォルト言語の翻訳があればx-defaultも出力します。frontmatterまたはmetadata Blockのrobots/googlebotでnoindexを指定したページは、hreflangの出力元・リンク先から除外します（canonicalは出力します）。

固定Astroテンプレートでは `Base` の `translations` に `{ locale, pathname, noindex? }` の配列を渡せます。同じパスを複数言語で必ず生成する場合は `translationLocales={['ja', 'en']}` を使えます。本体のcommerce・会員・Blockライブラリの固定ページもこの方式です。存在しない翻訳先は指定しないでください。独自テンプレートで翻訳先を指定しない場合はcanonicalのみ出力します。

canonical・hreflangは自動生成されるため、`head.links` から重複して追加しないでください。`href` は指定どおり出力されるため、`base` を使うサイトのローカルURLにはそのプレフィックスを含めます。
