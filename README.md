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

本リポジトリはAstroTable本体(テンプレートリポジトリ)。「Use this template」等で作成したサイト実体側のリポジトリで、後から本体の更新(バグ修正・新しい共通Block追加等)を取り込みたい場合は以下の手順を使う。

```bash
# 初回のみ: AstroTable本体をupstreamとして登録
git remote add upstream https://github.com/<owner>/astro-table.git

# 更新を取り込みたい時
git fetch upstream
git merge upstream/main   # または git rebase upstream/main
```

コア部分(`/src/blocks`, `/src/lib`, `/src/components`, `/src/layouts`等)とサイト固有部分(`/content`のコンテンツ・commerceモジュール)のファイルパスが分離されているため、upstreamの変更がコア部分のみに閉じていればコンフリクトはほぼ発生しない。

**注意: 初回のマージは`fatal: refusing to merge unrelated histories`で失敗する。** 「Use this template」で作成したリポジトリは、forkと違って単一の初期コミットしか持たず、AstroTable本体とは共通の祖先コミットを持たないため。初回のみ`--allow-unrelated-histories`を付けて実行する。

```bash
git merge upstream/main --allow-unrelated-histories
```

このマージコミット以降は両者の履歴がつながるため、2回目以降は通常の`git merge upstream/main`(フラグなし)で問題ない。

## Cloudflare Pagesへのデプロイ

デプロイはCloudflare Pagesのネイティブ Git 連携を使う。以下はCloudflareダッシュボード側で行うユーザー作業。

1. Cloudflareダッシュボードで本リポジトリを連携する
2. ビルド設定:
   - ビルドコマンド: `npm run build`
   - 出力ディレクトリ: `dist`
3. 環境変数(必要に応じて): `PUBLIC_TAG_ENV`(`site.config.ts`のタグ注入設定を本番/プレビューで出し分ける場合に使用)
4. `main`ブランチへのマージで本番デプロイ、PR作成でプレビューURLが自動発行される

品質ゲート(lint/typecheck/unit/build/e2e)はGitHub Actions(`.github/workflows/ci.yml`)側で独立して実行される。mainブランチの保護ルール(必須ステータスチェック化)はGitHub側の設定作業として別途行うこと。

## コントリビューション

Issue・PR歓迎です。進め方は[`CONTRIBUTING.md`](./CONTRIBUTING.md)を参照してください。

## License

MIT License. 詳細は[`LICENSE`](./LICENSE)を参照。
