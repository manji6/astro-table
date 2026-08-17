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

## コミュニティ

節度あるやり取りをお願いします。行き過ぎた言動があった場合はメンテナーへ連絡してください。
