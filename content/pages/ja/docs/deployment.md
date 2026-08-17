---
title: "デプロイ(Cloudflare Pages)"
description: "Cloudflare Pagesへのデプロイ手順"
pageType: "other"
---

デプロイはCloudflare PagesのネイティブGit連携を使います。lint・型チェック・ユニットテスト・ビルド・E2Eといった品質ゲートはGitHub Actions側で独立して実行されるため、デプロイ専用のワークフローYAMLはリポジトリに含みません。

## 接続手順

1. Cloudflareダッシュボードでこのリポジトリを連携する
2. ビルド設定を以下の内容にする
3. 必要に応じて環境変数を設定する(マーケティングタグのコンテナを本番/プレビューで出し分けたい場合など。サイト設定のページを参照)
4. `main`ブランチへのマージで本番デプロイ、プルリクエスト作成でプレビューURLが自動発行される

## ビルド設定

- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`

## ルートのリダイレクト

多言語対応をオプトインしている場合、`public/_redirects`がルート`/`をデフォルトロケール(`/ja/`)へ302リダイレクトします。

```
# public/_redirects
/  /ja/  302
```

このファイルはCloudflare Pages上でのみ有効です。ローカルの`npm run dev`・`npm run preview`では効かないため、ローカル確認時は`/ja/`のようにロケールを明示したパスへ直接アクセスしてください。

## CIとの関係

品質ゲートは`.github/workflows/ci.yml`で、プルリクエスト作成時と`main`ブランチへのプッシュ時に実行されます。内容は依存関係のインストールに続けて、lint・型チェック(`astro check`)・ユニットテスト(Vitest)・ビルド・E2E(Playwright)の順です。Cloudflare Pages側のデプロイとは別トリガーで動くため、CIが失敗していてもCloudflare Pages側のプレビューデプロイ自体は独立して作成されます。マージ前に品質を担保したい場合は、GitHub側のブランチ保護ルールでこのワークフローを必須ステータスチェックとして設定してください。
