---
title: "サイト設定"
description: "site.config.tsとastro.config.mjsの設定項目"
pageType: "other"
---

AstroTableのサイト全体設定は、リポジトリルートの2つのファイルに分かれています。`astro.config.mjs`はAstro本体の設定、`site.config.ts`はこのCMS固有のサイト設定(マーケティングタグ注入・会員機能のOn/Off)です。

## `site.config.ts`

`site.config.ts`は`SiteConfig`型に沿ったオブジェクトをデフォルトエクスポートするだけのファイルです。共通レイアウト(`Base.astro`)がビルド時にこの値を読み込み、ページの`<head>`やサイト全体の挙動に反映します。

```ts
export interface SiteConfig {
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
};

export default siteConfig;
```

本番/プレビューでタグコンテナを出し分けたい場合は、デプロイ環境の環境変数をこのファイル内で参照して条件分岐します。タグID・スニペット自体は秘匿情報ではないサイトを前提としているため、リポジトリへ直接コミットして構いません。

### `member` — 会員機能のOn/Off

`member.enabled`は、ログイン/会員発行ページ、ログイン状態オーバーレイ、ACDLへのuserネームスペース連携をまとめて有効化・無効化するスイッチです。`false`にすると、これらの会員関連機能は組み込まれません。実データを扱わない検証用サイトや、会員機能が不要なサイトでは`false`のままにしておくのが安全です。

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
