# AstroTable

Markdown(GFM表 = Block記法)をビルド時にAstroコンポーネントへ変換する軽量オーサリングシステム。

もともとはマーケティングツール(Web行動分析・パーソナライゼーション・CMP等)の動作検証用に、低コストで「実際に動いているように見えるダミーサイト」を作るために生まれました。CMSやEC専用システムを本格導入するほどではない規模のサイトを、生成AIとの協業を前提に手早く作れることを目指しています。

- **使い方・カスタマイズ方法を知りたい場合**: `npm run dev`後に[`/ja/docs/`](http://localhost:4321/ja/docs/)(または`/en/docs/`)へアクセス。このドキュメント自体もAstroTableのBlock記法で書かれたページです
- 生成AI(Claude Code等)への指示だけで運用できることを目標にしている。コードを書かない運用者は、まずこのファイルと`.claude/skills/`のSkillを起点にするとよい

## セットアップ

```bash
npm install
npx playwright install chromium   # 初回のみ(E2Eテストに必要)
npm run dev                       # 開発サーバー起動
```

主なコマンド一覧は[`CLAUDE.md`](./CLAUDE.md)の「コマンド」節を参照。

開発サーバー起動後、`/ja/block-library`(多言語対応時は`/en/block-library`も)にアクセスすると、現在利用可能な全Blockの一覧・実際のレンダリング結果・書き方(Markdownソース)を確認できる。

## よくある作業(Skill)

`.claude/skills/`に、Claude Codeへの指示だけで進められる定型作業が用意されている。

- `add-block` — 新しいBlockの追加
- `translate-page` — ページの多言語展開(i18nオプトイン時のみ)
- `add-product` — 商品データの追加(commerceモジュール使用時)
- `add-acdl-event` — ACDLイベントの追加

## テンプレート更新の取り込み(サイト実体側リポジトリでの作業)

[GitHub Releases](https://github.com/manji6/astro-table/releases)のリリースノートを確認し、`v0.1.0`等のタグを指定してサイト側の作業ブランチへ取り込みます。作成元の版を正しく記録する初回手順と、通常の更新マージは別の操作です。`-s ours` はファイルを変更せず取り込み済みとして記録するため、未適用の最新版には使わないでください。

詳しい手順（作成元不明の場合、競合の解消、検証、取り込み済みの版の確認）は以下を参照してください。

- [日本語: テンプレート更新の取り込み](content/pages/ja/docs/template-updates.md)
- [English: Pulling in Template Updates](content/pages/en/docs/template-updates.md)

## Cloudflare Workersへのデプロイ

Cloudflareは2025年にPages(静的サイト専用ホスティング)を非推奨化し、Workers(静的アセット配信機能付き)を新規プロジェクトの標準としている。本リポジトリはWorkers向けの`wrangler.jsonc`を同梱済みで、SSR用のWorkerコードは持たない純粋な静的アセット配信構成になっている。

### Git連携でのデプロイ(推奨)

1. Cloudflareダッシュボードの「Compute (Workers)」から本リポジトリを連携する
2. `wrangler.jsonc`が自動検出される。ビルド設定は以下を指定する:
   - ビルドコマンド: `npm run build`
   - デプロイコマンド: `npx wrangler deploy`(出力ディレクトリは`wrangler.jsonc`の`assets.directory`で指定済みのため、ダッシュボード側で個別に指定する項目はない)
3. `wrangler.jsonc`の`name`をCloudflare側のWorkerプロジェクト名と一致させる(「Use this template」でサイトを作った場合は書き換えが必要)
4. 環境変数(必要に応じて): `PUBLIC_TAG_ENV`(`site.config.ts`のタグ注入設定を本番/プレビューで出し分ける場合に使用)
5. `main`ブランチへのマージで本番デプロイ、PR作成でプレビューURLが自動発行される

### ローカルからの手動デプロイ

```bash
npm run build
npx wrangler deploy
```

初回は`npx wrangler login`でCloudflareアカウントの認証が必要。

品質ゲート(lint/typecheck/unit/build/e2e)はGitHub Actions(`.github/workflows/ci.yml`)側で独立して実行される。mainブランチの保護ルール(必須ステータスチェック化)はGitHub側の設定作業として別途行うこと。

## コントリビューション

Issue・PR歓迎です。進め方は[`CONTRIBUTING.md`](./CONTRIBUTING.md)を参照してください。

## License

MIT License. 詳細は[`LICENSE`](./LICENSE)を参照。
