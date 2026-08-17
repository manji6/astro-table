---
title: "セットアップ"
description: "AstroTableの開発環境構築と主要コマンド"
pageType: "other"
---

# セットアップ

AstroTableをローカルで動かすための手順です。

## 前提条件

Node.js 22.12.0以上が必要です。

## インストール

```bash
npm install
```

E2Eテスト(Playwright)を使う場合は、初回のみ以下も実行してください。

```bash
npx playwright install chromium
```

## 開発サーバーの起動

```bash
npm run dev
```

`http://localhost:4321`でサイトが確認できます。Markdownファイルを編集すると自動でリロードされます。

開発サーバー起動後、`/ja/block-library`にアクセスすると、現在利用可能な全Blockの一覧・実際のレンダリング結果・Markdownでの書き方をまとめて確認できます。新しくページを書く際に手元のリファレンスとして便利です。

---

## 主なコマンド

### ビルド・プレビュー

- `npm run build` — 本番ビルドを実行し、`dist/`に静的ファイルを出力する
- `npm run preview` — ビルド結果をローカルで確認する

### テスト

- `npm run test` — Unit test(Vitest)を実行する
- `npm run test:watch` — Unit testをウォッチモードで実行する
- `npm run e2e` — E2E test(Playwright)を実行する

### 品質チェック

- `npm run lint` — ESLintでコードを検査する
- `npm run typecheck` — `astro check`で型チェックを行う

### コンテンツ・Blockの雛形生成

- `npm run new:block` — 新しいBlockの雛形を生成する
- `npm run new:product` — 商品データの雛形を生成する(commerceモジュール使用時)

---

## 次に読むページ

- ページの書き方は[Markdownでページを書く](/ja/docs/content-authoring)を参照してください。
- リポジトリ全体の構成は[ディレクトリ構成](/ja/docs/directory-structure)を参照してください。
