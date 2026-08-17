# CLAUDE.md

**AstroTable**: Markdown(GFM表 = Block記法)をビルド時にAstroコンポーネントへ変換する軽量オーサリングシステム。取り外し可能なcommerceモジュール(ダミーECサイトのデモコンテンツ同梱)をテンプレートとして同梱している。

- 利用者向けドキュメント(セットアップ・Block一覧・カスタマイズ方法等)は`npm run dev`後に`/ja/docs/`(または`/en/docs/`)を参照。このドキュメント自体もAstroTableのBlock記法で書かれた実ページ
- 追加機能・改修タスクの進め方は[`CONTRIBUTING.md`](./CONTRIBUTING.md)を参照(GitHub Issues起点、タスク単位でレビューを挟む)

## 絶対に守る規約

- Block記法は「表 = Block、1行目1セル目がBlock名(ヘッダー行は空セルで列数を揃える)、列は位置ベース解釈」(詳細: `/docs/blocks`)
- パース層(`src/lib/markdown/parse-page.ts`)はBlock固有の解釈を持たない。解釈は各Blockコンポーネントの責務
- 未知のBlock名はビルドエラーで失敗させる(黙って素の表として描画しない)
- AEM Boilerplate / Block Collectionのコードをコピーして取り込まない。参考にしてAstroコンポーネントとして書き起こす
- コア(`/src/blocks`, `/src/lib`, `/src/components`, `/src/layouts`)/ commerceモジュール(`/src/modules/commerce`)の境界を守る。commerceの変更でコア部分を不用意に壊さない(詳細: `/docs/commerce`)
- 多言語対応はオプトイン機能。コアは単一言語でも成立する(詳細: `/docs/i18n`)
- `cart.ts`(状態管理)と`acdl-bridge.ts`(ACDL連携)は分離を維持する。カートはどんなマーケティングツールにも依存しない
- テストファースト: 成功基準の言語化 → テスト作成(失敗確認)→ 実装。変更後は必ずテストを実行する(詳細: `/docs/testing`)
- ACDLの中央集権ブリッジ(`acdl-bridge.ts`等)は、イベントが発生しうる全ページで明示的に`import`する。ユニットテストはモジュールを直接importして検証できてしまうため、「実際にどこかのページから読み込まれているか」は別途ブラウザで確認すること(過去にこの配線漏れで実際には一切pushされない不具合が発生したことがある)

## 模範Block

新しいBlockを作る際は `src/blocks/cards/index.astro` を参考にする(コメント厚め、位置ベースの列解釈の実例)。

## Skill

よくある作業は`.claude/skills/`のSkillに沿って進める。

- `add-block` — 新しいBlockの追加
- `translate-page` — ページの多言語展開(i18nオプトイン時のみ)
- `add-product` — 商品データの追加(commerceモジュール使用時)
- `add-acdl-event` — ACDLイベントの追加

## コマンド

- `npm run dev` — 開発サーバー起動
- `npm run build` — 本番ビルド(`dist/`)
- `npm run preview` — ビルド結果のプレビュー起動(Playwrightの`webServer`もこれを使う)
- `npm run test` / `npm run test:watch` — Vitest(Unit test、対象は`tests/**/*.test.ts`)
- `npm run lint` — ESLint(flat config, `eslint.config.js`。Astroファイル含む)
- `npm run typecheck`(= `npx astro check`) — 型チェック
- `npm run e2e`(= `npx playwright test`) — Playwright E2E(対象は`e2e/**`。初回は`npx playwright install chromium`が必要)
- `npm run new:block -- <name> [columns]` — 新しいBlockの雛形生成(`add-block` Skillが使う)
- `npm run new:product -- <slug>` — 新しい商品データの雛形生成(`add-product` Skillが使う)

## 進め方(開発エージェント向け)

- 追加機能・改修はGitHub Issuesから着手する(運用ルールは`CONTRIBUTING.md`)。**タスク単位でユーザーレビューを挟む**(まとめて確認はしない)。決定ログはIssue/PRのコメントに書く
- 想定外の問題が出た場合は、既存の設計方針(このファイルの「絶対に守る規約」と`/docs`配下)に照らして修正案を作り、Issue/PRのコメントに記録する
- 設計と実装が乖離する変更をした場合は、対応する`/docs`ページ(`content/pages/{ja,en}/docs/*.md`)も同時に更新する
