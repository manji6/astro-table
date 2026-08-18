---
title: "デプロイ(Cloudflare Workers)"
description: "Cloudflare Workers(静的アセット)へのデプロイ手順"
pageType: "other"
---

デプロイはCloudflare Workers(静的アセット配信機能)を使います。Cloudflareは2025年にPages(静的サイト専用ホスティング)を非推奨化し、Workersを新規プロジェクトの標準としているため、本リポジトリはWorkers向けの`wrangler.jsonc`を同梱しています。SSR用のWorkerコードは持たない、純粋な静的アセット配信構成です。lint・型チェック・ユニットテスト・ビルド・E2Eといった品質ゲートはGitHub Actions側で独立して実行されるため、デプロイ専用のワークフローYAMLはリポジトリに含みません。

## 接続手順(Git連携)

1. Cloudflareダッシュボードの「Compute (Workers)」からこのリポジトリを連携する
2. `wrangler.jsonc`が自動検出される。ビルド設定を以下の内容にする
3. `wrangler.jsonc`の`name`をCloudflare側のWorkerプロジェクト名と一致させる(「Use this template」でサイトを作った場合は書き換えが必要)
4. 必要に応じて環境変数を設定する(マーケティングタグのコンテナを本番/プレビューで出し分けたい場合など。サイト設定のページを参照)
5. `main`ブランチへのマージで本番デプロイ、プルリクエスト作成でプレビューURLが自動発行される

## ビルド設定

- ビルドコマンド: `npm run build`
- デプロイコマンド: `npx wrangler deploy`
- 出力ディレクトリ: ダッシュボード側での指定は不要(`wrangler.jsonc`の`assets.directory`が`./dist`を指定済み)

## ローカルからの手動デプロイ

Git連携を使わず手元から直接デプロイしたい場合:

```bash
npm run build
npx wrangler deploy
```

初回は`npx wrangler login`でCloudflareアカウントの認証が必要です。

## ルートのリダイレクト

多言語対応をオプトインしている場合、`public/_redirects`がルート`/`をデフォルトロケール(`/ja/`)へ302リダイレクトします。

```
# public/_redirects
/  /ja/  302
```

`_redirects`はCloudflare Pages・Workers静的アセットの両方でネイティブサポートされていますが、ローカルの`npm run dev`・`npm run preview`では効きません。ローカル確認時は`/ja/`のようにロケールを明示したパスへ直接アクセスしてください。

## CIとの関係

品質ゲートは`.github/workflows/ci.yml`で、プルリクエスト作成時と`main`ブランチへのプッシュ時に実行されます。内容は依存関係のインストールに続けて、lint・型チェック(`astro check`)・ユニットテスト(Vitest)・ビルド・E2E(Playwright)の順です。Cloudflare側のデプロイとは別トリガーで動くため、CIが失敗していてもCloudflare側のプレビューデプロイ自体は独立して作成されます。マージ前に品質を担保したい場合は、GitHub側のブランチ保護ルールでこのワークフローを必須ステータスチェックとして設定してください。
