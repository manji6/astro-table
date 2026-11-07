# コントリビューションガイド

AstroTableへのコントリビューションを検討していただきありがとうございます。バグ報告・機能提案・PRいずれも歓迎します。

## 開発環境のセットアップ

```bash
npm install
npx playwright install chromium   # 初回のみ(E2Eテストに必要)
npm run dev
```

主なコマンドは[`README.md`](./README.md)を参照してください。

## Issue

- バグ報告・機能提案はGitHub Issuesへ。テンプレート([`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/))に沿って書いてください
- 実装に着手する前に、既存Issueに一言コメントしてから始めると作業の重複を避けられます

## ブランチ・PRの進め方

1. `main`から作業ブランチを切る(`git checkout -b fix-xxx`や`feature-xxx`など、内容が分かる名前で)
2. テストファーストを心がける: 成功基準を言語化 → テスト作成(失敗確認) → 実装 → テスト通過を確認
3. コミット前に以下を実行し、全て通過することを確認する
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   npm run e2e   # commerce/member等の挙動に関わる変更の場合
   ```
4. PRを作成する。関連Issueがあれば本文に`Closes #<Issue番号>`を書く
5. レビューを経てマージ

## コーディング方針

- 新しいBlockの追加方法は[`/docs`](/docs)ページ(このリポジトリを`npm run dev`して`/ja/docs/creating-blocks`または`/en/docs/creating-blocks`からアクセス)を参照してください
- 位置ベースの列解釈・未知Block名のビルドエラー化など、既存の設計方針を変更する場合はIssueで先に議論してください
- コミットメッセージ・PR説明は日本語・英語どちらでも構いません

## リリース運用

配布単位はテンプレートのGitタグとGitHub Releaseです。npmパッケージは公開しません。安定版の `vMAJOR.MINOR.PATCH` を使い、0.xの破壊的な変更はマイナー更新、互換性のある修正はパッチ更新にします。1.0以降の破壊的な変更はメジャー更新です。

リリースする場合は、通常のPRで次の2点を揃えてレビューします。

1. `package.json` と `package-lock.json` のルートパッケージの版を同じ値に更新する
2. `releases/v<版番号>.md` を追加し、変更内容、破壊的な変更（なければその旨）、移行手順、サイト側の確認対象ファイルを記載する

`main` へのpushのCIが成功すると、Releaseワークフローが**そのCIで検証したコミットSHA**を対象にタグとReleaseを公開します。初回は `v0.1.0` です。すでに公開されている版はスキップし、タグやリリースノートを変更しません。既存タグだけがあり別のコミットを指している場合は失敗させ、付け替えません。リリースノートの欠落・空欄でも公開しません。

通常の修正PRでは毎回バージョンを上げる必要はありません。次のリリースPRで変更をまとめます。公開失敗時はActionsのログを確認し、修正後のmainのCIまたはReleaseジョブの再実行で公開します。版の変更が必要なら新しいPRで行い、公開済みタグは削除・移動しません。

テンプレート利用サイトでの意図しない公開を防ぐため、このワークフローは `manji6/astro-table` のmainへのpushが成功した場合にのみ動きます。利用サイトは[更新取り込み手順](content/pages/ja/docs/template-updates.md)を参照してください。

## コミュニティ

節度あるやり取りをお願いします。行き過ぎた言動があった場合はメンテナーへ連絡してください。
